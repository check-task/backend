import express from "express";

import { getTaskMembers, deleteMember, getMemberProfile } from "../controllers/member.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { getTaskMembersSchema, deleteMemberSchema, getMemberProfileSchema } from "../validators/member.schema.js";


const router = express.Router();

// GET /api/v1/task/:taskId/members
router.get("/:taskId/members", authenticate, validate(getTaskMembersSchema), getTaskMembers);

// DELETE /api/v1/task/:taskId
router.delete("/:taskId", authenticate, validate(deleteMemberSchema), deleteMember);

// GET /api/v1/task/:taskId/members/:userId
router.get("/:taskId/members/:userId", authenticate, validate(getMemberProfileSchema), getMemberProfile);

export default router;
