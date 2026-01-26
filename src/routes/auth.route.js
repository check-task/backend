import { Router } from "express";
import passport from "passport";
import { kakaoMiddleware } from "../middlewares/kakao.middleware.js";
import { AuthController } from "../controllers/auth.controller.js";

const router = Router();
const authController = new AuthController();

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

//카카오 회원 탈퇴
router.delete(
  "/kakao/unlink",
  passport.authenticate("jwt", { session: false }),
  authController.kakaoWithdraw.bind(authController)
);

//카카오 로그아웃
router.post(
  "/logout",
  passport.authenticate("jwt", { session: false }),
  authController.logout.bind(authController)
);


export default router;