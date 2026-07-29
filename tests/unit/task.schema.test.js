import { describe, it, expect } from "vitest";
import {
  createTaskSchema,
  updateTaskDeadlineSchema,
  updateSubTaskStatusSchema,
  updateTaskPrioritiesSchema,
  joinTaskSchema,
  addSubTaskSchema,
  updateSubTaskDeadlineSchema,
  updateTeamMemberSchema,
  taskIdParamSchema,
} from "../../src/validators/task.schema.js";

describe("createTaskSchema", () => {
  it("정상 요청을 통과시킨다", () => {
    const result = createTaskSchema.safeParse({
      body: { title: "과제 제목", folderId: 1, type: "PERSONAL" },
    });
    expect(result.success).toBe(true);
  });

  it("title이 없으면 실패하고 에러 path에 body.title이 포함된다", () => {
    const result = createTaskSchema.safeParse({
      body: { folderId: 1 },
    });
    expect(result.success).toBe(false);
    const fields = result.error.issues.map((i) => i.path.join("."));
    expect(fields).toContain("body.title");
  });

  it("folderId가 음수면 실패한다", () => {
    const result = createTaskSchema.safeParse({
      body: { title: "제목", folderId: -1 },
    });
    expect(result.success).toBe(false);
  });

  it("folderId가 0이면 실패한다", () => {
    const result = createTaskSchema.safeParse({
      body: { title: "제목", folderId: 0 },
    });
    expect(result.success).toBe(false);
  });

  it("type이 잘못된 값이면 실패한다", () => {
    const result = createTaskSchema.safeParse({
      body: { title: "제목", folderId: 1, type: "INVALID" },
    });
    expect(result.success).toBe(false);
  });

  it("type 기본값은 PERSONAL이다", () => {
    const result = createTaskSchema.safeParse({
      body: { title: "제목", folderId: 1 },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.type).toBe("PERSONAL");
  });

  it("subTasks를 포함한 요청을 통과시킨다", () => {
    const result = createTaskSchema.safeParse({
      body: {
        title: "제목",
        folderId: 1,
        subTasks: [{ title: "세부과제1", endDate: "2026-12-31" }],
      },
    });
    expect(result.success).toBe(true);
  });

  it("subTasks 항목에 title이 없으면 실패한다", () => {
    const result = createTaskSchema.safeParse({
      body: {
        title: "제목",
        folderId: 1,
        subTasks: [{ endDate: "2026-12-31" }],
      },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskDeadlineSchema", () => {
  it("정상 요청을 통과시키고 taskId를 숫자로 변환한다", () => {
    const result = updateTaskDeadlineSchema.safeParse({
      params: { taskId: "5" },
      body: { deadline: "2026-12-31" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(5);
    expect(typeof result.data.params.taskId).toBe("number");
  });

  it("taskId가 비숫자면 실패한다", () => {
    const result = updateTaskDeadlineSchema.safeParse({
      params: { taskId: "abc" },
      body: { deadline: "2026-12-31" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 0이면 실패한다", () => {
    const result = updateTaskDeadlineSchema.safeParse({
      params: { taskId: "0" },
      body: { deadline: "2026-12-31" },
    });
    expect(result.success).toBe(false);
  });

  it("deadline이 없으면 실패한다", () => {
    const result = updateTaskDeadlineSchema.safeParse({
      params: { taskId: "1" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("deadline이 빈 문자열이면 실패한다", () => {
    const result = updateTaskDeadlineSchema.safeParse({
      params: { taskId: "1" },
      body: { deadline: "" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateSubTaskStatusSchema", () => {
  it("COMPLETED는 통과한다", () => {
    const result = updateSubTaskStatusSchema.safeParse({
      params: { subTaskId: "3" },
      body: { status: "COMPLETED" },
    });
    expect(result.success).toBe(true);
  });

  it("PENDING은 통과한다", () => {
    const result = updateSubTaskStatusSchema.safeParse({
      params: { subTaskId: "3" },
      body: { status: "PENDING" },
    });
    expect(result.success).toBe(true);
  });

  it("잘못된 status 값은 실패한다", () => {
    const result = updateSubTaskStatusSchema.safeParse({
      params: { subTaskId: "3" },
      body: { status: "DONE" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTaskPrioritiesSchema", () => {
  it("정상 배열을 통과시킨다", () => {
    const result = updateTaskPrioritiesSchema.safeParse({
      body: {
        orderedTasks: [
          { taskId: 1, rank: 1 },
          { taskId: 2, rank: 2 },
        ],
      },
    });
    expect(result.success).toBe(true);
  });

  it("빈 배열이면 실패한다", () => {
    const result = updateTaskPrioritiesSchema.safeParse({
      body: { orderedTasks: [] },
    });
    expect(result.success).toBe(false);
  });

  it("orderedTasks가 없으면 실패한다", () => {
    const result = updateTaskPrioritiesSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });
});

describe("joinTaskSchema", () => {
  it("inviteCode가 있으면 통과한다", () => {
    const result = joinTaskSchema.safeParse({ body: { inviteCode: "ABC123" } });
    expect(result.success).toBe(true);
  });

  it("inviteCode가 없으면 실패한다", () => {
    const result = joinTaskSchema.safeParse({ body: {} });
    expect(result.success).toBe(false);
  });

  it("inviteCode가 빈 문자열이면 실패한다", () => {
    const result = joinTaskSchema.safeParse({ body: { inviteCode: "" } });
    expect(result.success).toBe(false);
  });
});

describe("addSubTaskSchema", () => {
  it("정상 요청을 통과시킨다", () => {
    const result = addSubTaskSchema.safeParse({
      params: { taskId: "1" },
      body: { title: "세부과제 제목" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(1);
  });

  it("title이 없으면 실패한다", () => {
    const result = addSubTaskSchema.safeParse({
      params: { taskId: "1" },
      body: {},
    });
    expect(result.success).toBe(false);
  });

  it("endDate는 선택사항이다", () => {
    const result = addSubTaskSchema.safeParse({
      params: { taskId: "1" },
      body: { title: "세부과제", endDate: "2026-12-31" },
    });
    expect(result.success).toBe(true);
  });

  it("deadline을 생략하면 마감일 미지정으로 통과한다", () => {
    const result = addSubTaskSchema.safeParse({
      params: { taskId: "1" },
      body: { title: "세부과제" },
    });
    expect(result.success).toBe(true);
  });

  it("deadline이 null이면 마감일 미지정으로 통과한다", () => {
    const result = addSubTaskSchema.safeParse({
      params: { taskId: "1" },
      body: { title: "세부과제", deadline: null },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.deadline).toBeNull();
  });
});

describe("updateSubTaskDeadlineSchema", () => {
  it("날짜 문자열을 통과시킨다", () => {
    const result = updateSubTaskDeadlineSchema.safeParse({
      params: { subTaskId: "10" },
      body: { endDate: "2026-12-31" },
    });
    expect(result.success).toBe(true);
  });

  it("endDate가 null이면 마감일 미지정으로 통과한다", () => {
    const result = updateSubTaskDeadlineSchema.safeParse({
      params: { subTaskId: "10" },
      body: { endDate: null },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.endDate).toBeNull();
  });

  it("endDate가 빈 문자열이면 null로 변환된다", () => {
    const result = updateSubTaskDeadlineSchema.safeParse({
      params: { subTaskId: "10" },
      body: { endDate: "" },
    });
    expect(result.success).toBe(true);
    expect(result.data.body.endDate).toBeNull();
  });

  it("endDate 필드 자체가 없으면 실패한다", () => {
    const result = updateSubTaskDeadlineSchema.safeParse({
      params: { subTaskId: "10" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});

describe("taskIdParamSchema", () => {
  it("숫자 문자열을 숫자로 변환해 통과시킨다", () => {
    const result = taskIdParamSchema.safeParse({
      params: { taskId: "42" },
    });
    expect(result.success).toBe(true);
    expect(result.data.params.taskId).toBe(42);
  });

  it("taskId가 0이면 실패한다", () => {
    const result = taskIdParamSchema.safeParse({
      params: { taskId: "0" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 음수면 실패한다", () => {
    const result = taskIdParamSchema.safeParse({
      params: { taskId: "-5" },
    });
    expect(result.success).toBe(false);
  });

  it("taskId가 비숫자면 실패한다", () => {
    const result = taskIdParamSchema.safeParse({
      params: { taskId: "abc" },
    });
    expect(result.success).toBe(false);
  });
});

describe("updateTeamMemberSchema", () => {
  it("role 0(Owner)은 통과한다", () => {
    const result = updateTeamMemberSchema.safeParse({
      params: { taskId: "1", userId: "2" },
      body: { role: 0 },
    });
    expect(result.success).toBe(true);
  });

  it("role 1(Member)은 통과한다", () => {
    const result = updateTeamMemberSchema.safeParse({
      params: { taskId: "1", userId: "2" },
      body: { role: 1 },
    });
    expect(result.success).toBe(true);
  });

  it("role 2는 실패한다", () => {
    const result = updateTeamMemberSchema.safeParse({
      params: { taskId: "1", userId: "2" },
      body: { role: 2 },
    });
    expect(result.success).toBe(false);
  });

  it("role이 없으면 실패한다", () => {
    const result = updateTeamMemberSchema.safeParse({
      params: { taskId: "1", userId: "2" },
      body: {},
    });
    expect(result.success).toBe(false);
  });
});
