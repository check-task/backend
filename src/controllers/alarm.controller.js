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
