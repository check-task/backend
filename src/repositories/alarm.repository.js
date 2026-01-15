import prisma from "../db.config.js"; // 추가!
import dayjs from "dayjs";

// 커서 기반 알람 목록 조회
export const findAlarmsByUserId = async (userId, options = {}) => {
  // 한국 시간(KST) 기준 현재 시간 가져오기 (UTC+9)
  const kstDate = dayjs().add(9, "hour").toDate();

  const {
    // 알림 읽음 여부 조회를 위해 추가 => 나중에 구현하게 되면 사용하기 위해 남겨둠
    // isRead = null, // 알람 읽음 여부 => null: 모두, true: 읽음, false: 읽지 않음
    cursor = null,
    limit = 10,
    orderBy = "alarmDate",
    order = "desc", // 최근 알림 순으로 조회
  } = options;

  const where = {
    userId,
    alarmDate: {
      lte: kstDate,
    },
    //알람 읽음 여부 추가 나중에 구현하게 되면 사용하기 위해 남겨둠
    // ...(isRead !== null && { isRead }),
    ...(cursor && { id: { lt: cursor } }),
  };

  const alarms = await prisma.userAlarm.findMany({
    where,
    orderBy: {
      [orderBy]: order,
    },
    take: limit + 1,
  });

  return alarms;
};
