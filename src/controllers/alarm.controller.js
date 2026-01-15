import * as AlarmService from "../services/alarm.service.js"; // 추가!
import {
  alarmListResponseDTO,
  cursorPaginationMeta,
} from "../dtos/alarm.dto.js"; // 추가!

// 알람 목록 조회
export const getAlarms = async (req, res, next) => {
  try {
    const userId = req.user?.id || 1; // (TODO: 로그인 기능 구현 후 수정)

    const options = {
      // isRead:
      //   req.query.isRead === "true"
      //     ? true
      //     : req.query.isRead === "false"
      //     ? false
      //     : null, // 알람 읽음 여부 => null: 모두, true: 읽음, false: 읽지 않음
      cursor: req.query.cursor ? parseInt(req.query.cursor) : null,
      limit: parseInt(req.query.limit) || 10, // 기본 10개
      orderBy: req.query.orderBy,
      order: req.query.order,
    };

    const alarms = await AlarmService.getAlarms(userId, options);

    // limit+1개를 가져왔으므로, hasNextPage 판단 후 실제 데이터는 limit개만
    const hasNextPage = alarms.length > options.limit;
    const dataToReturn = hasNextPage ? alarms.slice(0, options.limit) : alarms;

    const responseData = alarmListResponseDTO(dataToReturn);
    const meta = cursorPaginationMeta(dataToReturn, options.limit);

    return res.success(
      {
        ...responseData,
        meta,
      },
      "알림 목록 조회 성공"
    );
  } catch (error) {
    next(error);
  }
};
