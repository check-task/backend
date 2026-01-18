import express from 'express';
import { taskController } from '../controllers/task.controller.js';

const router = express.Router();

// 세부 TASK 상태 업데이트
router.patch(
  '/subtask/:subTaskId/status',
  taskController.updateSubTaskStatus
);

export default router;