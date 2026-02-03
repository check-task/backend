import { BadRequestError, NotFoundError } from "../errors/custom.error.js";
import alarmService from "../services/alarm.service.js";

class AlarmController {
  constructor() {
    this.alarmService = alarmService;
  }

  // 알람 목록 조회
  handleAlarmList = async (req, res) => {
    const userId = req.user.id;
    // req.user는 로그인 미들웨어에서 설정됨
    const result = await this.alarmService.getAlarms(
      userId, // 임시로 지정한 유저 ID
      // req.user.id, // 로그인 미들웨어에서 검증된 유저 ID
      req.query.cursor ? parseInt(req.query.cursor) : undefined,
      req.query.limit ? parseInt(req.query.limit) : undefined,
      req.query.orderBy,
      req.query.order
    );

    return res.success(result, "알림 목록 조회 성공");
  };

  // 개별 알림 삭제
  handleAlarmDelete = async (req, res) => {
    const userId = req.user.id;

    // alarmId 파라미터 파싱 및 검증
    const alarmId = req.params.alarmId;

    // 400 에러: 파라미터가 숫자가 아닌 경우
    if (!alarmId || isNaN(parseInt(alarmId))) {
      throw new BadRequestError(
        "INVALID_PARAMETER",
        "params는 숫자로 보내야합니다."
      );
    }

    const parsedAlarmId = parseInt(alarmId);

    // Service 호출
    await this.alarmService.deleteAlarm(userId, parsedAlarmId);

    // 성공 응답 (data는 null)
    return res.success(null, "개별 알림 삭제 성공");
  };

  // 전체 알림 삭제
  handleAlarmDeleteAll = async (req, res) => {
    const userId = req.user.id;

    // Service 호출
    await this.alarmService.deleteAllAlarms(userId);

    // 성공 응답 (data는 null)
    return res.success(null, "알림 전체 삭제 성공");
  };

  // 최종 마감 알림 수정
  handleAlarmUpdateDeadline = async (req, res) => {
    const userId = req.user.id;
    const deadlineAlarm = req.body.deadlineAlarm;

    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }

    // 400 에러: 파라미터가 숫자가 아닌 경우
    if (!deadlineAlarm || isNaN(parseInt(deadlineAlarm))) {
      throw new BadRequestError("INVALID_BODY", "Body의 deadlineAlarm 데이터는 number 형식으로 보내야합니다.");
    }

    const parsedDeadlineAlarm = parseInt(deadlineAlarm);

    // Service 호출
    const result = await this.alarmService.updateDeadline(userId, parsedDeadlineAlarm);

    // 성공 응답 (이미지 명세에 맞게)
    return res.success(result, "최종 마감 시간의 알림 전송 시간을 변경했습니다.");
  };

  // ✅ Task 마감 알림 수정
  handleAlarmUpdateTask = async (req, res) => {
    const userId = req.user.id;
    const taskAlarm = req.body.taskAlarm;


    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }
    // 400 에러: 파라미터가 숫자가 아닌 경우
    if (!taskAlarm || isNaN(parseInt(taskAlarm))) {
      throw new BadRequestError("INVALID_BODY", "Body의 taskAlarm 데이터는 number 형식으로 보내야합니다.");
    }

    const parsedTaskAlarm = parseInt(taskAlarm);

    // Service 호출
    const result = await this.alarmService.updateTask(userId, parsedTaskAlarm);

    // 성공 응답 (이미지 명세에 맞게)
    return res.success(result, "과제 마감 시간의 알림 전송 시간을 변경했습니다.");
  };

  // 과제 알림 여부 설정
  handleAlarmUpdateTaskStatus = async (req, res) => {
    const userId = req.user.id;
    const taskId = req.params.taskId;
    const isAlarm = req.body.isAlarm;

    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }

    if (!taskId) {
      throw new BadRequestError("INVALID_PARAMETER", "요청하신 taskId가 존재하지 않습니다.");
    }
    if (isNaN(parseInt(taskId))) {
      throw new BadRequestError("INVALID_PARAMETER", "params의 taskId는 숫자로 보내야합니다.");
    }
    if (typeof isAlarm !== "boolean") {
      throw new BadRequestError("INVALID_BODY", "Body의 isAlarm 데이터는 Boolean 형식으로 보내야합니다.");
    }

    const parsedTaskId = parseInt(taskId);


    // Service 호출
    const result = await this.alarmService.updateTaskAlarmStatus(
      userId,
      parsedTaskId,
      isAlarm
    );

    // 성공 응답 (이미지 명세에 맞게)
    return res.success(result, "과제에 대한 알림 여부를 변경하였습니다..");
  };

  // subtask 알림 여부 설정
  handleAlarmUpdateSubtaskStatus = async (req, res) => {
    const userId = req.user.id;
    const subTaskId = req.params.subtaskId;
    const isAlarm = req.body.isAlarm;

    if (!userId) {
      throw new NotFoundError("USER_NOT_FOUND", "사용자를 찾을 수 없습니다.");
    }

    if (!subTaskId) {
      throw new BadRequestError("INVALID_PARAMETER", "요청하신 subTaskId가 존재하지 않습니다.");
    }
    if (isNaN(parseInt(subTaskId))) {
      throw new BadRequestError("INVALID_PARAMETER", "params의 subTaskId는 숫자로 보내야합니다.");
    }
    if (typeof isAlarm !== "boolean") {
      throw new BadRequestError("INVALID_BODY", "Body의 isAlarm 데이터는 Boolean 형식으로 보내야합니다.");
    }

    const parsedSubTaskId = parseInt(subTaskId);

    // Service 호출
    const result = await this.alarmService.updateSubtaskAlarmStatus(
      userId,
      parsedSubTaskId,
      isAlarm
    );

    // 성공 응답 (이미지 명세에 맞게)
    return res.success(result, "세부과제에 대한 알림 여부를 변경하였습니다..");
  };

  //  알림 읽음 처리
  handleAlarmUpdateAlarmReadStatus = async (req, res) => {
    const userId = req.user.id;
    const alarmId = req.params.alarmId;
    const isRead = req.body.isRead;

    const parsedAlarmId = parseInt(alarmId);

    if (!alarmId || isNaN(parseInt(alarmId))) {
      throw new BadRequestError("INVALID_PARAMETER", "params는 숫자로 보내야합니다.");
    }

    // Service 호출
    const result = await this.alarmService.updateAlarmReadStatus(
      userId,
      parsedAlarmId,
      isRead
    );

    // 성공 응답 (이미지 명세에 맞게)
    return res.success(result, "알림 읽음 처리 성공");
  };


  // 모든 알림 읽음 처리
  handleAlarmUpdateAllAlarmReadStatus = async (req, res) => {
    const userId = req.user.id;

    // Service 호출
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
