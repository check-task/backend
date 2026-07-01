import admin from "../config/firebase.config.js";
import { redis } from "../config/redis.config.js"; 

export const sendPushNotification = async (userId, title, body) => {
  try {
    const token = await redis.get(`fcm_token:${userId}`);
    
    if (!token) {
      console.log(`[FCM] User ${userId}는 등록된 디바이스 토큰이 없어 푸시를 보내지 않습니다.`);
      return;
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
    };

    await admin.messaging().send(message);
    console.log(`[FCM] User ${userId}에게 푸시 알림 팝업 전송 완료!`);
  } catch (error) {
    console.error("[FCM] 푸시 알림 발송 중 에러 발생:", error);
  }
};