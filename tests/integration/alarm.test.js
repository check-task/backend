import { describe, it, expect, vi, beforeEach } from "vitest";
import supertest from "supertest";
import { buildApp } from "../helpers/app.js";
import { generateToken } from "../helpers/token.js";

vi.mock("../../src/services/alarm.service.js", () => ({
  default: {
    getAlarms: vi.fn(),
    deleteAlarm: vi.fn(),
    deleteAllAlarms: vi.fn(),
    updateDeadline: vi.fn(),
    updateTask: vi.fn(),
    updateAlarmReadStatus: vi.fn(),
    updateAllAlarmReadStatus: vi.fn(),
    updateTaskAlarmStatus: vi.fn(),
    updateSubtaskAlarmStatus: vi.fn(),
    getUnreadAlarmCount: vi.fn(),
  },
}));
vi.mock("../../src/db.config.js", () => ({
  default: { $connect: vi.fn(), $disconnect: vi.fn() },
}));

import alarmService from "../../src/services/alarm.service.js";

const app = buildApp();
const AUTH = `Bearer ${generateToken(1)}`;

beforeEach(() => vi.clearAllMocks());

// ─── 알람 목록 조회 ────────────────────────────────────────────────
describe("GET /api/v1/alarm — 알람 목록 조회", () => {
  it("200: 정상 조회", async () => {
    alarmService.getAlarms.mockResolvedValue([{ id: 1, message: "마감 알림" }]);

    const res = await supertest(app)
      .get("/api/v1/alarm")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
  });

  it("200: query 파라미터(cursor, limit)와 함께 조회", async () => {
    alarmService.getAlarms.mockResolvedValue([]);

    const res = await supertest(app)
      .get("/api/v1/alarm?cursor=5&limit=10")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(alarmService.getAlarms).toHaveBeenCalledWith(
      1,
      5,
      10,
      undefined,
      undefined,
    );
  });

  it("401: 토큰 없음", async () => {
    const res = await supertest(app).get("/api/v1/alarm");
    expect(res.status).toBe(401);
  });
});

// ─── 최종 마감 알림 설정 변경 ──────────────────────────────────────
describe("PATCH /api/v1/alarm/settings/deadline — 마감 알림 설정", () => {
  it("200: 정상 변경", async () => {
    alarmService.updateDeadline.mockResolvedValue({ deadlineAlarm: 30 });

    const res = await supertest(app)
      .patch("/api/v1/alarm/settings/deadline")
      .set("Authorization", AUTH)
      .send({ deadlineAlarm: 30 });

    expect(res.status).toBe(200);
    expect(res.body.resultType).toBe("SUCCESS");
    expect(alarmService.updateDeadline).toHaveBeenCalledWith(1, 30);
  });

  it("400: deadlineAlarm 숫자 변환 불가 문자열", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/settings/deadline")
      .set("Authorization", AUTH)
      .send({ deadlineAlarm: "thirty" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
    const fields = res.body.data.map((d) => d.field);
    expect(fields).toContain("body.deadlineAlarm");
  });

  it("400: deadlineAlarm 누락", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/settings/deadline")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });
});

// ─── Task 마감 알림 설정 변경 ──────────────────────────────────────
describe("PATCH /api/v1/alarm/settings/task — Task 알림 설정", () => {
  it("200: 정상 변경", async () => {
    alarmService.updateTask.mockResolvedValue({ taskAlarm: 60 });

    const res = await supertest(app)
      .patch("/api/v1/alarm/settings/task")
      .set("Authorization", AUTH)
      .send({ taskAlarm: 60 });

    expect(res.status).toBe(200);
    expect(alarmService.updateTask).toHaveBeenCalledWith(1, 60);
  });

  it("400: taskAlarm 누락", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/settings/task")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });
});

// ─── 과제 알림 여부 설정 ────────────────────────────────────────────
describe("PATCH /api/v1/alarm/task/:taskId — 과제 알림 여부", () => {
  it("200: isAlarm true 설정", async () => {
    alarmService.updateTaskAlarmStatus.mockResolvedValue({ isAlarm: true });

    const res = await supertest(app)
      .patch("/api/v1/alarm/task/1")
      .set("Authorization", AUTH)
      .send({ isAlarm: true });

    expect(res.status).toBe(200);
    expect(alarmService.updateTaskAlarmStatus).toHaveBeenCalledWith(1, 1, true);
  });

  it("400: isAlarm 문자열 'true'는 실패", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/task/1")
      .set("Authorization", AUTH)
      .send({ isAlarm: "true" });

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });

  it("400: taskId가 비숫자", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/task/abc")
      .set("Authorization", AUTH)
      .send({ isAlarm: true });

    expect(res.status).toBe(400);
  });
});

// ─── 세부과제 알림 여부 설정 ────────────────────────────────────────
describe("PATCH /api/v1/alarm/subtask/:subtaskId — 세부과제 알림 여부", () => {
  it("200: isAlarm false 설정", async () => {
    alarmService.updateSubtaskAlarmStatus.mockResolvedValue({ isAlarm: false });

    const res = await supertest(app)
      .patch("/api/v1/alarm/subtask/3")
      .set("Authorization", AUTH)
      .send({ isAlarm: false });

    expect(res.status).toBe(200);
  });

  it("400: isAlarm 누락", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/subtask/3")
      .set("Authorization", AUTH)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.errorCode).toBe("VALIDATION_ERROR");
  });
});

// ─── 알림 읽음 처리 (단건) ──────────────────────────────────────────
describe("PATCH /api/v1/alarm/:alarmId — 알림 읽음 처리", () => {
  it("200: 정상 읽음 처리", async () => {
    alarmService.updateAlarmReadStatus.mockResolvedValue({ isRead: true });

    const res = await supertest(app)
      .patch("/api/v1/alarm/10")
      .set("Authorization", AUTH)
      .send({ isRead: true });

    expect(res.status).toBe(200);
  });

  it("400: alarmId가 0", async () => {
    const res = await supertest(app)
      .patch("/api/v1/alarm/0")
      .set("Authorization", AUTH)
      .send({ isRead: true });

    expect(res.status).toBe(400);
  });
});

// ─── 개별 알림 삭제 ────────────────────────────────────────────────
describe("DELETE /api/v1/alarm/:alarmId — 개별 알림 삭제", () => {
  it("200: 정상 삭제", async () => {
    alarmService.deleteAlarm.mockResolvedValue(null);

    const res = await supertest(app)
      .delete("/api/v1/alarm/5")
      .set("Authorization", AUTH);

    expect(res.status).toBe(200);
    expect(alarmService.deleteAlarm).toHaveBeenCalledWith(1, 5);
  });

  it("400: alarmId가 비숫자", async () => {
    const res = await supertest(app)
      .delete("/api/v1/alarm/abc")
      .set("Authorization", AUTH);

    expect(res.status).toBe(400);
  });
});
