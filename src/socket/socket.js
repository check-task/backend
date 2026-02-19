import { Server } from "socket.io";
import { setupTaskHandlers } from "./handlers/task.handler.js";
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Socket.IO 서버 설정
 * @param {http.Server} httpServer - HTTP 서버 인스턴스
 * @returns {Server} Socket.IO 서버 인스턴스
 */
const setupSocket = (httpServer) => {
  try {
    // Socket.IO 서버 초기화
    const io = new Server(httpServer, {
      path: "/socket.io/",
      cors: {
        origin: [
          "http://localhost:8000",
          "http://localhost:3000",
          "https://checktask.kro.kr",
          "https://checktask.p-e.kr",
        ],
        methods: ["GET", "POST", "PATCH", "DELETE"],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000,
      maxHttpBufferSize: 1e6, // 1MB
      transports: ['websocket', 'polling']
    });

    console.log("🔥 Socket.IO 서버가 성공적으로 초기화되었습니다.");
    console.log(`📡 Socket.IO 경로: ${io.path()}`);
    console.log('🔌 CORS 설정:', JSON.stringify(io.engine.opts.cors, null, 2));

    // ✨ 소켓 인증 미들웨어
    io.use((socket, next) => {
      // 1. 클라이언트가 보낸 토큰 확인
      // socket.handshake.auth.token : 실제 프론트엔드(React/Next.js)에서 보낼 때 (권장)
      // socket.handshake.headers.token : Postman 헤더에서 보낼 때 (테스트용)
      const token = socket.handshake.auth.token || socket.handshake.headers.token;

      if (!token) {
        return next(new Error('Authentication error: 토큰이 없습니다.'));
      }
      // 2. 토큰 검증
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        socket.user = decoded; // 소켓 객체에 사용자 정보 저장
        next(); // 통과
      } catch (err) {
        next(new Error('Authentication error: 유효하지 않은 토큰입니다.'));
      }
    });

    // 연결 이벤트 핸들러
    io.on("connection", (socket) => {
      if (!socket || !socket.id) {
        console.error('❌ 유효하지 않은 소켓 연결 시도가 있었습니다.');
        return socket?.disconnect(true);
      }

      console.log(`✅ 사용자 접속: userId ${socket.user.id} 접속`);

      try {
        // 핸들러 초기화
        setupTaskHandlers(io, socket);

        // 연결 해제 이벤트
        socket.on('disconnect', (reason) => {
          console.log(`\n${'='.repeat(50)}`);
          console.log(`❌ 연결 종료 userId[${socket.user.id}]`);
          console.log(`📛 사유: ${reason}`);
          console.log('='.repeat(50) + '\n');
        });

        // 에러 이벤트
        socket.on('error', (error) => {
          console.error(`\n${'❌'.repeat(10)}`);
          console.error(`소켓 에러 userId[${socket.user.id}]:`, error);
          console.error('스택 트레이스:', error.stack);
          console.error('❌'.repeat(10) + '\n');
        });

      } catch (error) {
        console.error(`\n❌ 핸들러 초기화 중 오류 발생 userId[${socket.user.id}]:`, error);
        socket.emit('error', {
          message: '서버 내부 오류가 발생했습니다.',
          code: 'HANDLER_INIT_ERROR'
        });
      }
    });

    // 서버 전체 에러 핸들링
    io.engine.on("connection_error", (err) => {
      console.error('\n' + '❌'.repeat(10));
      console.error('Socket.IO 연결 에러:', err.message);
      console.error('에러 코드:', err.code);
      console.error('컨텍스트:', err.context);
      console.error('❌'.repeat(10) + '\n');
    });

    return io;

  } catch (error) {
    console.error('\n' + '❌'.repeat(10));
    console.error('Socket.IO 서버 초기화 중 치명적 오류 발생:');
    console.error(error);
    console.error('❌'.repeat(10) + '\n');
    throw error; // 상위 핸들러로 에러 전파
  }
};

export default setupSocket;