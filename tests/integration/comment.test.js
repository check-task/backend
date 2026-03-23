import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/comment.service.js", () => ({
  default: {
    createComment: vi.fn(),
    updateComment: vi.fn(),
    deleteComment: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));

import commentService from "../../src/services/comment.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 댓글 생성 ────────────────────────────────────────────────────
describe("POST /api/v1/task/subtask/:subTaskId/comments — 댓글 생성", () => {
  it("201: 정상 생성 후 응답 data 검증", async () => {
    commentService.createComment.mockResolvedValue({
      comment_id: 1,
      sub_task_id: 3,
      content: "좋아요",
      created_at: "2026-03-18T00:00:00.000Z",
    });

    const res = await supertest(app)
      .post("/api/v1/task/subtask/3/comments")
      .set("Authorization", AUTH)
      .send({ content: "좋아요" });

    expect(res.status).toBe(201);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      comment_id: 1,
      sub_task_id: 3,
      content: "좋아요",
    });
  });

  it("400: content 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/subtask/3/comments")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
    const fields = res.body.data.map((d) => d.field);
    expect(fields).toContain("body.content");
  });

  it("400: content가 빈 문자열", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/subtask/3/comments")
      .set("Authorization", AUTH)
      .send({ content: "" });

    expect(res.status).toBe(400);
  });

  it("400: subTaskId가 0", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/subtask/0/comments")
      .set("Authorization", AUTH)
      .send({ content: "댓글" });

    expect(res.status).toBe(400);
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/task/subtask/3/comments")
      .send({ content: "댓글" });

    expect(res.status).toBe(401);
  });
});

// ─── 댓글 수정 ────────────────────────────────────────────────────
describe("PATCH /api/v1/task/comment/:commentId — 댓글 수정", () => {
  it("200: 정상 수정 후 응답 data 검증", async () => {
    commentService.updateComment.mockResolvedValue({
      comment_id: 5,
      content: "수정된 댓글",
    });

    const res = await supertest(app)
      .patch("/api/v1/task/comment/5")
      .set("Authorization", AUTH)
      .send({ content: "수정된 댓글" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      comment_id: 5,
      content: "수정된 댓글",
    });
  });

  it("400: content 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/comment/5")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: commentId가 비숫자", async () => {
    const res = await supertest(app)
      .patch("/api/v1/task/comment/abc")
      .set("Authorization", AUTH)
      .send({ content: "수정" });

    expect(res.status).toBe(400);
  });
});

// ─── 댓글 삭제 ────────────────────────────────────────────────────
describe("DELETE /api/v1/task/comment/:commentId — 댓글 삭제", () => {
  it("200: 정상 삭제", async () => {
    commentService.deleteComment.mockResolvedValue(undefined);

    const res = await supertest(app)
      .delete("/api/v1/task/comment/5")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toBeNull();
  });

  it("400: commentId가 0", async () => {
    const res = await supertest(app)
      .delete("/api/v1/task/comment/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/task/comment/5");
    expect(res.status).toBe(401);
  });
});
