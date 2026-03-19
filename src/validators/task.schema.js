import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 공통 body 조각 ──────────────────────────────────────────────
const subTaskSchema = z.object({
  title: z.string().trim().min(1, "세부 과제 제목은 필수입니다."),
  endDate: z.string().optional(),
  status: z.enum(["PENDING", "COMPLETED"]).optional(),
});

// multipart/form-data 로 올 때 JSON 문자열 → 배열 자동 변환
const jsonArray = (inner) =>
  z.preprocess((v) => {
    if (typeof v === "string") {
      try {
        return JSON.parse(v);
      } catch {
        return v;
      }
    }
    return v;
  }, inner);

// ─── 과제 생성 ────────────────────────────────────────────────────
export const createTaskSchema = z.object({
  body: z.object({
    title: z.string().trim().min(1, "제목은 필수입니다."),
    folderId: z.coerce.number().int().positive("folderId는 양수입니다."),
    deadline: z.string().optional(),
    type: z.enum(["TEAM", "PERSONAL"]).default("PERSONAL"),
    subTasks: z.array(subTaskSchema).optional().default([]),
  }),
});

// ─── 마감일 변경 ──────────────────────────────────────────────────
export const updateTaskDeadlineSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    deadline: z.string({ required_error: "마감일은 필수입니다." }).min(1),
  }),
});

// ─── 세부 Task 상태 변경 ──────────────────────────────────────────
export const updateSubTaskStatusSchema = z.object({
  params: z.object({
    subTaskId: idParam,
  }),
  body: z.object({
    status: z.enum(["PENDING", "COMPLETED"], {
      errorMap: () => ({
        message: "status는 PENDING 또는 COMPLETED여야 합니다.",
      }),
    }),
  }),
});

// ─── 팀 참여 (초대코드) ───────────────────────────────────────────
export const joinTaskSchema = z.object({
  body: z.object({
    inviteCode: z.string().trim().min(1, "초대 코드는 필수입니다."),
  }),
});

// ─── 과제 수정 (multipart/form-data) ─────────────────────────────
export const updateTaskSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z
    .object({
      title: z.string().trim().optional(),
      folderId: z.coerce.number().int().positive().optional(),
      deadline: z.string().optional(),
      type: z.enum(["TEAM", "PERSONAL", "팀"]).optional(),
      subTasks: jsonArray(z.array(subTaskSchema)).optional(),
    })
    .optional(),
});
