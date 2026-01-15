// 알람 목록 응답 DTO (커서 기반 페이징)
export const alarmListResponseDTO = (alarms, hasNextPage = false) => {
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

// 커서 기반 페이징 메타 정보
export const cursorPaginationMeta = (alarms, limit) => {
  const hasNextPage = alarms.length > limit;
  const cursor = hasNextPage ? alarms[limit - 1].id : null;

  return {
    hasNextPage,
    cursor,
  };
};
