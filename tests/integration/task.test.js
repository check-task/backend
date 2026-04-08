import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/task.service.js", () => ({
  default: {
    registerTask: vi.fn(),
    getTaskList: vi.fn(),
    getTaskDetail: vi.fn(),
    removeTask: vi.fn(),
    modifyTask: vi.fn(),
    updateTaskDeadline: vi.fn(),
    updatePriorities: vi.fn(),
    modifyMemberRole: vi.fn(),
    outMember: vi.fn(),
    createSingleSubTask: vi.fn(),
    updateSubTaskStatus: vi.fn(),
    updateSubTaskDeadline: vi.fn(),
    setSubTaskAssignee: vi.fn(),
    generateInviteCode: vi.fn(),
    joinTaskByInviteCode: vi.fn(),
    getCompletedTasks: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));

import taskService from "../../src/services/task.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 과제 생성 ────────────────────────────────────────────────────
describe("POST /api/v1/task — 과제 생성", () => {
  it("201: 정상 생성 후 응답 data 검증", async () => {
    taskService.registerTask.mockResolvedValue({ id: 1, title: "새 과제" });

    const res = await supertest(app)
      .post("/api/v1/task")
      .set("Authorization", AUTH)
      .send({ title: "새 과제", folderId: 1, type: "PERSONAL" });

    expect(res.status).toBe(201);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ id: 1, title: "새 과제" });
  });

  it("400: title 없음 → VALIDATION_ERROR + 에러 필드 확인", async () => {
    const res = await supertest(app)
      .post("/api/v1/task")
      .set("Authorization", AUTH)
      .send({ folderId: 1 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
    const fields = res.body.data.map((d) => d.field);
    expect(fields).toContain("body.title");
  });

  it("400: folderId가 음수 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/task")
      .set("Authorization", AUTH)
      .send({ title: "제목", folderId: -1 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/task")
      .send({ title: "제목", folderId: 1 });

    expect(res.status).toBe(401);
  });
});

// ─── 마감일 변경 ──────────────────────────────────────────────────
describe("PATCH /api/v1/task/:taskId/deadline — 마감일 변경", () => {
  it("200: 정상 변경 후 응답 data 검증", async () => {
    const mockDeadline = new Date("2026-12-31");
    taskService.updateTaskDeadline.mockResolvedValue({
      id: 1,
      deadline: mockDeadline,
    });

    const res = await supertest(app)
      .patch("/api/v1/task/1/deadline")
      .set("Authorization", AUTH)
      .send({ deadline: "2026-12-31" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ taskId: 1 });
    expect(taskService.updateTaskDeadline).toHaveBeenCalledWith(
      1,
      1,
      "2026-12-31",
    );
  });

  it("400: deadline 누락", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/1/deadline")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/abc/deadline")
      .set("Authorization", AUTH)
      .send({ deadline: "2026-12-31" });

    expect(res.status).toBe(400);
  });

  it("400: taskId가 0", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/0/deadline")
      .set("Authorization", AUTH)
      .send({ deadline: "2026-12-31" });

    expect(res.status).toBe(400);
  });
});

// ─── 세부과제 상태 변경 ───────────────────────────────────────────
describe("PATCH /api/v1/task/subtask/:subTaskId/status — 세부과제 상태 변경", () => {
  it("200: COMPLETED로 정상 변경", async () => {
    taskService.updateSubTaskStatus.mockResolvedValue({ id: 1 });

    const res = await supertest(app)
      .patch("/api/v1/task/subtask/1/status")
      .set("Authorization", AUTH)
      .send({ status: "COMPLETED" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: 잘못된 status 값", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/1/status")
      .set("Authorization", AUTH)
      .send({ status: "DONE" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: status 누락", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/1/status")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
  });
});

// ─── 초대코드 팀 참여 ─────────────────────────────────────────────
describe("POST /api/v1/task/join — 초대코드 참여", () => {
  it("200: 정상 참여 후 응답 data 검증", async () => {
    taskService.joinTaskByInviteCode.mockResolvedValue({
      taskId: 1,
      taskTitle: "팀 과제",
      memberId: 5,
    });

    const res = await supertest(app)
      .post("/api/v1/task/join")
      .set("Authorization", AUTH)
      .send({ inviteCode: "ABCD1234" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ task_id: 1, member_id: 5 });
  });

  it("400: inviteCode 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/join")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: inviteCode 빈 문자열", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/join")
      .set("Authorization", AUTH)
      .send({ inviteCode: "" });

    expect(res.status).toBe(400);
  });
});

