import { Router } from "express";
import passport from "passport";
import { kakaoMiddleware } from "../middlewares/kakao.middleware.js";
import { AuthController } from "../controllers/auth.controller.js";
import { BadRequestError } from "../errors/custom.error.js";

const router = Router();
const authController = new AuthController();

//카카오 로그인 요청
router.get("/kakao",
  (req, res, next) => {
    const ALLOWED_STATES = ["local", "prod"];
    const state = req.query.state || "prod";

    if (!ALLOWED_STATES.includes(state)) { throw BadRequestError("잘못된 state값을 입력했습니다.") }

    req.oauthState = state;
    next();
  }, kakaoMiddleware.start
);

router.get(
  "/kakao/callback",
  kakaoMiddleware.callback,
  (req, res) => {
    const ALLOWED_STATES = ["local", "prod"];
    const state = req.query.state ?? "prod";
    
    if (!ALLOWED_STATES.includes(state)) { throw BadRequestError("잘못된 state값을 입력했습니다.") }

    const REDIRECT_URL_MAP = {
      local: process.env.FRONTEND_LOCAL,
      prod: process.env.FRONTEND_VERCEL,
    };

    const redirectBaseUrl = REDIRECT_URL_MAP[state] || REDIRECT_URL_MAP.prod;

    if (!redirectBaseUrl) {
      return res.status(500).send("REDIRECT URL NOT CONFIGURED");
    }

    return res.redirect(`${redirectBaseUrl}/auth/kakao/callback`);

    //리다이렉트 되기 때문에 필요없지만 추후 테스트를 위해 남겨둠
    //const { user, accessToken, refreshToken, isNewUser } = req.user;
    // return res.status(200).json({
    //   resultType: "SUCCESS",
    //   message: isNewUser ? "회원 가입 성공" : "로그인 성공",
    //   data: {
    //     id: user.id,
    //     isNewUser,
    //     provider: "KAKAO",  
    //     token: {
    //       accessToken,
    //       refreshToken,
    //       accessTokenExpireIn: 3600,
    //     }
    //   }
    // });
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