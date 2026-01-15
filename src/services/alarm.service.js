// Service
import * as AlarmRepository from "../repositories/alarm.repository.js";

export const getAlarms = async (userId, options) => {
  const alarms = await AlarmRepository.findAlarmsByUserId(userId);

  // Service에서 페이징 로직 처리
  const limit = options.limit || 10; // Repository 기본값과 동기화 필요
  const hasNextPage = alarms.length > limit;
  const data = hasNextPage ? alarms.slice(0, limit) : alarms;
  const cursor =
    hasNextPage && data.length > 0 ? data[data.length - 1].id : null;

  return {
    alarms: data,
    hasNextPage,
    cursor,
  };
};
