import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken";
import { BadRequestError, InternalServerError, UnauthorizedError } from "../errors/custom.error.js"
import crypto from "crypto";
import { redis } from "../config/redis.config.js";
import { folderRepository } from "../repositories/folder.repository.js";
import axios from "axios";
import {
  generateAccessToken as generateAccessTokenUtil,
  generateRefreshToken as generateRefreshTokenUtil,
  saveRefreshToken as saveRefreshTokenUtil,
} from "./token.service.js";
import { createRemoteJWKSet, jwtVerify } from "jose";

// 로그인 공통 서비스 로직
export class CommonAuthService {
  constructor() {
    this.secret = process.env.JWT_SECRET;
  }

  //Refresh Token 검증 및 Access Token 재발급
  async refreshAccessToken(refreshToken){
    try{
      const payload = jwt.verify(refreshToken, this.secret);
      const { id: userId, tokenId } = payload;

      const storedUserId = await redis.get(`refresh_token:${tokenId}`);

      if (!storedUserId || storedUserId !== String(userId)) {
        throw new BadRequestError("INVALID_REFRESH_TOKEN", "유효하지 않은 토큰입니다.");
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        throw new BadRequestError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
      }

      return generateAccessTokenUtil(user);
    }catch(err){
      throw new BadRequestError("REFRESH_TOKEN_EXPIRED", "Refresh Token이 만료되었습니다.");
    }
  }

  // 로그아웃 시 Refresh Token 폐기
  async revokeRefreshToken(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, this.secret);
      const { tokenId } = payload;

