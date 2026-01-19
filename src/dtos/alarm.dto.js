// 알람 목록 응답 DTO (커서 기반 페이징)
export const alarmListResponseDto = (alarms, hasNextPage = false) => {
  return {
    alarmList: alarms.map((alarm) => ({
      noticeId: alarm.id, // 알람 ID
      title: alarm.title, // 알람 제목
      alarmContent: alarm.alarmContent, // 알람 내용
      isRead: alarm.isRead, // 0: off, 1: on
      alarmDate: alarm.alarmDate, // 알람 보낼 시간
      taskId: alarm.taskId, // 과제 ID
      subTaskId: alarm.subTaskId || null, // 세부과제 ID
    })),
  };
};

// 최종 마감 알림 수정 DTO
export const updateDeadlineAlarmDto = (data) => {
  return {
    user: {
      userId: data.userId,
      nickname: data.nickname,
      deadlineAlarm: data.deadlineAlarm,
    },
  };
};

// TASK 알림 수정 DTO
export const updateTaskAlarmDto = (data) => {
  return {
    user: {
      userId: data.userId,
      nickname: data.nickname,
      taskAlarm: data.taskAlarm,
    },
  };
};
