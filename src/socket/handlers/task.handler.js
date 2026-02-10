import prisma from "../../db.config.js";
import modalService from '../../services/modal.service.js';
import {
  CreateReferenceDto, UpdateReferenceDto,
  CreateCommunicationDto, UpdateCommunicationDto,
  CreateLogDto, UpdateLogDto
} from '../../dtos/modal.dto.js';
import { CommentService } from '../../services/comment.service.js';
import taskService from "../../services/task.service.js";

//과제 API 관련 SOCKET
export const taskEvents = {
  JOIN_TASK: "joinTaskRoom", //태스크 방 입장
  //클라이언트 -> 서버로 명령
  UPDATE_SUBTASK: "updateSubtaskStatus", //세부과제 상태 업데이트
  UPDATE_DEADLINE: "updateDeadline", //세부과제 마감일 업데이트
  SET_ASSIGNEE: "setSubTaskAssignee", //세부과제 담당자 설정
  UPDATE_TASK: "task:update", // 과제 수정
  UPDATE_MEMBER: "member:update", // 멤버 역할 변경
  CREATE_SUBTASK: "subtask:create", // 단일 세부 과제 생성
  //서버 -> 클라이언트로 결과
  SUBTASK_UPDATED: "subtaskStatusUpdated", //세부과제 상태 업데이트 완료
  DEADLINE_UPDATED: "deadlineUpdated", //세부과제 마감일 업데이트 완료
  ASSIGNEE_UPDATED: "subtaskAssigneeUpdated", //세부과제 담당자 업데이트
  TASK_UPDATED: "task:updated", // 과제 수정 완료
  MEMBER_UPDATED: "member:updated", // 멤버 역할 변경
  SUBTASK_CREATED: "subtask:created", // 단일 세부 과제 생성
};

//자료 API 관련 SOCKET
export const referenceEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_REFERENCE: "reference:create",
  UPDATE_REFERENCE: "reference:update",
  DELETE_REFERENCE: "reference:delete",
  //서버 -> 클라이언트로 결과
  CREATED_REFERENCE: "reference:created",
  UPDATED_REFERENCE: "reference:updated",
  DELETED_REFERENCE: "reference:deleted",
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

//커뮤니케이션 API 관련 SOCKET 이벤트 정의
export const communicationEvents = {
  // 클라이언트 -> 서버
  CREATE_COMMUNICATION: "communication:create",
  UPDATE_COMMUNICATION: "communication:update",
  DELETE_COMMUNICATION: "communication:delete",
  // 서버 -> 클라이언트
  CREATED_COMMUNICATION: "communication:created",
  UPDATED_COMMUNICATION: "communication:updated",
  DELETED_COMMUNICATION: "communication:deleted",
};

export const logEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_LOG: "log:create",
  UPDATE_LOG: "log:update",
  DELETE_LOG: "log:delete",
  //서버 -> 클라이언트
  CREATED_LOG: "log:created",
  UPDATED_LOG: "log:updated",
  DELETED_LOG: "log:deleted",
}

