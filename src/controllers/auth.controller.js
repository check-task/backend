import { AgreementService, AppleAuthService, CommonAuthService, KakaoAuthService } from "../services/auth.service.js";
import { LoginService } from "../services/login.service.js";
import { BadRequestError, UnauthorizedError } from "../errors/custom.error.js";
// import { prisma } from "../db.config.js";

export class AuthController{
    constructor(){
        this.commonAuthService = new CommonAuthService();
        this.kakaoAuthService = new KakaoAuthService();
        this.loginService = new LoginService();
        this.agreementService = new AgreementService();
        this.appleAuthService = new AppleAuthService();
    }

    // 통합 회원 탈퇴 — provider 값으로 자체/카카오 자동 분기
    async withdraw(req, res, next) {
        try {
            if (!req.user) {
                throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
            }
            const provider = req.user.provider ?? null;
            await this.commonAuthService.revokeAllUserTokens(req.user.id);
            // 추후 분기 없이 통합으로 수정 필요
            if (provider === null) {
                await this.loginService.withdrawLocalUser(req.user.id);

                const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
                res.clearCookie("refreshToken", {
                    httpOnly: true,
                    secure: isSecure,
                    sameSite: isSecure ? "none" : "lax",
                    domain: isSecure ? process.env.COOKIE_DOMAIN : undefined,
                    path: "/",
                });

                return res.status(200).json({
                    resultType: "SUCCESS",
                    message: "회원 탈퇴가 완료되었습니다.",
                });
            }

            if (provider === "KAKAO") {
              await this.kakaoAuthService.withdrawKakaoUser(req.user);
              return res.status(200).json({
                  resultType: "SUCCESS",
                  message: "카카오 회원 탈퇴가 완료되었습니다.",
              });
            }

            if (provider === "APPLE") {
              await this.appleAuthService.withdrawAppleUser(req.user);
              return res.status(200).json({
                  resultType: "SUCCESS",
                  message: "애플 회원 탈퇴가 완료되었습니다.",
              });
            }
            throw new BadRequestError("UNSUPPORTED_PROVIDER", "지원하지 않는 로그인 방식입니다.");
        } catch (error) {
            next(error);
        }
    }

    // 통합 로그아웃
    async logout(req, res, next) {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.headers.authorization?.replace("Bearer ", "");
      if (refreshToken){
        await this.commonAuthService.revokeRefreshToken(refreshToken);
      }
      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
      
      // refresh token 쿠키 삭제
      res.clearCookie("refreshToken",{
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        domain: isSecure ? process.env.COOKIE_DOMAIN : undefined,
        path: "/",
      });

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "로그아웃이 완료되었습니다."
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next){
    try{
      const refreshToken =
        req.cookies?.refreshToken ||
        req.headers.authorization?.replace("Bearer ", "");
      if(!refreshToken){throw new UnauthorizedError("UNAUTHORIZED","Refresh Token이 없습니다.");}
      
      const newAccessToken = await this.commonAuthService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        resultType: "SUCCESS",
        data: {
          accessToken: newAccessToken,
          accessTokenExpireIn: 3600,
          userId: req.user?.id,
        }
      });
    }catch (error){
      next(error);
    }
  }

  //재가입시 기존 정보 복구
  async restore(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        throw new BadRequestError("TOKEN_REQUIRED", "복구 토큰이 필요합니다.");
      }

      const { accessToken, refreshToken } =
        await this.commonAuthService.restoreUser(token);

      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";

      // refreshToken 쿠키 세팅
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        domain: isSecure ? process.env.COOKIE_DOMAIN : undefined,
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 14,
      });

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "계정이 복구되었으며 로그인되었습니다.",
        data: {
          accessToken,
          accessTokenExpireIn: 3600,
        },
      });

    } catch (error) {
      next(error);
    }
  }

  // 소셜 로그인용 이용약관
  async agreement(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
      }

      const { isTermsAgreed, isThirdParty, isMarketing = false } = req.body;

      if (!isTermsAgreed) {
        throw new BadRequestError("TERMS_REQUIRED", "필수 약관에 동의해야 합니다.");
      }

      if (!isThirdParty) {
        throw new BadRequestError("THIRD_PARTY_REQUIRED", "제3자 제공 동의는 필수입니다.");
      }

      await this.agreementService.saveAgreement(req.user.id, {
        isThirdParty,
        isMarketing,
      });
      
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "약관 동의가 완료되었습니다.",
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }

  // APPLE 연동하기
  async appleLogin(req, res, next) {
    try {
      const state = req.query.state || "prod";
      const ALLOWED_STATES = ["local", "prod"];
      if (!ALLOWED_STATES.includes(state)) {
        throw new BadRequestError("INVALID_STATE", "잘못된 state값입니다.");
      }
      const url = this.appleAuthService.getAppleAuthUrl(state);
      return res.redirect(url);
    } catch (error) {
      next(error);
    }
  }

  // APLLE 콜백 처리
  async appleCallback(req, res, next) {
    try {
      const { code, id_token, user: appleUserJson, state, error } = req.body;

      const REDIRECT_URL_MAP = { local: process.env.FRONTEND_LOCAL, prod: process.env.FRONTEND_VERCEL };
      const redirectBaseUrl = REDIRECT_URL_MAP[state] ?? REDIRECT_URL_MAP["prod"];

      if (!redirectBaseUrl) { return res.status(500).send("리다이렉트 URL이 설정되지 않았습니다."); }

      if (error || !code || !id_token) {
        return res.redirect(`${redirectBaseUrl}/login?status=failed`);
      }

      let appleUser = null;
      try {
        appleUser = appleUserJson ? JSON.parse(appleUserJson) : null;
      } catch {
        appleUser = null;
      }
      const result = await this.appleAuthService.handleAppleLogin(id_token, appleUser);

      // 탈퇴 회원 분기
      if (result.withdrawnUser) {
        return res.redirect(`${redirectBaseUrl}/login?status=withdrawn&token=${result.restoreToken}`);
      }

      const { accessToken, refreshToken, isNewUser } = result;
      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";

      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
        domain: isSecure ? process.env.COOKIE_DOMAIN : undefined,
        path: "/",
        maxAge: 1000 * 60 * 60 * 24 * 14,
      });

      return res.redirect(`${redirectBaseUrl}/auth/apple/callback?isNewUser=${isNewUser}`);
    } catch (error) {
      next(error);
    }
  }
}



