import { describe, it, expect } from "vitest";
import {
  getAlarmListSchema,
  alarmIdParamSchema,
  updateDeadlineAlarmSchema,
  updateTaskAlarmSchema,
  updateAlarmReadStatusSchema,
  updateTaskAlarmStatusSchema,
  updateSubtaskAlarmStatusSchema,
} from "../../src/validators/alarm.schema.js";

describe("getAlarmListSchema", () => {
  it("query 파라미터가 없어도 통과한다", () => {
    const result = getAlarmListSchema.safeParse({ query: {} });
    expect(result.success).toBe(true);
  });

  it("cursor와 limit을 숫자로 변환한다", () => {
    const result = getAlarmListSchema.safeParse({
      query: { cursor: "5", limit: "10" },
    });
    expect(result.success).toBe(true);
    expect(result.data.query.cursor).toBe(5);
    expect(result.data.query.limit).toBe(10);
  });

  it("order가 asc/desc 이외 값이면 실패한다", () => {
    const result = getAlarmListSchema.safeParse({
      query: { order: "random" },
    });
    expect(result.success).toBe(false);
  });
});

describe("alarmIdParamSchema", () => {
  it("숫자 문자열을 숫자로 변환해 통과시킨다", () => {
    const result = alarmIdParamSchema.safeParse({
      params: { alarmId: "7" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.alarmId).toBe(7);
  });

  it("alarmId가 0이면 실패한다", () => {
    const result = alarmIdParamSchema.safeParse({
      params: { alarmId: "0" },
    });
    expect(result.success).toBe(false);
  });

  it("alarmId가 비숫자면 실패한다", () => {
    const result = alarmIdParamSchema.safeParse({
      params: { alarmId: "abc" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateDeadlineAlarmSchema", () => {
  it("숫자 문자열을 숫자로 변환해 통과시킨다", () => {
    const result = updateDeadlineAlarmSchema.safeParse({
      body: { deadlineAlarm: "30" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.deadlineAlarm).toBe(30);
  });

  it("숫자를 그대로 통과시킨다", () => {
    const result = updateDeadlineAlarmSchema.safeParse({
      body: { deadlineAlarm: 30 },
    });
    expect(result.success).toBe(true);
  });

  it("변환 불가 문자열이면 실패한다", () => {
    const result = updateDeadlineAlarmSchema.safeParse({
      body: { deadlineAlarm: "one" },
    });
    expect(result.success).toBe(false);
  });

  it("deadlineAlarm이 없으면 실패한다", () => {
    const result = updateDeadlineAlarmSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskAlarmSchema", () => {
  it("숫자를 통과시킨다", () => {
    const result = updateTaskAlarmSchema.safeParse({
      body: { taskAlarm: 60 },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.taskAlarm).toBe(60);
  });

  it("숫자 문자열을 숫자로 변환한다", () => {
    const result = updateTaskAlarmSchema.safeParse({
      body: { taskAlarm: "60" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.taskAlarm).toBe(60);
  });

  it("taskAlarm이 없으면 실패한다", () => {
    const result = updateTaskAlarmSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });
});

describe("updateAlarmReadStatusSchema", () => {
  it("isRead true는 통과한다", () => {
    const result = updateAlarmReadStatusSchema.safeParse({
      params: { alarmId: "10" },
      body: { isRead: true },
    });
    expect(result.success).toBe(true);
  });

  it("isRead false는 통과한다", () => {
    const result = updateAlarmReadStatusSchema.safeParse({
      params: { alarmId: "10" },
      body: { isRead: false },
    });
    expect(result.success).toBe(true);
  });

  it("isRead가 문자열 'true'면 실패한다", () => {
    const result = updateAlarmReadStatusSchema.safeParse({
      params: { alarmId: "10" },
      body: { isRead: "true" },
    });
    expect(result.success).toBe(false);
  });

  it("isRead가 없으면 실패한다", () => {
    const result = updateAlarmReadStatusSchema.safeParse({
      params: { alarmId: "10" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskAlarmStatusSchema", () => {
  it("isAlarm true를 통과시킨다", () => {
    const result = updateTaskAlarmStatusSchema.safeParse({
      params: { taskId: "1" },
      body: { isAlarm: true },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(1);
  });

  it("isAlarm false를 통과시킨다", () => {
    const result = updateTaskAlarmStatusSchema.safeParse({
      params: { taskId: "1" },
      body: { isAlarm: false },
    });
    expect(result.success).toBe(true);
  });

  it("isAlarm이 문자열이면 실패한다", () => {
    const result = updateTaskAlarmStatusSchema.safeParse({
      params: { taskId: "1" },
      body: { isAlarm: "true" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSubtaskAlarmStatusSchema", () => {
  it("isAlarm true는 통과한다", () => {
    const result = updateSubtaskAlarmStatusSchema.safeParse({
      params: { subtaskId: "5" },
      body: { isAlarm: true },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.subtaskId).toBe(5);
  });

  it("isAlarm이 문자열 'true'면 실패한다", () => {
    const result = updateSubtaskAlarmStatusSchema.safeParse({
      params: { subtaskId: "5" },
      body: { isAlarm: "true" },
    });
    expect(result.success).toBe(false);
  });

  it("isAlarm이 없으면 실패한다", () => {
    const result = updateSubtaskAlarmStatusSchema.safeParse({
      params: { subtaskId: "5" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});
