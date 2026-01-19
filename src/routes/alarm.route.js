import express from "express";
import {
  handleAlarmDelete,
  handleAlarmDeleteAll,
  handleAlarmList,
} from "../controllers/alarm.controller.js";

const router = express.Router();

// GET /v1/api/alarm - 알람 목록 조회
router.get("/", handleAlarmList);

// DELETE /v1/api/alarm/:alarmId - 개별 알림 삭제
router.delete("/:alarmId", handleAlarmDelete);
// DELETE /v1/api/alarm - 전체 알림 삭제 (모든 알림)
router.delete("/", handleAlarmDeleteAll);

export default router;
