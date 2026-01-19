import express from "express";
import {
  handleAlarmDelete,
  handleAlarmDeleteAll,
  handleAlarmList,
  handleAlarmUpdateDeadline,
  handleAlarmUpdateTask,
} from "../controllers/alarm.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = express.Router();

// GET /v1/api/alarm - 알람 목록 조회
router.get("/", authenticate, handleAlarmList);

// DELETE /v1/api/alarm/:alarmId - 개별 알림 삭제
router.delete("/:alarmId", authenticate, handleAlarmDelete);
// DELETE /v1/api/alarm - 전체 알림 삭제 (모든 알림)
router.delete("/", authenticate, handleAlarmDeleteAll);

// PATCH /v1/api/alarm/deadline - 최종 마감 알림 수정
router.patch("/deadline", authenticate, handleAlarmUpdateDeadline);

// PATCH /v1/api/alarm/task - 과제 마감 알림 수정
router.patch("/task", authenticate, handleAlarmUpdateTask);

export default router;
