import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 팀원 목록 조회 ───────────────────────────────────────────────
export const getTaskMembersSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
});

// ─── 팀원 삭제 ───────────────────────────────────────────────────
export const deleteMemberSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
});

// ─── 팀원 상세 프로필 조회 ─────────────────────────────────────────
export const getMemberProfileSchema = z.object({
  params: z.object({
    taskId: idParam,
    userId: idParam,
  }),
});