import prisma from "../../db.config.js";
import modalService from '../../services/modal.service.js';
import { CreateReferenceDto, UpdateReferenceDto, } from '../../dtos/modal.dto.js';
import { CommentService } from '../../services/comment.service.js';

//과제 API 관련 SOCKET
export const taskEvents = {
  JOIN_TASK: 'joinTaskRoom', //태스크 방 입장
  //클라이언트 -> 서버로 명령
  UPDATE_SUBTASK: 'updateSubtaskStatus', //세부과제 상태 업데이트
  UPDATE_DEADLINE: 'updateDeadline', //세부과제 마감일 업데이트
  SET_ASSIGNEE: 'setSubTaskAssignee', //세부과제 담당자 설정
  //서버 -> 클라이언트로 결과
  SUBTASK_UPDATED: 'subtaskStatusUpdated', //세부과제 상태 업데이트 완료
  DEADLINE_UPDATED: 'deadlineUpdated', //세부과제 마감일 업데이트 완료
  ASSIGNEE_UPDATED: 'subtaskAssigneeUpdated' //세부과제 담당자 업데이트
};

//자료 API 관련 SOCKET
export const referenceEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_REFERENCE: 'reference:create',
  UPDATE_REFERENCE: 'reference:update',
  DELETE_REFERENCE: 'reference:delete',
  //서버 -> 클라이언트로 결과
  CREATED_REFERENCE: 'reference:created',
  UPDATED_REFERENCE: 'reference:updated',
  DELETED_REFERENCE: 'reference:deleted',
};

