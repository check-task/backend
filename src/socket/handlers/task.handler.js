import prisma from "../../db.config.js";
import taskService from "../../services/task.service.js";

export const taskEvents = {
  JOIN_TASK: 'joinTaskRoom',
  UPDATE_SUBTASK: 'updateSubtaskStatus',
  SUBTASK_UPDATED: 'subtaskStatusUpdated',
  UPDATE_DEADLINE: 'updateDeadline',
  DEADLINE_UPDATED: 'deadlineUpdated',
  SET_ASSIGNEE: 'setSubTaskAssignee',
  ASSIGNEE_UPDATED: 'subtaskAssigneeUpdated'
};

/**
 * 태스크 관련 소켓 이벤트 핸들러
 * @param {Server} io - Socket.IO 서버 인스턴스
 * @param {Socket} socket - Socket 인스턴스
 */
export const setupTaskHandlers = (io, socket) => {
  // 태스크 방 입장
  socket.on(taskEvents.JOIN_TASK, (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`📌 [${socket.id}] 사용자가 태스크 방에 입장했습니다. (Task ID: ${taskId})`);
  });

  // 서브태스크 상태 업데이트
  socket.on(taskEvents.UPDATE_SUBTASK, async ({ taskId, subTaskId, status }, callback) => {
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
        },
        include: {
          assignee: {
            select: {
              id: true,
              nickname: true,
              email: true
            }
          }
        }
      });

      console.log(`✅ [${socket.id}] 서브태스크 상태 업데이트 성공:`, updatedSubTask);

      // 2. 방에 있는 모든 클라이언트에게 상태 업데이트 알림
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_UPDATED, {
        ...updatedSubTask,
        updatedAt: updatedSubTask.updatedAt.toISOString()
      });
      
      // 3. 호출자에게 응답
      respond(callback, {
        success: true,
        message: '상태가 업데이트되었습니다.',
        data: updatedSubTask
      });
    } catch (error) {
      console.error(`❌ [${socket.id}] 서브태스크 상태 업데이트 실패:`, error);
      respond(callback, {
        success: false,
        error: error.message
      });
    }
  });

  // 마감일 업데이트
  socket.on(taskEvents.UPDATE_DEADLINE, async ({ taskId, subTaskId, deadline }, callback) => {
    try {
      const numericSubTaskId = Number(subTaskId);
      const deadlineDate = new Date(deadline);
      
      console.log(`🔄 [${socket.id}] 서브태스크 마감일 업데이트 시도:`, { 
        taskId, 
        subTaskId: numericSubTaskId, 
        deadline: deadlineDate
      });

      // 1. DB 업데이트
      const updatedSubTask = await prisma.subTask.update({
        where: { id: numericSubTaskId },
        data: { 
          deadline: deadlineDate,
          updatedAt: new Date()
        }
      });

      console.log(`✅ [${socket.id}] 서브태스크 마감일 업데이트 성공:`, updatedSubTask);

      // 2. 방에 있는 모든 클라이언트에게 마감일 업데이트 알림
      io.to(`task:${taskId}`).emit(taskEvents.DEADLINE_UPDATED, {
        subTaskId: numericSubTaskId,
        deadline: updatedSubTask.deadline?.toISOString(),
        updatedAt: updatedSubTask.updatedAt.toISOString()
      });
      
      // 3. 호출자에게 응답
      respond(callback, {
        success: true,
        message: '마감일이 업데이트되었습니다.',
        data: updatedSubTask
      });
    } catch (error) {
      console.error(`❌ [${socket.id}] 서브태스크 마감일 업데이트 실패:`, error);
      respond(callback, {
        success: false,
        error: error.message
      });
    }
  });

  // 세부과제 담당자 설정
  socket.on(taskEvents.SET_ASSIGNEE, async ({ taskId, subTaskId, assigneeId }, callback) => {
    try {
      const numericSubTaskId = Number(subTaskId);
      const numericAssigneeId = assigneeId ? Number(assigneeId) : null;
      
      console.log(`🔄 [${socket.id}] 세부과제 담당자 설정 시도:`, { 
        taskId, 
        subTaskId: numericSubTaskId, 
        assigneeId: numericAssigneeId 
      });

      // 1. DB 업데이트
      const updatedSubTask = await prisma.subTask.update({
        where: { id: numericSubTaskId },
        data: { 
          assigneeId: numericAssigneeId,
          updatedAt: new Date()
        },
        include: {
          assignee: {
            select: {
              id: true,
              nickname: true,
              email: true
            }
          }
        }
      });

      console.log(`✅ [${socket.id}] 세부과제 담당자 설정 성공:`, updatedSubTask);

      // 2. 방에 있는 모든 클라이언트에게 담당자 업데이트 알림
      io.to(`task:${taskId}`).emit(taskEvents.ASSIGNEE_UPDATED, {
        subTaskId: numericSubTaskId,
        assignee: updatedSubTask.assignee,
        updatedAt: updatedSubTask.updatedAt.toISOString()
      });
      
      // 3. 호출자에게 응답
      respond(callback, {
        success: true,
        message: '담당자가 업데이트되었습니다.',
        data: updatedSubTask
      });
    } catch (error) {
      console.error(`❌ [${socket.id}] 세부과제 담당자 설정 실패:`, error);
      respond(callback, {
        success: false,
        error: error.message
      });
    }
  });
};

/**
 * 소켓 응답 헬퍼 함수
 * @param {Function} callback - 콜백 함수
 * @param {Object} data - 응답 데이터
 */
function respond(callback, data) {
  if (typeof callback === 'function') {
    callback({
      ...data,
      timestamp: new Date().toISOString()
    });
  }
}
