import { LoginService } from "../services/login.service.js";
import { BadRequestError, UnauthorizedError } from "../errors/custom.error.js";
import {
  emailQuery,
  sendCodeBody,
  verifyCodeBody,
  signupBody,
  loginBody,
  passwordChangeBody,
  passwordResetConfirmBody,
} from "../validators/auth.schema.js";

export class LoginController {
  constructor() {
    this.loginService = new LoginService();
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
      const isProd = process.env.NODE_ENV === "production";
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
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

      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
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

      const isProd = process.env.NODE_ENV === "production";
      res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
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

      const isProd = process.env.NODE_ENV === "production";
      res.clearCookie("refreshToken", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
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
}
