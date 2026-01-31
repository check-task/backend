import prisma from "../db.config.js";
import dayjs from "dayjs";

class AlarmRepository {
  //유저의 알림 조회
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

  //과제 알림 생성
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

  //세부과제 알림 생성
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

  //유저의 개별 알림 삭제
  async deleteAlarmById(alarmId) {
    return await prisma.userAlarm.delete({
      where: { id: alarmId },
    });
  }

  //알림 조회
  async findAlarmById(alarmId) {
    return await prisma.userAlarm.findUnique({
      where: { id: alarmId },
      select: {
        id: true,
        userId: true,
      },
    });
  }


  //유저의 모든 알림 삭제
  async deleteAllAlarmsByUserId(userId) {
    return await prisma.userAlarm.deleteMany({
      where: { userId },
    });
  }

  //최종 마감 알림 시간 수정
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

  //과제 알림 시간 수정
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

  //과제 알림 상태 변경
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

  //세부과제 알림 상태 변경
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

  //알림 읽음 처리
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

  // 알림 읽음 처리 -> 모든 알림 읽음 처리
  async updateAllAlarmReadStatus(userId) {
    return await prisma.userAlarm.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });
  }

  //세부과제 알림 삭제
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