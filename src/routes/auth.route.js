import { Router } from "express";
import passport from "passport";
import { kakaoMiddleware } from "../middlewares/kakao.middleware.js";
import { AuthController } from "../controllers/auth.controller.js";
import { BadRequestError } from "../errors/custom.error.js";
import { redis } from "../config/redis.js";

const router = Router();
const authController = new AuthController();

//카카오 로그인 요청
router.get("/kakao",
  (req, res, next) => {
    const ALLOWED_STATES = ["local", "prod"];
    const state = req.query.state || "prod";
    if (!ALLOWED_STATES.includes(state)) { throw new BadRequestError("INVALID_STATE", "잘못된 state값을 입력했습니다.") }

    passport.authenticate("kakao", {
      state,
    })(req, res, next);
  }
);

router.get(
  "/kakao/callback",
  //1회성 callback 방어
  async (req, res, next) => {
    const { code, state = "prod" } = req.query;
    if(!code){throw new BadRequestError( "INVALID_KAKAO_CALLBACK", "카카오 인증 코드가 존재하지 않습니다." );}

    const ALLOWED_STATES = ["local", "prod"];
    if (!ALLOWED_STATES.includes(state)) { throw new BadRequestError("INVALID_STATE", "잘못된 state값을 입력했습니다.");}
    
    const used = await redis.get(`kakao_code:${code}`);
    if (used){throw new BadRequestError("DUPLICATED_CALLBACK","이미 처리된 카카오 콜백입니다.");}

    await redis.set(`kakao_code:${code}`, "1", "EX", 60);
    
    next();
  },
  
  //passort-kakao 인증
  kakaoMiddleware.callback,

  //성공
  (req, res) => {
    const REDIRECT_URL_MAP = {
      local: process.env.FRONTEND_LOCAL,
      prod: process.env.FRONTEND_VERCEL,
    };

    const redirectBaseUrl = REDIRECT_URL_MAP[req.query.state || "prod"];
    if (!redirectBaseUrl) { return res.status(500).send("리다이렉트 URL이 설정되지 않았습니다."); }

    const { refreshToken } = req.user;
    const isProd = process.env.NODE_ENV === "production";

    //refresh Token -> HttpOnly 쿠기로 변경
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14일로 설정
    });

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
router.post("/logout", authController.logout.bind(authController));
router.post("/refresh", authController.refresh.bind(authController));


export default router;