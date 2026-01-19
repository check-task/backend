import "dotenv/config";
import { defineConfig, env } from "@prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",

  // 데이터베이스 URL은 여기서 한 번만 설정
  datasource: {
    url: env("DATABASE_URL"),
  },

  // (선택) 마이그레이션 경로 유지
  migrations: {
    path: "prisma/migrations",
  },
});
