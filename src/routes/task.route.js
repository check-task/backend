import express from "express";
import multer from "multer";

import taskController from "../controllers/task.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { validateTaskType, validateTaskMembership } from "../middlewares/taskAuthorization.middleware.js";
import {
  createTaskSchema,
  getTasksSchema,
  taskIdParamSchema,
  updateTaskSchema,
  updateTaskDeadlineSchema,
  updateTaskPrioritiesSchema,
  updateTeamMemberSchema,
  deleteTeamMemberSchema,
  addSubTaskSchema,
  updateSubTaskStatusSchema,
  updateSubTaskDeadlineSchema,
  setSubTaskAssigneeSchema,
  convertTaskToTeamSchema,
  generateInviteCodeSchema,
  joinTaskSchema,
  patchSubTaskSchema,
  deleteSelectedSubTaskSchema,
  deleteAllSubTaskParamsSchema,
} from "../validators/task.schema.js";

const upload = multer({ storage: multer.memoryStorage() });

const router = express.Router();

// 완료된 과제
router.get("/completed", authenticate, taskController.getCompletedTasks);

// POST /api/v1/task -- 과제 생성
router.post("/", authenticate, upload.array('files'), validate(createTaskSchema), taskController.createTask);

// PATCH /api/v1/task/priority -- 우선 순위 변경
router.patch(
  "/priority",
  authenticate,
  validate(updateTaskPrioritiesSchema),
  taskController.updateTaskPriorities
);

// 초대 코드로 팀 참여 API
router.post("/join", authenticate, validate(joinTaskSchema), taskController.joinTaskByInviteCode);

// 세부 TASK 상태 업데이트 API
router.patch(
  "/subtask/:subTaskId/status",
  authenticate,
  validate(updateSubTaskStatusSchema),
  taskController.updateSubTaskStatus
);

// 세부task 날짜 변경 API
router.patch(
  "/subtask/:subTaskId/deadline",
  authenticate,
  validate(updateSubTaskDeadlineSchema),
  taskController.updateSubTaskDeadline
);

// 세부 TASK 담당자 설정 API
router.patch(
  "/subtask/:subTaskId/assignee",
  authenticate,
  validate(setSubTaskAssigneeSchema),
  taskController.setSubTaskAssignee
);

// GET /api/v1/task?sort=우선순위 -- 과제 목록 조회
router.get("/", authenticate, validate(getTasksSchema), taskController.getTasks);

// PATCH /api/v1/task/:taskId -- 과제 수정 (validate)
router.patch( "/:taskId", authenticate, validateTaskType, validate(updateTaskSchema), taskController.updateTask);

// PATCH /api/v1/task/:taskId/convert-to-team -- 개인 과제 → 팀 과제 변경
router.patch(
  "/:taskId/convert-to-team",
  authenticate,
  validateTaskMembership,
  validate(convertTaskToTeamSchema),
  taskController.convertTaskToTeam
);

// GET /api/v1/task/:taskId -- 과제 세부 사항 조회
router.get(
  "/:taskId",
  authenticate,
  validateTaskType,
  validate(taskIdParamSchema),
  taskController.getTaskDetail
);

// PATCH /api/v1/task/:taskId/member/:targetUserId -- 팀원 정보 수정
router.patch(
  "/:taskId/member/:targetUserId",
  authenticate,
  validateTaskType,
  validate(updateTeamMemberSchema),
  taskController.updateTeamMember
);

// 팀원 관계 삭제
router.delete(
  "/:taskId/member/:userId",
  authenticate,
  validateTaskType,
  validate(deleteTeamMemberSchema),
  taskController.deleteTeamMember
);

// POST /api/v1/task/:taskId/subTask -- 단일 세부 과제 추가
router.post(
  "/:taskId/subtask",
  authenticate,
  validateTaskType,
  validate(addSubTaskSchema),
  taskController.addSubTask
);

// PATCH /api/v1/task/:taskId/subTask -- 단일 세부 과제 수정
router.patch(
  "/:taskId/subtask",
  authenticate,
  validateTaskType,
  validate(patchSubTaskSchema),
  taskController.patchSubTask
);

// PATCH /api/v1/task/:taskId/subTask/all -- 전체 세부 과제 삭제
router.delete(
  "/:taskId/subtask/all",
  authenticate,
  validateTaskType,
  validate(deleteAllSubTaskParamsSchema),
  taskController.allDeleteSubTask
);

// PATCH /api/v1/task/:taskId/subTask -- 목록 세부 과제 삭제
router.delete(
  "/:taskId/subtask",
  authenticate,
  validateTaskType,
  validate(deleteSelectedSubTaskSchema),
  taskController.deleteSubTask
);

// Task 마감일 변경 API
router.patch(
  "/:taskId/deadline",
  authenticate,
  validateTaskType,
  validate(updateTaskDeadlineSchema),
  taskController.updateTaskDeadline
);

// 초대 코드 생성 API
router.post(
  "/:taskId/invitation",
  authenticate,
  validateTaskType,
  validate(generateInviteCodeSchema),
  taskController.generateInviteCode
);

export default router;
