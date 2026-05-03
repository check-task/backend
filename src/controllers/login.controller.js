import { LoginService } from "../services/login.service.js";
import { BadRequestError } from "../errors/custom.error.js";
import {
  emailQuery,
  nicknameQuery,
  sendCodeBody,
  verifyCodeBody,
  signupBody,
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
      const { email, password, nickname } = parsed.data;
      await this.loginService.signupLocalUser(email, password, nickname);
      return res.status(201).json({
        resultType: "SUCCESS",
        message: "회원가입이 완료되었습니다.",
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
}
