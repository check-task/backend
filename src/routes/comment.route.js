import express from 'express';
import { createCommentController } from '../controllers/comment.controller.js';

const router = express.Router();

// 댓글 생성 API
router.post('/task/subtask/:subTaskId/comments', createCommentController);

// 기본 내보내기로 변경
export default router;