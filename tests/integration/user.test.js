import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/user.service.js", () => ({
  default: {
    getMyInfo: vi.fn(),
    updateProfile: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));
vi.mock("../../src/middlewares/upload.middleware.js", () => ({
  uploadToS3: vi.fn().mockResolvedValue("https://s3.example.com/profile.png"),
  default: {
    single: () => (req, res, next) => next(),
  },
}));
vi.mock("../../src/config/s3.config.js", () => ({
  default: { send: vi.fn() },
}));

import userService from "../../src/services/user.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 내 정보 조회 ─────────────────────────────────────────────────
describe("GET /api/v1/user/me — 내 정보 조회", () => {
  it("200: 정상 조회 후 응답 data 검증", async () => {
    userService.getMyInfo.mockResolvedValue({
      userId: 1,
      nickname: "홍길동",
      phoneNum: "010-1234-5678",
      email: "test@example.com",
      profileImage: "https://example.com/profile.png",
      deadlineAlarm: 30,
      taskAlarm: 60,
      folders: [{ folderId: 1, folderTitle: "내 폴더", color: "#FF5733" }],
    });

    const res = await supertest(app)
      .get("/api/v1/user/me")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      userId: 1,
      nickname: "홍길동",
      email: "test@example.com",
    });
    expect(res.body.data.folders).toHaveLength(1);
    expect(userService.getMyInfo).toHaveBeenCalledWith(1);
  });

  it("200: 폴더가 없으면 빈 배열 반환", async () => {
    userService.getMyInfo.mockResolvedValue({
      userId: 1,
      nickname: "홍길동",
      phoneNum: null,
      email: "test@example.com",
      profileImage: null,
      deadlineAlarm: 0,
      taskAlarm: 0,
      folders: [],
    });

    const res = await supertest(app)
      .get("/api/v1/user/me")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.data.folders).toEqual([]);
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/user/me");
    expect(res.status).toBe(401);
  });

  it("404: 존재하지 않는 사용자 — USER_NOT_FOUND", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    userService.getMyInfo.mockRejectedValue(
      new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다."),
    );

    const res = await supertest(app)
      .get("/api/v1/user/me")
      .set("Authorization", AUTH);

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("USER_NOT_FOUND");
  });
});

// ─── 프로필 수정 ──────────────────────────────────────────────────
describe("PATCH /api/v1/user/profile — 프로필 수정", () => {
  it("200: nickname 수정 성공", async () => {
    userService.updateProfile.mockResolvedValue({
      userId: 1,
      nickname: "새닉네임",
      phoneNum: null,
      email: "test@example.com",
      profileImage: null,
      updatedAt: "2026-03-23T00:00:00.000Z",
    });

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ nickname: "새닉네임" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({ userId: 1, nickname: "새닉네임" });
    expect(userService.updateProfile).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ nickname: "새닉네임" }),
    );
  });

  it("200: email 수정 성공", async () => {
    userService.updateProfile.mockResolvedValue({
      userId: 1,
      nickname: "홍길동",
      phoneNum: null,
      email: "new@example.com",
      profileImage: null,
      updatedAt: "2026-03-23T00:00:00.000Z",
    });

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ email: "new@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email: "new@example.com" });
  });

  it("200: deadlineAlarm 수정 성공 (숫자 문자열도 허용)", async () => {
    userService.updateProfile.mockResolvedValue({
      userId: 1,
      nickname: "홍길동",
      phoneNum: null,
      email: "test@example.com",
      profileImage: null,
      updatedAt: "2026-03-23T00:00:00.000Z",
    });

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ deadlineAlarm: 30 });

    expect(res.status).toBe(200);
    expect(userService.updateProfile).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ deadlineAlarm: 30 }),
    );
  });

  it("200: body 없이도 통과한다 (스키마 전체 optional)", async () => {
    userService.updateProfile.mockResolvedValue({
      userId: 1,
      nickname: "홍길동",
      phoneNum: null,
      email: "test@example.com",
      profileImage: null,
      updatedAt: "2026-03-23T00:00:00.000Z",
    });

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(200);
  });

  it("400: email 형식이 잘못됨 → VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: nickname이 빈 문자열이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ nickname: "" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: deadlineAlarm이 변환 불가 문자열이면 VALIDATION_ERROR", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ deadlineAlarm: "thirty" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .send({ nickname: "테스트" });

    expect(res.status).toBe(401);
  });

  it("400: 닉네임 100자 초과 — 서비스 에러", async () => {
    const { BadRequestError } =
      await import("../../src/errors/custom.error.js");
    userService.updateProfile.mockRejectedValue(
      new BadRequestError(
        "INVALID_NICKNAME",
        "닉네임은 최대 100자까지만 가능합니다.",
      ),
    );

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ nickname: "a".repeat(101) });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("INVALID_NICKNAME");
  });

  it("404: 존재하지 않는 사용자 — USER_NOT_FOUND", async () => {
    const { NotFoundError } = await import("../../src/errors/custom.error.js");
    userService.updateProfile.mockRejectedValue(
      new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다."),
    );

    const res = await supertest(app)
      .patch("/api/v1/user/profile")
      .set("Authorization", AUTH)
      .send({ nickname: "이름" });

    expect(res.status).toBe(404);
    expect(res.body.errorCode).toBe("USER_NOT_FOUND");
  });
});
