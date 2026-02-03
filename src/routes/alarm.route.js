import express from "express";
import alarmController from "../controllers/alarm.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = express.Router();

// GET /api/v1/alarm - 알람 목록 조회
router.get("/", authenticate, alarmController.handleAlarmList);

// DELETE /api/v1/alarm/:alarmId - 개별 알림 삭제
router.delete("/:alarmId", authenticate, alarmController.handleAlarmDelete);

// DELETE /api/v1/alarm - 전체 알림 삭제 (모든 알림)
router.delete("/", authenticate, alarmController.handleAlarmDeleteAll);

// PATCH /api/v1/alarm/settings/deadline - 최종 마감 알림 수정
router.patch("/settings/deadline", authenticate, alarmController.handleAlarmUpdateDeadline);

// PATCH /api/v1/alarm/settings/task - 과제 마감 알림 수정
router.patch("/settings/task", authenticate, alarmController.handleAlarmUpdateTask);

// PATCH /api/v1/alarm/subtask/:subTaskId - 세부과제 알림 여부 수정
router.patch(
  "/subtask/:subtaskId",
  authenticate,
  alarmController.handleAlarmUpdateSubtaskStatus
);

// PATCH /api/v1/alarm/task/:taskId - 과제 알림 여부 수정
router.patch("/task/:taskId", authenticate, alarmController.handleAlarmUpdateTaskStatus);

// PATCH /api/v1/alarm/:alarmId - 알림 읽음 처리
router.patch("/:alarmId", authenticate, alarmController.handleAlarmUpdateAlarmReadStatus);

// PATCH /api/v1/alarm - 모든 알림 읽음 처리
router.patch("/", authenticate, alarmController.handleAlarmUpdateAllAlarmReadStatus);

// GET /api/v1/alarm/unread-count - 안읽은 알림 개수 확인
router.get("/unread-count", authenticate, alarmController.handleUnreadAlarmCount);

export default router;
