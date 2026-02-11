//한국 시간으로 설정
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

dayjs.extend(utc);
dayjs.extend(timezone);

// 한국 시간 기준으로 알림 시간 계산 헬퍼 함수
export const calculateAlarmDate = (deadline, alarmHours) => {
  // deadline을 날짜 문자열로 변환 (YYYY-MM-DD)
  let dateStr;

  if (deadline instanceof Date) {
    // Date 객체에서 날짜만 추출 (로컬 시간 기준)
    const year = deadline.getFullYear();
    const month = String(deadline.getMonth() + 1).padStart(2, '0');
    const day = String(deadline.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else {
    // 이미 문자열인 경우
    dateStr = deadline.toString().split('T')[0]; // 시간 부분 제거
  }

  // 한국 시간 자정(00:00:00 KST)으로 파싱
  const kstDeadline = dayjs.tz(dateStr, "YYYY-MM-DD", "Asia/Seoul");

  // 알림 시간 계산 (한국 시간 기준)
  const alarmDateKST = kstDeadline.subtract(alarmHours, "hour");


  // 한국 시간을 Date 객체로 변환
  return new Date(alarmDateKST.toDate().getTime() + 9 * 60 * 60 * 1000);
};