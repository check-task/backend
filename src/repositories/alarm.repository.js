import prisma from "../db.config.js"; // 추가!
import dayjs from "dayjs";

// 커서 기반 알람 목록 조회
export const findAlarmsByUserId = async (userId, options = {}) => {
  const kstDate = dayjs().add(9, "hour").toDate();
  const {
    cursor = null, // ← undefined면 null 사용
    limit = 10, // ← undefined면 10 사용
    orderBy = "alarmDate", // ← undefined면 "alarmDate" 사용
    order = "desc", // ← undefined면 "desc" 사용
  } = options;

  // 이제 cursor, limit, orderBy, order는 항상 값이 있음!

  const where = {
    userId,
    alarmDate: {
      lte: kstDate,
    },
    ...(cursor && { id: { lt: cursor } }), // cursor가 null이면 무시
  };

  const alarms = await prisma.userAlarm.findMany({
    where,
    orderBy: { [orderBy]: order }, // 항상 유효한 값
    take: limit + 1, // 항상 숫자
  });

  return alarms;
};
