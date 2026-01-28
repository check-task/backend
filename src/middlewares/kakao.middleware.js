import passport from "../config/passport.config.js";

export const kakaoMiddleware = {
  // 카카오 로그인 시작
  start: passport.authenticate("kakao", {
    session: false,
    callbackURL: process.env.KAKAO_CALLBACK_URL
  }),

  // 카카오 콜백
  callback: passport.authenticate("kakao", {
    session: false,
    failureRedirect: "/login-failed",
  }),
};
