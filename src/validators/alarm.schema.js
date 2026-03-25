import { z } from "zod";
import { idParam } from "./common.schema.js";

// ─── 알람 목록 조회 (query) ───────────────────────────────────────
export const getAlarmListSchema = z.object({
  query: z.object({
    cursor: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().optional(),
    orderBy: z.string().optional(),
    order: z.enum(["asc", "desc"]).optional(),
  }),
});

// ─── 개별 알림 삭제 / 읽음 처리 ──────────────────────────────────
export const alarmIdParamSchema = z.object({
  params: z.object({
    alarmId: idParam,
  }),
});

// ─── 최종 마감 알림 설정 변경 ─────────────────────────────────────
export const updateDeadlineAlarmSchema = z.object({
  body: z.object({
    deadlineAlarm: z.coerce
      .number({ error: () => "deadlineAlarm은 숫자여야 합니다." })
      .int("deadlineAlarm은 정수여야 합니다."),
  }),
});

// ─── Task 마감 알림 설정 변경 ─────────────────────────────────────
export const updateTaskAlarmSchema = z.object({
  body: z.object({
    taskAlarm: z.coerce
      .number({ error: () => "taskAlarm은 숫자여야 합니다." })
      .int("taskAlarm은 정수여야 합니다."),
  }),
});

// ─── 알림 읽음 처리 (단건) ───────────────────────────────────────
export const updateAlarmReadStatusSchema = z.object({
  params: z.object({
    alarmId: idParam,
  }),
  body: z.object({
    isRead: z.boolean({ error: () => "isRead는 Boolean 형식이어야 합니다." }),
  }),
});

// ─── 과제 알림 여부 설정 ──────────────────────────────────────────
export const updateTaskAlarmStatusSchema = z.object({
  params: z.object({
    taskId: idParam,
  }),
  body: z.object({
    isAlarm: z.boolean({ error: () => "isAlarm은 Boolean 형식이어야 합니다." }),
  }),
});

// ─── 세부과제 알림 여부 설정 ──────────────────────────────────────
export const updateSubtaskAlarmStatusSchema = z.object({
  params: z.object({
    subtaskId: idParam,
  }),
  body: z.object({
    isAlarm: z.boolean({ error: () => "isAlarm은 Boolean 형식이어야 합니다." }),
  }),
});
