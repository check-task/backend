import * as AlarmRepository from "../repositories/alarm.repository.js";
import { NotFoundError, ForbiddenError } from "../errors/custom.error.js";

// 알람 목록 조회
export const getAlarms = async (userId, options) => {
  const alarms = await AlarmRepository.findAlarmsByUserId(userId, options);
  return alarms; // 배열 그대로 반환
};
