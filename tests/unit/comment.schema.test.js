import { describe, it, expect } from "vitest";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
} from "../../src/validators/comment.schema.js";

describe("createCommentSchema", () => {
  it("정상 요청을 통과시키고 subTaskId를 숫자로 변환한다", () => {
    const result = createCommentSchema.safeParse({
      params: { subTaskId: "3" },
      body: { content: "좋은 댓글입니다." },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.subTaskId).toBe(3);
  });

  it("content가 빈 문자열이면 실패한다", () => {
    const result = createCommentSchema.safeParse({
      params: { subTaskId: "3" },
      body: { content: "" },
    });
    expect(result.success).toBe(false);
  });

  it("content가 없으면 실패한다", () => {
    const result = createCommentSchema.safeParse({
      params: { subTaskId: "3" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("subTaskId가 0이면 실패한다", () => {
    const result = createCommentSchema.safeParse({
      params: { subTaskId: "0" },
      body: { content: "댓글" },
    });
    expect(result.success).toBe(false);
  });

  it("subTaskId가 비숫자면 실패한다", () => {
    const result = createCommentSchema.safeParse({
      params: { subTaskId: "abc" },
      body: { content: "댓글" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateCommentSchema", () => {
  it("정상 요청을 통과시키고 commentId를 숫자로 변환한다", () => {
    const result = updateCommentSchema.safeParse({
      params: { commentId: "5" },
      body: { content: "수정된 댓글" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.commentId).toBe(5);
  });

  it("content가 빈 문자열이면 실패한다", () => {
    const result = updateCommentSchema.safeParse({
      params: { commentId: "5" },
      body: { content: "" },
    });
    expect(result.success).toBe(false);
  });

  it("content가 없으면 실패한다", () => {
    const result = updateCommentSchema.safeParse({
      params: { commentId: "5" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("commentId가 음수면 실패한다", () => {
    const result = updateCommentSchema.safeParse({
      params: { commentId: "-1" },
      body: { content: "댓글" },
    });
    expect(result.success).toBe(false);
  });
});

describe("deleteCommentSchema", () => {
  it("commentId가 숫자 문자열이면 통과하고 숫자로 변환한다", () => {
    const result = deleteCommentSchema.safeParse({
      params: { commentId: "7" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.commentId).toBe(7);
  });

  it("commentId가 0이면 실패한다", () => {
    const result = deleteCommentSchema.safeParse({
      params: { commentId: "0" },
    });
    expect(result.success).toBe(false);
  });

  it("commentId가 비숫자면 실패한다", () => {
    const result = deleteCommentSchema.safeParse({
      params: { commentId: "abc" },
    });
    expect(result.success).toBe(false);
  });
});
