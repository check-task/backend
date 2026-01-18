import express from "express";
import userRouter from "./user.route.js";
import alarmRouter from "./alarm.route.js";
import commentRouter from "./comment.route.js"; 

const router = express.Router();

// 각 도메인별 라우터 등록
router.use("/user", userRouter);
router.use("/alarm", alarmRouter);
router.use(commentRouter);

// health check용 기본 라우트
router.get("/health", (req, res) => {
  return res.success({ status: "OK" }, "서버가 정상 작동중입니다");
});

export default router;