import alarmService from "../services/alarm.service.js";

class AlarmController {
  constructor() {
    this.alarmService = alarmService;
  }

  // 알람 목록 조회
  handleAlarmList = async (req, res) => {
    const userId = req.user.id;
    const result = await this.alarmService.getAlarms(
      userId,
      req.query.cursor,
      req.query.limit,
      req.query.orderBy,
      req.query.order,
    );

    return res.success(result, "알림 목록 조회 성공");
  };

  // 개별 알림 삭제
  handleAlarmDelete = async (req, res) => {
    const userId = req.user.id;
    const { alarmId } = req.params;

    await this.alarmService.deleteAlarm(userId, alarmId);

    return res.success(null, "개별 알림 삭제 성공");
  };

  // 전체 알림 삭제
  handleAlarmDeleteAll = async (req, res) => {
    const userId = req.user.id;

    await this.alarmService.deleteAllAlarms(userId);

    return res.success(null, "알림 전체 삭제 성공");
  };

  // 최종 마감 알림 수정
  handleAlarmUpdateDeadline = async (req, res) => {
    const userId = req.user.id;
    const { deadlineAlarm } = req.body;

    const result = await this.alarmService.updateDeadline(
      userId,
      deadlineAlarm,
    );

    return res.success(
      result,
      "최종 마감 시간의 알림 전송 시간을 변경했습니다.",
    );
  };

  // Task 마감 알림 수정
  handleAlarmUpdateTask = async (req, res) => {
    const userId = req.user.id;
    const { taskAlarm } = req.body;

    const result = await this.alarmService.updateTask(userId, taskAlarm);

    return res.success(
      result,
      "과제 마감 시간의 알림 전송 시간을 변경했습니다.",
    );
  };

  // 과제 알림 여부 설정
  handleAlarmUpdateTaskStatus = async (req, res) => {
    const userId = req.user.id;
    const { taskId } = req.params;
    const { isAlarm } = req.body;

    const result = await this.alarmService.updateTaskAlarmStatus(
      userId,
      taskId,
      isAlarm,
    );

    return res.success(result, "과제에 대한 알림 여부를 변경하였습니다..");
  };

  // subtask 알림 여부 설정
  handleAlarmUpdateSubtaskStatus = async (req, res) => {
    const userId = req.user.id;
    const { subtaskId } = req.params;
    const { isAlarm } = req.body;

    const result = await this.alarmService.updateSubtaskAlarmStatus(
      userId,
      subtaskId,
      isAlarm,
    );

    return res.success(result, "세부과제에 대한 알림 여부를 변경하였습니다..");
  };

  // 알림 읽음 처리
  handleAlarmUpdateAlarmReadStatus = async (req, res) => {
    const userId = req.user.id;
    const { alarmId } = req.params;
    const { isRead } = req.body;

    const result = await this.alarmService.updateAlarmReadStatus(
      userId,
      alarmId,
      isRead,
    );

    return res.success(result, "알림 읽음 처리 성공");
  };

  // 모든 알림 읽음 처리
  handleAlarmUpdateAllAlarmReadStatus = async (req, res) => {
    const userId = req.user.id;

    const result = await this.alarmService.updateAllAlarmReadStatus(userId);

    return res.success(result, "모든 알림 읽음 처리 성공");
  };

  // 안읽은 알림 개수 확인
  handleUnreadAlarmCount = async (req, res) => {
    const userId = req.user.id;

    const result = await this.alarmService.getUnreadAlarmCount(userId);

    return res.success(result, "안읽은 알림 개수 조회 성공");
  };
}

export default new AlarmController();
