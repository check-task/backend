import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // 새 엔진 대신 예전처럼 동작하는 classic 엔진 사용
  // engine: "classic",

  // 데이터베이스 URL은 여기서 한 번만 설정
  datasource: {
    url: env("DATABASE_URL"),
  },

  // (선택) 마이그레이션 경로 유지
  migrations: {
    path: "prisma/migrations",
  },
});
