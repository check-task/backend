import { Router } from "express";
import passport from "passport";
import { kakaoMiddleware } from "../middlewares/kakao.middleware.js";
import { AuthController } from "../controllers/auth.controller.js";
import { BadRequestError } from "../errors/custom.error.js";
import session from "express-session";

const router = Router();
const authController = new AuthController();

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 5 * 60 * 1000 }, // 5분
  })
);

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

    const crypto = require("crypto");
    const tempCode = crypto.randomBytes(32).toString("hex");

    // 세션에 토큰 저장 (5분)
    if (!req.session.codes) req.session.codes = {};
    const { user, accessToken, refreshToken, isNewUser } = req.user;
    req.session.codes[tempCode] = { userId: user.id, accessToken, refreshToken, isNewUser };

    return res.redirect(`${redirectBaseUrl}?code=${tempCode}`);

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

// 토큰 교환
router.get("/auth/token", (req, res) => {
  const code = req.query.code;
  if (!code || !req.session.codes || !req.session.codes[code])
    return res.status(400).json({ message: "Invalid or expired code" });

  const tokenData = req.session.codes[code];
  delete req.session.codes[code]; // 1회용 코드
  res.json({ resultType: "SUCCESS", data: tokenData });
});

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