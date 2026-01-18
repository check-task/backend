import dotenv from "dotenv";
import { Strategy as KakaoStrategy } from "passport-kakao";
import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken"; //jwt 토큰 생성

dotenv.config();
const secret = process.env.JWT_SECRET;

//Access Token 생성-> 로그인 성공 시 Access Token 발급 및 API 요청 시 인증용 토큰
export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user.id,
      provider: user.provider,
      providerId: user.providerId,
    },
    secret,
    { expiresIn: "1h" }
  );
};

//Refresh Token 생성-> Access Token 만료 시 재발급용 토큰 
export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    secret,
    { expiresIn: "14d" }
  );
};

//Kakao 사용자 DB 처리
const kakaoVerify = async (profile) => {
  //카카오에서 넘어오는 사용자 정보 파싱
  const kakaoAccount = profile._json.kakao_account || {};
  const profileInfo = kakaoAccount.profile || {};
  
  //사용자 정보 정리 -> 닉내임이 없다면 "카카오유저", 전화번호는 +82 -> 010형식으로 변환
  const nickname = profileInfo.nickname || "카카오유저";
  const profileImage = profileInfo.profile_image_url || "";
  const email = kakaoAccount.email || null;
  const phoneNum = kakaoAccount.phone_number
  ? kakaoAccount.phone_number.replace("+82 ", "0")
  : "01000000000";
  
  const providerId = profile.id.toString();
  // 기존 사용자를 조회
  let user = await prisma.user.findFirst({
    where: {
      provider: "KAKAO",
      providerId: providerId,
    },
  });

  // 없으면 회원가입
  if (!user) {
    user = await prisma.user.create({
      data: {
        nickname,
        phoneNum: phoneNum,
        email,
        profileImage: profileImage,
        password: "", // 소셜 로그인은 비밀번호 없음
        provider: "KAKAO",
        providerId: providerId,
      },
    });

    return { user, isNewUser: true };
  }

  return { user, isNewUser: false };
};

//Kakao Strategy -> passport에 전략 등록함
export const kakaoStrategy = new KakaoStrategy(
  {
    //카카오 앱 설정값
    clientID: process.env.PASSPORT_KAKAO_CLIENT_ID,
    clientSecret: process.env.PASSPORT_KAKAO_CLIENT_SECRET, // 선택
    callbackURL: process.env.KAKAO_CALLBACK_URL,
  },
  //로그인 성공 후 실행되는 함수
  async (accessToken, refreshToken, profile, cb) => {
    try {
      const { user, isNewUser } = await kakaoVerify(profile);

      const jwtAccessToken = generateAccessToken(user);
      const jwtRefreshToken = generateRefreshToken(user);

      return cb(null, {
        user,
        accessToken: jwtAccessToken,
        refreshToken: jwtRefreshToken,
        isNewUser,
      });
    } catch (err) {
      return cb(err);
    }
  }
);
