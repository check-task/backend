import { prisma } from "../db.config.js";
import { redis } from "../config/redis.config.js";
import { transporter } from "../config/email.config.js";
import { folderRepository } from "../repositories/folder.repository.js";
import bcrypt from "bcrypt";
import {
  BadRequestError,
  InternalServerError,
} from "../errors/custom.error.js";

export class LoginService {
  async checkEmailDuplicate(email) {
    const user = await prisma.user.findUnique({ where: { email } });
    return { isDuplicate: !!user };
  }

  async sendVerificationCode(email) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new BadRequestError("EMAIL_DUPLICATE", "이미 가입된 이메일입니다.");
    }

    const existing = await redis.get(`email_code:${email}`);
    if (existing) {
      throw new BadRequestError(
        "CODE_ALREADY_SENT",
        "이미 발송된 인증코드가 있습니다. 만료 후 다시 시도해 주세요.",
      );
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));

    await redis.set(`email_code:${email}`, code, "EX", 60 * 2);

    try {
      await transporter.sendMail({
        from: `"Check-Task" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: "[Check-Task] 이메일 인증코드",
        html: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
            <h2>이메일 인증</h2>
            <p>아래 인증코드를 입력해 주세요. 유효 시간은 <strong>2분</strong>입니다.</p>
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f5f5f5; border-radius: 8px;">
              ${code}
            </div>
          </div>
        `,
      });
    } catch (error) {
      await redis.del(`email_code:${email}`);
      throw new InternalServerError(
        "EMAIL_SEND_FAILED",
        "이메일 발송에 실패했습니다.",
      );
    }
  }

  async resendVerificationCode(email) {
    const cooldown = await redis.get(`email_resend_cooldown:${email}`);
    if (cooldown) {
      throw new BadRequestError(
        "RESEND_TOO_SOON",
        "1분 후에 재발송할 수 있습니다.",
      );
    }

    await redis.del(`email_code:${email}`);
    await this.sendVerificationCode(email);
    await redis.set(`email_resend_cooldown:${email}`, "1", "EX", 60 * 2);
  }

  async signupLocalUser(email, password, nickname) {
    const verified = await redis.get(`email_verified:${email}`);
    if (!verified) {
      throw new BadRequestError(
        "EMAIL_NOT_VERIFIED",
        "이메일 인증이 필요합니다.",
      );
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new BadRequestError(
        "EMAIL_DUPLICATE",
        "이미 사용 중인 이메일입니다.",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          nickname,
          phoneNum: "",
          role: "USER",
        },
      });

      await folderRepository.addFolder(user.id, {
        folderTitle: "지정안함",
        color: "#818892",
      });

      await prisma.userAlarmSetting.create({
        data: { userId: user.id },
      });

      await prisma.userAgreement.create({
        data: {
          userId: user.id,
          termsAgreedAt: new Date(),
          isPush: true,
          pushUpdatedAt: new Date(),
          isThirdParty: true,
          thirdPartyUpdatedAt: new Date(),
          isMarketing: true,
          marketingUpdatedAt: new Date(),
        },
      });

      await redis.del(`email_verified:${email}`);

      return user;
    } catch (error) {
      throw new InternalServerError(
        "SIGNUP_FAILED",
        "회원가입 처리 중 오류가 발생했습니다.",
      );
    }
  }

  async verifyEmailCode(email, code) {
    const stored = await redis.get(`email_code:${email}`);

    if (!stored) {
      throw new BadRequestError(
        "CODE_EXPIRED",
        "인증코드가 만료되었습니다. 다시 발송해 주세요.",
      );
    }
    if (stored !== code) {
      throw new BadRequestError(
        "INVALID_CODE",
        "인증코드가 올바르지 않습니다.",
      );
    }

    await redis.set(`email_verified:${email}`, "1", "EX", 60 * 10);
    await redis.del(`email_code:${email}`);
  }
}
