import { describe, it, expect } from "vitest";
import {
  createReferenceSchema,
  updateReferenceSchema,
  deleteReferenceSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
  deleteCommunicationSchema,
  createLogSchema,
  updateLogSchema,
  deleteLogSchema,
} from "../../src/validators/modal.schema.js";

// ─── 자료(Reference) ───────────────────────────────────────────────
describe("createReferenceSchema", () => {
  it("url 타입 요청을 통과시키고 taskId를 숫자로 변환한다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "1" },
      query: { type: "url" },
      body: { name: "참고자료", url: "https://example.com" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(1);
  });

  it("file 타입 요청을 통과시킨다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "1" },
      query: { type: "file" },
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

  it("type이 없으면 실패한다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "1" },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 0이면 실패한다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "0" },
      query: { type: "url" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 비숫자면 실패한다", () => {
    const result = createReferenceSchema.safeParse({
      params: { taskId: "abc" },
      query: { type: "url" },
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

  it("url만 있어도 통과한다", () => {
    const result = updateReferenceSchema.safeParse({
      params: { taskId: "1", referenceId: "2" },
      body: { url: "https://new.com" },
    });
    expect(result.success).toBe(true);
  });

  it("file_url만 있어도 통과한다", () => {
    const result = updateReferenceSchema.safeParse({
      params: { taskId: "1", referenceId: "2" },
      body: { file_url: "https://s3.example.com/file.pdf" },
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

  it("referenceId가 0이면 실패한다", () => {
    const result = updateReferenceSchema.safeParse({
      params: { taskId: "1", referenceId: "0" },
      body: { name: "이름" },
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteReferenceSchema", () => {
  it("taskId와 referenceId가 정상이면 통과하고 숫자로 변환한다", () => {
    const result = deleteReferenceSchema.safeParse({
      params: { taskId: "3", referenceId: "7" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(3);
    expect(result.data.params.referenceId).toBe(7);
  });

  it("referenceId가 없으면 실패한다", () => {
    const result = deleteReferenceSchema.safeParse({
      params: { taskId: "3" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 음수면 실패한다", () => {
    const result = deleteReferenceSchema.safeParse({
      params: { taskId: "-1", referenceId: "7" },
    });
    expect(result.success).toBe(false);
  });
});

// ─── 커뮤니케이션 ──────────────────────────────────────────────────
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

  it("name이 없으면 실패한다", () => {
    const result = createCommunicationSchema.safeParse({
      params: { taskId: "1" },
      body: { url: "https://slack.com" },
    });
    expect(result.success).toBe(false);
  });

  it("name이 빈 문자열이면 실패한다", () => {
    const result = createCommunicationSchema.safeParse({
      params: { taskId: "1" },
      body: { name: "", url: "https://slack.com" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCommunicationSchema", () => {
  it("name만 있어도 통과한다", () => {
    const result = updateCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "3" },
      body: { name: "새 이름" },
    });
    expect(result.success).toBe(true);
  });

  it("url만 있어도 통과한다", () => {
    const result = updateCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "3" },
      body: { url: "https://new.com" },
    });
    expect(result.success).toBe(true);
  });

  it("수정값이 하나도 없으면 실패한다", () => {
    const result = updateCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "3" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("communicationId가 비숫자면 실패한다", () => {
    const result = updateCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "abc" },
      body: { name: "이름" },
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteCommunicationSchema", () => {
  it("taskId와 communicationId가 정상이면 통과한다", () => {
    const result = deleteCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "5" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.communicationId).toBe(5);
  });

  it("communicationId가 0이면 실패한다", () => {
    const result = deleteCommunicationSchema.safeParse({
      params: { taskId: "1", communicationId: "0" },
    });
    expect(result.success).toBe(false);
  });
});

// ─── 회의록 ────────────────────────────────────────────────────────
describe("createLogSchema", () => {
  it("date만 있어도 통과한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "1" },
      body: { date: "2026-03-20" },
    });
    expect(result.success).toBe(true);
  });

  it("모든 필드가 있어도 통과한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "1" },
      body: {
        date: "2026-03-20",
        agenda: "안건",
        conclusion: "결론",
        discussion: "논의 내용",
      },
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

  it("date가 빈 문자열이면 실패한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "1" },
      body: { date: "" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 0이면 실패한다", () => {
    const result = createLogSchema.safeParse({
      params: { taskId: "0" },
      body: { date: "2026-03-20" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateLogSchema", () => {
  it("date만 있어도 통과한다", () => {
    const result = updateLogSchema.safeParse({
      params: { taskId: "1", logId: "2" },
      body: { date: "2026-03-21" },
    });
    expect(result.success).toBe(true);
  });

  it("agenda만 있어도 통과한다", () => {
    const result = updateLogSchema.safeParse({
      params: { taskId: "1", logId: "2" },
      body: { agenda: "새 안건" },
    });
    expect(result.success).toBe(true);
  });

  it("수정값이 하나도 없으면 실패한다", () => {
    const result = updateLogSchema.safeParse({
      params: { taskId: "1", logId: "2" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("logId가 음수면 실패한다", () => {
    const result = updateLogSchema.safeParse({
      params: { taskId: "1", logId: "-1" },
      body: { agenda: "안건" },
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteLogSchema", () => {
  it("taskId와 logId가 정상이면 통과하고 숫자로 변환한다", () => {
    const result = deleteLogSchema.safeParse({
      params: { taskId: "2", logId: "9" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(2);
    expect(result.data.params.logId).toBe(9);
  });

  it("logId가 없으면 실패한다", () => {
    const result = deleteLogSchema.safeParse({
      params: { taskId: "2" },
    });
    expect(result.success).toBe(false);
  });

  it("logId가 비숫자면 실패한다", () => {
    const result = deleteLogSchema.safeParse({
      params: { taskId: "2", logId: "abc" },
    });
    expect(result.success).toBe(false);
  });
});
