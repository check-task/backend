import dotenv from "dotenv";
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

dotenv.config();

const app = express();
const port = process.env.PORT;

//cors 방식 허용
app.use(cors(corsOptions));
app.use(express.static("public"));
//request의 본문을 json으로 해석할 수 있도록 함.(JSON 형태의 요청 body를 파싱하기 위함)
app.use(express.json());
//단순 객체 문자열 형태로 본문 데이터 해석 (form-data 형태의 요청 body를 파싱하기 위함)
app.use(express.urlencoded({ extended: false }));

app.use(stateHandler);

app.get("/", (req, res) => {
  return res.success("아싸 나이스 성공~");
});

//swagger
const swaggerDocument = YAML.load(
  path.join(process.cwd(), "src/swagger/swagger.yml")
);
app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.get("/openapi.json", swaggerHandler);

// API 라우터 등록
app.use("/api/v1", apiRouter);

app.use(errorHandler);

// 서버 시작 함수
const startServer = async () => {
  try {
    // DB 연결 테스트 & 커넥션 풀 초기화
    await prisma.$connect();
    console.log("✅ Database connected successfully");

    // 서버 리스닝
    app.listen(port, () => {
      console.log(`Example app listening on port ${port}`);
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