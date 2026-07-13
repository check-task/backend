import { AgreementService, KakaoAuthService } from "../services/auth.service.js";
import { LoginService } from "../services/login.service.js";
import { BadRequestError, UnauthorizedError } from "../errors/custom.error.js";
// import { prisma } from "../db.config.js";

export class AuthController{
    constructor(){
        this.kakaoAuthService = new KakaoAuthService();
        this.loginService = new LoginService();
        this.agreementService = new AgreementService()
    }

    // 통합 회원 탈퇴 — provider 값으로 자체/카카오 자동 분기
    async withdraw(req, res, next) {
        try {
            if (!req.user) {
                throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
            }

            const provider = req.user.provider ?? null;

            if (provider === null) {
                await this.loginService.withdrawLocalUser(req.user.id);

                const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
                res.clearCookie("refreshToken", {
                    httpOnly: true,
                    secure: isSecure,
                    sameSite: isSecure ? "none" : "lax",
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

            throw new BadRequestError("UNSUPPORTED_PROVIDER", "지원하지 않는 로그인 방식입니다.");
        } catch (error) {
            next(error);
        }
    }

    // @deprecated — /api/v1/auth/withdraw 사용 권장
    async kakaoWithdraw(req, res, next){
        try{
            if(!req.user){
                throw new UnauthorizedError("UNAUTHORIZED","인증 정보가 없습니다");
            }
            
            await this.kakaoAuthService.withdrawKakaoUser(req.user);

            return res.status(200).json({
                resultType: "SUCCESS",
                message: "카카오 회원 탈퇴가 완료되었습니다."
            });
        }catch (error){
            next(error);
        }
    }

    //카카오 로그아웃
    async logout(req, res, next) {
    try {
      const refreshToken =
        req.cookies?.refreshToken ||
        req.headers.authorization?.replace("Bearer ", "");
      if (refreshToken){
        await this.kakaoAuthService.revokeRefreshToken(refreshToken);
      }
      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
      
      //refresh token 쿠키 삭제
      res.clearCookie("refreshToken",{
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
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
      
      const newAccessToken = await this.kakaoAuthService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        resultType: "SUCCESS",
        data: {
          accessToken: newAccessToken,
          accessTokenExpireIn: 3600,
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
        await this.kakaoAuthService.restoreKakaoUser(token);

      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";

      // refreshToken 쿠키 세팅
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? "none" : "lax",
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

  async agreement(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
      }

      const { isTermsAgreed, isThirdParty = false, isMarketing = false } = req.body;

      if (!isTermsAgreed) {
        throw new BadRequestError("TERMS_REQUIRED", "필수 약관에 동의해야 합니다.");
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
}