// ─── 우선순위 변경 ────────────────────────────────────────────────
describe("PATCH /api/v1/task/priority — 우선순위 변경", () => {
  it("200: 정상 변경", async () => {
    taskService.updatePriorities.mockResolvedValue(undefined);

    const res = await supertest(app)
      .patch("/api/v1/task/priority")
      .set("Authorization", AUTH)
      .send({
        orderedTasks: [
          { taskId: 1, rank: 1 },
          { taskId: 2, rank: 2 },
        ],
      });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: orderedTasks 빈 배열", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/priority")
      .set("Authorization", AUTH)
      .send({ orderedTasks: [] });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });
});

// ─── 완료된 과제 조회 ─────────────────────────────────────────────
describe("GET /api/v1/task/completed — 완료된 과제 조회", () => {
  it("200: 정상 조회 후 응답 data 검증", async () => {
    taskService.getCompletedTasks.mockResolvedValue([
      {
        id: 1,
        title: "완료된 과제",
        deadline: new Date("2026-03-01"),
        type: "PERSONAL",
        status: "COMPLETED",
        folder: { id: 2, folderTitle: "내 폴더", color: "#FF5733" },
      },
    ]);

    const res = await supertest(app)
      .get("/api/v1/task/completed")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data.tasks).toHaveLength(1);
    expect(res.body.data.tasks[0]).toMatchObject({
      taskId: 1,
      title: "완료된 과제",
      type: "개인",
      status: "완료",
    });
  });

  it("200: 완료된 과제가 없으면 빈 배열", async () => {
    taskService.getCompletedTasks.mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/v1/task/completed")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.tasks).toEqual([]);
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/task/completed");
    expect(res.status).toBe(401);
  });
});

// ─── 과제 목록 조회 ───────────────────────────────────────────────
describe("GET /api/v1/task — 과제 목록 조회", () => {
  it("200: 정상 조회 후 task/subTask 분리 구조 검증", async () => {
    taskService.getTaskList.mockResolvedValue([
      {
        id: 1,
        title: "과제1",
        folderId: 2,
        type: "PERSONAL",
        status: "PENDING",
        deadline: null,
        folder: { color: "#FF5733", folderTitle: "내 폴더" },
        priorities: [{ rank: 1 }],
        progress: 50,
        subTasks: [
          { id: 10, title: "세부과제1", status: "PENDING", endDate: null },
        ],
      },
    ]);

    const res = await supertest(app)
      .get("/api/v1/task")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data.task).toHaveLength(1);
    expect(res.body.data.task[0]).toMatchObject({ taskId: 1, title: "과제1" });
    expect(res.body.data.subTask).toHaveLength(1);
    expect(res.body.data.subTask[0]).toMatchObject({ subTaskId: 10, taskId: 1 });
  });

  it("200: query 파라미터(type, sort)와 함께 조회", async () => {
    taskService.getTaskList.mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/v1/task?type=TEAM&sort=deadline")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(taskService.getTaskList).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ type: "TEAM", sort: "deadline" }),
    );
  });

  it("400: type이 잘못된 값이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task?type=INVALID")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/task");
    expect(res.status).toBe(401);
  });
});