//댓글 API 관련 SOCKET
export const commentEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_COMMENT: 'comment:create',
  UPDATE_COMMENT: 'comment:update',
  DELETE_COMMENT: 'comment:delete',
  //서버 -> 클라이언트로 결과
  CREATED_COMMENT: 'comment:created',
  UPDATED_COMMENT: 'comment:updated',
  DELETED_COMMENT: 'comment:deleted',
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
    console.log(`📌 [${socket.user.id}] 사용자가 태스크 방에 입장했습니다. (Task ID: ${taskId})`);
  });

  // 서브과제 상태 업데이트
  socket.on(taskEvents.UPDATE_SUBTASK, async ({ taskId, subTaskId, status }, callback) => {
    try {
      const numericSubTaskId = Number(subTaskId);
      const normalizedStatus = status.toUpperCase();

      console.log(`🔄 [${socket.user.id}] 서브태스크 상태 업데이트 시도:`, {
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
      console.error(`❌ [${socket.user.id}] 서브태스크 상태 업데이트 실패:`, error);
      if (typeof callback === 'function') {
        callback({
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
    }
  });
  // 세부과제 마감일 업데이트
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


  //자료 생성 Socket
  socket.on(referenceEvents.CREATE_REFERENCE, async (payload, callback) => {
    try {
      const { taskId, type, item } = payload;
      console.log(`[SOCKET][reference:create] 요청 수신`, { userId: socket.user.id, taskId, type, });

      //service에서 호출 -> DB 생성
      const data = await modalService.createReferences(
        new CreateReferenceDto({
          taskId: Number(taskId),
          userId: socket.user.id,
          type,
          items: [item],
        })
      );
      //같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(
        referenceEvents.CREATED_REFERENCE,
        {
          taskId: Number(taskId),
          references: data,
        }
      );
      console.log(`[SOCKET][reference:created] 브로드캐스트 완료`);
      callback?.({ success: true });
    } catch (err) {
      console.error('reference:create 실패', err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? 'INTERNAL_SERVER_ERROR',
        reason: err.reason ?? err.message,
      });
    }
  });

  //자료 수정 Socket
  socket.on(referenceEvents.UPDATE_REFERENCE, async (payload, callback) => {
    try {
      const { taskId, referenceId, name, url, file_url } = payload;
      console.log(`[SOCKET][reference:update] 요청 수신`, { socketId: socket.id, taskId, referenceId });

      //service에서 호출 -> DB 수정
      const data = await modalService.updateReference(
        new UpdateReferenceDto({
          taskId: Number(taskId),
          referenceId: Number(referenceId),
          userId: socket.user.id,
          name,
          url,
          file_url,
        })
      );
      //같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(
        referenceEvents.UPDATED_REFERENCE,
        {
          taskId: Number(taskId),
          references: data,
        }
      );
      console.log(`[SOCKET][reference:updated] 브로드캐스트 완료`);
      callback?.({ success: true });

    } catch (err) {
      console.error('reference:update  실패', err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
        reason: err.reason ?? err.message,
      });
    }
  });

  // 자료 삭제 Socket
  socket.on(referenceEvents.DELETE_REFERENCE, async (payload, callback) => {
    try {
      const { taskId, referenceId } = payload;
      console.log(`[SOCKET][reference:delete] 요청 수신`, { socketId: socket.id, taskId, referenceId, });

      // service에서 호출 -> DB 삭제
      await modalService.deleteReference({
        taskId: Number(taskId),
        referenceId: Number(referenceId),
        userId: socket.user.id,
      });

      // 같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(
        referenceEvents.DELETED_REFERENCE,
        {
          taskId: Number(taskId),
          referenceId: Number(referenceId),
        }
      );
      console.log(`[SOCKET][reference:deleted] 브로드캐스트 완료`, { taskId });
      callback?.({ success: true });
    } catch (err) {
      console.error('reference:delete 실패', err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
        reason: err.reason ?? err.message,
      });
    }
  });

  // 댓글 생성
  socket.on(commentEvents.CREATE_COMMENT, async (payload, callback) => {
    try {
      const { taskId, subTaskId, content } = payload;
      const userId = socket.user.id;

      console.log(`[SOCKET][comment:create] 요청 수신`, { userId, taskId, subTaskId, content });

      // Service 호출
      const newComment = await CommentService.createComment(Number(subTaskId), {
        userId: userId,
        content: content,
      });

      // 같은 Task 방에 있는 사람들에게 알림
      io.to(`task:${taskId}`).emit(commentEvents.CREATED_COMMENT, {
        taskId: Number(taskId),
        subTaskId: Number(subTaskId),
        comment: newComment
      });

      console.log(`[SOCKET][comment:created] 브로드캐스트 완료`);
      callback?.({ success: true, data: newComment });

    } catch (err) {
      console.error(`[SOCKET][comment:create] 실패`, err);
      callback?.({
        success: false,
        message: err.message || '댓글 생성 실패'
      });
    }
  });

  // 댓글 수정
  socket.on(commentEvents.UPDATE_COMMENT, async (payload, callback) => {
    try {
      const { taskId, subTaskId, commentId, content } = payload;
      const userId = socket.user.id;

      console.log(`[SOCKET][comment:update] 요청 수신`, { userId, commentId });

      const updatedComment = await CommentService.updateComment(Number(commentId), userId, content);

      io.to(`task:${taskId}`).emit(commentEvents.UPDATED_COMMENT, {
        taskId: Number(taskId),
        subTaskId: Number(subTaskId),
        comment: updatedComment
      });

      callback?.({ success: true, data: updatedComment });

    } catch (err) {
      console.error(`[SOCKET][comment:update] 실패`, err);
      callback?.({ success: false, message: err.message });
    }
  });

  // 댓글 삭제
  socket.on(commentEvents.DELETE_COMMENT, async (payload, callback) => {
    try {
      const { taskId, subTaskId, commentId } = payload;
      const userId = socket.user.id;

      console.log(`[SOCKET][comment:delete] 요청 수신`, { userId, commentId });

      await CommentService.deleteComment(Number(commentId), userId);

      io.to(`task:${taskId}`).emit(commentEvents.DELETED_COMMENT, {
        taskId: Number(taskId),
        subTaskId: Number(subTaskId),
        commentId: Number(commentId)
      });

      callback?.({ success: true });

    } catch (err) {
      console.error(`[SOCKET][comment:delete] 실패`, err);
      callback?.({ success: false, message: err.message });
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
