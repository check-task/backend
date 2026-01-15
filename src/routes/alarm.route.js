import express from "express";
import * as AlarmController from "../controllers/alarm.controller.js"; // 추가!

const router = express.Router();

// GET /v1/api/alarm - 알람 목록 조회
router.get("/", AlarmController.getAlarms);

export default router;
