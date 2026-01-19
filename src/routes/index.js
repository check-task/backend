import express from "express";
import userRouter from "./user.route.js";
import alarmRouter from "./alarm.route.js";
import commentRouter from "./comment.route.js";
import taskRouter from "./task.route.js";
import modalRouter from "./modal.route.js";
import folderRouter from "./folder.route.js";
import kakaoAuthRouter from "./kakao_auth.route.js"
const router = express.Router();

//kakao
router.use("/auth",kakaoAuthRouter)

// 각 도메인별 라우터 등록
router.use("/user/folder", folderRouter);
router.use("/user", userRouter);
router.use("/alarm", alarmRouter);
router.use(commentRouter);
router.use("/task", taskRouter);
router.use("/reference", modalRouter);

// health check용 기본 라우트
router.get("/health", (req, res) => {
  return res.success({ status: "OK" }, "서버가 정상 작동중입니다");
});

export default router;
