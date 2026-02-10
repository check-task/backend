import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/error.middleware.js";
import { stateHandler } from "./middlewares/state.middleware.js";
import { corsOptions } from "./config/cors.config.js";
import apiRouter from "./routes/index.js";
import prisma from "./db.config.js";
import { swaggerHandler } from "./middlewares/swagger.middleware.js";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import path from "path";
import passport from "passport";
import { createServer } from "http";
import setupSocket from "./socket/socket.js";
import cookieParser from "cookie-parser";

console.log(" INDEX.JS LOADED");
const app = express();
const port = process.env.PORT;

//HTTPS 프록시 환경에서 secure 쿠키 정상 동작을 위해 설정(PC + 모바일)
app.set("trust proxy", 1)
// 3. HTTP 서버 및 소켓 서버 생성
const httpServer = createServer(app);

// Socket.IO 서버 초기화
const io = setupSocket(httpServer);
app.set('io', io);  // Make io accessible in routes

// HTTP 서버 이벤트 리스너 추가
httpServer.on('error', (error) => {
  console.error('❌ HTTP 서버 오류:', error);
});

httpServer.on('listening', () => {
  const addr = httpServer.address();
  const bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  console.log(`🌐 HTTP 서버가 ${bind}에서 실행 중입니다.`);
});

//cors 방식 허용
app.use(cors(corsOptions));
app.use(express.static("public"));
//request의 본문을 json으로 해석할 수 있도록 함.(JSON 형태의 요청 body를 파싱하기 위함)
app.use(express.json());
//단순 객체 문자열 형태로 본문 데이터 해석 (form-data 형태의 요청 body를 파싱하기 위함)
app.use(express.urlencoded({ extended: false }));

app.use(cookieParser());

app.use(passport.initialize());

app.use(stateHandler);

app.get("/", (req, res) => {
  return res.success("아싸 나이스 성공~");
});

//swagger
const swaggerDocument = YAML.load(
  path.join(process.cwd(), "src/swagger/swagger.yml")
);

// 서버 URL을 동적으로 설정
const serverPort = process.env.PORT;
swaggerDocument.servers = [
  {
    url: `https://checktask.p-e.kr`,
    description: "Production Server",
  },
  {
    url: `http://localhost:${serverPort}`,
    description: "Local Development Server",
  },
];

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/openapi.json", swaggerHandler);

// API 라우터 등록
app.use("/api/v1", apiRouter);

app.use(errorHandler);

// 서버 시작 함수
const startServer = async () => {
  try {
    // DB 연결 테스트 & 커넥션 풀 초기화
    console.log('🔌 데이터베이스에 연결 중...');
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // 서버 시작
    const PORT = process.env.PORT || 8000;
    const HOST = '0.0.0.0';

    httpServer.listen(PORT, HOST, () => {
      const serverUrl = `http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`;
      console.log('\n🚀 ===== 서버 시작 =====');
      console.log(`   - 서버 주소: ${serverUrl}`);
      console.log(`   - 서버 시간: ${new Date().toISOString()}`);
      console.log(`   - Node.js 버전: ${process.version}`);
      console.log(`   - 플랫폼: ${process.platform} ${process.arch}`);
      console.log(`   - 메모리 사용량: ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`);
      console.log('==========================\n');

      /*
    // 서버 리스닝
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);*/
    });
  } catch (err) {
    console.error("❌ Failed to connect to the database:", err);
    process.exit(1);
  }
};

startServer();

// 프로세스 종료 시 Prisma 연결 종료
const gracefulExit = async () => {
  console.log("Disconnecting Prisma...");
  await prisma.$disconnect();
  process.exit(0);
};

// SIGINT: Ctrl+C 종료, SIGTERM: 프로세스 종료
process.on("SIGINT", gracefulExit);
process.on("SIGTERM", gracefulExit);