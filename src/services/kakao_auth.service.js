import { prisma } from "../db.config.js";
import jwt from "jsonwebtoken";

const secret = process.env.JWT_SECRET;

//Access Token 생성-> 로그인 성공 시 Access Token 발급 및 API 요청 시 인증용 토큰
const generateAccessToken = (user) => {
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
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    secret,
    { expiresIn: "14d" }
  );
};

//Kakao 사용자 DB 처리
export const handleKakaoLogin = async (profile) => {
  const kakaoAccount = profile._json.kakao_account || {};
  const profileInfo = kakaoAccount.profile || {};

  const nickname = profileInfo.nickname || "카카오유저";
  const profileImage = profileInfo.profile_image_url || "";
  const email = kakaoAccount.email || null;
  const phoneNum = kakaoAccount.phone_number
    ? kakaoAccount.phone_number.replace("+82 ", "0")
    : "01000000000";

  const providerId = profile.id.toString();

  let user = await prisma.user.findFirst({
    where: { provider: "KAKAO", providerId },
  });

  let isNewUser = false;

  if (!user) {
    isNewUser = true;
    user = await prisma.user.create({
      data: {
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

  return {
    user,
    isNewUser,
    accessToken: generateAccessToken(user),
    refreshToken: generateRefreshToken(user),
  };
};