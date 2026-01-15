import express from "express";
import { handleAlarmList } from "../controllers/alarm.controller.js";

const router = express.Router();

// GET /v1/api/alarm - 알람 목록 조회
router.get("/", handleAlarmList);

export default router;
