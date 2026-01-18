import express from "express";
import taskController from "../controllers/task.controller.js";

const router = express.Router();

// GET /api/v1/task -- 과제 생성
router.get("/", taskController.createTask);

// PATCH /api/v1/task/:taskId
router.patch("/:taskId", taskController.updateTask);

// DELETE /api/v1/task/:taskId
router.delete("/:taskId", taskController.deleteTask);

export default router;
