import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/modal.service.js", () => ({
  default: {
    createReferences: vi.fn(),
    updateReference: vi.fn(),
    deleteReference: vi.fn(),
    createCommunication: vi.fn(),
    updateCommunication: vi.fn(),
    deleteCommunication: vi.fn(),
    createLog: vi.fn(),
    updateLog: vi.fn(),
    deleteLog: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));
vi.mock("../../src/middlewares/upload.middleware.js", () => ({
  uploadToS3: vi.fn().mockResolvedValue("https://s3.example.com/file.pdf"),
  default: {
    single: () => (req, res, next) => next(),
  },
}));
vi.mock("../../src/config/s3.config.js", () => ({
  default: { send: vi.fn() },
}));

import modalService from "../../src/services/modal.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 자료(Reference) 생성 ────────────────────────────────────────────
describe("POST /api/v1/reference/data/:taskId — 자료 생성 (url 타입)", () => {
  it("200: url 타입 자료 정상 생성", async () => {
    modalService.createReferences.mockResolvedValue([
      { id: 1, taskId: 1, name: "참고자료", url: "https://example.com", fileUrl: null },
    ]);

    const res = await supertest(app)
      .post("/api/v1/reference/data/1?type=url")
      .set("Authorization", AUTH)
      .send({ name: "참고자료", url: "https://example.com" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toMatchObject({ name: "참고자료", url: "https://example.com" });
  });

  it("400: type이 잘못된 값이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/data/1?type=image")
      .set("Authorization", AUTH)
      .send({ name: "자료" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: type이 없으면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/data/1")
      .set("Authorization", AUTH)
      .send({ name: "자료" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/data/0?type=url")
      .set("Authorization", AUTH)
      .send({ name: "자료", url: "https://example.com" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/data/1?type=url")
      .send({ name: "자료", url: "https://example.com" });

    expect(res.status).toBe(401);
  });

  it("401: 멤버가 아닌 경우 서비스 에러", async () => {
    const { UnauthorizedError } = await import("../../src/errors/custom.error.js");
    modalService.createReferences.mockRejectedValue(
      new UnauthorizedError("UNAUTHORIZED", "권한이 없습니다.")
    );

    const res = await supertest(app)
      .post("/api/v1/reference/data/1?type=url")
      .set("Authorization", AUTH)
      .send({ name: "자료", url: "https://example.com" });

    expect(res.status).toBe(401);
  });

  it("404: 존재하지 않는 taskId — NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.createReferences.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "taskId가 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .post("/api/v1/reference/data/9999?type=url")
      .set("Authorization", AUTH)
      .send({ name: "자료", url: "https://example.com" });

    expect(res.status).toBe(404);
  });
});

// ─── 자료(Reference) 수정 ────────────────────────────────────────────
describe("PATCH /api/v1/reference/data/:taskId/:referenceId — 자료 수정", () => {
  it("200: name 수정 성공", async () => {
    modalService.updateReference.mockResolvedValue({
      id: 2,
      taskId: 1,
      name: "새 이름",
      url: "https://example.com",
      fileUrl: null,
    });

    const res = await supertest(app)
      .patch("/api/v1/reference/data/1/2")
      .set("Authorization", AUTH)
      .send({ name: "새 이름" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ id: 2, name: "새 이름" });
  });

  it("400: 수정할 값이 없으면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/data/1/2")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: referenceId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/data/1/abc")
      .set("Authorization", AUTH)
      .send({ name: "이름" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/data/1/2")
      .send({ name: "이름" });

    expect(res.status).toBe(401);
  });

  it("404: 자료가 존재하지 않으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.updateReference.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "자료가 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .patch("/api/v1/reference/data/1/9999")
      .set("Authorization", AUTH)
      .send({ name: "이름" });

    expect(res.status).toBe(404);
  });
});

// ─── 자료(Reference) 삭제 ────────────────────────────────────────────
describe("DELETE /api/v1/reference/data/:taskId/:referenceId — 자료 삭제", () => {
  it("200: 정상 삭제", async () => {
    modalService.deleteReference.mockResolvedValue({ id: 2 });

    const res = await supertest(app)
      .delete("/api/v1/reference/data/1/2")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: referenceId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/reference/data/1/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/reference/data/1/2");

    expect(res.status).toBe(401);
  });

  it("404: 자료가 없으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.deleteReference.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "자료가 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .delete("/api/v1/reference/data/1/9999")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
  });
});

// ─── 커뮤니케이션 생성 ───────────────────────────────────────────────
describe("POST /api/v1/reference/communication/:taskId — 커뮤니케이션 생성", () => {
  it("200: 정상 생성", async () => {
    modalService.createCommunication.mockResolvedValue([
      { id: 1, taskId: 1, name: "슬랙", url: "https://slack.com" },
    ]);

    const res = await supertest(app)
      .post("/api/v1/reference/communication/1")
      .set("Authorization", AUTH)
      .send({ name: "슬랙", url: "https://slack.com" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data[0]).toMatchObject({ name: "슬랙", url: "https://slack.com" });
  });

  it("400: name 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/communication/1")
      .set("Authorization", AUTH)
      .send({ url: "https://slack.com" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: url 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/communication/1")
      .set("Authorization", AUTH)
      .send({ name: "슬랙" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/communication/1")
      .send({ name: "슬랙", url: "https://slack.com" });

    expect(res.status).toBe(401);
  });

  it("401: 권한 없음 → UnauthorizedError", async () => {
    const { UnauthorizedError } = await import("../../src/errors/custom.error.js");
    modalService.createCommunication.mockRejectedValue(
      new UnauthorizedError("UNAUTHORIZED", "권한이 없습니다.")
    );

    const res = await supertest(app)
      .post("/api/v1/reference/communication/1")
      .set("Authorization", AUTH)
      .send({ name: "슬랙", url: "https://slack.com" });

    expect(res.status).toBe(401);
  });
});

// ─── 커뮤니케이션 수정 ───────────────────────────────────────────────
describe("PATCH /api/v1/reference/communication/:taskId/:communicationId — 커뮤니케이션 수정", () => {
  it("200: 정상 수정", async () => {
    modalService.updateCommunication.mockResolvedValue({
      id: 3,
      taskId: 1,
      name: "노션",
      url: "https://notion.so",
    });

    const res = await supertest(app)
      .patch("/api/v1/reference/communication/1/3")
      .set("Authorization", AUTH)
      .send({ name: "노션" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ name: "노션" });
  });

  it("400: 수정할 값이 없으면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/communication/1/3")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: communicationId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/communication/1/abc")
      .set("Authorization", AUTH)
      .send({ name: "노션" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/communication/1/3")
      .send({ name: "노션" });

    expect(res.status).toBe(401);
  });

  it("404: 커뮤니케이션이 없으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.updateCommunication.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "커뮤니케이션이 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .patch("/api/v1/reference/communication/1/9999")
      .set("Authorization", AUTH)
      .send({ name: "이름" });

    expect(res.status).toBe(404);
  });
});

// ─── 커뮤니케이션 삭제 ───────────────────────────────────────────────
describe("DELETE /api/v1/reference/communication/:taskId/:communicationId — 커뮤니케이션 삭제", () => {
  it("200: 정상 삭제", async () => {
    modalService.deleteCommunication.mockResolvedValue({ id: 3 });

    const res = await supertest(app)
      .delete("/api/v1/reference/communication/1/3")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: communicationId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/reference/communication/1/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/reference/communication/1/3");

    expect(res.status).toBe(401);
  });
});

// ─── 회의록 생성 ──────────────────────────────────────────────────────
describe("POST /api/v1/reference/log/:taskId — 회의록 생성", () => {
  it("200: 정상 생성", async () => {
    modalService.createLog.mockResolvedValue([
      {
        id: 1,
        taskId: 1,
        date: "2026-03-20T00:00:00.000Z",
        agenda: "기획 논의",
        conclusion: "다음 주 재논의",
        discussion: "세부 논의 내용",
      },
    ]);

    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .set("Authorization", AUTH)
      .send({
        date: "2026-03-20",
        agenda: "기획 논의",
        conclusion: "다음 주 재논의",
        discussion: "세부 논의 내용",
      });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data[0]).toMatchObject({ agenda: "기획 논의" });
  });

  it("200: date만 있어도 생성된다", async () => {
    modalService.createLog.mockResolvedValue([
      { id: 2, taskId: 1, date: "2026-03-21T00:00:00.000Z", agenda: null, conclusion: null, discussion: null },
    ]);

    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .set("Authorization", AUTH)
      .send({ date: "2026-03-21" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: date 없음 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: date가 빈 문자열이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .set("Authorization", AUTH)
      .send({ date: "" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 음수면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/log/-1")
      .set("Authorization", AUTH)
      .send({ date: "2026-03-20" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .send({ date: "2026-03-20" });

    expect(res.status).toBe(401);
  });

  it("401: 권한 없음 → UnauthorizedError", async () => {
    const { UnauthorizedError } = await import("../../src/errors/custom.error.js");
    modalService.createLog.mockRejectedValue(
      new UnauthorizedError("UNAUTHORIZED", "권한이 없습니다.")
    );

    const res = await supertest(app)
      .post("/api/v1/reference/log/1")
      .set("Authorization", AUTH)
      .send({ date: "2026-03-20" });

    expect(res.status).toBe(401);
  });
});

// ─── 회의록 수정 ──────────────────────────────────────────────────────
describe("PATCH /api/v1/reference/log/:taskId/:logId — 회의록 수정", () => {
  it("200: agenda 수정 성공", async () => {
    modalService.updateLog.mockResolvedValue({
      id: 1,
      taskId: 1,
      date: "2026-03-20T00:00:00.000Z",
      agenda: "수정된 안건",
      conclusion: null,
      discussion: null,
    });

    const res = await supertest(app)
      .patch("/api/v1/reference/log/1/1")
      .set("Authorization", AUTH)
      .send({ agenda: "수정된 안건" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ agenda: "수정된 안건" });
  });

  it("400: 수정할 값이 없으면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/log/1/1")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: logId가 비숫자면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/log/1/abc")
      .set("Authorization", AUTH)
      .send({ agenda: "안건" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/reference/log/1/1")
      .send({ agenda: "안건" });

    expect(res.status).toBe(401);
  });

  it("404: 회의록이 없으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.updateLog.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "회의록이 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .patch("/api/v1/reference/log/1/9999")
      .set("Authorization", AUTH)
      .send({ agenda: "안건" });

    expect(res.status).toBe(404);
  });
});

// ─── 회의록 삭제 ──────────────────────────────────────────────────────
describe("DELETE /api/v1/reference/log/:taskId/:logId — 회의록 삭제", () => {
  it("200: 정상 삭제", async () => {
    modalService.deleteLog.mockResolvedValue({ id: 1 });

    const res = await supertest(app)
      .delete("/api/v1/reference/log/1/1")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("400: logId가 0이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .delete("/api/v1/reference/log/1/0")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/reference/log/1/1");

    expect(res.status).toBe(401);
  });

  it("404: 회의록이 없으면 NotFoundError", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    modalService.deleteLog.mockRejectedValue(
      new NotFoundError("NOT_FOUND", "회의록이 존재하지 않습니다.")
    );

    const res = await supertest(app)
      .delete("/api/v1/reference/log/1/9999")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
  });
});
