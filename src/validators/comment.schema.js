import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 댓글 생성 ────────────────────────────────────────────────────
export const createCommentSchema = z.object({
  params: z.object({
    subTaskId: idParam,
  }),
  body: z.object({
    content: z.string().trim().min(1, "댓글 내용을 입력해주세요."),
  }),
});

// ─── 댓글 수정 ────────────────────────────────────────────────────
export const updateCommentSchema = z.object({
  params: z.object({
    commentId: idParam,
  }),
  body: z.object({
    content: z.string().trim().min(1, "댓글 내용을 입력해주세요."),
  }),
});

// ─── 댓글 삭제 ────────────────────────────────────────────────────
export const deleteCommentSchema = z.object({
  params: z.object({
    commentId: idParam,
  }),
});
