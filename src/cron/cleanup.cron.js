import cron from "node-cron";
import { CommonAuthService } from "../services/auth.service.js";

const service = new CommonAuthService();

// 매일 새벽 3시 실행
cron.schedule("0 3 * * *", async () => {
  console.log("탈퇴 유저 정리 시작");

  try {
    await service.deleteExpiredUsers();
    console.log("탈퇴 유저 정리 완료");
  } catch (error) {
    console.error("탈퇴 유저 정리 실패:", error);
  }
});