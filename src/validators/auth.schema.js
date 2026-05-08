import { z } from "zod";

export const emailQuery = z.object({
  email: z.string().email({ error: "유효한 이메일 형식이 아닙니다." }),
});

export const nicknameQuery = z.object({
  nickname: z.string().min(1, { error: "닉네임을 입력해 주세요." }).max(30, { error: "닉네임은 30자 이하여야 합니다." }),
});

export const sendCodeBody = z.object({
  email: z.string().email({ error: "유효한 이메일 형식이 아닙니다." }),
});

export const verifyCodeBody = z.object({
  email: z.string().email({ error: "유효한 이메일 형식이 아닙니다." }),
  code: z.string().length(6, { error: "인증코드는 6자리입니다." }),
});

export const loginBody = z.object({
  email: z.string().email({ error: "유효한 이메일 형식이 아닙니다." }),
  password: z.string().min(1, { error: "비밀번호를 입력해 주세요." }),
});

export const signupBody = z.object({
  email: z.string().email({ error: "유효한 이메일 형식이 아닙니다." }),
  password: z
    .string()
    .min(8, { error: "비밀번호는 8자 이상이어야 합니다." })
    .max(20, { error: "비밀번호는 20자 이하여야 합니다." })
    .regex(/[!@#$%^&*(),.?":{}|<>]/, { error: "비밀번호에 특수문자가 포함되어야 합니다." }),
  nickname: z.string().min(1, { error: "닉네임을 입력해 주세요." }).max(30, { error: "닉네임은 30자 이하여야 합니다." }),
});
