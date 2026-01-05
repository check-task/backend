import dotenv from "dotenv";
import prismaPkg from "@prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

// .env를 가장 먼저 로드해야 환경 변수가 정상적으로 적용됩니다.
dotenv.config();

const { PrismaClient } = prismaPkg;

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

// Prisma Client 인스턴스 생성
// Prisma 7에서는 런타임에 연결 정보를 생성자에 전달해야 합니다.
export const prisma = new PrismaClient({ adapter });

export default prisma;
