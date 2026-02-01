import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken";
import { BadRequestError, InternalServerError } from "../errors/custom.error.js"
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
    return jwt.sign(
      {
        id: user.id,
      },
      this.secret,
      {
        expiresIn:"14d"
      }
    );
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

      return{
        user,
        isNewUser,
        accessToken: this.generateAccessToken(user),
        refreshToken: this.generateRefreshToken(user),
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

  //카카오 로그아웃(아직 미정)
  async logoutKakaoUser(kakaoAccessToken){
    if(!kakaoAccessToken){
      throw new BadRequestError("KAKAO_ACCESS_TOKEN_REQUIRED", "카카오 로그인을 위한 토큰이 필요합니다.");
    }
    try{
      await axios.post(
        "https://kapi.kakao.com/v1/user/logout",
        {},
        {
          headers: {
            Authorization: `Bearer ${kakaoAccessToken}`,
          }
        }
      );
    }catch (error){
      throw new InternalServerError("KAKAO_LOGOUT_FAILED","카카오 로그아웃 처리 중 오류가 발생했습니다.");
    }
  }
}