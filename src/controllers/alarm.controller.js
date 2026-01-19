import { BadRequestError } from "../errors/custom.error.js";
import * as AlarmService from "../services/alarm.service.js";

// 알람 목록 조회
export const handleAlarmList = async (req, res) => {
  // userId를 query 파라미터에서 받기 (임시)
  const userId = req.query.userId ? parseInt(req.query.userId) : 1; // 기본값 1
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

// 개별 알림 삭제
export const handleAlarmDelete = async (req, res) => {
  // userId (임시 - 로그인 미들웨어 생성 후 req.user.id 사용)
  const userId = req.query.userId ? parseInt(req.query.userId) : 1;

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

// 전체 알림 삭제
export const handleAlarmDeleteAll = async (req, res) => {
  // userId (임시 - 로그인 미들웨어 생성 후 req.user.id 사용)
  const userId = req.query.userId ? parseInt(req.query.userId) : 1;

  // Service 호출
  await AlarmService.deleteAllAlarms(userId);

  // 성공 응답 (data는 null)
  return res.success(null, "알림 전체 삭제 성공");
};
