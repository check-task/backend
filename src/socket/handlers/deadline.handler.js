/**
 * 마감일 관련 소켓 이벤트 핸들러
 * @param {Server} io - Socket.IO 서버 인스턴스
 * @param {Socket} socket - Socket 인스턴스
 */
export const setupDeadlineHandlers = (io, socket) => {
  // 마감일 업데이트
  socket.on('updateDeadline', async ({ taskId, subTaskId, deadline }, callback) => {
    try {
      const room = `task:${taskId}`;
      const numericSubTaskId = Number(subTaskId);
      const deadlineDate = new Date(deadline);
      
      console.log(` [${socket.id}] 마감일 업데이트 시도:`, { 
        taskId, 
        subTaskId: numericSubTaskId, 
        deadline: deadlineDate.toISOString() 
      });

      // 1. DB 업데이트
      const updatedSubTask = await prisma.subTask.update({
        where: { id: numericSubTaskId },
        data: { 
          deadline: deadlineDate,
          updatedAt: new Date()
        }
      });

      console.log(` [${socket.id}] 마감일 업데이트 성공:`, updatedSubTask);

      // 2. 방에 있는 모든 클라이언트에게 마감일 업데이트 알림
      io.to(room).emit('deadlineUpdated', {
        subTaskId: updatedSubTask.id,
        taskId,
        deadline: updatedSubTask.deadline?.toISOString(),
        updatedAt: updatedSubTask.updatedAt.toISOString()
      });
      
      // 3. 호출자에게 응답
      if (typeof callback === 'function') {
        callback({ 
          success: true,
          message: '마감일이 업데이트되었습니다.',
          data: updatedSubTask,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ [${socket.id}] 마감일 업데이트 오류:`, error);
      if (typeof callback === 'function') {
        callback({ 
          success: false, 
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
};

/**
 * 마감일 관련 이벤트 타입 상수
 * 
 * @example
 * // 
 * import { deadlineEvents } from './handlers/deadline.handler.js';
 * socket.emit(deadlineEvents.UPDATE, { taskId, subTaskId, deadline });
 */
export const deadlineEvents = {
  UPDATE: 'updateDeadline',
  UPDATED: 'deadlineUpdated'
};
