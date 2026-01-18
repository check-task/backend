import { Router } from "express";
import passport from "../config/kakao_passport.config.js";

const router = Router();

//카카오 로그인 요청
router.get("/kakao",
  passport.authenticate("kakao", { session: false })
);

router.get(
  "/kakao/callback",
  passport.authenticate("kakao", {
    session: false,
    failureRedirect: "/login-failed",
  }),
  (req, res) => {
    const { user, accessToken, refreshToken, isNewUser } = req.user;

    //응답 json 
    return res.status(200).json({
      resultType: "SUCCESS",
      message: isNewUser ? "회원 가입 성공" : "로그인 성공",
      data: {
        user_id: user.user_id,
        isNewUser,
        provider: "KAKAO",  
        token: {
          accessToken,
          refreshToken,
          accessTokenExpireIn: 3600,
        }
      }
    });
  }
);

export default router;