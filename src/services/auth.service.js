import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken";
import { BadRequestError, InternalServerError } from "../errors/custom.error.js"
import axios from "axios";
import crypto from "crypto";
import { redis } from "../config/redis.js";

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
    const phoneNum = kakaoAccount.phone_number
      ? kakaoAccount.phone_number.replace("+82 ", "0")
      : "01000000000";

    const providerId = profile.id.toString();

    try {
      //기존 사용자 조회
      let user = await prisma.user.findFirst({
        where:{
          provider: "KAKAO",
          providerId,
        },
      });
      
      let isNewUser = false;

      //탈퇴 사용자면 자동 복구
      if(user && user.deletedAt){
        user = await prisma.user.update({
          where: {
            id: user.id
          },
          data: {
            deletedAt: null,
          },
        });
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
          },
        });
      }
      //토근 생성
      const accessToken = this.generateAccessToken(user);
      const { refreshToken, tokenId } = this.generateRefreshToken(user);
      
      //Refresh Token Redis에 저장
      await this.saveRefreshToken(tokenId, user.id);

      // 추후 삭제

      console.log("==========================================");
      console.log("✅ 로그인 성공! 발급된 토큰 정보:");
      console.log("👉 Access Token:", accessToken);
      console.log("👉 Refresh Token:", refreshToken);
      console.log("👤 로그인 유저 ID:", user.id);
      console.log("==========================================");
      //

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

  //카카오 회원 탈퇴
  async withdrawKakaoUser(user){
    if(!user){
      throw new BadRequestError("INVALID_USER","유효하지 않은 사용자입니다.");
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
      throw new InternalServerError("USER_WITHDRAW_FAILED","회원 탈퇴 처리 중 오류가 발생했습니다.");
    }
  }

  //로그아웃 시 Refresh Token 폐기
  async revokeRefreshToken(refreshToken) {
    try {
      const payload = jwt.verify(refreshToken, this.secret);
      const { tokenId } = payload;

      await redis.del(`refresh_token:${tokenId}`);
    } catch (err) {
      // 이미 만료된 경우도 로그아웃은 성공 처리
    }
  }
}