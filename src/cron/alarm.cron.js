import cron from "node-cron";
import alarmRepository from "../repositories/alarm.repository.js";
import { sendPushNotification } from "../utils/fcmSender.js";
import redis from "../config/redis.config.js";

// 5분마다 자동으로 실행되는 마감 알림 발송 봇
cron.schedule("*/5 * * * *", async () => {
  console.log("⏰ [스케줄러] 5분 주기 마감 알림 발송 체크 시작...");

  try {
    const pendingAlarms = await alarmRepository.findUnsentAlarms();

    if (pendingAlarms.length === 0) {
      console.log("⏰ [스케줄러] 이번 주기에 발송할 마감 알림이 없습니다.");
      return;
    }

    for (const alarm of pendingAlarms) {
      const redisKey = `pushed_alarm:${alarm.id}`;
      const isAlreadyPushed = await redis.get(redisKey);

      if (isAlreadyPushed) {
        continue; 
      }

      await sendPushNotification(alarm.userId, alarm.title, alarm.alarmContent);

      await redis.set(redisKey, "true", "EX", 60 * 60 * 24 * 7);
    }

    console.log(`⏰ [스케줄러] 총 ${pendingAlarms.length}건의 알림 체크 및 처리 완료.`);
  } catch (error) {
    console.error("🚨 [스케줄러 에러] 마감 알림 자동 발송 중 문제가 발생했습니다:", error);
  }
});