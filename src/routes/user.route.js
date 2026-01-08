import express from "express";
// import { UserController } from "../controllers/user.controller.js";

const router = express.Router();

// GET /api/users
router.get("/", (req, res, next) => {
  // UserController.getUsers(req, res, next);
  return res.success({ users: [] }, "사용자 목록 조회");
});

// GET /api/users/:id
router.get("/:id", (req, res, next) => {
  // UserController.getUserById(req, res, next);
  return res.success({ user: {} }, "사용자 조회");
});

// POST /api/users
router.post("/", (req, res, next) => {
  // UserController.createUser(req, res, next);
  return res.success({ user: {} }, "사용자 생성");
});

export default router;
