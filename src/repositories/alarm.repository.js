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

    // 환경 타지 않도록 순수 Date 객체 사용 (현재 시간 + 9시간)
    const kstDate = new Date(Date.now() + 9 * 60 * 60 * 1000);

    const where = {
      userId,
      alarmDate: {
        lte: kstDate, // 미래 알림 제외
      },
    };

    const alarms = await prisma.userAlarm.findMany({
      where,
      // ✅ 과제와 세부과제 정보를 함께 조회 (진척도 계산용)
      include: {
        task: {
          include: { subTasks: true }
        }
      },
      orderBy: [
        { [orderBy]: order },
        { id: order }
      ],
      cursor: cursor ? { id: cursor } : undefined,
      skip: cursor ? 1 : 0,
      take: limit + 1,
    });

    // ✅ 조회된 알림 목록을 순회하며 진척도 실시간 반영
    return alarms.map(alarm => {
      // 과제 알림이고(taskId 있음, subTaskId 없음), 관련 과제 정보가 있는 경우
      if (alarm.taskId && !alarm.subTaskId && alarm.task && alarm.task.subTasks) {
        const total = alarm.task.subTasks.length;
        const completed = alarm.task.subTasks.filter(st => st.status === 'COMPLETED').length;
        const currentProgress = total > 0 ? Math.round((completed / total) * 100) : 0;

        // 알림 내용 업데이트 (덮어쓰기)
        alarm.alarmContent = `'현재 ${currentProgress}%완성 중이에요. 빨리 끝내고 쉬어요!`;
      }

      const taskType = alarm.task.type;

      // 응답 최적화를 위해 include 했던 task 객체는 제거하고 반환 (선택 사항)
      const { task, ...alarmData } = alarm;
      return { ...alarmData, alarmContent: alarm.alarmContent, taskType };
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

    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { taskAlarm: true },
    });

    const subTask = await tx.subTask.findUnique({
      where: { id: subTaskId },
    });

    const taskAlarm = user.taskAlarm;

    return await tx.userAlarm.create({
      data: {
        userId,
        taskId,
        subTaskId,
        title: `'${subTaskTitle}'의 마감까지 ${taskAlarm}시간 남았어요!`,
        alarmContent: `'현재 ${subTask.status === 'COMPLETED' ? '완료' : '진행 중'} 상태에요. 빨리 끝내고 쉬어요!`,
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

  // (추가) 아직 읽지 않은 과제 알림 조회 (과제 정보 포함)
  async findPendingTaskAlarms(userId) {
    return await prisma.userAlarm.findMany({
      where: {
        userId,
        isRead: false,
        taskId: { not: null },
        subTaskId: null, // 세부과제 알림 제외
      },
      include: {
        task: true, // 마감일 확인을 위해 과제 정보 포함
      },
    });
  }

  // (추가) 아직 읽지 않은 세부과제 알림 조회 (세부과제 정보 포함)
  async findPendingSubTaskAlarms(userId) {
    return await prisma.userAlarm.findMany({
      where: {
        userId,
        isRead: false,
        subTaskId: { not: null }, // 세부과제 알림만
      },
      include: {
        subTask: true, // 마감일 확인을 위해 세부과제 정보 포함
      },
    });
  }

  // (추가) 알림 시간 업데이트 (개별)
  async updateAlarmDate(alarmId, newAlarmDate) {
    return await prisma.userAlarm.update({
      where: { id: alarmId },
      data: { alarmDate: newAlarmDate },
    });
  }
}

export default new AlarmRepository();