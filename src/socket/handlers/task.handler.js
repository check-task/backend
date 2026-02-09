import prisma from "../../db.config.js";
import modalService from '../../services/modal.service.js';
import taskService from "../../services/task.service.js";
import { CreateReferenceDto, UpdateReferenceDto, } from '../../dtos/modal.dto.js';
import { UnauthorizedError } from '../../errors/custom.error.js';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

//과제 API 관련 SOCKET
export const taskEvents = {
  JOIN_TASK: 'joinTaskRoom', //태스크 방 입장
  //클라이언트 -> 서버로 명령
  UPDATE_SUBTASK: 'updateSubtaskStatus', //세부과제 상태 업데이트
  UPDATE_DEADLINE: 'updateDeadline', //세부과제 마감일 업데이트
  SET_ASSIGNEE: 'setSubTaskAssignee', //세부과제 담당자 설정
  UPDATE_TASK: 'task:update', // 과제 수정
  UPDATE_MEMBER: 'member:update', // 멤버 역할 변경
  CREATE_SUBTASK: 'subtask:create', // 단일 세부 과제 생성
  //서버 -> 클라이언트로 결과
  SUBTASK_UPDATED: 'subtaskStatusUpdated', //세부과제 상태 업데이트 완료
  DEADLINE_UPDATED: 'deadlineUpdated', //세부과제 마감일 업데이트 완료
  ASSIGNEE_UPDATED: 'subtaskAssigneeUpdated', //세부과제 담당자 업데이트
  TASK_UPDATED: 'task:updated', // 과제 수정 완료
  MEMBER_UPDATED: 'member:updated', // 멤버 역할 변경
  SUBTASK_CREATED: 'subtask:created' // 단일 세부 과제 생성
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
  DELETED_REFERENCE: 'reference:deleted'
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

  // 서브과제 상태 업데이트
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
      const { taskId, type, item, token } = payload;
      console.log(`[SOCKET][reference:create] 요청 수신`, { socketId: socket.id, taskId, type, });
      if (!token) { throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다."); }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        throw new UnauthorizedError('INVALID_TOKEN', '유효하지 않은 토큰입니다');
      }

      const userId = decoded.id;
      console.log(`[SOCKET][reference:create] 인증 성공`, { userId, taskId, });

      //service에서 호출 -> DB 생성
      const data = await modalService.createReferences(
        new CreateReferenceDto({
          taskId: Number(taskId),
          userId,
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
      const { taskId, referenceId, name, url, file_url, token } = payload;
      console.log(`[SOCKET][reference:update] 요청 수신`, { socketId: socket.id, taskId, referenceId });
      if (!token) { throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다."); }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        throw new UnauthorizedError('INVALID_TOKEN', '유효하지 않은 토큰입니다');
      }

      const userId = decoded.id;
      console.log(`[SOCKET][reference:update] 인증 성공`, { userId, taskId, });

      //service에서 호출 -> DB 수정
      const data = await modalService.updateReference(
        new UpdateReferenceDto({
          taskId: Number(taskId),
          referenceId: Number(referenceId),
          userId,
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

  // 자료 삭제
  socket.on(referenceEvents.DELETE_REFERENCE, async (payload, callback) => {
    try {
      const { taskId, referenceId, token } = payload;
      console.log(`[SOCKET][reference:delete] 요청 수신`, { socketId: socket.id, taskId, referenceId, });
      if (!token) { throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다."); }

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        throw new UnauthorizedError('INVALID_TOKEN', '유효하지 않은 토큰입니다');
      }

      const userId = decoded.id;
      console.log(`[SOCKET][reference:delete] 인증 성공`, { userId, taskId, });
      // service에서 호출 -> DB 삭제
      await modalService.deleteReference({
        taskId: Number(taskId),
        referenceId: Number(referenceId),
        userId,
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

  // 과제 수정
  socket.on(taskEvents.UPDATE_TASK, async (payload, callback) => {
    try {
      const { taskId, data, token } = payload;
      console.log(`[SOCKET][task:update] 요청 수신`, { taskId });

      if (!token) throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다.");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // DB 수정 처리
      const result = await taskService.modifyTask(Number(taskId), data);

      // 최신 상세 정보 조회 후 브로드캐스트
      const updatedTask = await taskService.getTaskDetail(Number(taskId));
      io.to(`task:${taskId}`).emit(taskEvents.TASK_UPDATED, updatedTask);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error('task:update 실패', err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 팀원 역할 변경 
  socket.on(taskEvents.UPDATE_MEMBER, async (payload, callback) => {
    try {
      const { taskId, memberId, role, token } = payload;
      console.log(`[SOCKET][member:update] 요청 수신`, { taskId, memberId, role });

      if (!token) throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다.");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await taskService.modifyMemberRole(Number(taskId), Number(memberId), role);

      // 같은 방 팀원들에게 알림
      io.to(`task:${taskId}`).emit(taskEvents.MEMBER_UPDATED, {
        memberId: result.id,
        role: result.role,
        userId: result.userId
      });

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error('member:update 실패', err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 단일 세부과제 추가 
  socket.on(taskEvents.CREATE_SUBTASK, async (payload, callback) => {
    try {
      const { taskId, subtaskData, token } = payload;
      console.log(`[SOCKET][subtask:create] 요청 수신`, { taskId });

      if (!token) throw new UnauthorizedError("UNAUTHORIZED_SOCKET", "인증 토큰이 없습니다.");
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const result = await taskService.createSingleSubTask(
        decoded.id, // 토큰에서 추출한 유저 ID
        Number(taskId),
        subtaskData
      );

      // 방 전체에 새로운 세부과제 정보 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_CREATED, result);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error('subtask:create 실패', err);
      callback?.({ success: false, reason: err.message });
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
