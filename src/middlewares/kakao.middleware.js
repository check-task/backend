import passport from "../config/kakao_passport.config";

export const isLogin = passport.authenticate("jwt", { session: false });