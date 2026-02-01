import { Server } from "socket.io";
import { setupCommentHandlers } from "./handlers/comment.handler.js";
import { setupTaskHandlers } from "./handlers/task.handler.js";
import { setupDeadlineHandlers } from "./handlers/deadline.handler.js";

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
        origin: "*",
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

    // 연결 이벤트 핸들러
    io.on("connection", (socket) => {
      if (!socket || !socket.id) {
        console.error('❌ 유효하지 않은 소켓 연결 시도가 있었습니다.');
        return socket?.disconnect(true);
      }

      const clientIp = socket.handshake?.headers?.['x-forwarded-for'] || 
                      socket.handshake?.address || 
                      '알 수 없음';
      const userAgent = socket.handshake?.headers?.['user-agent'] || '알 수 없음';

      console.log('\n' + '='.repeat(50));
      console.log(`✅ 새로운 클라이언트 연결됨 [${socket.id}]`);
      console.log(`🌐 IP: ${clientIp}`);
      console.log(`🖥️  User-Agent: ${userAgent}`);
      console.log('='.repeat(50) + '\n');

      try {
        // 핸들러 초기화
        setupCommentHandlers(io, socket);
        setupTaskHandlers(io, socket);
        setupDeadlineHandlers(io, socket);

        // 연결 해제 이벤트
        socket.on('disconnect', (reason) => {
          console.log(`\n${'='.repeat(50)}`);
          console.log(`❌ 연결 종료 [${socket.id}]`);
          console.log(`📛 사유: ${reason}`);
          console.log('='.repeat(50) + '\n');
        });

        // 에러 이벤트
        socket.on('error', (error) => {
          console.error(`\n${'❌'.repeat(10)}`);
          console.error(`소켓 에러 [${socket.id}]:`, error);
          console.error('스택 트레이스:', error.stack);
          console.error('❌'.repeat(10) + '\n');
        });

      } catch (error) {
        console.error(`\n❌ 핸들러 초기화 중 오류 발생 [${socket.id}]:`, error);
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