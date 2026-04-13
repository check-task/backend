import { Router } from "express";
import passport from "passport";
import { AuthController } from "../controllers/auth.controller.js";
import { BadRequestError } from "../errors/custom.error.js";
import { redis } from "../config/redis.config.js";

const router = Router();
const authController = new AuthController();

//카카오 로그인 요청
router.get("/kakao", (req, res, next) => {
  const state = req.query.state || "prod";
  const ALLOWED_STATES = ["local", "prod"];

  if (!ALLOWED_STATES.includes(state)) {
    throw new BadRequestError("INVALID_STATE", "잘못된 state값을 입력했습니다.");
  }

  passport.authenticate("kakao", {
    state: state,
  })(req, res, next);
});

router.get(
  "/kakao/callback",
  passport.authenticate("kakao", { session: false }),
  //1회성 callback 방어
  async (req, res, _next) => {
    const { code, state } = req.query;
    if (!code) {
      throw new BadRequestError("INVALID_KAKAO_CALLBACK", "카카오 인증 코드가 존재하지 않습니다.");
    }

    const ALLOWED_STATES = ["local", "prod"];
    if (!ALLOWED_STATES.includes(state)) {
      throw new BadRequestError("INVALID_STATE", "잘못된 state값을 입력했습니다.");
    }

    const used = await redis.get(`kakao_code:${code}`);
    if (used) {
      throw new BadRequestError("DUPLICATED_CALLBACK", "이미 처리된 카카오 콜백입니다.");
    }

    await redis.set(`kakao_code:${code}`, "1", "EX", 60);
    const REDIRECT_URL_MAP = {
      local: process.env.FRONTEND_LOCAL,
      prod: process.env.FRONTEND_VERCEL,
    };

    const redirectBaseUrl = REDIRECT_URL_MAP[state] ?? REDIRECT_URL_MAP["prod"];
    if (!redirectBaseUrl) {
      return res.status(500).send("리다이렉트 URL이 설정되지 않았습니다.");
    }

    if (!req.user) {
      return res.redirect(`${redirectBaseUrl}/login?status=failed`);
    }

    // 탈퇴 회원 분기
    if (req.user.withdrawnUser) {
      return res.redirect(
        `${redirectBaseUrl}/login?status=withdrawn&token=${req.user.restoreToken}`
      );
    }

    const { refreshToken } = req.user;
    const isProd = process.env.NODE_ENV === "production";

    //refresh Token -> HttpOnly 쿠키에 저장
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "none" : "lax",
      path: "/",
      maxAge: 1000 * 60 * 60 * 24 * 14, // 14일
    });

    return res.redirect(`${redirectBaseUrl}/auth/kakao/callback`);
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
//Access Token 발급
router.post("/refresh", authController.refresh.bind(authController));
//재가입시 복구
router.post("/restore", authController.restore.bind(authController));

export default router;
