import { describe, it, expect } from "vitest";
import { getTaskMembersSchema } from "../../src/validators/member.schema.js";

describe("getTaskMembersSchema", () => {
  it("정상 요청을 통과시키고 taskId를 숫자로 변환한다", () => {
    const result = getTaskMembersSchema.safeParse({
      params: { taskId: "5" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(5);
  });

  it("taskId가 0이면 실패한다", () => {
    const result = getTaskMembersSchema.safeParse({
      params: { taskId: "0" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 음수면 실패한다", () => {
    const result = getTaskMembersSchema.safeParse({
      params: { taskId: "-1" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 비숫자 문자열이면 실패한다", () => {
    const result = getTaskMembersSchema.safeParse({
      params: { taskId: "abc" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 없으면 실패한다", () => {
    const result = getTaskMembersSchema.safeParse({
      params: {},
    });
    expect(result.success).toBe(false);
  });
});