      await redis.del(`refresh_token:${tokenId}`);
    } catch (err) {
      // 이미 만료된 경우도 로그아웃은 성공 처리
    }
  }
  
  // 탈퇴 회원 복구
  async restoreUser(restoreToken) {
    if (!restoreToken) {
      throw new BadRequestError("TOKEN_REQUIRED", "복구 토큰이 필요합니다.");
    }

    const userId = await redis.get(`restore_token:${restoreToken}`);

    if (!userId) {
      throw new BadRequestError("INVALID_TOKEN", "유효하지 않거나 만료된 토큰입니다.");
    }

    const user = await prisma.user.findFirst({
      where: {
        id: parseInt(userId),
        deletedAt: { not: null },
      },
    });

    if (!user) {
      throw new BadRequestError("USER_NOT_FOUND", "복구할 사용자가 없습니다.");
    }

    // 계정 복구
    const restoredUser = await prisma.user.update({
      where: { id: user.id },
      data: { deletedAt: null },
    });

    // 1회성 토큰 삭제 
    await redis.del(`restore_token:${restoreToken}`);

    // 로그인 토큰 발급
    const accessToken = generateAccessTokenUtil(restoredUser);
    const { refreshToken, tokenId } = generateRefreshTokenUtil(restoredUser);
    await saveRefreshTokenUtil(tokenId, restoredUser.id);

    return {
      user: restoredUser,
      accessToken,
      refreshToken,
    };
  }
  
  // 만료된 사용자 삭제
  async deleteExpiredUsers() {
    try {
      const DELETE_AFTER_DAYS = Number(process.env.DELETE_AFTER_DAYS || 7); //DB 삭제 기준 = 일주일
      
      const deleteThresholdDate = new Date(Date.now() - DELETE_AFTER_DAYS * 24 * 60 * 60 * 1000);

      const users = await prisma.user.findMany({
        where: {
          deletedAt: {
            not: null,
            lt: deleteThresholdDate,
          },
        },
      });
      console.log(`삭제 대상 유저 수: ${users.length}`);
      for (const user of users) {
        const userId = user.id
        
        // Redis SCAN으로 Refresh Token 정리
        let cursor = "0";
        do {
          const result = await redis.scan(cursor, "MATCH", "refresh_token:*", "COUNT", 100);
          cursor = result[0];
          const keys = result[1];

          for (const key of keys) {
            const storedUserId = await redis.get(key);
            if (storedUserId === String(userId)) {
              await redis.del(key);
            }
          }
        } while (cursor !== "0");

        // 카카오 연결 해제 (카카오 가입자에 한해)
        if (user.provider === "KAKAO" && user.providerId) {
          try {
            await axios.post(
              "https://kapi.kakao.com/v1/user/unlink",
              new URLSearchParams({ target_id_type: "user_id", target_id: user.providerId }),
              { headers: { Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}` } }
            );
          }catch(err){
            console.warn(`카카오 연동 해제 실패 (userId: ${user.id})`, err.response?.data ?? err.message);
          }
        }
        await prisma.$transaction(async (tx) => {
          await tx.comment.deleteMany({ where: { userId } });
          await tx.userAlarm.deleteMany({ where: { userId } });
          await tx.taskPriority.deleteMany({ where: { userId } });
          await tx.member.deleteMany({ where: { userId } });
          await tx.folder.deleteMany({ where: { userId } });
          // 나머지는 cascade 자동 처리
          await tx.user.delete({where: { id: user.id }});
        });
      }

    } catch (error) {
      console.error("USER CLEANUP ERROR:", error);
      throw new InternalServerError("USER_CLEANUP_FAILED","유저 정리 중 오류 발생");
    }
  }
}

export class KakaoAuthService {
  constructor(){
    this.secret = process.env.JWT_SECRET;
  }
  //카카오 로그인 처리
  async handleKakaoLogin(profile){ // 추후 승인 나면 추가 ->  kakaoAccessToken
    const kakaoAccount = profile?._json?.kakao_account ?? {};
    const profileInfo = kakaoAccount.profile ?? {};

    const nickname = profileInfo.nickname ?? "카카오유저";
    const profileImage = profileInfo.profile_image_url ?? "";
    const email = kakaoAccount.email ?? null;
    //카카오 비즈앱 최소 동의 정책으로 phone_number 미제공 시 데모데이용 임시 더미 전화번호 사용
    const phoneNum = kakaoAccount.phone_number
      ? kakaoAccount.phone_number.replace("+82 ", "0")
      : "전화번호를 입력해 주세요.";

    const providerId = profile.id.toString();

    try {
      //기존 사용자 조회
        let user = await prisma.user.findFirst({
        where:{
          provider: "KAKAO",
          providerId: providerId,
        },
      });

      let isNewUser = false;
      
      // 탈퇴 사용자 차단
      if (user && user.deletedAt) {
        const restoreToken = crypto.randomUUID();

        await redis.set(
          `restore_token:${restoreToken}`,
          String(user.id),
          "EX",
          60 * 5 //5분
        );

        return {
          withdrawnUser: true,
          restoreToken,
        };
      }

      //신규 사용자 생성
      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data:{
            nickname,
            phoneNum,
            email,
            profileImage,
            password: "",
            provider: "KAKAO",
            providerId,
            role: "USER",
          },
        });

        // 지정안함 폴더 생성
        await folderRepository.addFolder(user.id, {
          folderTitle: "지정안함",
          color: "#818892", 
        });

        await prisma.userAlarmSetting.create({
          data: { userId: user.id },
        });

      }
      // 토큰 생성
      const accessToken = generateAccessTokenUtil(user);
      const { refreshToken, tokenId } = generateRefreshTokenUtil(user);
      // Refresh Token Redis에 저장
      await saveRefreshTokenUtil(tokenId, user.id);

      return{
        user,
        isNewUser,
        accessToken,
        refreshToken,
      };
    } catch (error){
      console.error("ERROR:", error);
      throw new InternalServerError("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }
  }

  // 카카오 회원 탈퇴
  async withdrawKakaoUser(user){
    if(!user){
      throw new UnauthorizedError("UNAUTHORIZED","인증 정보가 없습니다.");
    }
    if (user.deletedAt) {
      throw new BadRequestError("ALREADY_WITHDRAWN","이미 탈퇴 처리된 사용자입니다.");
    }
    try{
      await prisma.user.update({
        where: {
          id: user.id
        },
        data: {
          deletedAt: new Date()
        },
      });
    }catch (error){
      console.error("WITHDRAW ERROR:", error.response?.data ?? error.message);
      throw new InternalServerError("USER_WITHDRAW_FAILED","회원 탈퇴 처리 중 오류가 발생했습니다.");
    }
  }

  // 앱 카카오 로그인
  async handleKakaoAppLogin(kakaoAccessToken) {
    let profileResponse;
    try {
      profileResponse = await axios.get("https://kapi.kakao.com/v2/user/me", {
        headers: {
          Authorization: `Bearer ${kakaoAccessToken}`,
        },
      });
    } catch (error) {
      throw new UnauthorizedError("INVALID_KAKAO_TOKEN", "유효하지 않은 카카오 토큰입니다.");
    }

    const { id, kakao_account } = profileResponse.data;
    const profileInfo = kakao_account?.profile ?? {};

    const mockProfile = {
      id: id.toString(),
      _json: {
        kakao_account: {
          ...kakao_account,
          profile: profileInfo
        }
      }
    };

    return await this.handleKakaoLogin(mockProfile);
  }
}

// 소셜 로그인 후 이용약관
export class AgreementService {
  async saveAgreement(userId, { isThirdParty, isMarketing }) {
    const now = new Date();
    
    await prisma.userAgreement.upsert({
      where: { userId },
      
      create: {
        userId,
        termsAgreedAt: now,
        thirdPartyUpdatedAt: isThirdParty ? now : null,
        isThirdParty,
        marketingUpdatedAt: isMarketing ? now : null,
        isMarketing,
        pushUpdatedAt: null,
        isPush: false,
      },
      
      update: {
        termsAgreedAt: now,
        thirdPartyUpdatedAt: isThirdParty ? now : null,
        isThirdParty,
        marketingUpdatedAt: isMarketing ? now : null,
        isMarketing,
      },
    });
  }
}

// APPLE 연동 서비스
export class AppleAuthService {
  constructor() {
    this.APPLE_JWKS_URL = "https://appleid.apple.com/auth/keys"; // Apple 공개키 URL
    this.APPLE_ISSUER = "https://appleid.apple.com"; // 토큰 발급자 확인용
    this.clientId = process.env.APPLE_CLIENT_ID; // 채택 Bundle ID
  }

  getAppleAuthUrl(state = "prod") {
    const params = new URLSearchParams({
      client_id: process.env.APPLE_CLIENT_ID,
      redirect_uri: process.env.APPLE_REDIRECT_URI,
      response_type: "code id_token",
      response_mode: "form_post",
      scope: "name email",
      state,
    });
    return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
  }

  // 토큰 검증
  async verifyAppleToken(identityToken) {
    try {
      const JWKS = createRemoteJWKSet(new URL(this.APPLE_JWKS_URL));
      const { payload } = await jwtVerify(identityToken, JWKS, {
        issuer: this.APPLE_ISSUER,
        audience: this.clientId,
      });
      return payload;

    } catch (error) {
      if (error.code === "ERR_JWT_EXPIRED") {
        throw new UnauthorizedError("APPLE_TOKEN_EXPIRED", "Apple 토큰이 만료되었습니다.");
      }
      if (
        error.code === "ERR_JWS_SIGNATURE_VERIFICATION_FAILED" ||
        error.code === "ERR_JWT_CLAIM_VALIDATION_FAILED"
      ) {
        throw new UnauthorizedError("INVALID_APPLE_TOKEN", "유효하지 않은 Apple 토큰입니다.");
      }
      throw new InternalServerError("APPLE_AUTH_FAILED", "Apple 인증 중 오류가 발생했습니다.");
    }
  }

  // Apple 로그인 처리
  async handleAppleLogin(identityToken, appleUser) {
    try {
      const payload = await this.verifyAppleToken(identityToken);

      // 토큰에서 사용자 정보를 추출함
      const sub = payload.sub; // Apple -> Provider ID
      // 이메일은 최초 로그인 시 payload에 있거나 appleUser로 전달됨
      const email = payload.email ?? appleUser?.email ?? null;
      const nickname = appleUser?.name?.firstName // 최초 로그인 시에만 이름 제공 없으면 Apple 유저 고용
        ? `${appleUser.name.firstName}${appleUser.name.lastName ?? ""}`
        : "Apple유저";

      let isNewUser = false;

      // 기존 유저인지 조회
      let user = await prisma.user.findFirst({
        where: { provider: "APPLE", providerId: sub },
      });

      // 탈퇴 사용자 처리
      if (user && user.deletedAt) {
        const restoreToken = crypto.randomUUID();
        await redis.set(
          `restore_token:${restoreToken}`, 
          String(user.id), 
          "EX", 
          60 * 5
        );
        return { withdrawnUser: true, restoreToken };
      }

      // 신규 사용자 생성
      if (!user) {
        isNewUser = true;
        user = await prisma.user.create({
          data: {
            nickname,
            email,
            phoneNum: "전화번호를 입력해 주세요.",
            password: "",
            provider: "APPLE",
            providerId: sub,
            role: "USER",
          },
        });

        await folderRepository.addFolder(user.id, {
          folderTitle: "지정안함",
          color: "#818892",
        });

        await prisma.userAlarmSetting.create({
          data: { userId: user.id },
        });
      }

      // Access Token 생성
      const accessToken = generateAccessTokenUtil(user);
      // Refresh Token 생성
      const { refreshToken, tokenId } = generateRefreshTokenUtil(user);
      // Redis에 저장
      await saveRefreshTokenUtil(tokenId, user.id);

      return { user, accessToken, refreshToken, isNewUser };
    } catch (error) {
      if (error instanceof UnauthorizedError || error instanceof BadRequestError) {
        throw error;
      }
      throw new InternalServerError("INTERNAL_SERVER_ERROR", "서버 내부 오류가 발생했습니다.");
    }
    }
    // 애플 회원 탈퇴
    async withdrawAppleUser(user) {
    if (!user) {
      throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
    }
    if (user.deletedAt) {
      throw new BadRequestError("ALREADY_WITHDRAWN", "이미 탈퇴 처리된 사용자입니다.");
    }
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { deletedAt: new Date() },
      });
    } catch (error) {
      throw new InternalServerError("USER_WITHDRAW_FAILED", "회원 탈퇴 처리 중 오류가 발생했습니다.");
    }
  }

}