/**
 * 세부 과제(SubTask) 마감일 미지정(endDate = null) 동작 검증
 *
 * 정책: 마감일이 없으면 알림 시각을 계산할 수 없으므로 알림을 만들지 않는다.
 *       마감일이 나중에 지정되면 그 시점에 알림이 생성된다.
 *
 * 각 테스트는 필요한 목을 명시적으로 지정한다(목 누수로 우연히 통과하는 것을 막기 위함).
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { calculateAlarmDate } from "../../src/utils/calculateAlarmDate.js";

const mockTx = {
  user: { findFirst: vi.fn(), findUnique: vi.fn() },
  member: { findMany: vi.fn() },
  subTask: { findMany: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
};

vi.mock("../../src/db.config.js", () => {
  const prisma = {
    $transaction: vi.fn(async (fn) => fn(mockTx)),
    user: { findUnique: vi.fn() },
    member: { findFirst: vi.fn(), findMany: vi.fn() },
    subTask: { findMany: vi.fn(), findUnique: vi.fn() },
    userAlarm: { findFirst: vi.fn() },
  };
  return { prisma, default: prisma };
});

vi.mock("../../src/repositories/alarm.repository.js", () => ({
  default: {
    createTaskAlarm: vi.fn().mockResolvedValue({ id: 1 }),
    createSubTaskAlarm: vi.fn().mockResolvedValue({ id: 2 }),
    updateAlarmsForTaskDeadline: vi.fn().mockResolvedValue(undefined),
    updateAlarmsForSubTaskDeadline: vi.fn().mockResolvedValue(undefined),
    updateAlarm: vi.fn().mockResolvedValue({}),
    deleteAlarmById: vi.fn().mockResolvedValue({}),
    deleteSubTaskAlarm: vi.fn().mockResolvedValue({}),
    deleteAlarmsBySubTaskIds: vi.fn().mockResolvedValue({}),
    updateSubtaskAlarmStatus: vi.fn(),
  },
}));

vi.mock("../../src/repositories/task.repository.js", () => ({
  default: {
    createTask: vi.fn(),
    createMember: vi.fn(),
    findMaxRank: vi.fn(),
    upsertTaskPriority: vi.fn(),
    addSubTasks: vi.fn(),
    findFolderById: vi.fn(),
    findFolderByUserIdAndName: vi.fn(),
    createSubTask: vi.fn(),
    findTaskById: vi.fn(),
    findSubTaskById: vi.fn(),
    updateSubTask: vi.fn(),
    updateTask: vi.fn(),
    findAlarmBySubTaskId: vi.fn(),
    findMemberInTask: vi.fn(),
  },
}));

import { prisma } from "../../src/db.config.js";
import alarmRepository from "../../src/repositories/alarm.repository.js";
import taskRepository from "../../src/repositories/task.repository.js";
import taskService from "../../src/services/task.service.js";
import alarmService from "../../src/services/alarm.service.js";
import { TaskRequestDTO, TaskResponseDTO } from "../../src/dtos/task.dto.js";

const resetAll = () => {
  vi.clearAllMocks();
  // clearAllMocks는 구현(mockResolvedValue)을 지우지 않으므로 명시적으로 초기화한다.
  for (const fn of Object.values(taskRepository)) fn.mockReset();
  mockTx.user.findFirst.mockReset();
  mockTx.user.findUnique.mockReset();
  mockTx.member.findMany.mockReset();
  mockTx.subTask.findMany.mockReset();
  mockTx.subTask.update.mockReset();
  prisma.subTask.findMany.mockReset();
  prisma.subTask.findUnique.mockReset();
  prisma.userAlarm.findFirst.mockReset();
};

// ─── 세부 과제 생성 ────────────────────────────────────────────────
describe("createSingleSubTask — 마감일 미지정 생성", () => {
  beforeEach(resetAll);

  const arrangeParent = ({ deadline = null } = {}) => {
    taskRepository.findTaskById.mockResolvedValue({
      id: 5,
      type: "PERSONAL",
      deadline,
    });
    taskRepository.findMemberInTask.mockResolvedValue({
      id: 1,
      userId: 1,
      taskId: 5,
      role: false,
    });
    prisma.member.findMany.mockResolvedValue([{ id: 1, userId: 1, taskId: 5 }]);
  };

  it("deadline을 생략하면 endDate가 null로 저장되고 알림은 생성되지 않는다", async () => {
    arrangeParent();
    taskRepository.createSubTask.mockResolvedValue({
      id: 30,
      taskId: 5,
      title: "마감일 없는 세부과제",
      endDate: null,
      isAlarm: true,
      subTaskAssignees: [
        {
          member: {
            id: 1,
            userId: 1,
            user: { id: 1, nickname: "u1", alarmSetting: { taskAlarm: 6 } },
          },
        },
      ],
    });

    const result = await taskService.createSingleSubTask(1, 5, {
      title: "마감일 없는 세부과제",
    });

    const [createArg] = taskRepository.createSubTask.mock.calls[0];
    expect(createArg.endDate).toBeNull();
    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
    expect(result.deadline).toBeNull();
  });

  it("deadline이 명시적으로 null이어도 endDate가 null로 저장된다", async () => {
    arrangeParent();
    taskRepository.createSubTask.mockResolvedValue({
      id: 31,
      taskId: 5,
      title: "세부과제",
      endDate: null,
      isAlarm: true,
      subTaskAssignees: [
        {
          member: {
            id: 1,
            userId: 1,
            user: { id: 1, nickname: "u1", alarmSetting: { taskAlarm: 6 } },
          },
        },
      ],
    });

    await taskService.createSingleSubTask(1, 5, {
      title: "세부과제",
      deadline: null,
    });

    const [createArg] = taskRepository.createSubTask.mock.calls[0];
    expect(createArg.endDate).toBeNull();
    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
  });

  it("빈 문자열 deadline도 미지정으로 처리한다", async () => {
    arrangeParent();
    taskRepository.createSubTask.mockResolvedValue({
      id: 32,
      taskId: 5,
      title: "세부과제",
      endDate: null,
      isAlarm: true,
      subTaskAssignees: [],
    });

    await taskService.createSingleSubTask(1, 5, {
      title: "세부과제",
      deadline: "",
    });

    const [createArg] = taskRepository.createSubTask.mock.calls[0];
    expect(createArg.endDate).toBeNull();
  });

  it("부모 과제에 마감일이 있어도 미지정 세부과제는 마감일 비교 없이 생성된다", async () => {
    arrangeParent({ deadline: new Date(Date.UTC(2026, 0, 1)) });
    taskRepository.createSubTask.mockResolvedValue({
      id: 33,
      taskId: 5,
      title: "세부과제",
      endDate: null,
      isAlarm: true,
      subTaskAssignees: [],
    });

    await expect(
      taskService.createSingleSubTask(1, 5, { title: "세부과제" }),
    ).resolves.toMatchObject({ subTaskId: 33 });
  });

  it("날짜 형식이 잘못되면 INVALID_DATE로 거부한다", async () => {
    arrangeParent();
    taskRepository.findMemberInTask.mockResolvedValue({
      id: 1,
      role: false,
      user: { alarmSetting: { taskAlarm: 24 } },
    });

    await expect(
      taskService.createSingleSubTask(1, 5, {
        title: "세부과제",
        deadline: "날짜아님",
      }),
    ).rejects.toMatchObject({ errorCode: "INVALID_DATE" });

    expect(taskRepository.createSubTask).not.toHaveBeenCalled();
  });
});

// ─── 과제 생성 시 세부과제 일괄 등록 ────────────────────────────────
describe("registerTask — 마감일 지정/미지정 세부과제 혼재", () => {
  beforeEach(resetAll);

  it("미지정 세부과제는 endDate null로 저장되고, 지정된 것만 알림이 생성된다", async () => {
    const taskDeadline = new Date(Date.UTC(2026, 5, 30, 0, 0, 0));
    const stEnd = new Date(Date.UTC(2026, 5, 20, 0, 0, 0));

    taskRepository.findFolderByUserIdAndName.mockResolvedValue({ id: 9 });
    taskRepository.createTask.mockResolvedValue({
      id: 40,
      title: "과제",
      deadline: taskDeadline,
      type: "PERSONAL",
      isAlarm: false,
    });
    taskRepository.createMember.mockResolvedValue({ id: 3 });
    taskRepository.findMaxRank.mockResolvedValue(0);
    taskRepository.upsertTaskPriority.mockResolvedValue({});
    mockTx.member.findMany.mockResolvedValue([{ id: 3, userId: 1 }]);

    const assigneeMock = {
      member: {
        id: 3,
        userId: 1,
        user: { id: 1, nickname: "u1", alarmSetting: { taskAlarm: 8 } },
      },
    };
    taskRepository.createSubTask.mockImplementation(async (row) => {
      if (row.title === "마감일 있음") {
        return {
          id: 401,
          taskId: 40,
          title: "마감일 있음",
          endDate: stEnd,
          isAlarm: true,
          subTaskAssignees: [assigneeMock],
        };
      }
      return {
        id: 402,
        taskId: 40,
        title: "마감일 없음",
        endDate: null,
        isAlarm: true,
        subTaskAssignees: [assigneeMock],
      };
    });

    await taskService.registerTask(1, {
      title: "과제",
      type: "PERSONAL",
      deadline: taskDeadline,
      isAlarm: false,
      subTasks: [
        { title: "마감일 있음", endDate: stEnd },
        { title: "마감일 없음", endDate: null },
      ],
    });

    const createCalls = taskRepository.createSubTask.mock.calls;
    expect(createCalls[0][0].endDate).toEqual(stEnd);
    expect(createCalls[1][0].endDate).toBeNull();

    // 마감일이 있는 세부과제 1건에 대해서만 알림 생성
    expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledTimes(1);
    expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
      1,
      40,
      401,
      "마감일 있음",
      calculateAlarmDate(stEnd, 8),
      mockTx,
    );
  });
});

// ─── 세부 과제 마감일 변경 ─────────────────────────────────────────
describe("updateSubTaskDeadline — 마감일 해제/재지정", () => {
  beforeEach(resetAll);

  const arrangeSubTask = (overrides = {}) => {
    prisma.subTask.findUnique.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: true,
      endDate: new Date(Date.UTC(2026, 5, 20)),
      task: { deadline: new Date(Date.UTC(2026, 11, 31)) },
      subTaskAssignees: [
        { member: { userId: 7, user: { alarmSetting: { taskAlarm: 5 } } } },
      ],
      ...overrides,
    });
    taskRepository.findMemberInTask.mockResolvedValue({ id: 7 });
  };

  it("마감일 → null: endDate가 null로 저장되고 기존 알림이 모두 삭제된다", async () => {
    arrangeSubTask();
    mockTx.subTask.update.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: true,
      endDate: null,
    });

    const result = await taskService.updateSubTaskDeadline(50, null, 1);

    const [updateArg] = mockTx.subTask.update.mock.calls[0];
    expect(updateArg.data.endDate).toBeNull();
    expect(alarmRepository.deleteAlarmsBySubTaskIds).toHaveBeenCalledWith(
      [50],
      mockTx,
    );
    expect(alarmRepository.updateAlarmsForSubTaskDeadline).not.toHaveBeenCalled();
    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
    expect(result.endDate).toBeNull();
  });

  it("빈 문자열도 마감일 해제로 처리한다", async () => {
    arrangeSubTask();
    mockTx.subTask.update.mockResolvedValue({ id: 50, endDate: null });

    await taskService.updateSubTaskDeadline(50, "", 1);

    const [updateArg] = mockTx.subTask.update.mock.calls[0];
    expect(updateArg.data.endDate).toBeNull();
    expect(alarmRepository.deleteAlarmsBySubTaskIds).toHaveBeenCalledWith(
      [50],
      mockTx,
    );
  });

  it("null → 마감일 지정: 알림이 없던 세부과제에 알림이 새로 생성된다", async () => {
    arrangeSubTask({ endDate: null });
    taskRepository.findAlarmBySubTaskId.mockResolvedValue(null);
    mockTx.subTask.update.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: true,
      endDate: new Date(Date.UTC(2026, 5, 25)),
    });

    await taskService.updateSubTaskDeadline(50, "2026-06-25", 1);

    const [updateArg] = mockTx.subTask.update.mock.calls[0];
    expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
      7,
      60,
      50,
      "세부과제",
      calculateAlarmDate(updateArg.data.endDate, 5),
      mockTx,
    );
    expect(alarmRepository.deleteAlarmsBySubTaskIds).not.toHaveBeenCalled();
  });

  it("null → 마감일 지정: 담당자가 없으면 알림을 만들지 않는다", async () => {
    arrangeSubTask({ endDate: null, subTaskAssignees: [] });
    taskRepository.findAlarmBySubTaskId.mockResolvedValue(null);
    mockTx.subTask.update.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: true,
      endDate: new Date(Date.UTC(2026, 5, 25)),
    });

    await taskService.updateSubTaskDeadline(50, "2026-06-25", 1);

    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
  });

  it("null → 마감일 지정: isAlarm이 꺼져 있으면 알림을 만들지 않는다", async () => {
    arrangeSubTask({ endDate: null });
    taskRepository.findAlarmBySubTaskId.mockResolvedValue(null);
    mockTx.subTask.update.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: false,
      endDate: new Date(Date.UTC(2026, 5, 25)),
    });

    await taskService.updateSubTaskDeadline(50, "2026-06-25", 1);

    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
  });

  it("기존 알림이 있으면 재생성하지 않고 시각만 갱신한다", async () => {
    arrangeSubTask();
    taskRepository.findAlarmBySubTaskId.mockResolvedValue({ id: 999 });
    mockTx.subTask.update.mockResolvedValue({
      id: 50,
      taskId: 60,
      title: "세부과제",
      isAlarm: true,
      endDate: new Date(Date.UTC(2026, 5, 25)),
    });

    await taskService.updateSubTaskDeadline(50, "2026-06-25", 1);

    const [updateArg] = mockTx.subTask.update.mock.calls[0];
    expect(
      alarmRepository.updateAlarmsForSubTaskDeadline,
    ).toHaveBeenCalledWith(50, updateArg.data.endDate, mockTx);
    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
  });

  it("부모 과제 마감일을 초과하는 날짜는 거부한다", async () => {
    arrangeSubTask({ endDate: null });

    await expect(
      taskService.updateSubTaskDeadline(50, "2027-01-01", 1),
    ).rejects.toThrow("부모 Task의 마감일을 초과할 수 없습니다.");

    expect(mockTx.subTask.update).not.toHaveBeenCalled();
  });

  it("날짜 형식이 잘못되면 INVALID_DATE로 거부한다", async () => {
    arrangeSubTask();

    await expect(
      taskService.updateSubTaskDeadline(50, "날짜아님", 1),
    ).rejects.toMatchObject({ errorCode: "INVALID_DATE" });

    expect(mockTx.subTask.update).not.toHaveBeenCalled();
  });
});

// ─── 세부 과제 일괄 수정 ───────────────────────────────────────────
describe("updateSelectedSubTasks — 일괄 수정으로 마감일 해제", () => {
  beforeEach(resetAll);

  it("마감일이 null이 되면 기존 알림을 삭제한다", async () => {
    taskRepository.findTaskById.mockResolvedValue({ id: 70, type: "PERSONAL" });
    taskRepository.findMemberInTask.mockResolvedValue({ id: 1, role: false });
    taskRepository.findSubTaskById.mockResolvedValue({ id: 80, taskId: 70 });
    taskRepository.updateSubTask.mockResolvedValue({
      id: 80,
      taskId: 70,
      title: "세부과제",
      isAlarm: true,
      endDate: null,
      subTaskAssignees: [],
    });

    const results = await taskService.updateSelectedSubTasks(1, 70, [
      { subTaskId: 80, endDate: null },
    ]);

    expect(alarmRepository.deleteAlarmsBySubTaskIds).toHaveBeenCalledWith(
      [80],
      mockTx,
    );
    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
    expect(results[0].deadline).toBeNull();
  });

  it("마감일이 다시 지정되면 알림을 생성한다", async () => {
    const newEnd = new Date(Date.UTC(2026, 7, 1));
    taskRepository.findTaskById.mockResolvedValue({ id: 70, type: "PERSONAL" });
    taskRepository.findMemberInTask.mockResolvedValue({ id: 1, role: false });
    taskRepository.findSubTaskById.mockResolvedValue({ id: 81, taskId: 70 });
    taskRepository.updateSubTask.mockResolvedValue({
      id: 81,
      taskId: 70,
      title: "세부과제",
      isAlarm: true,
      endDate: newEnd,
      subTaskAssignees: [
        {
          member: {
            userId: 1,
            user: { alarmSetting: { taskAlarm: 4 } },
          },
        },
      ],
    });

    await taskService.updateSelectedSubTasks(1, 70, [
      { subTaskId: 81, endDate: newEnd },
    ]);

    expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
      1,
      70,
      81,
      "세부과제",
      calculateAlarmDate(newEnd, 4),
      mockTx,
    );
  });
});

// ─── 과제 마감일 변경 시 미지정 세부과제 영향 ───────────────────────
describe("updateTaskDeadline — 미지정 세부과제는 비교 대상에서 제외", () => {
  beforeEach(resetAll);

  it("마감일 미지정 세부과제가 있어도 과제 마감일을 변경할 수 있다", async () => {
    taskRepository.findTaskById.mockResolvedValue({ id: 90, type: "PERSONAL" });
    taskRepository.findMemberInTask.mockResolvedValue({ id: 1, role: false });
    prisma.subTask.findMany.mockResolvedValue([
      { id: 1, endDate: null },
      { id: 2, endDate: new Date(Date.UTC(2026, 0, 5)) },
    ]);
    taskRepository.updateTask.mockResolvedValue({
      id: 90,
      deadline: new Date(Date.UTC(2026, 0, 10)),
    });
    mockTx.member.findMany.mockResolvedValue([]);

    await expect(
      taskService.updateTaskDeadline(1, 90, "2026-01-10"),
    ).resolves.toBeDefined();

    expect(taskRepository.updateTask).toHaveBeenCalled();
  });

  it("마감일이 지정된 세부과제보다 이른 날짜는 여전히 거부한다", async () => {
    taskRepository.findTaskById.mockResolvedValue({ id: 90, type: "PERSONAL" });
    taskRepository.findMemberInTask.mockResolvedValue({ id: 1, role: false });
    prisma.subTask.findMany.mockResolvedValue([
      { id: 1, endDate: null },
      { id: 2, endDate: new Date(Date.UTC(2026, 0, 20)) },
    ]);

    await expect(
      taskService.updateTaskDeadline(1, 90, "2026-01-10"),
    ).rejects.toThrow();

    expect(taskRepository.updateTask).not.toHaveBeenCalled();
  });
});

// ─── 알림 on/off 토글 ─────────────────────────────────────────────
describe("alarmService.updateSubtaskAlarmStatus — 마감일 미지정 세부과제", () => {
  beforeEach(resetAll);

  it("알림을 켜도 마감일이 없으면 알림을 만들지 않는다", async () => {
    prisma.subTask.findUnique.mockResolvedValue({
      id: 100,
      taskId: 110,
      title: "세부과제",
      status: "PENDING",
      task: { members: [{ id: 2, userId: 1, role: false }] },
      subTaskAssignees: [
        { member: { user: { id: 1, alarmSetting: { taskAlarm: 3 } } } },
      ],
    });
    alarmRepository.updateSubtaskAlarmStatus.mockResolvedValue({
      id: 100,
      taskId: 110,
      title: "세부과제",
      isAlarm: true,
      endDate: null,
    });

    await alarmService.updateSubtaskAlarmStatus(1, 100, true);

    expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
    expect(alarmRepository.deleteAlarmsBySubTaskIds).toHaveBeenCalledWith([100]);
  });

  it("마감일이 있으면 기존대로 알림을 생성한다", async () => {
    const endDate = new Date(Date.UTC(2026, 8, 1));
    prisma.subTask.findUnique.mockResolvedValue({
      id: 101,
      taskId: 110,
      title: "세부과제",
      status: "PENDING",
      task: { members: [{ id: 2, userId: 1, role: false }] },
      subTaskAssignees: [
        { member: { user: { id: 1, alarmSetting: { taskAlarm: 3 } } } },
      ],
    });
    alarmRepository.updateSubtaskAlarmStatus.mockResolvedValue({
      id: 101,
      taskId: 110,
      title: "세부과제",
      isAlarm: true,
      endDate,
    });
    prisma.userAlarm.findFirst.mockResolvedValue(null);

    await alarmService.updateSubtaskAlarmStatus(1, 101, true);

    expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
      1,
      110,
      101,
      "세부과제",
      calculateAlarmDate(endDate, 3),
    );
  });
});

// ─── DTO 변환 ─────────────────────────────────────────────────────
describe("TaskRequestDTO — 마감일 null 전달", () => {
  it("toSubUpdate: endDate가 null이면 null 그대로 전달한다(에포크로 변환되지 않음)", () => {
    const result = TaskRequestDTO.toSubUpdate({ endDate: null });
    expect(result.endDate).toBeNull();
  });

  it("toSubUpdate: endDate가 빈 문자열이어도 null로 전달한다", () => {
    const result = TaskRequestDTO.toSubUpdate({ endDate: "" });
    expect(result.endDate).toBeNull();
  });

  it("toSubUpdate: endDate 키가 없으면 endDate를 건드리지 않는다", () => {
    const result = TaskRequestDTO.toSubUpdate({ title: "제목만 변경" });
    expect("endDate" in result).toBe(false);
  });

  it("toCreate: subTasks의 endDate가 없으면 null로 변환한다", () => {
    const result = TaskRequestDTO.toCreate({
      title: "과제",
      subTasks: [{ title: "미지정" }, { title: "지정", endDate: "2026-12-31" }],
    });
    expect(result.subTasks[0].endDate).toBeNull();
    expect(result.subTasks[1].endDate).toBeInstanceOf(Date);
  });
});

describe("TaskResponseDTO — 마감일 미지정 응답", () => {
  it("fromDetail: endDate가 null인 세부과제의 deadline은 null로 응답한다", () => {
    const result = TaskResponseDTO.fromDetail({
      id: 1,
      title: "과제",
      deadline: new Date(Date.UTC(2026, 11, 31)),
      type: "PERSONAL",
      status: "PENDING",
      members: [],
      subTasks: [
        { id: 1, title: "미지정", endDate: null, status: "PENDING" },
        {
          id: 2,
          title: "지정",
          endDate: new Date(Date.UTC(2026, 11, 30)),
          status: "PENDING",
        },
      ],
    });

    expect(result.subTasks[0].deadline).toBeNull();
    expect(result.subTasks[1].deadline).toBe("2026-12-30T00:00:00");
  });

  it("fromList: endDate가 null인 세부과제의 deadline은 null로 응답한다", () => {
    const result = TaskResponseDTO.fromList([
      {
        id: 1,
        title: "과제",
        deadline: new Date(Date.UTC(2026, 11, 31)),
        type: "PERSONAL",
        status: "PENDING",
        subTasks: [{ id: 1, title: "미지정", endDate: null, status: "PENDING" }],
      },
    ]);

    expect(result.subTask[0].deadline).toBeNull();
  });
});
