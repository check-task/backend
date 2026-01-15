import * as AlarmService from "../services/alarm.service.js"; // 추가!
import { alarmListResponseDTO } from "../dtos/alarm.dto.js"; // 추가!

// 알람 목록 조회
// Controller (간단해짐!)
export const getAlarms = async (req, res, next) => {
  try {
    const userId = req.user?.id || 1;

    const options = {
      cursor: req.query.cursor ? parseInt(req.query.cursor) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined,
      orderBy: req.query.orderBy,
      order: req.query.order,
    };

    const { alarms, hasNextPage, cursor } = await AlarmService.getAlarms(
      userId,
      options
    );

    const responseData = alarmListResponseDTO(alarms);
    const meta = { hasNextPage, cursor };

    return res.success({ ...responseData, meta }, "알림 목록 조회 성공");
  } catch (error) {
    next(error);
  }
};
