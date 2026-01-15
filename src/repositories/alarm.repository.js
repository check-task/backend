import prisma from "../db.config.js";
import dayjs from "dayjs";

export const findAlarmsByUserId = async (userId, options = {}) => {
  // 기본값 적용
  const {
    cursor = null,
    limit = 10,
    orderBy = "alarmDate",
    order = "desc",
  } = options;

  const kstDate = dayjs().add(9, "hour").toDate();

  const where = {
    userId,
    alarmDate: {
      lte: kstDate,
    },
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
