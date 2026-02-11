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
      // ...(cursor && { id: { lt: cursor } }),
    };

    return await prisma.userAlarm.findMany({
      where,
      // ✅ 수정: 정렬 기준이 같을 때 id로 순서를 보장하도록 배열로 변경
      orderBy: [
        { [orderBy]: order },
        { id: order } // id도 같은 방향으로 정렬 (보통 desc)
      ],
      // ✅ 추가: Prisma의 native cursor 사용
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0, // 커서값 자체는 제외하고 그 다음부터 조회
      take: limit + 1,
    });
  }

  //과제 알림 생성
  async createTaskAlarm(userId, taskId, taskTitle, alarmDate, tx = prisma) {

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { deadlineAlarm: true },
    });

    const task = await tx.task.findUnique({
      where: { id: taskId },
      include: { subTasks: true },
    });
    const totalSubTasks = task?.subTasks?.length || 0;
    const completedSubTasks = task?.subTasks?.filter(st => st.status === 'COMPLETED').length || 0;
    const progressRate = totalSubTasks > 0 ? Math.round((completedSubTasks / totalSubTasks) * 100) : 0;

    const deadlineAlarm = user.deadlineAlarm;

    return await tx.userAlarm.create({
      data: {
        userId,
        taskId,
        title: `'${taskTitle}'의 마감까지 ${deadlineAlarm}시간 남았어요!`,
        alarmContent: `'현재 ${progressRate}%완성 중이에요. 빨리 끝내고 쉬어요!`,
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

  //안읽음 알림 여부 
  async countUnreadAlarms(userId) {
    const kstDate = dayjs().add(9, "hour").toDate();

    return await prisma.userAlarm.count({
      where: {
        userId,
        isRead: false,
        alarmDate: {
          lte: kstDate,
        },
      },
    });
  }
}

export default new AlarmRepository();