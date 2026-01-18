import passport from "../config/kakao_passport.config.js";

export const kakaoMiddleware = {
  start: passport.authenticate("kakao", { session: false }),

  callback: (req, res, next) => {
    passport.authenticate("kakao", { session: false }, (err, user) => {
      if (err) return next(err);

      if (!user) {
        const error = new Error("카카오 로그인에 실패했습니다");
        error.statusCode = 401;
        error.errorCode = "KAKAO_LOGIN_FAILED";
        return next(error);
      }

      req.user = user;
      next();
    })(req, res, next);
  },
};
