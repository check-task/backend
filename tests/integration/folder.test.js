import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/folder.service.js", () => ({
  folderService: {
    createFolder: vi.fn(),
    updateFolder: vi.fn(),
    deleteFolder: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));

import { folderService } from "../../src/services/folder.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 폴더 생성 ────────────────────────────────────────────────────
describe("POST /api/v1/user/folder — 폴더 생성", () => {
  it("200: 정상 생성 후 응답 data 검증", async () => {
    folderService.createFolder.mockResolvedValue({
      id: 1,
      userId: 1,
      folderTitle: "공부",
      color: "#FF5733",
    });

    const res = await supertest(app)
      .post("/api/v1/user/folder")
      .set("Authorization", AUTH)
      .send({ folderTitle: "공부", color: "#FF5733" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(res.body.data).toMatchObject({
      id: 1,
      folderTitle: "공부",
      color: "#FF5733",
    });
  });

  it("400: color가 Hex 형식 아님", async () => {
    const res = await supertest(app)
      .post("/api/v1/user/folder")
      .set("Authorization", AUTH)
      .send({ folderTitle: "공부", color: "blue" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: folderTitle 누락", async () => {
    const res = await supertest(app)
      .post("/api/v1/user/folder")
      .set("Authorization", AUTH)
      .send({ color: "#FF5733" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app)
      .post("/api/v1/user/folder")
      .send({ folderTitle: "공부", color: "#FF5733" });

    expect(res.status).toBe(401);
  });
});

// ─── 폴더 수정 ────────────────────────────────────────────────────
describe("PATCH /api/v1/user/folder/:folderId — 폴더 수정", () => {
  it("200: folderTitle만 수정", async () => {
    folderService.updateFolder.mockResolvedValue({
      id: 1,
      folderTitle: "수정됨",
    });

    const res = await supertest(app)
      .patch("/api/v1/user/folder/1")
      .set("Authorization", AUTH)
      .send({ folderTitle: "수정됨" });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("200: color만 수정", async () => {
    folderService.updateFolder.mockResolvedValue({ id: 1, color: "#AABBCC" });

    const res = await supertest(app)
      .patch("/api/v1/user/folder/1")
      .set("Authorization", AUTH)
      .send({ color: "#AABBCC" });

    expect(res.status).toBe(200);
  });

  it("400: body 비어있음", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/folder/1")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: folderId가 비숫자", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/folder/abc")
      .set("Authorization", AUTH)
      .send({ folderTitle: "이름" });

    expect(res.status).toBe(400);
  });

  it("400: folderId가 0", async () => {
    const res = await supertest(app)
      .patch("/api/v1/user/folder/0")
      .set("Authorization", AUTH)
      .send({ folderTitle: "이름" });

    expect(res.status).toBe(400);
  });
});

// ─── 폴더 삭제 ────────────────────────────────────────────────────
describe("DELETE /api/v1/user/folder/:folderId — 폴더 삭제", () => {
  it("200: 정상 삭제", async () => {
    folderService.deleteFolder.mockResolvedValue(undefined);

    const res = await supertest(app)
      .delete("/api/v1/user/folder/1")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(folderService.deleteFolder).toHaveBeenCalledWith(1, 1);
  });

  it("400: folderId가 비숫자", async () => {
    const res = await supertest(app)
      .delete("/api/v1/user/folder/abc")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).delete("/api/v1/user/folder/1");
    expect(res.status).toBe(401);
  });
});
