import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import dotenv from "dotenv";
import { prisma } from "../db.config.js";

dotenv.config();

const jwtOptions = {
  //표준 Bearer 토큰 방식
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  //검증
  secretOrKey: process.env.JWT_SECRET,
};

//jwt 인증 핵심 로직
export const jwtStrategy = new JwtStrategy(
  jwtOptions,
  async (payload, done) => {
    try {
      const user = await prisma.user.findFirst({
        where: {
          provider: payload.provider,       // "kakao"
          providerId: payload.providerId, // 카카오 profile.id  
        },
      });

      //수정 전
      if (!user) return done(null, false);
      // if (!user || user.deletedAt) {
      //   return done(null, false);
      // }

      return done(null, user);
    } catch (err) {
      return done(err, false);
    }
  }
);
