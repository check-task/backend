import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/member.service.js", () => ({
  default: {
    getTaskMembers: vi.fn(),
    deleteMember: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));

import memberService from "../../src/services/member.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 팀원 목록 조회 ────────────────────────────────────────────────
describe("GET /api/v1/task/:taskId/members — 팀원 목록 조회", () => {
  it("200: 정상 조회 후 응답 data 검증", async () => {
    memberService.getTaskMembers.mockResolvedValue([
      {
        id: 1,
        profileImage: "https://example.com/profile1.png",
        nickname: "홍길동",
        role: "owner",
      },
      {
        id: 2,
        profileImage: null,
        nickname: "김철수",
        role: "member",
      },
    ]);

    const res = await supertest(app)
      .get("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data.members).toHaveLength(2);
    expect(res.body.data.count).toBe(2);
    expect(res.body.data.members[0]).toMatchObject({
      id: 1,
      nickname: "홍길동",
      role: "owner",
    });
    expect(res.body.data.members[1]).toMatchObject({
      id: 2,
      nickname: "김철수",
      role: "member",
    });
  });

  it("200: 팀원이 없을 때 빈 배열 반환", async () => {
    memberService.getTaskMembers.mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.members).toEqual([]);
    expect(res.body.data.count).toBe(0);
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task/0/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 음수면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task/-1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자 문자열이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .get("/api/v1/task/abc/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/task/1/members");

    expect(res.status).toBe(401);
  });

  it("404: 존재하지 않는 과제 ID — TASK_NOT_FOUND", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    memberService.getTaskMembers.mockRejectedValue(
      new NotFoundError("TASK_NOT_FOUND", "해당하는 과제를 찾을 수 없습니다.")
    );

    const res = await supertest(app)
      .get("/api/v1/task/9999/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("TASK_NOT_FOUND");
  });

  it("404: 유효하지 않은 과제 ID — INVALID_TASK_ID", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    memberService.getTaskMembers.mockRejectedValue(
      new NotFoundError("INVALID_TASK_ID", "유효하지 않은 과제 ID입니다.")
    );

    const res = await supertest(app)
      .get("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("INVALID_TASK_ID");
  });
});

// ─── 팀원 삭제 ────────────────────────────────────────────────────────
describe("DELETE /api/v1/task/:taskId/members — 팀원 삭제", () => {
  it("200: 팀원이 탈퇴하면 멤버만 삭제", async () => {
    memberService.deleteMember.mockResolvedValue({
      deleted: "member",
      memberId: 10,
      userId: 1,
      taskId: 1,
    });

    const res = await supertest(app)
      .delete("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ deleted: "member", memberId: 10 });
  });

  it("200: 팀장이 탈퇴하면 과제 전체 삭제", async () => {
    memberService.deleteMember.mockResolvedValue({
      deleted: "task",
      taskId: 1,
    });

    const res = await supertest(app)
      .delete("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ deleted: "task", taskId: 1 });
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/0/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/task/1/members");

    expect(res.status).toBe(401);
  });

  it("404: 해당 과제의 멤버가 아닐 때 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    memberService.deleteMember.mockRejectedValue(
      new NotFoundError("해당 과제의 멤버가 아닙니다.")
    );

    const res = await supertest(app)
      .delete("/api/v1/task/1/members")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
  });
});
