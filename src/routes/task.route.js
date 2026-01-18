import express from 'express';
import { taskController } from '../controllers/task.controller.js';

const router = express.Router();

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