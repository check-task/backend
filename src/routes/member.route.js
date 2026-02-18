import express from 'express';
import { getTaskMembers } from '../controllers/member.controller.js';
import authenticate from '../middlewares/authenticate.middleware.js';

const router = express.Router();

// GET /api/v1/task/:taskId/members
router.get('/:taskId/members', authenticate, getTaskMembers);

export default router;
