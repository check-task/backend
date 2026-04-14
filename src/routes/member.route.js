import express from "express";

import { getTaskMembers, deleteMember } from "../controllers/member.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getTaskMembersSchema, deleteMemberSchema } from "../validators/member.schema.js";


const router = express.Router();

// GET /api/v1/task/:taskId/members
router.get("/:taskId/members", authenticate, validate(getTaskMembersSchema), getTaskMembers);

// DELETE /api/v1/task/:taskId/members
router.delete("/:taskId/members", authenticate, validate(deleteMemberSchema), deleteMember);

export default router;
