import {
  deleteAlarmById,
  findAlarmsByUserId,
  findAlarmById,
  deleteAllAlarmsByUserId,
  updateDeadlineAlarm,
  updateTaskAlarm,
  updateTaskAlarmStatusRepository,
  updateSubtaskAlarmStatusRepository,
} from "../repositories/alarm.repository.js";
import {
  alarmListResponseDto,
  updateDeadlineAlarmDto,
  updateSubtaskAlarmStatusDto,
  updateTaskAlarmDto,
  updateTaskAlarmStatusDto,
} from "../dtos/alarm.dto.js";
import {
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from "../errors/custom.error.js";
import prisma from "../db.config.js";

export const getAlarms = async (userId, cursor, limit, orderBy, order) => {
  // 알람 조회
  const alarms = await findAlarmsByUserId(userId, {
    cursor,
    limit,
    orderBy,
    order,
  });

  // 페이징 로직
  const effectiveLimit = limit || 7;
  const hasNextPage = alarms.length > effectiveLimit;
  const data = hasNextPage ? alarms.slice(0, effectiveLimit) : alarms;
  const nextCursor =
    hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

  // DTO 변환
  const responseData = alarmListResponseDto(data);

  return {
    ...responseData,
    meta: {
      hasNextPage,
      cursor: nextCursor,
    },
  };
};

// 개별 알림 삭제
export const deleteAlarm = async (userId, alarmId) => {
  // 알림 존재 여부 확인
  const alarm = await findAlarmById(alarmId);

  if (!alarm) {
    throw new NotFoundError(
      "ALARM_NOT_FOUND",
      "요청하신 alarmID가 DB에 존재하지 않습니다."
    );
  }

  // 알림 소유자 확인 (본인의 알림인지)
  if (alarm.userId !== userId) {
    throw new ForbiddenError(
      "ALARM_ACCESS_DENIED",
      "해당 알림에 접근할 권한이 없습니다."
    );
  }

  // 알림 삭제
  await deleteAlarmById(alarmId);

  return null; // 성공 시 data는 null
};

// 전체 알림 삭제
export const deleteAllAlarms = async (userId) => {
  // 유저 검증 (임시 - 로그인 미들웨어 생성 후 삭제 예정)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      deletedAt: true,
    },
  });

  if (!user) {
    throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
  }

  if (user.deletedAt !== null) {
    throw new ForbiddenError(
      "USER_DELETED",
      "탈퇴한 유저는 알림을 삭제할 수 없습니다."
    );
  }

  // 유저의 모든 알림 삭제
  await deleteAllAlarmsByUserId(userId);

  return null; // 성공 시 data는 null
};

// 최종 마감 알림 수정
export const updateDeadline = async (userId, deadlineAlarm) => {
  // 최종 마감 알림 수정 (Repository 호출)
  const updatedUser = await updateDeadlineAlarm(userId, deadlineAlarm);

  // DTO 변환
  return updateDeadlineAlarmDto({
    userId: updatedUser.id,
    nickname: updatedUser.nickname,
    deadlineAlarm: updatedUser.deadlineAlarm,
  });
};

// Task 마감 알림 수정
export const updateTask = async (userId, taskAlarm) => {
  // Task 마감 알림 수정 (Repository 호출)
  const updatedUser = await updateTaskAlarm(userId, taskAlarm);

  // DTO 변환
  return updateTaskAlarmDto({
    userId: updatedUser.id,
    nickname: updatedUser.nickname,
    taskAlarm: updatedUser.taskAlarm,
  });
};

// ✅ 과제 알림 여부 설정
export const updateTaskAlarmStatus = async (userId, taskId, isAlarm) => {
  // taskId가 유효한 숫자인지 확인
  if (!Number.isInteger(taskId) || taskId <= 0) {
    throw new BadRequestError(
      "INVALID_TASK_ID",
      "유효하지 않은 과제 ID입니다."
    );
  }
  // 과제 존재 여부 및 소유권 확인
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      members: {
        where: { userId: userId },
      },
    },
  });

  if (!task) {
    throw new NotFoundError("TASK_NOT_FOUND", "과제를 찾을 수 없습니다.");
  }

  // 개인 과제인 경우 본인만, 팀 과제인 경우 멤버만 수정 가능
  const isOwner = task.members.some(
    (m) => m.userId === userId && m.role === false
  );
  const isMember = task.members.some((m) => m.userId === userId);

  if (!isOwner && !isMember) {
    throw new ForbiddenError(
      "TASK_ACCESS_DENIED",
      "해당 과제에 접근할 권한이 없습니다."
    );
  }

  // 과제 알림 여부 설정 (Repository 호출)
  const updatedTask = await updateTaskAlarmStatusRepository(taskId, isAlarm);

  // DTO 변환
  return updateTaskAlarmStatusDto({
    taskId: updatedTask.id,
    title: updatedTask.title,
    deadline: updatedTask.deadline,
    isAlarm: updatedTask.isAlarm,
    updatedAt: updatedTask.updatedAt,
  });
};

// ✅ 세부과제 알림 여부 설정
export const updateSubtaskAlarmStatus = async (userId, subTaskId, isAlarm) => {
  // subTaskId가 유효한 숫자인지 확인
  if (!Number.isInteger(subTaskId) || subTaskId <= 0) {
    throw new BadRequestError(
      "INVALID_PARAMETER",
      "params의 subTaskId는 숫자로 보내야합니다."
    );
  }
  // 세부과제 존재 여부 및 과제에 속한 맴버인지 확인
  const subTask = await prisma.subTask.findUnique({
    where: { id: subTaskId },
    include: {
      task: {
        include: {
          members: true, // 모든 멤버 가져오기 (where 제거)
        },
      },
    },
  });
  // 세부과제 존재 여부 확인
  if (!subTask) {
    throw new NotFoundError(
      "SUB_TASK_NOT_FOUND",
      "요청하신 subTaskId가 DB에 존재하지 않습니다."
    );
  }
  // 해당 과제의 멤버인지 확인
  const task = subTask.task;
  const isOwner = task.members.some(
    (m) => m.userId === userId && m.role === false
  );
  const isMember = task.members.some((m) => m.userId === userId);

  if (!isOwner && !isMember) {
    throw new ForbiddenError(
      "SUBTASK_ACCESS_DENIED",
      "해당 세부과제에 접근할 권한이 없습니다."
    );
  }
  //  세부과제 알림 여부 설정 (Repository 호출)
  const updatedSubTask = await updateSubtaskAlarmStatusRepository(
    subTaskId,
    isAlarm
  );

  // updatedSubTask가 null인 경우 체크
  if (!updatedSubTask) {
    throw new NotFoundError(
      "SUBTASK_UPDATE_FAILED",
      "세부과제 업데이트에 실패했습니다."
    );
  }

  // DTO 변환
  return updateSubtaskAlarmStatusDto({
    subTaskId: updatedSubTask.id,
    assigneeId: updatedSubTask.assigneeId,
    taskId: updatedSubTask.taskId,
    title: updatedSubTask.title,
    endDate: updatedSubTask.endDate,
    isAlarm: updatedSubTask.isAlarm,
    updatedAt: updatedSubTask.updatedAt,
  });
};
