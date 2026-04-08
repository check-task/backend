import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken";
import { BadRequestError, InternalServerError, UnauthorizedError } from "../errors/custom.error.js"
import crypto from "crypto";
import { redis } from "../config/redis.config.js";
import { folderRepository } from "../repositories/folder.repository.js";
import axios from "axios";

export class KakaoAuthService {
  constructor(){
    this.secret = process.env.JWT_SECRET;
  }

  //Access Token 생성
  generateAccessToken(user){
    return jwt.sign(
      {
        id: user.id,
        provider: user.provider,
        providerId: user.providerId,
      },
      this.secret,
      {
        expiresIn: "1h"
      }
    );
  }

  //Refresh Token 생성
  generateRefreshToken(user){
    const tokenId = crypto.randomUUID();

    const refreshToken= jwt.sign(
      { id: user.id, tokenId},
      this.secret,
      { expiresIn:"14d" }
    );

    return { refreshToken, tokenId};
  }
  //Redis에 저장
  async saveRefreshToken(tokenId, userId){
    const TTL = 60 * 60 * 24 * 14; //14일 설정

    await redis.set(
      `refresh_token:${tokenId}`,
      userId,
      "EX",
      TTL
    );
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

      return this.generateAccessToken(user);
    }catch(err){
      throw new BadRequestError("REFRESH_TOKEN_EXPIRED", "Refresh Token이 만료되었습니다.");
    }
  }

  //카카오 로그인 처리
  async handleKakaoLogin(profile, kakaoAccessToken){
    const kakaoAccount = profile?._json?.kakao_account ?? {};
    const profileInfo = kakaoAccount.profile ?? {};

    const nickname = profileInfo.nickname ?? "카카오유저";
    const profileImage = profileInfo.profile_image_url ?? "";
    const email = kakaoAccount.email ?? null;
    //카카오 비즈앱 최소 동의 정책으로 phone_number 미제공 시 데모데이용 임시 더미 전화번호 사용
    const phoneNum = kakaoAccount.phone_number
      ? kakaoAccount.phone_number.replace("+82 ", "0")
      : "010-0000-0000";

    const providerId = profile.id.toString();
    // console.log("카카오 프로필:", JSON.stringify(profile._json, null, 2));

    // 카카오 동의 항목 파싱 - service_terms는 별도 API 호출 필요
    let serviceTerm = [];
    try {
      const response = await axios.get("https://kapi.kakao.com/v1/user/service/terms", {
        headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      });
      serviceTerm = response.data?.allowed_service_terms ?? [];
      // console.log("service_terms 응답:", JSON.stringify(response.data, null, 2));
    } catch (error) {
      console.error("service_terms 조회 실패:", error.message);
    }

    const getAgreedAt = (tag) => {
      const term = serviceTerm.find(t => t.tag === tag);
      return term ? new Date(term.agreed_at) : null;
    };
    const termsAgreedAt = getAgreedAt("termsAgreedAt");
    const pushUpdatedAt = getAgreedAt("pushUpdatedAt");
    const thirdPartyUpdatedAt = getAgreedAt("thirdPartyUpdatedAt");
    const marketingUpdatedAt = getAgreedAt("marketingUpdatedAt");

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
          providerId,
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

        // 동의 항목 저장
        await prisma.userAgreement.upsert({
          where: { userId: user.id },
          create: {
            userId: user.id,
            termsAgreedAt: termsAgreedAt ?? new Date(),
            pushUpdatedAt,
            isPush: !!pushUpdatedAt,
            thirdPartyUpdatedAt,
            isThirdParty: !!thirdPartyUpdatedAt,
            marketingUpdatedAt,
            isMarketing: !!marketingUpdatedAt,
          },
          update: {}, // 재로그인 시 덮어쓰지 않게 설정
        });

      }
      // 토큰 생성
      const accessToken = this.generateAccessToken(user);
      const { refreshToken, tokenId } = this.generateRefreshToken(user);

      // Refresh Token Redis에 저장
      await this.saveRefreshToken(tokenId, user.id);

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
      // 카카오 연결 해제
      await axios.post(
        "https://kapi.kakao.com/v1/user/unlink",
        new URLSearchParams({ target_id_type: "user_id", target_id: user.providerId }),
        { headers: { Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}` } }
      );
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

        await prisma.$transaction(async (tx) => {
          await tx.comment.deleteMany({ where: { userId } });
          await tx.userAlarm.deleteMany({ where: { userId } });
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

  async restoreKakaoUser(restoreToken) {
    if (!restoreToken) {
      throw new BadRequestError("TOKEN_REQUIRED", "복구 토큰이 필요합니다.");
    }

    const providerId = await redis.get(`restore_token:${restoreToken}`);

    if (!providerId) {
      throw new BadRequestError("INVALID_TOKEN", "유효하지 않거나 만료된 토큰입니다.");
    }

    const user = await prisma.user.findFirst({
      where: {
        provider: "KAKAO",
        providerId,
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
    const accessToken = this.generateAccessToken(restoredUser);
    const { refreshToken, tokenId } = this.generateRefreshToken(restoredUser);

    await this.saveRefreshToken(tokenId, restoredUser.id);

    return {
      user: restoredUser,
      accessToken,
      refreshToken,
    };
  }
}

