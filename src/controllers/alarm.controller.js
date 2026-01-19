import { BadRequestError } from "../errors/custom.error.js";
import * as AlarmService from "../services/alarm.service.js";

// ✅ GET /v1/api/alarm - 알람 목록 조회
export const handleAlarmList = async (req, res) => {
  const userId = req.user.id;
  // req.user는 로그인 미들웨어에서 설정됨
  const result = await AlarmService.getAlarms(
    userId, // 임시로 지정한 유저 ID
    // req.user.id, // 로그인 미들웨어에서 검증된 유저 ID
    req.query.cursor ? parseInt(req.query.cursor) : undefined,
    req.query.limit ? parseInt(req.query.limit) : undefined,
    req.query.orderBy,
    req.query.order
  );

  return res.success(result, "알림 목록 조회 성공");
};

// ✅ DELETE /v1/api/alarm/:alarmId - 개별 알림 삭제
export const handleAlarmDelete = async (req, res) => {
  // userId (임시 - 로그인 미들웨어 생성 후 req.user.id 사용)
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
  await AlarmService.deleteAlarm(userId, parsedAlarmId);

  // 성공 응답 (data는 null)
  return res.success(null, "개별 알림 삭제 성공");
};

// ✅ DELETE /v1/api/alarm - 전체 알림 삭제
export const handleAlarmDeleteAll = async (req, res) => {
  const userId = req.user.id;

  // Service 호출
  await AlarmService.deleteAllAlarms(userId);

  // 성공 응답 (data는 null)
  return res.success(null, "알림 전체 삭제 성공");
};

// ✅ PATCH /v1/api/alarm/deadline - 최종 마감 알림 수정
export const handleAlarmUpdateDeadline = async (req, res) => {
  const userId = req.user.id;
  const deadlineAlarm = req.body.deadlineAlarm;

  // 400 에러: 파라미터가 숫자가 아닌 경우
  if (!deadlineAlarm || isNaN(parseInt(deadlineAlarm))) {
    throw new BadRequestError("INVALID_BODY", "Body의 데이터 형식이 다를 경우");
  }

  const parsedDeadlineAlarm = parseInt(deadlineAlarm);

  // Service 호출
  const result = await AlarmService.updateDeadline(userId, parsedDeadlineAlarm);

  // 성공 응답 (이미지 명세에 맞게)
  return res.success(result, "최종 마감 시간의 알림 전송 시간을 변경했습니다.");
};

// ✅ Task 마감 알림 수정
export const handleAlarmUpdateTask = async (req, res) => {
  const userId = req.user.id;
  const taskAlarm = req.body.taskAlarm;

  // 400 에러: 파라미터가 숫자가 아닌 경우
  if (!taskAlarm || isNaN(parseInt(taskAlarm))) {
    throw new BadRequestError("INVALID_BODY", "Body의 데이터 형식이 다를 경우");
  }

  const parsedTaskAlarm = parseInt(taskAlarm);

  // Service 호출
  const result = await AlarmService.updateTask(userId, parsedTaskAlarm);

  // 성공 응답 (이미지 명세에 맞게)
  return res.success(result, "과제 마감 시간의 알림 전송 시간을 변경했습니다.");
};

// ✅ 과제 알림 여부 설정
export const handleAlarmUpdateTaskStatus = async (req, res) => {
  const userId = req.user.id;
  const taskId = req.params.taskId;
  const isAlarm = req.body.isAlarm;

  // 400 에러: 파라미터가 숫자가 아닌 경우
  if (!taskId || isNaN(parseInt(taskId))) {
    throw new BadRequestError(
      "INVALID_PARAMS",
      "params는 숫자로 보내야합니다."
    );
  }

  const parsedTaskId = parseInt(taskId);

  // isAlarm 검증
  if (typeof isAlarm !== "boolean") {
    throw new BadRequestError(
      "INVALID_BODY",
      "Body의 isAlarm 데이터는 boolean 형식으로 보내야합니다."
    );
  }

  // Service 호출
  const result = await AlarmService.updateTaskAlarmStatus(
    userId,
    parsedTaskId,
    isAlarm
  );

  // 성공 응답 (이미지 명세에 맞게)
  return res.success(result, "과제에 대한 알림 여부를 변경하였습니다..");
};

// ✅ PATCH /v1/api/alarm/subtask/:subTaskId - subtask 알림 여부 설정
export const handleAlarmUpdateSubtaskStatus = async (req, res) => {
  const userId = req.user.id;
  const subTaskId = req.params.subtaskId;
  const isAlarm = req.body.isAlarm;

  // 400 에러: 파라미터가 숫자가 아닌 경우
  if (!subTaskId || isNaN(parseInt(subTaskId))) {
    throw new BadRequestError(
      "INVALID_PARAMETER",
      "params는 숫자로 보내야합니다."
    );
  }

  const parsedSubTaskId = parseInt(subTaskId);

  // isAlarm 검증
  if (typeof isAlarm !== "boolean") {
    throw new BadRequestError(
      "INVALID_BODY",
      "Body의 isAlarm 데이터는 boolean 형식으로 보내야합니다."
    );
  }

  // Service 호출
  const result = await AlarmService.updateSubtaskAlarmStatus(
    userId,
    parsedSubTaskId,
    isAlarm
  );

  // 성공 응답 (이미지 명세에 맞게)
  return res.success(result, "세부과제에 대한 알림 여부를 변경하였습니다..");
};

// ✅ PATCH /v1/api/alarm/read/:alarmId - 알림 읽음 처리
export const handleAlarmUpdateAlarmReadStatus = async (req, res) => {
  const userId = req.user.id;
  const alarmId = req.params.alarmId;
  const isRead = req.body.isRead;

  const parsedAlarmId = parseInt(alarmId);

  // Service 호출
  const result = await AlarmService.updateAlarmReadStatus(
    userId,
    parsedAlarmId,
    isRead
  );

  // 성공 응답 (이미지 명세에 맞게)
  return res.success(result, "알림 읽음 처리 성공");
};
