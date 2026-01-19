import express from "express";
import taskController from "../controllers/task.controller.js";
import authenticate from '../middlewares/authenticate.middleware.js';

const router = express.Router();

// POST /api/v1/task -- 과제 생성
router.post("/", authenticate, taskController.createTask);

// PATCH /api/v1/task/:taskId -- 과제 수정
router.patch("/:taskId", authenticate, taskController.updateTask);

// DELETE /api/v1/task/:taskId -- 과제 삭제
router.delete("/:taskId", authenticate, taskController.deleteTask);

// GET /api/v1/task/:taskId -- 과제 세부 사항 조회
router.get("/:taskId", authenticate, taskController.getTaskDetail);

// GET /api/v1/task?sort=우선순위 -- 과제 목록 조회
router.get("/", authenticate, taskController.getTasks);

// PATCH /api/v1/task/:taskId/member/:memberId -- 팀원 정보 수정
router.patch("/:taskId/member/:memberId", authenticate, taskController.updateTeamMember);

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
  authenticate,
  taskController.updateSubTaskDeadline
);

// 세부 TASK 담당자 설정 API
router.patch(
  '/subtask/:subTaskId/assignee',
  authenticate,
  taskController.setSubTaskAssignee
);

// 초대 링크 생성 API
router.post(
  '/:taskId/invitation',
  authenticate,
  taskController.generateInviteCode
);

export default router;