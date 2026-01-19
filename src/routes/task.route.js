import express from "express";
import taskController from "../controllers/task.controller.js";
import  authenticate  from "../middlewares/authenticate.middleware.js";

const router = express.Router();

// 완료된 과제
router.get("/completed", authenticate, taskController.getCompletedTasks);

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
  authenticate,
  taskController.updateSubTaskStatus
);

// 세부task 날짜 변경 API
// 세부 TASK 마감일 변경
router.patch(
  '/subtask/:subTaskId/deadline',
  taskController.updateSubTaskDeadline
);

// 세부 TASK 담당자 설정 API
router.patch(
  '/subtask/:subTaskId/assignee',
  taskController.setSubTaskAssignee
);

export default router;