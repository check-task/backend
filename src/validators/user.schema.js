import { z } from "zod";

// ─── 프로필 수정 (multipart/form-data) ───────────────────────────
export const updateProfileSchema = z.object({
  body: z
    .object({
      nickname: z.string().trim().min(1).optional(),
      phoneNum: z.string().trim().optional(),
      email: z.string().trim().email("올바른 이메일 형식이 아닙니다.").optional(),
      deadlineAlarm: z.coerce.number().int().optional(),
      taskAlarm: z.coerce.number().int().optional(),
    })
    .optional(),
});
