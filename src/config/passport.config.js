import passport from "passport";
import { kakaoStrategy } from "./auth.config.js";
import { jwtStrategy } from "./jwt.config.js";

// 카카오 로그인 전략 등록
passport.use(kakaoStrategy);

// JWT 인증 전략 등록
passport.use(jwtStrategy);

export default passport;
