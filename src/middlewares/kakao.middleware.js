import passport from "../config/passport.config.js";
import dotenv from "dotenv";
dotenv.config();

export const kakaoMiddleware = {
  // 카카오 로그인 시작
  start: (req, res, next) => {
    passport.authenticate("kakao", {
      callbackURL: process.env.KAKAO_CALLBACK_URL,
    })(req, res, next);
  },

  // 카카오 콜백
  callback: passport.authenticate("kakao", {
    //Passport 세션 사용 x
    session: false,
    failureRedirect: "/login-failed",
  }),
};