// ─── 과제 상세 조회 ───────────────────────────────────────────────
describe("GET /api/v1/task/:taskId — 과제 상세 조회", () => {
  it("200: 정상 조회 후 응답 data 검증", async () => {
    taskService.getTaskDetail.mockResolvedValue({
      id: 1,
      title: "팀 과제",
      folderId: 2,
      type: "TEAM",
      status: "PENDING",
      deadline: new Date("2026-12-31"),
      folder: { color: "#FF5733", folderTitle: "내 폴더" },
      subTasks: [],
      communications: [],
      logs: [],
      references: [],
    });

    const res = await supertest(app)
      .get("/api/v1/task/1")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      taskId: 1,
      title: "팀 과제",
      type: "TEAM",
    });
    expect(taskService.getTaskDetail).toHaveBeenCalledWith(1);
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task/abc")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/task/1");
    expect(res.status).toBe(401);
  });

  it("404: 존재하지 않는 과제 — NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    taskService.getTaskDetail.mockRejectedValue(
      new NotFoundError("TASK_NOT_FOUND", "과제를 찾을 수 없습니다."),
    );

    const res = await supertest(app)
      .get("/api/v1/task/9999")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("TASK_NOT_FOUND");
  });
});

// ─── 과제 삭제 ────────────────────────────────────────────────────
describe("DELETE /api/v1/task/:taskId — 과제 삭제", () => {
  it("200: 정상 삭제", async () => {
    taskService.removeTask.mockResolvedValue(undefined);

    const res = await supertest(app)
      .delete("/api/v1/task/1")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toBeNull();
    expect(taskService.removeTask).toHaveBeenCalledWith(1);
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/abc")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/task/1");
    expect(res.status).toBe(401);
  });
});

// ─── 과제 수정 ────────────────────────────────────────────────────
describe("PATCH /api/v1/task/:taskId — 과제 수정", () => {
  it("200: title 수정 성공", async () => {
    taskService.modifyTask.mockResolvedValue({ id: 1, title: "수정된 제목" });

    const res = await supertest(app)
      .patch("/api/v1/task/1")
      .set("Authorization", AUTH)
      .send({ title: "수정된 제목" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ id: 1, title: "수정된 제목" });
  });

  it("400: taskId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/abc")
      .set("Authorization", AUTH)
      .send({ title: "수정" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/1")
      .send({ title: "수정" });

    expect(res.status).toBe(401);
  });
});

// ─── 팀원 역할 변경 ───────────────────────────────────────────────
describe("PATCH /api/v1/task/:taskId/member/:userId — 팀원 역할 변경", () => {
  it("200: role 1(Member)로 변경 성공", async () => {
    taskService.modifyMemberRole.mockResolvedValue({
      id: 5,
      userId: 2,
      taskId: 1,
      role: true,
    });

    const res = await supertest(app)
      .patch("/api/v1/task/1/member/2")
      .set("Authorization", AUTH)
      .send({ role: 1 });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      memberId: 5,
      userId: 2,
      taskId: 1,
      role: 1,
    });
    expect(taskService.modifyMemberRole).toHaveBeenCalledWith(1, 2, 1);
  });

  it("200: role 0(Owner)으로 변경 성공", async () => {
    taskService.modifyMemberRole.mockResolvedValue({
      id: 5,
      userId: 2,
      taskId: 1,
      role: false,
    });

    const res = await supertest(app)
      .patch("/api/v1/task/1/member/2")
      .set("Authorization", AUTH)
      .send({ role: 0 });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe(0);
  });

  it("400: role이 2면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/1/member/2")
      .set("Authorization", AUTH)
      .send({ role: 2 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: role 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/1/member/2")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/1/member/2")
      .send({ role: 1 });

    expect(res.status).toBe(401);
  });
});

// ─── 팀원 추방 ────────────────────────────────────────────────────
describe("DELETE /api/v1/task/:taskId/member/:memberId — 팀원 추방", () => {
  it("200: 정상 추방", async () => {
    taskService.outMember.mockResolvedValue({ id: 3 });

    const res = await supertest(app)
      .delete("/api/v1/task/1/member/3")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(taskService.outMember).toHaveBeenCalledWith(1, 3, 1);
  });

  it("400: memberId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/1/member/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/abc/member/3")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/task/1/member/3");
    expect(res.status).toBe(401);
  });
});

