import { Router } from "express";
import {kakaoMiddleware} from "../middlewares/kakao.middleware.js";

const router = Router();

//카카오 로그인 요청
router.get("/kakao", kakaoMiddleware.start);

router.get(
  "/kakao/callback",
  kakaoMiddleware.callback,
  (req, res) => {
    const { user, accessToken, refreshToken, isNewUser } = req.user;

    //응답 json 
    return res.status(200).json({
      resultType: "SUCCESS",
      message: isNewUser ? "회원 가입 성공" : "로그인 성공",
      data: {
        id: user.id,
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