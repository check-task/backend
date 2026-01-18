import express from "express";
import taskController from "../controllers/task.controller.js";

const router = express.Router();

// GET /api/v1/task -- 과제 생성
router.get("/", taskController.createTask);

// PATCH /api/v1/task/:taskId
router.patch("/:taskId", taskController.updateTask);

// DELETE /api/v1/task/:taskId
router.delete("/:taskId", taskController.deleteTask);

// 세부 TASK 완료 처리 API 
// 세부 TASK 상태 업데이트
router.patch(
  '/subtask/:subTaskId/status',
  taskController.updateSubTaskStatus
);

// 세부task 날짜 변경 API
// 세부 TASK 마감일 변경
router.patch(
  '/subtask/:subTaskId/deadline',
  taskController.updateSubTaskDeadline
);

export default router;