// ─── 세부 과제 추가 ───────────────────────────────────────────────
describe("POST /api/v1/task/:taskId/subTask — 세부 과제 추가", () => {
  it("200: 정상 추가 후 응답 data 검증", async () => {
    taskService.createSingleSubTask.mockResolvedValue({
      subTaskId: 10,
      title: "새 세부 과제",
      deadline: new Date("2026-12-31"),
    });

    const res = await supertest(app)
      .post("/api/v1/task/1/subTask")
      .set("Authorization", AUTH)
      .send({ title: "새 세부 과제", deadline: "2026-12-31" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      subTaskId: 10,
      title: "새 세부 과제",
    });
    expect(taskService.createSingleSubTask).toHaveBeenCalledWith(
      1,
      1,
      expect.objectContaining({ title: "새 세부 과제" }),
    );
  });

  it("400: title 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/1/subTask")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/0/subTask")
      .set("Authorization", AUTH)
      .send({ title: "세부 과제" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/1/subTask")
      .send({ title: "세부 과제" });

    expect(res.status).toBe(401);
  });
});

// ─── 세부 과제 마감일 변경 ────────────────────────────────────────
describe("PATCH /api/v1/task/subtask/:subTaskId/deadline — 세부 과제 마감일 변경", () => {
  it("200: 정상 변경 후 응답 data 검증", async () => {
    taskService.updateSubTaskDeadline.mockResolvedValue({
      id: 10,
      endDate: new Date("2026-11-30"),
    });

    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/deadline")
      .set("Authorization", AUTH)
      .send({ endDate: "2026-11-30" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ sub_task_id: 10 });
  });

  it("400: endDate 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/deadline")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: subTaskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/0/deadline")
      .set("Authorization", AUTH)
      .send({ endDate: "2026-11-30" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/deadline")
      .send({ endDate: "2026-11-30" });

    expect(res.status).toBe(401);
  });
});

// ─── 세부 과제 담당자 설정 ────────────────────────────────────────
describe("PATCH /api/v1/task/subtask/:subTaskId/assignee — 세부 과제 담당자 설정", () => {
  it("200: 정상 설정 후 응답 data 검증", async () => {
    taskService.setSubTaskAssignee.mockResolvedValue({
      subTaskId: 10,
      assigneeId: 3,
    });

    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/assignee")
      .set("Authorization", AUTH)
      .send({ assigneeId: 3 });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      sub_task_id: 10,
      assignee_id: 3,
    });
    expect(taskService.setSubTaskAssignee).toHaveBeenCalledWith(10, 3);
  });

  it("400: assigneeId 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/assignee")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: assigneeId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/assignee")
      .set("Authorization", AUTH)
      .send({ assigneeId: 0 });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/subtask/10/assignee")
      .send({ assigneeId: 3 });

    expect(res.status).toBe(401);
  });
});

// ─── 초대 코드 생성 ───────────────────────────────────────────────
describe("POST /api/v1/task/:taskId/invitation — 초대 코드 생성", () => {
  it("200: 정상 생성 후 응답 data 검증", async () => {
    taskService.generateInviteCode.mockResolvedValue({
      invite_code: "ABCD1234",
      invite_expired: "2026-04-01T00:00:00.000Z",
    });

    const res = await supertest(app)
      .post("/api/v1/task/1/invitation")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      invite_code: "ABCD1234",
      invite_expired: "2026-04-01T00:00:00.000Z",
    });
    expect(taskService.generateInviteCode).toHaveBeenCalledWith(1, 1);
  });

  it("400: taskId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/abc/invitation")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).post("/api/v1/task/1/invitation");
    expect(res.status).toBe(401);
  });

  it("404: 과제가 없으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    taskService.generateInviteCode.mockRejectedValue(
      new NotFoundError("TASK_NOT_FOUND", "과제를 찾을 수 없습니다."),
    );

    const res = await supertest(app)
      .post("/api/v1/task/9999/invitation")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("TASK_NOT_FOUND");
  });
});
