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

// 개별 알림 삭제
export const deleteAlarmById = async (alarmId) => {
  return await prisma.userAlarm.delete({
    where: { id: alarmId },
  });
};

// 알림 존재 여부 및 소유자 확인
export const findAlarmById = async (alarmId) => {
  return await prisma.userAlarm.findUnique({
    where: { id: alarmId },
    select: {
      id: true,
      userId: true,
    },
  });
};

// 유저의 모든 알림 삭제
export const deleteAllAlarmsByUserId = async (userId) => {
  return await prisma.userAlarm.deleteMany({
    where: { userId },
  });
};
