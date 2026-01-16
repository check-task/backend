import { findAlarmsByUserId } from "../repositories/alarm.repository.js";
import { alarmListResponseDTO } from "../dtos/alarm.dto.js";
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

  // 1. 알람 조회
  const alarms = await findAlarmsByUserId(userId, {
    cursor,
    limit,
    orderBy,
    order,
  });

  // 2. 페이징 로직
  const effectiveLimit = limit || 7;
  const hasNextPage = alarms.length > effectiveLimit;
  const data = hasNextPage ? alarms.slice(0, effectiveLimit) : alarms;
  const nextCursor =
    hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

  // 3. DTO 변환
  const responseData = alarmListResponseDTO(data);

  return {
    ...responseData,
    meta: {
      hasNextPage,
      cursor: nextCursor,
    },
  };
};
