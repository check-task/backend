import { describe, it, expect } from "vitest";
import {
  createReferenceSchema,
  updateReferenceSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
  createLogSchema,
  updateLogSchema,
} from "../../src/validators/modal.schema.js";

describe("createReferenceSchema", () => {
  it("url 타입 요청을 통과시킨다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "1" },
      query: { type: "url" },
      body: { name: "참고자료", url: "https://example.com" },
    });
    expect(result.success).toBe(true);
  });

  it("잘못된 type이면 실패한다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "1" },
      query: { type: "image" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateReferenceSchema", () => {
  it("name만 있어도 통과한다", () => {
    const result = updateReferenceSchema.safeParse({
      params: { taskId: "1", referenceId: "2" },
      body: { name: "새 이름" },
    });
    expect(result.success).toBe(true);
  });

  it("수정값이 하나도 없으면 실패한다", () => {
    const result = updateReferenceSchema.safeParse({
      params: { taskId: "1", referenceId: "2" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("createCommunicationSchema", () => {
  it("name과 url이 모두 있으면 통과한다", () => {
    const result = createCommunicationSchema.safeParse({
      params: { taskId: "1" },
      body: { name: "슬랙", url: "https://slack.com" },
    });
    expect(result.success).toBe(true);
  });

  it("url이 없으면 실패한다", () => {
    const result = createCommunicationSchema.safeParse({
      params: { taskId: "1" },
      body: { name: "슬랙" },
    });
    expect(result.success).toBe(false);
  });
});

describe("createLogSchema", () => {
  it("date만 있어도 통과한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "1" },
      body: { date: "2026-03-20" },
    });
    expect(result.success).toBe(true);
  });

  it("date가 없으면 실패한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "1" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLogSchema", () => {
  it("수정값이 하나도 없으면 실패한다", () => {
    const result = updateLogSchema.safeParse({
      params: { taskId: "1", logId: "2" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});
