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
