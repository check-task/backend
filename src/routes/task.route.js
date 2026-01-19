import express from "express";
import taskController from "../controllers/task.controller.js";

const router = express.Router();

// POST /api/v1/task -- 과제 생성
router.post("/", taskController.createTask);

// PATCH /api/v1/task/:taskId -- 과제 수정
router.patch("/:taskId", taskController.updateTask);

// DELETE /api/v1/task/:taskId -- 과제 삭제
router.delete("/:taskId", taskController.deleteTask);

// GET /api/v1/task/:taskId -- 과제 세부 사항 조회
router.get("/:taskId", taskController.getTaskDetail);

// GET /api/v1/task?sort=우선순위 -- 과제 목록 조회
router.get("/", taskController.getTasks);

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

// 세부 TASK 담당자 설정 API
router.patch(
  '/subtask/:subTaskId/assignee',
  taskController.setSubTaskAssignee
);

export default router;