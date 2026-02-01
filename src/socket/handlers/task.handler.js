import prisma from "../../db.config.js";

/**
 * 태스크 관련 소켓 이벤트 핸들러
 * @param {Server} io - Socket.IO 서버 인스턴스
 * @param {Socket} socket - Socket 인스턴스
 */
export const setupTaskHandlers = (io, socket) => {
  // 태스크 방 입장
  socket.on('joinTaskRoom', (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`📌 [${socket.id}] 사용자가 태스크 방에 입장했습니다. (Task ID: ${taskId})`);
  });

  // 서브태스크 상태 업데이트
  socket.on('updateSubtaskStatus', async ({ taskId, subTaskId, status }, callback) => {
    try {
      const numericSubTaskId = Number(subTaskId);
      const normalizedStatus = status.toUpperCase();
      
      console.log(`🔄 [${socket.id}] 서브태스크 상태 업데이트 시도:`, { 
        taskId, 
        subTaskId: numericSubTaskId, 
        status: normalizedStatus 
      });

      // 1. DB 업데이트
      const updatedSubTask = await prisma.subTask.update({
        where: { id: numericSubTaskId },
        data: { 
          status: normalizedStatus,
          updatedAt: new Date()
        }
      });

      console.log(`✅ [${socket.id}] 서브태스크 상태 업데이트 성공:`, updatedSubTask);

      // 2. 방에 있는 모든 클라이언트에게 상태 업데이트 알림
      io.to(`task:${taskId}`).emit('subtaskStatusUpdated', {
        ...updatedSubTask,
        updatedAt: updatedSubTask.updatedAt.toISOString()
      });
      
      // 3. 호출자에게 응답
      if (typeof callback === 'function') {
        callback({ 
          success: true, 
          message: '상태가 업데이트되었습니다.',
          data: updatedSubTask,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error(`❌ [${socket.id}] 서브태스크 상태 업데이트 실패:`, error);
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

// 이벤트 타입 정의 (선택사항) / 문자열 대신 상수 사용하면 오타방지, 
// 이벤트이름바꿀때 한곳에서 수정해서 유지보수성
/*// 이렇게 쓰는 대신
socket.emit('updateSubtaskStatus', data);

// 이렇게 사용할 수 있음
import { taskEvents } from './handlers/task.handler.js';
socket.emit(taskEvents.UPDATE_SUBTASK, data);
 */

export const taskEvents = {
  JOIN_TASK: 'joinTaskRoom',
  UPDATE_SUBTASK: 'updateSubtaskStatus',
  SUBTASK_UPDATED: 'subtaskStatusUpdated'
};
