//한국 시간으로 설정
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// 실제 마감 시각 기준으로 alarmHours 차감하여 알림 시간 계산
export const calculateAlarmDate = (deadline, alarmHours) => {
  const d = deadline instanceof Date ? deadline : new Date(deadline);
  return dayjs(d).subtract(alarmHours, "hour").toDate();
};