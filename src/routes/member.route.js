import express from "express";

import { getTaskMembers } from "../controllers/member.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getTaskMembersSchema } from "../validators/member.schema.js";

const router = express.Router();

// GET /api/v1/task/:taskId/members
router.get("/:taskId/members", authenticate, validate(getTaskMembersSchema), getTaskMembers);

export default router;
