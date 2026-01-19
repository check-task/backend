import {
  deleteAlarmById,
  findAlarmsByUserId,
  findAlarmById,
  deleteAllAlarmsByUserId,
  updateDeadlineAlarm,
  updateTaskAlarm,
} from "../repositories/alarm.repository.js";
import {
  alarmListResponseDto,
  updateDeadlineAlarmDto,
  updateTaskAlarmDto,
} from "../dtos/alarm.dto.js";
import { NotFoundError, ForbiddenError } from "../errors/custom.error.js";
import prisma from "../db.config.js";

export const getAlarms = async (userId, cursor, limit, orderBy, order) => {
  //미들웨어 생성 전 유저 검증 로직 service에서 처리 => 미들웨어 생성 후 삭제 예정 (9~24줄)
  // 유저 존재 및 탈퇴 여부 확인
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
      "탈퇴한 유저는 알림을 조회할 수 없습니다."
    );
  }

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
      "탈퇴한 유저는 알림을 수정할 수 없습니다."
    );
  }

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
      "탈퇴한 유저는 알림을 수정할 수 없습니다."
    );
  }

  // Task 마감 알림 수정 (Repository 호출)
  const updatedUser = await updateTaskAlarm(userId, taskAlarm);

  // DTO 변환
  return updateTaskAlarmDto({
    userId: updatedUser.id,
    nickname: updatedUser.nickname,
    taskAlarm: updatedUser.taskAlarm,
  });
};
