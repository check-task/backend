import { LoginService} from "../services/login.service.js";
import { KakaoAuthService, AppleAuthService } from "../services/auth.service.js";
import { BadRequestError, UnauthorizedError } from "../errors/custom.error.js";
import {
  emailQuery,
  sendCodeBody,
  verifyCodeBody,
  signupBody,
  loginBody,
  passwordChangeBody,
  passwordVerifyBody,
  passwordResetConfirmBody,
} from "../validators/auth.schema.js";

export class LoginController {
  constructor() {
    this.loginService = new LoginService();
    this.kakaoAuthService = new KakaoAuthService();
    this.appleAuthService = new AppleAuthService();
  }

  async signup(req, res, next) {
    try {
      const parsed = signupBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError("INVALID_INPUT", parsed.error.issues[0].message);
      }
      const { email, password, nickname, phoneNum } = parsed.data;
      await this.loginService.signupLocalUser(email, password, nickname, phoneNum, req.file);
      return res.status(201).json({
        resultType: "SUCCESS",
        message: "회원가입이 완료되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }
      const { email, password } = parsed.data;
      const result = await this.loginService.loginLocalUser(email, password);

      if (result.withdrawnUser) {
        return res.status(200).json({
          resultType: "SUCCESS",
          message: "탈퇴 처리된 계정입니다. 복구 토큰을 사용해 복구할 수 있습니다.",
          data: {
            withdrawnUser: true,
            restoreToken: result.restoreToken,
          },
        });
      }

      const { user, accessToken, refreshToken } = result;
      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
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
        message: "로그인이 완료되었습니다.",
        data: {
          accessToken,
          accessTokenExpireIn: 3600,
          user: {
            id: user.id,
            email: user.email,
            nickname: user.nickname,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async withdraw(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
      }
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
    } catch (error) {
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) {
        throw new BadRequestError("TOKEN_REQUIRED", "복구 토큰이 필요합니다.");
      }

      const { accessToken, refreshToken } =
        await this.loginService.restoreLocalUser(token);

      const isSecure = process.env.NODE_ENV === "production" || process.env.NODE_ENV === "test";
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

  async checkEmail(req, res, next) {
    try {
      const parsed = emailQuery.safeParse(req.query);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_EMAIL",
          parsed.error.issues[0].message,
        );
      }
      const result = await this.loginService.checkEmailDuplicate(
        parsed.data.email,
      );
      return res.status(200).json({ resultType: "SUCCESS", data: result });
    } catch (error) {
      next(error);
    }
  }

  async sendCode(req, res, next) {
    try {
      const parsed = sendCodeBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_EMAIL",
          parsed.error.issues[0].message,
        );
      }
      await this.loginService.sendVerificationCode(parsed.data.email);
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "인증코드가 발송되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async resendCode(req, res, next) {
    try {
      const parsed = sendCodeBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_EMAIL",
          parsed.error.issues[0].message,
        );
      }
      await this.loginService.resendVerificationCode(parsed.data.email);
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "인증코드가 재발송되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyCode(req, res, next) {
    try {
      const parsed = verifyCodeBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }
      await this.loginService.verifyEmailCode(
        parsed.data.email,
        parsed.data.code,
      );
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "이메일 인증이 완료되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
      }
      const parsed = passwordChangeBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }

      await this.loginService.changePassword(
        req.user.id,
        parsed.data.currentPassword,
        parsed.data.newPassword,
      );

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
        message: "비밀번호가 변경되었습니다. 다시 로그인해 주세요.",
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyPassword(req, res, next) {
    try {
      if (!req.user) {
        throw new UnauthorizedError("UNAUTHORIZED", "인증 정보가 없습니다.");
      }
      const parsed = passwordVerifyBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }

      await this.loginService.verifyPassword(req.user.id, parsed.data.password);

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "비밀번호가 확인되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async sendPasswordResetCode(req, res, next) {
    try {
      const parsed = emailQuery.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_EMAIL",
          parsed.error.issues[0].message,
        );
      }
      await this.loginService.sendPasswordResetCode(parsed.data.email);
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "비밀번호 재설정 인증코드가 발송되었습니다.",
      });
    } catch (error) {
      next(error);
    }
  }

  async verifyPasswordResetCode(req, res, next) {
    try {
      const parsed = verifyCodeBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }
      const result = await this.loginService.verifyPasswordResetCode(
        parsed.data.email,
        parsed.data.code,
      );
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "인증이 완료되었습니다.",
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  async confirmPasswordReset(req, res, next) {
    try {
      const parsed = passwordResetConfirmBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError(
          "INVALID_INPUT",
          parsed.error.issues[0].message,
        );
      }
      await this.loginService.confirmPasswordReset(
        parsed.data.resetToken,
        parsed.data.newPassword,
      );
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "비밀번호가 재설정되었습니다. 새 비밀번호로 로그인해 주세요.",
      });
    } catch (error) {
      next(error);
    }
  }

  // 앱 자체 로그인
  async appLogin(req, res, next) {
    try {
      const parsed = loginBody.safeParse(req.body);
      if (!parsed.success) {
        throw new BadRequestError("INVALID_INPUT", passwordResetConfirmBody.error.issues[0].message);
      }

      const { email, password } = parsed.data;

      const result = await this.loginService.loginLocalUser(email, password);

      if (result.withdrawnUser) {
        return res.status(200).json({
          resultType: "SUCCESS",
          message: "탈퇴 처리된 계정입니다. 복구 토큰을 사용해 복구할 수 있습니다.",
          data: {
            withdrawnUser: true,
            restoreToken: result.restoreToken,
          },
        });
      }

      const {user, accessToken, refreshToken} = result;

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "앱 로그인이 완료되었습니다.",
        data: {
          accessToken, 
          refreshToken,
          accessTokenExpireIn: 3600,
          user: {
            id: user.id,
            email: user.email,
            mickname: user.nickname,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // 앱 카카오 로그인
  async appKakaoLogin(req, res, next) {
    try {
      const { kakaoAccessToken } = req.body;
      if (!kakaoAccessToken) {
        throw new BadRequestError("TOKEN_REQUIRED", "카카오 엑세스 토큰이 필요합니다.");
      }
      const result = await this.kakaoAuthService.handleKakaoAppLogin(kakaoAccessToken);

      if (result.withdrawnUser) {
        return res.status(200).json({
          resultType: "SUCCESS",
          message: "탈퇴 처리된 카카오 계정입니다.",
          data: { withdrawnUser: true, restoreToken: result.restoreToken },
        });
      }

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "카카오 앱 로그인이 완료되었습니다.",
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isNewUser: result.isNewUser,
          user: {
            id: result.user.id,
            email: result.user.email,
            nickname: result.user.nickname,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
  
  // 앱 애플 로그인
  async appAppleLogin(req, res, next) { 
  try {
      const { identityToken, user: appleUserJson } = req.body;

      if (typeof identityToken !== "string" || identityToken.trim() === "") {
        throw new BadRequestError("INVALID_INPUT", "Apple identityToken은 문자열이어야 합니다.");
      }

      let appleUser = null;
      if (appleUserJson !== undefined && appleUserJson !== null) {
        try {
          appleUser = typeof appleUserJson === "string" ? JSON.parse(appleUserJson) : appleUserJson;
        } catch {
          throw new BadRequestError("INVALID_INPUT", "Apple user 정보는 유효한 JSON이어야 합니다.");
        }
      }

      const result = await this.appleAuthService.handleAppleLogin(identityToken, appleUser);

      // 탈퇴 유저 분기 처리
      if (result.withdrawnUser) {
        return res.status(200).json({
          resultType: "SUCCESS",
          message: "탈퇴 처리된 애플 계정입니다.",
          data: { withdrawnUser: true, restoreToken: result.restoreToken },
        });
      }

      // 정상 로그인 성공 처리
      return res.status(200).json({
        resultType: "SUCCESS",
        message: "애플 앱 로그인이 완료되었습니다.",
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
          isNewUser: result.isNewUser,
          user: {
            id: result.user.id,
            email: result.user.email,
            nickname: result.user.nickname,
          },
        },
      });
    } catch (error) {
      console.error("🍎 애플 로그인 에러 원인:", error);
      next(error);
    }
  }
}
