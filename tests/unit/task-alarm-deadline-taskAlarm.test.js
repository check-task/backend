/**
 * TaskService / AlarmService 알림 검증
 * - 과제(Task) 단위 알림 시각: UserAlarmSetting.deadlineAlarm + calculateAlarmDate(과제 마감)
 * - 세부과제(SubTask) 알림 시각: UserAlarmSetting.taskAlarm + endDate 기준 오프셋
 * - vitest.config.js 의 TZ=UTC 와 맞춰 날짜 단언이 환경에 흔들리지 않음
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
    member: { findFirst: vi.fn() },
    subTask: { findMany: vi.fn(), findUnique: vi.fn() },
  };
  return { prisma, default: prisma };
});

vi.mock("../../src/repositories/alarm.repository.js", () => ({
  default: {
    createTaskAlarm: vi.fn().mockResolvedValue({ id: 1 }),
    createSubTaskAlarm: vi.fn().mockResolvedValue({ id: 2 }),
    updateAlarmsForTaskDeadline: vi.fn().mockResolvedValue(undefined),
    updateAlarm: vi.fn().mockResolvedValue({}),
    updateAlarmDate: vi.fn().mockResolvedValue({}),
    deleteAlarmById: vi.fn().mockResolvedValue({}),
    deleteSubTaskAlarm: vi.fn().mockResolvedValue({}),
    createMemberJoinAlarm: vi.fn().mockResolvedValue({}),
    updateDeadlineAlarm: vi.fn().mockResolvedValue({}),
    updateTaskAlarm: vi.fn().mockResolvedValue({}),
    findPendingTaskAlarms: vi.fn().mockResolvedValue([]),
    findPendingSubTaskAlarms: vi.fn().mockResolvedValue([]),
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
    createSubTask: vi.fn(),
    findTaskById: vi.fn(),
    findSubTaskById: vi.fn(),
    updateSubTask: vi.fn(),
    findAlarmBySubTaskId: vi.fn(),
    updateTask: vi.fn(),
    findMemberInTask: vi.fn(),
    findTaskByCode: vi.fn(),
    findFolderByUserIdAndName: vi.fn(),
  },
}));

import { prisma } from "../../src/db.config.js";
import alarmRepository from "../../src/repositories/alarm.repository.js";
import taskRepository from "../../src/repositories/task.repository.js";
import taskService from "../../src/services/task.service.js";
import alarmService from "../../src/services/alarm.service.js";

describe("TaskService 알림 — deadlineAlarm / taskAlarm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTx.user.findFirst.mockReset();
    mockTx.user.findUnique.mockReset();
    mockTx.member.findMany.mockReset();
    mockTx.subTask.findMany.mockReset();
  });

  const deadline = new Date(Date.UTC(2025, 5, 15, 6, 0, 0));

  describe("registerTask", () => {
    it("PERSONAL: 생성자 alarmSetting.deadlineAlarm 으로 과제 알림(createTaskAlarm)", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      taskRepository.createTask.mockResolvedValue({
        id: 10,
        title: "개인 과제",
        deadline,
        type: "PERSONAL",
        isAlarm: true,
      });
      taskRepository.createMember.mockResolvedValue({ id: 1 });
      taskRepository.findMaxRank.mockResolvedValue(0);
      taskRepository.upsertTaskPriority.mockResolvedValue({});
      mockTx.user.findFirst.mockResolvedValue({
        id: 1,
        alarmSetting: { deadlineAlarm: 30 },
      });

      await taskService.registerTask(1, {
        title: "개인 과제",
        type: "PERSONAL",
        deadline,
        isAlarm: true,
      });

      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledWith(
        1,
        10,
        "개인 과제",
        calculateAlarmDate(deadline, 30),
        mockTx,
      );
      expect(alarmRepository.createSubTaskAlarm).not.toHaveBeenCalled();
    });

    it("TEAM: 멤버별 user.alarmSetting.deadlineAlarm 으로 createTaskAlarm", async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      taskRepository.createTask.mockResolvedValue({
        id: 11,
        title: "팀 과제",
        deadline,
        type: "TEAM",
        isAlarm: true,
      });
      taskRepository.createMember.mockResolvedValue({ id: 1 });
      taskRepository.findMaxRank.mockResolvedValue(0);
      taskRepository.upsertTaskPriority.mockResolvedValue({});
      mockTx.member.findMany.mockResolvedValue([
        { userId: 2, user: { alarmSetting: { deadlineAlarm: 12 } } },
        { userId: 3, user: { alarmSetting: { deadlineAlarm: 48 } } },
      ]);

      await taskService.registerTask(1, {
        title: "팀 과제",
        type: "TEAM",
        deadline,
        isAlarm: true,
      });

      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledTimes(2);
      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledWith(
        2,
        11,
        "팀 과제",
        calculateAlarmDate(deadline, 12),
        mockTx,
      );
      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledWith(
        3,
        11,
        "팀 과제",
        calculateAlarmDate(deadline, 48),
        mockTx,
      );
    });

    it("과제+세부과제: Task는 deadlineAlarm, SubTask는 assignee.user.alarmSetting.taskAlarm (알림 수신자는 assignee.userId)", async () => {
      const endDate = new Date(Date.UTC(2025, 5, 14, 9, 0, 0));
      const memberId = 88;
      const actualUserId = 420;

      prisma.user.findUnique.mockResolvedValue({ id: 1 });
      taskRepository.createTask.mockResolvedValue({
        id: 20,
        title: "복합",
        deadline,
        type: "PERSONAL",
        isAlarm: true,
      });
      taskRepository.createMember.mockResolvedValue({ id: 1 });
      taskRepository.findMaxRank.mockResolvedValue(0);
      taskRepository.upsertTaskPriority.mockResolvedValue({});
      taskRepository.addSubTasks.mockResolvedValue({ count: 1 });
      mockTx.user.findFirst.mockResolvedValue({
        id: 1,
        alarmSetting: { deadlineAlarm: 24 },
      });
      mockTx.subTask.findMany.mockResolvedValue([
        {
          id: 500,
          taskId: 20,
          title: "하위",
          endDate,
          isAlarm: true,
          assigneeId: memberId,
          assignee: {
            id: memberId,
            userId: actualUserId,
            user: { alarmSetting: { taskAlarm: 6 } },
          },
        },
      ]);

      await taskService.registerTask(1, {
        title: "복합",
        type: "PERSONAL",
        deadline,
        isAlarm: true,
        subTasks: [
          { title: "하위", endDate, isAlarm: true, assigneeId: memberId },
        ],
      });

      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledWith(
        1,
        20,
        "복합",
        calculateAlarmDate(deadline, 24),
        mockTx,
      );

      const expectedSub = new Date(endDate);
      expectedSub.setHours(expectedSub.getHours() - 6);
      expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
        actualUserId,
        20,
        500,
        "하위",
        expectedSub,
        mockTx,
      );
    });
  });

  describe("createSingleSubTask", () => {
    it("taskAlarm 반영 시 createSubTaskAlarm 첫 인자는 유저 id(assignee.userId)", async () => {
      const endDate = new Date(Date.UTC(2025, 7, 1, 15, 0, 0));
      const memberRowId = 99;
      const userIdForAlarm = 1001;

      taskRepository.findTaskById.mockResolvedValue({ id: 40, type: "TEAM" });
      taskRepository.createSubTask.mockResolvedValue({
        id: 700,
        taskId: 40,
        title: "신규 ST",
        endDate,
        status: "PENDING",
        isAlarm: true,
        assigneeId: memberRowId,
        assignee: {
          id: memberRowId,
          userId: userIdForAlarm,
          user: { alarmSetting: { taskAlarm: 8 } },
        },
      });

      await taskService.createSingleSubTask(1, 40, {
        title: "신규 ST",
        endDate,
        isAlarm: true,
      });

      const expected = new Date(endDate);
      expected.setHours(expected.getHours() - 8);
      expect(alarmRepository.createSubTaskAlarm).toHaveBeenCalledWith(
        userIdForAlarm,
        40,
        700,
        "신규 ST",
        expected,
        mockTx,
      );
    });
  });

  describe("updateSingleSubTask", () => {
    it("기존 알림이 있으면 taskAlarm 기준으로 updateAlarm", async () => {
      const endDate = new Date(Date.UTC(2025, 9, 10, 18, 0, 0));
      taskRepository.findTaskById.mockResolvedValue({ id: 50 });
      taskRepository.findMemberInTask.mockResolvedValue({ userId: 1 });
      taskRepository.findSubTaskById.mockResolvedValue({ id: 800, assigneeId: 77 });
      taskRepository.updateSubTask.mockResolvedValue({
        id: 800,
        taskId: 50,
        title: "수정된 ST",
        endDate,
        isAlarm: true,
        assigneeId: 77,
        assignee: {
          id: 77,
          userId: 770,
          user: { alarmSetting: { taskAlarm: 3 } },
        },
      });
      taskRepository.findAlarmBySubTaskId.mockResolvedValue({ id: 9001 });

      await taskService.updateSingleSubTask(1, 50, 800, {
        title: "수정된 ST",
        endDate,
        isAlarm: true,
      });

      const expectedAlarmDate = new Date(endDate);
      expectedAlarmDate.setHours(expectedAlarmDate.getHours() - 3);
      expect(alarmRepository.updateAlarm).toHaveBeenCalledWith(
        9001,
        {
          title: `'수정된 ST'의 마감 알림`,
          alarmContent: `'수정된 ST' 진행 중입니다.`,
          alarmDate: expectedAlarmDate,
        },
        mockTx,
      );
    });
  });

  describe("updateTaskDeadline", () => {
    it("마감 변경 후 updateAlarmsForTaskDeadline 호출", async () => {
      const taskId = 60;
      taskRepository.findTaskById.mockResolvedValue({
        id: taskId,
        deadline: new Date(Date.UTC(2025, 3, 1, 0, 0, 0)),
      });
      prisma.member.findFirst.mockResolvedValue({ userId: 1, role: false });
      prisma.subTask.findMany.mockResolvedValue([]);
      taskRepository.updateTask.mockResolvedValue({ id: taskId });

      await taskService.updateTaskDeadline(1, taskId, "2025-05-20");

      const [, dataArg] = taskRepository.updateTask.mock.calls[0];
      expect(dataArg.deadline).toBeInstanceOf(Date);
      expect(alarmRepository.updateAlarmsForTaskDeadline).toHaveBeenCalledWith(
        taskId,
        dataArg.deadline,
        mockTx,
      );
    });
  });

  describe("joinTaskByInviteCode", () => {
    it("참여자에게 과제 알림은 deadlineAlarm 기준 createTaskAlarm", async () => {
      const dl = new Date(Date.UTC(2025, 4, 8, 0, 0, 0));
      const findTask = {
        id: 70,
        title: "초대 과제",
        deadline: dl,
        isAlarm: true,
        inviteExpiredAt: null,
      };

      taskRepository.findTaskByCode.mockResolvedValue(findTask);
      taskRepository.findMemberInTask.mockResolvedValue(null);
      taskRepository.findFolderById.mockResolvedValue({ id: 3, userId: 5 });
      taskRepository.createMember.mockResolvedValue({ id: 555 });
      mockTx.member.findMany.mockResolvedValue([]);
      mockTx.user.findUnique
        .mockResolvedValueOnce({ nickname: "새멤버" })
        .mockResolvedValueOnce({
          id: 5,
          alarmSetting: { deadlineAlarm: 72 },
        });

      await taskService.joinTaskByInviteCode(5, 3, "ABC123XY");

      expect(alarmRepository.createTaskAlarm).toHaveBeenCalledWith(
        5,
        70,
        "초대 과제",
        calculateAlarmDate(dl, 72),
        mockTx,
      );
    });

    it("기존 팀원에게 createMemberJoinAlarm", async () => {
      const findTask = {
        id: 71,
        title: "팀",
        deadline,
        isAlarm: false,
        inviteExpiredAt: null,
      };
      taskRepository.findTaskByCode.mockResolvedValue(findTask);
      taskRepository.findMemberInTask.mockResolvedValue(null);
      taskRepository.findFolderById.mockResolvedValue({ id: 1, userId: 9 });
      taskRepository.createMember.mockResolvedValue({ id: 600 });
      mockTx.user.findUnique.mockResolvedValue({ nickname: "신입" });
      mockTx.member.findMany.mockResolvedValue([
        { userId: 2, user: {} },
        { userId: 3, user: {} },
      ]);

      await taskService.joinTaskByInviteCode(9, 1, "INVITE01");

      expect(alarmRepository.createMemberJoinAlarm).toHaveBeenCalledTimes(2);
      expect(alarmRepository.createMemberJoinAlarm).toHaveBeenCalledWith(
        2,
        71,
        "팀",
        "신입",
        mockTx,
      );
    });
  });
});

describe("AlarmService 알림 설정 변경 시 pending 알람 재계산", () => {
  beforeEach(() => vi.clearAllMocks());

  it("updateDeadline: task 마감 + 새 deadlineAlarm → updateAlarmDate", async () => {
    const taskDeadline = new Date(Date.UTC(2025, 2, 20, 0, 0, 0));
    alarmRepository.updateDeadlineAlarm.mockResolvedValue({
      id: 1,
      nickname: "u",
      deadlineAlarm: 36,
    });
    alarmRepository.findPendingTaskAlarms.mockResolvedValue([
      { id: 100, task: { deadline: taskDeadline } },
    ]);

    await alarmService.updateDeadline(1, 36);

    expect(alarmRepository.updateAlarmDate).toHaveBeenCalledWith(
      100,
      calculateAlarmDate(taskDeadline, 36),
    );
  });

  it("updateTask: subTask.endDate + 새 taskAlarm → updateAlarmDate", async () => {
    const stEnd = new Date(Date.UTC(2025, 8, 15, 12, 0, 0));
    alarmRepository.updateTaskAlarm.mockResolvedValue({
      id: 1,
      nickname: "u",
      taskAlarm: 10,
    });
    alarmRepository.findPendingSubTaskAlarms.mockResolvedValue([
      { id: 200, subTask: { endDate: stEnd } },
    ]);

    await alarmService.updateTask(1, 10);

    expect(alarmRepository.updateAlarmDate).toHaveBeenCalledWith(
      200,
      calculateAlarmDate(stEnd, 10),
    );
  });
});