export const setupTaskHandlers = (io, socket) => {
  // 태스크 방 입장
  socket.on(taskEvents.JOIN_TASK, (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`📌 [${socket.user.id}] 사용자가 태스크 방에 입장했습니다. (Task ID: ${taskId})`);
  });

  // 방 참여자 목록 확인 🐞 DEBUG용
  socket.on('debug:checkRoom', (taskId) => {
    const roomName = `task:${taskId}`;
    const clients = io.sockets.adapter.rooms.get(roomName);

    console.log(`=== 🏠 방 [${roomName}] 참여자 목록 ===`);
    if (clients) {
      console.log(`총 ${clients.size}명 참여 중`);
      for (const clientId of clients) {
        // 소켓 객체 찾기
        const clientSocket = io.sockets.sockets.get(clientId);
        const user = clientSocket?.user; // 우리가 저장해둔 사용자 정보

        console.log(`- Socket ID: ${clientId}`);
        console.log(`  User: ${user ? `ID: ${user.id}` : '비회원/정보없음'}`);
      }
    } else {
      console.log('방이 존재하지 않거나 비어있습니다.');
    }
    console.log('====================================');
  });

  // 과제 수정
  socket.on(taskEvents.UPDATE_TASK, async (payload, callback) => {
    try {
      const { taskId, data } = payload;
      console.log(`[SOCKET][task:update] 요청 수신`, { taskId });

      // DB 수정 처리
      const result = await taskService.modifyTask(Number(taskId), data);

      // 최신 상세 정보 조회 후 브로드캐스트
      const updatedTask = await taskService.getTaskDetail(Number(taskId));
      io.to(`task:${taskId}`).emit(taskEvents.TASK_UPDATED, updatedTask);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("task:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 팀원 역할 변경
  socket.on(taskEvents.UPDATE_MEMBER, async (payload, callback) => {
    try {
      const { taskId, memberId, role } = payload;
      console.log(`[SOCKET][member:update] 요청 수신`, {
        taskId,
        memberId,
        role,
      });

      const result = await taskService.modifyMemberRole(
        Number(taskId),
        Number(memberId),
        role,
      );

      // 같은 방 팀원들에게 알림
      io.to(`task:${taskId}`).emit(taskEvents.MEMBER_UPDATED, {
        memberId: result.id,
        role: result.role,
        userId: result.userId,
      });

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("member:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 단일 세부과제 추가
  socket.on(taskEvents.CREATE_SUBTASK, async (payload, callback) => {
    try {
      const { taskId, subtaskData } = payload;
      console.log(`[SOCKET][subtask:create] 요청 수신`, { taskId });

      const result = await taskService.createSingleSubTask(
        socket.user.id,
        Number(taskId),
        subtaskData,
      );

      // 방 전체에 새로운 세부과제 정보 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_CREATED, result);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("subtask:create 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 서브과제 상태 업데이트
  socket.on(
    taskEvents.UPDATE_SUBTASK,
    async ({ taskId, subTaskId, status }, callback) => {
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
            updatedAt: new Date(),
          },
          include: {
            assignee: {
              select: {
                id: true,
                nickname: true,
                email: true,
              },
            },
          },
        });

        console.log(
          `✅ [${socket.id}] 서브태스크 상태 업데이트 성공:`,
          updatedSubTask,
        );

        // 2. 방에 있는 모든 클라이언트에게 상태 업데이트 알림
        io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_UPDATED, {
          ...updatedSubTask,
          updatedAt: updatedSubTask.updatedAt.toISOString(),
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
  socket.on(
    taskEvents.UPDATE_DEADLINE,
    async ({ taskId, subTaskId, deadline }, callback) => {
      try {
        const numericSubTaskId = Number(subTaskId);
        const deadlineDate = new Date(deadline);

        console.log(`🔄 [${socket.id}] 서브태스크 마감일 업데이트 시도:`, {
          taskId,
          subTaskId: numericSubTaskId,
          deadline: deadlineDate,
        });

        // 1. DB 업데이트
        const updatedSubTask = await prisma.subTask.update({
          where: { id: numericSubTaskId },
          data: {
            deadline: deadlineDate,
            updatedAt: new Date(),
          },
        });

        console.log(
          `✅ [${socket.id}] 서브태스크 마감일 업데이트 성공:`,
          updatedSubTask,
        );

        // 2. 방에 있는 모든 클라이언트에게 마감일 업데이트 알림
        io.to(`task:${taskId}`).emit(taskEvents.DEADLINE_UPDATED, {
          subTaskId: numericSubTaskId,
          deadline: updatedSubTask.deadline?.toISOString(),
          updatedAt: updatedSubTask.updatedAt.toISOString(),
        });

        // 3. 호출자에게 응답
        respond(callback, {
          success: true,
          message: "마감일이 업데이트되었습니다.",
          data: updatedSubTask,
        });
      } catch (error) {
        console.error(
          `❌ [${socket.id}] 서브태스크 마감일 업데이트 실패:`,
          error,
        );
        respond(callback, {
          success: false,
          error: error.message,
        });
      }
    },
  );

  // 세부과제 담당자 설정
  socket.on(
    taskEvents.SET_ASSIGNEE,
    async ({ taskId, subTaskId, assigneeId }, callback) => {
      try {
        const numericSubTaskId = Number(subTaskId);
        const numericAssigneeId = assigneeId ? Number(assigneeId) : null;

        console.log(`🔄 [${socket.id}] 세부과제 담당자 설정 시도:`, {
          taskId,
          subTaskId: numericSubTaskId,
          assigneeId: numericAssigneeId,
        });

        // 1. DB 업데이트
        const updatedSubTask = await prisma.subTask.update({
          where: { id: numericSubTaskId },
          data: {
            assigneeId: numericAssigneeId,
            updatedAt: new Date(),
          },
          include: {
            assignee: {
              select: {
                id: true,
                nickname: true,
                email: true,
              },
            },
          },
        });

        console.log(
          `✅ [${socket.id}] 세부과제 담당자 설정 성공:`,
          updatedSubTask,
        );

        // 2. 방에 있는 모든 클라이언트에게 담당자 업데이트 알림
        io.to(`task:${taskId}`).emit(taskEvents.ASSIGNEE_UPDATED, {
          subTaskId: numericSubTaskId,
          assignee: updatedSubTask.assignee,
          updatedAt: updatedSubTask.updatedAt.toISOString(),
        });

        // 3. 호출자에게 응답
        respond(callback, {
          success: true,
          message: "담당자가 업데이트되었습니다.",
          data: updatedSubTask,
        });
      } catch (error) {
        console.error(`❌ [${socket.id}] 세부과제 담당자 설정 실패:`, error);
        respond(callback, {
          success: false,
          error: error.message,
        });
      }
    },
  );

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
        }),
      );
      //같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(referenceEvents.CREATED_REFERENCE, {
        taskId: Number(taskId),
        references: data,
      });
      console.log(`[SOCKET][reference:created] 브로드캐스트 완료`);
      callback?.({ success: true });
    } catch (err) {
      console.error("reference:create 실패", err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
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
        }),
      );
      //같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(referenceEvents.UPDATED_REFERENCE, {
        taskId: Number(taskId),
        references: data,
      });
      console.log(`[SOCKET][reference:updated] 브로드캐스트 완료`);
      callback?.({ success: true });
    } catch (err) {
      console.error("reference:update  실패", err);
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
      const { taskId, referenceId } = payload;
      console.log(`[SOCKET][reference:delete] 요청 수신`, { socketId: socket.id, taskId, referenceId, });

      // service에서 호출 -> DB 삭제
      await modalService.deleteReference({
        taskId: Number(taskId),
        referenceId: Number(referenceId),
        userId: socket.user.id,
      });

      // 같은 task 방에 broadcast
      io.to(`task:${taskId}`).emit(referenceEvents.DELETED_REFERENCE, {
        taskId: Number(taskId),
        referenceId: Number(referenceId),
      });
      console.log(`[SOCKET][reference:deleted] 브로드캐스트 완료`, { taskId });
      callback?.({ success: true });
    } catch (err) {
      console.error("reference:delete 실패", err);
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
      socket.to(`task:${taskId}`).emit(commentEvents.CREATED_COMMENT, {
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

      //나 제외하고 모두에게 보냄.
      socket.to(`task:${taskId}`).emit(commentEvents.UPDATED_COMMENT, {
        taskId: Number(taskId),
        subTaskId: Number(subTaskId),
        comment: updatedComment
      });
      console.log(`[SOCKET][comment:updated] 브로드캐스트 완료`);
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

  // 과제 수정
  socket.on(taskEvents.UPDATE_TASK, async (payload, callback) => {
    try {
      const { taskId, ...data } = payload;
      console.log(`[SOCKET][task:update] 요청 수신`, { taskId });

      // DB 수정 처리
      const result = await taskService.modifyTask(Number(taskId), data);

      // 최신 상세 정보 조회 후 브로드캐스트
      const updatedTask = await taskService.getTaskDetail(Number(taskId));
      io.to(`task:${taskId}`).emit(taskEvents.TASK_UPDATED, updatedTask);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("task:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 팀원 역할 변경
  socket.on(taskEvents.UPDATE_MEMBER, async (payload, callback) => {
    try {
      const { taskId, memberId, role } = payload;
      console.log(`[SOCKET][member:update] 요청 수신`, {
        taskId,
        memberId,
        role,
      });

      const result = await taskService.modifyMemberRole(
        Number(taskId),
        Number(memberId),
        role,
      );

      // 같은 방 팀원들에게 알림
      io.to(`task:${taskId}`).emit(taskEvents.MEMBER_UPDATED, {
        memberId: result.id,
        role: result.role,
        userId: result.userId,
      });

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("member:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 단일 세부과제 추가
  socket.on(taskEvents.CREATE_SUBTASK, async (payload, callback) => {
    try {
      const { taskId, ...subtaskData } = payload;
      console.log(`[SOCKET][subtask:create] 요청 수신`, { taskId });

      const result = await taskService.createSingleSubTask(
        socket.user.id,
        Number(taskId),
        subtaskData,
      );

      // 방 전체에 새로운 세부과제 정보 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_CREATED, result);

      callback?.({ success: true, data: result });
    } catch (err) {
      console.error("subtask:create 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });
  // 커뮤니케이션

  // 커뮤니케이션 생성 Socket
  socket.on(
    communicationEvents.CREATE_COMMUNICATION,
    async (payload, callback) => {
      try {
        const { taskId, name, url } = payload;
        console.log(`[SOCKET][communication:create] 요청 수신`, {
          socketId: socket.id,
          taskId,
          name,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][communication:create] 인증 성공`, {
          userId,
          taskId,
        });

        const data = await modalService.createCommunication(
          new CreateCommunicationDto({
            taskId: Number(taskId),
            userId,
            name,
            url,
          }),
        );

        // 같은 task 방에 broadcast (전체 리스트 전송)
        io.to(`task:${taskId}`).emit(
          communicationEvents.CREATED_COMMUNICATION,
          {
            taskId: Number(taskId),
            communications: data,
          },
        );
        console.log(`[SOCKET][communication:created] 브로드캐스트 완료`);
        callback?.({ success: true });
      } catch (err) {
        console.error("communication:create 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );

  // 커뮤니케이션 수정 
  socket.on(
    communicationEvents.UPDATE_COMMUNICATION,
    async (payload, callback) => {
      try {
        const { taskId, communicationId, name, url } = payload;
        console.log(`[SOCKET][communication:update] 요청 수신`, {
          socketId: socket.id,
          taskId,
          communicationId,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][communication:update] 인증 성공`, {
          userId,
          taskId,
        });

        const data = await modalService.updateCommunication(
          new UpdateCommunicationDto({
            taskId: Number(taskId),
            communicationId: Number(communicationId),
            userId,
            name,
            url,
          }),
        );

        // 같은 task 방에 broadcast (수정된 단일 객체 전송)
        io.to(`task:${taskId}`).emit(
          communicationEvents.UPDATED_COMMUNICATION,
          {
            taskId: Number(taskId),
            communication: data,
          },
        );
        console.log(`[SOCKET][communication:updated] 브로드캐스트 완료`);
        callback?.({ success: true });
      } catch (err) {
        console.error("communication:update 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );

  // 커뮤니케이션 삭제 
  socket.on(
    communicationEvents.DELETE_COMMUNICATION,
    async (payload, callback) => {
      try {
        const { taskId, communicationId } = payload;
        console.log(`[SOCKET][communication:delete] 요청 수신`, {
          socketId: socket.id,
          taskId,
          communicationId,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][communication:delete] 인증 성공`, {
          userId,
          taskId,
        });

        await modalService.deleteCommunication({
          taskId: Number(taskId),
          communicationId: Number(communicationId),
          userId,
        });

        // 같은 task 방에 broadcast (삭제된 ID 전송)
        io.to(`task:${taskId}`).emit(
          communicationEvents.DELETED_COMMUNICATION,
          {
            taskId: Number(taskId),
            communicationId: Number(communicationId),
          },
        );
        console.log(`[SOCKET][communication:deleted] 브로드캐스트 완료`, {
          taskId,
        });
        callback?.({ success: true });
      } catch (err) {
        console.error("communication:delete 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );

  // 회의록 생성
  socket.on(
    logEvents.CREATE_LOG,
    async (payload, callback) => {
      try {
        const { taskId, date, agenda, conclusion, discussion } = payload;
        console.log(`[SOCKET][log:create] 요청 수신`, {
          socketId: socket.id,
          taskId,
          date,
          agenda,
          conclusion,
          discussion,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][log:create] 인증 성공`, {
          userId,
          taskId,
        });

        const data = await modalService.createLog(
          new CreateLogDto({
            taskId: Number(taskId),
            userId,
            date: new Date(date),
            agenda: agenda || null,
            conclusion: conclusion || null,
            discussion: discussion || null,
          }),
        );

        io.to(`task:${taskId}`).emit(logEvents.CREATED_LOG, {
          taskId: Number(taskId),
          log: data,
        });
        console.log(`[SOCKET][log:created] 브로드캐스트 완료`);
        callback?.({ success: true });
      }
      catch (err) {
        console.error("log:create 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );
  // 회의록 수정
  socket.on(
    logEvents.UPDATE_LOG,
    async (payload, callback) => {
      try {
        const { taskId, logId, date, agenda, conclusion, discussion } = payload;
        console.log(`[SOCKET][log:update] 요청 수신`, {
          socketId: socket.id,
          taskId,
          logId,
          date,
          agenda,
          conclusion,
          discussion,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][log:update] 인증 성공`, {
          userId,
          taskId,
        });

        const updatedLog = await modalService.updateLog(
          new UpdateLogDto({
            taskId: Number(taskId),
            logId: Number(logId),
            userId,
            date: new Date(date),
            agenda: agenda || null,
            conclusion: conclusion || null,
            discussion: discussion || null,
          }),
        );

        io.to(`task:${taskId}`).emit(logEvents.UPDATED_LOG, {
          taskId: Number(taskId),
          log: updatedLog,
        });

        console.log(`[SOCKET][log:updated] 브로드캐스트 완료`);
        callback?.({ success: true });
      }
      catch (err) {
        console.error("log:update 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );
  // 회의록 삭제
  socket.on(
    logEvents.DELETE_LOG,
    async (payload, callback) => {
      try {
        const { taskId, logId } = payload;
        console.log(`[SOCKET][log:delete] 요청 수신`, {
          socketId: socket.id,
          taskId,
          logId,
        });

        const userId = socket.user.id;
        console.log(`[SOCKET][log:delete] 인증 성공`, {
          userId,
          taskId,
        });

        await modalService.deleteLog({
          taskId: Number(taskId),
          logId: Number(logId),
          userId,
        });

        io.to(`task:${taskId}`).emit(logEvents.DELETED_LOG, {
          taskId: Number(taskId),
          logId: Number(logId),
        });

        console.log(`[SOCKET][log:deleted] 브로드캐스트 완료`);
        callback?.({ success: true });
      }
      catch (err) {
        console.error("log:delete 실패", err);
        callback?.({
          success: false,
          errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
          reason: err.reason ?? err.message,
        });
      }
    },
  );
};


//소켓 응답 헬퍼 함수
function respond(callback, data) {
  if (typeof callback === "function") {
    callback({
      ...data,
      timestamp: new Date().toISOString(),
    });
  }
}
