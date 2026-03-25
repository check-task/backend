import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "../../src/validators/user.schema.js";

describe("updateProfileSchema", () => {
  it("모든 필드가 있어도 통과한다", () => {
    const result = updateProfileSchema.safeParse({
      body: {
        nickname: "홍길동",
        phoneNum: "010-1234-5678",
        email: "test@example.com",
        deadlineAlarm: 30,
        taskAlarm: 60,
      },
    });
    expect(result.success).toBe(true);
  });

  it("body가 없어도(완전 선택) 통과한다", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("body가 빈 객체여도 통과한다", () => {
    const result = updateProfileSchema.safeParse({ body: {} });
    expect(result.success).toBe(true);
  });

  it("nickname만 있어도 통과한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { nickname: "새닉네임" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.nickname).toBe("새닉네임");
  });

  it("nickname이 빈 문자열이면 실패한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { nickname: "" },
    });
    expect(result.success).toBe(false);
  });

  it("email 형식이 올바르지 않으면 실패한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { email: "not-an-email" },
    });
    expect(result.success).toBe(false);
  });

  it("올바른 email 형식은 통과한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { email: "user@example.com" },
    });
    expect(result.success).toBe(true);
  });

  it("deadlineAlarm이 숫자 문자열이면 숫자로 변환해 통과한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { deadlineAlarm: "30" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.deadlineAlarm).toBe(30);
  });

  it("deadlineAlarm이 변환 불가 문자열이면 실패한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { deadlineAlarm: "thirty" },
    });
    expect(result.success).toBe(false);
  });

  it("taskAlarm이 숫자 문자열이면 숫자로 변환해 통과한다", () => {
    const result = updateProfileSchema.safeParse({
      body: { taskAlarm: "60" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.taskAlarm).toBe(60);
  });
});
