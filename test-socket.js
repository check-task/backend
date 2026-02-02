import { io } from "socket.io-client";
/*
const socket = io("http://localhost:8000", {
  path: "/socket.io/"
});

socket.on("connect", () => {
  console.log("✅ connected:", socket.id);
});

socket.on("disconnect", () => {
  console.log("❌ disconnected");
});
*/
//const io = require('socket.io-client');
//import { io } from 'socket.io-client';






const socket = io('http://localhost:8000', {
  path: '/socket.io/',
  transports: ['websocket']
});

// 연결 이벤트
socket.on('connect', () => {
  console.log('✅ 연결 성공! Socket ID:', socket.id);
  
  // 테스트 방 참가
  socket.emit('joinTaskRoom', '1');
  
  // 2초 후에 상태 업데이트
  setTimeout(() => {
    console.log('\n🔄 서브태스크 상태 업데이트 시도...');
    socket.emit('updateSubtaskStatus', {
      taskId: 2,
      subTaskId: 2,
      status: 'COMPLETED'
    }, (response) => {
      console.log('서버 응답:', response);
    });
  }, 2000);
});

// 이벤트 수신
socket.on('subtaskStatusUpdated', (data) => {
  console.log('\n📩 상태 업데이트 수신:', data);
});

// 에러 처리
socket.on('connect_error', (error) => {
  console.error('연결 오류:', error);
});

// 종료 처리
process.on('SIGINT', () => {
  socket.disconnect();
  process.exit();
});