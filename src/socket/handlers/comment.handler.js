import prisma from "../../db.config.js";
import { CommentRepository } from "../../repositories/comment.repository.js";
/**
 * 댓글 관련 소켓 이벤트 핸들러
 * @param {Server} io - Socket.IO 서버 인스턴스
 * @param {Socket} socket - Socket 인스턴스
 */
export const setupCommentHandlers = (io, socket) => {
  // 댓글 이벤트 핸들러
  const handleCommentEvent = async (event, data, callback) => {
    console.log(`📝 [${socket.id}] ${event}Comment 이벤트 수신:`, data);
    try {
      let result;
      const now = new Date();

      // 1. DB 작업
      switch (event) {
        case 'create':
          // result = await prisma.comment.create({
          //   data: {
          //     ...data,
          //     createdAt: now,
          //     updatedAt: now
          //   }
          // });
          result = await CommentRepository.createComment(data, data.subTaskId);
          break;

        case 'update':
          result = await prisma.comment.update({
            where: { id: data.id },
            data: {
              content: data.content,
              updatedAt: now
            }
          });
          break;

        case 'delete':
          result = await prisma.comment.delete({
            where: { id: data.id }
          });
          break;
      }

      // 2. 성공 응답
      const response = {
        success: true,
        message: `${event}Comment 성공`,
        data: result,
        timestamp: now.toISOString()
      };

      // 3. 콜백 전송 (요청자에게만)
      if (callback) callback(response);

      // 4. 방에 이벤트 브로드캐스트 (작성자 포함 모든 클라이언트에게)
      if (data?.postId) {
        io.to(`post:${data.postId}`).emit(`${event}Comment`, response);
      }

      console.log(`✅ [${socket.id}] ${event}Comment 성공:`, response);
    } catch (error) {
      console.error(`❌ [${socket.id}] ${event}Comment 실패:`, error);
      const errorResponse = {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };

      if (callback) callback(errorResponse);
    }
  };

  // 댓글 생성
  socket.on('createComment', (data, callback) =>
    handleCommentEvent('create', data, callback)
  );

  // 댓글 수정
  socket.on('updateComment', (data, callback) =>
    handleCommentEvent('update', data, callback)
  );

  // 댓글 삭제
  socket.on('deleteComment', (data, callback) =>
    handleCommentEvent('delete', data, callback)
  );

  // 게시글 방 입장
  socket.on('joinPostRoom', (postId) => {
    socket.join(`post:${postId}`);
    console.log(`🚪 [${socket.id}] 사용자가 게시글 방에 입장했습니다. (Post ID: ${postId})`);
  });

  // 게시글 방 퇴장
  socket.on('leavePostRoom', (postId) => {
    socket.leave(`post:${postId}`);
    console.log(`🚶 [${socket.id}] 사용자가 게시글 방에서 퇴장했습니다. (Post ID: ${postId})`);
  });
};

// 이벤트 타입 정의 (선택사항)
export const commentEvents = {
  CREATE: 'createComment',
  UPDATE: 'updateComment',
  DELETE: 'deleteComment',
  JOIN_POST: 'joinPostRoom',
  LEAVE_POST: 'leavePostRoom'
};
