import dotenv from "dotenv";
import { Strategy as KakaoStrategy } from "passport-kakao";
import { handleKakaoLogin } from "../services/kakao_auth.service.js";

dotenv.config();

//Kakao Strategy -> passport에 전략 등록함
export const kakaoStrategy = new KakaoStrategy(
  {
    //카카오 설정값
    clientID: process.env.PASSPORT_KAKAO_CLIENT_ID,
    clientSecret: process.env.PASSPORT_KAKAO_CLIENT_SECRET,
    callbackURL: process.env.KAKAO_CALLBACK_URL,
  },
  //로그인 성공 후 실행되는 함수
  async (accessToken, refreshToken, profile, done) => {
    try{
      const result = await handleKakaoLogin(profile);
      return done(null, result);
    }catch(err){
      return done(err);
    }
  }
);
