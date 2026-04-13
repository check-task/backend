import express from "express";

import {
  createCommentController,
  updateCommentController,
  deleteCommentController,
} from "../controllers/comment.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "../validators/comment.schema.js";

const router = express.Router();

// 댓글 생성 API
router.post(
  "/task/subtask/:subTaskId/comments",
  authenticate,
  validate(createCommentSchema),
  createCommentController
);

// 댓글 수정 API
router.patch(
  "/task/comment/:commentId",
  authenticate,
  validate(updateCommentSchema),
  updateCommentController
);

// 댓글 삭제 API
router.delete(
  "/task/comment/:commentId",
  authenticate,
  validate(deleteCommentSchema),
  deleteCommentController
);

export default router;
