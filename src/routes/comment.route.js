import express from 'express';
import { 
  createCommentController, 
  updateCommentController, 
  deleteCommentController 
} from '../controllers/comment.controller.js';
import authenticate from '../middlewares/authenticate.middleware.js';

const router = express.Router();

// 댓글 생성 API
router.post('/task/subtask/:subTaskId/comments', authenticate, createCommentController);

// 댓글 수정 API
router.patch('/task/comment/:commentId', authenticate, updateCommentController);

// 댓글 삭제 API
router.delete('/task/comment/:commentId', authenticate, deleteCommentController);

// 기본 내보내기로 변경
export default router;