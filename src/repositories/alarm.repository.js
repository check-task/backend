import prisma from "../db.config.js";
import dayjs from "dayjs";

class AlarmRepository {
  async findAlarmsByUserId(userId, options = {}) {
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

    return await prisma.userAlarm.findMany({
      where,
      orderBy: {
        [orderBy]: order,
      },
      take: limit + 1,
    });
  }

  async createTaskAlarm(userId, taskId, taskTitle, alarmDate, tx = prisma) {
    return await tx.userAlarm.create({
      data: {
        userId,
        taskId,
        title: "과제 생성 알림",
        alarmContent: `${taskTitle} 과제가 생성되었습니다`,
        alarmDate,
        isRead: false,
        createdAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
      },
    });
  }

  async createSubTaskAlarm(userId, taskId, subTaskId, subTaskTitle, alarmDate, tx = prisma) {
    return await tx.userAlarm.create({
      data: {
        userId,
        taskId,
        subTaskId,
        title: "세부과제 생성 알림",
        alarmContent: `${subTaskTitle} 세부과제가 생성되었습니다`,
        alarmDate,
        isRead: false,
        createdAt: new Date(Date.now() + 9 * 60 * 60 * 1000),
      },
    });
  }

  async deleteAlarmById(alarmId) {
    return await prisma.userAlarm.delete({
      where: { id: alarmId },
    });
  }

  async findAlarmById(alarmId) {
    return await prisma.userAlarm.findUnique({
      where: { id: alarmId },
      select: {
        id: true,
        userId: true,
      },
    });
  }

  async deleteAllAlarmsByUserId(userId) {
    return await prisma.userAlarm.deleteMany({
      where: { userId },
    });
  }

  async updateDeadlineAlarm(userId, deadlineAlarm) {
    return await prisma.user.update({
      where: { id: userId },
      data: { deadlineAlarm },
      select: {
        id: true,
        nickname: true,
        deadlineAlarm: true,
      },
    });
  }

  async updateTaskAlarm(userId, taskAlarm) {
    return await prisma.user.update({
      where: { id: userId },
      data: { taskAlarm },
      select: {
        id: true,
        nickname: true,
        taskAlarm: true,
      },
    });
  }

  async updateTaskAlarmStatus(taskId, isAlarm) {
    return await prisma.task.update({
      where: { id: taskId },
      data: { isAlarm },
      select: {
        id: true,
        title: true,
        deadline: true,
        isAlarm: true,
        updatedAt: true,
      },
    });
  }

  async updateSubtaskAlarmStatus(subTaskId, isAlarm) {
    return await prisma.subTask.update({
      where: { id: subTaskId },
      data: { isAlarm },
      select: {
        id: true,
        assigneeId: true,
        taskId: true,
        title: true,
        endDate: true,
        isAlarm: true,
        updatedAt: true,
      },
    });
  }

  async updateAlarmReadStatus(alarmId, isRead) {
    return await prisma.userAlarm.update({
      where: { id: alarmId },
      data: { isRead },
      select: {
        id: true,
        userId: true,
        taskId: true,
        subTaskId: true,
        title: true,
        alarmContent: true,
        isRead: true,
      },
    });
  }

  async deleteSubTaskAlarm(userId, subTaskId) {
    return await prisma.userAlarm.deleteMany({
      where: {
        userId,
        subTaskId,
      },
    });
  }
}

export default new AlarmRepository();