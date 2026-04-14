import modalService from "../../services/modal.service.js";
// 모달 헬퍼 등록
import {
  CreateReferenceDto,
  UpdateReferenceDto,
  CreateCommunicationDto,
  UpdateCommunicationDto,
  CreateLogDto,
  UpdateLogDto,
} from "../../dtos/modal.dto.js";
import CommentService from "../../services/comment.service.js";
import commentHelper from "../../helpers/comment.helper.js";
import taskService from "../../services/task.service.js";
import taskHelper from "../../helpers/task.helper.js";

//과제 API 관련 SOCKET
export const taskEvents = {
  JOIN_TASK: "joinTaskRoom", //태스크 방 입장
  //클라이언트 -> 서버로 명령
  UPDATE_TASK: "task:update", // 메인 과제 수정
  UPDATE_SUBTASK_STATUS: "updateSubtaskStatus", //세부과제 상태 업데이트
  UPDATE_DEADLINE: "updateDeadline", //세부과제 마감일 업데이트
  SET_ASSIGNEE: "setSubTaskAssignee", //세부과제 담당자 설정
  CREATE_SUBTASK: "subtask:create", // 단일 세부 과제 생성
  UPDATE_SUBTASKS: "subtask:update", // 선택 세부 과제 수정
  DELETED_SUBTASKS: "subtask:delete", // 선택 세부 과제 삭제
  DELETED_ALL_SUBTASKS: "subtask:deleteAll", // 전체 세부 과제 삭제
  UPDATE_MEMBER: "member:update", // 멤버 역할 변경

  //서버 -> 클라이언트로 결과
  TASK_UPDATED: "task:updated", // 메인 과제 수정 완료
  SUBTASK_STATUS_UPDATED: "subtaskStatusUpdated", //세부과제 상태 업데이트 완료
  DEADLINE_UPDATED: "deadlineUpdated", //세부과제 마감일 업데이트 완료
  ASSIGNEE_UPDATED: "subtaskAssigneeUpdated", //세부과제 담당자 업데이트
  SUBTASK_CREATED: "subtask:created", // 단일 세부 과제 생성
  SUBTASKS_UPDATE: "subtask:updated", // 선택 세부 과제 수정
  SUBTASKS_DELETE: "subtask:deleted", // 선택 세부 과제 삭제
  ALL_SUBTASKS_DELETE: "subtask:deletedAll", // 전체 세부 과제 삭제
  MEMBER_UPDATED: "member:updated", // 멤버 역할 변경
};

//댓글 API 관련 SOCKET
export const commentEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_COMMENT: "comment:create",
  UPDATE_COMMENT: "comment:update",
  DELETE_COMMENT: "comment:delete",
  //서버 -> 클라이언트로 결과
  CREATED_COMMENT: "comment:created",
  UPDATED_COMMENT: "comment:updated",
  DELETED_COMMENT: "comment:deleted",
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

// 로그 확인 관련 SOCKET
export const logEvents = {
  //클라이언트 -> 서버로 명령
  CREATE_LOG: "log:create",
  UPDATE_LOG: "log:update",
  DELETE_LOG: "log:delete",
  //서버 -> 클라이언트
  CREATED_LOG: "log:created",
  UPDATED_LOG: "log:updated",
  DELETED_LOG: "log:deleted",
};

export const setupTaskHandlers = (io, socket) => {
  // 태스크 방 입장
  socket.on(taskEvents.JOIN_TASK, (taskId) => {
    socket.join(`task:${taskId}`);
    console.log(`📌 [${socket.user.id}] 사용자가 태스크 방에 입장했습니다. (Task ID: ${taskId})`);
  });

  // 방 참여자 목록 확인 🐞 DEBUG용
  socket.on("debug:checkRoom", (taskId) => {
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
        console.log(`  User: ${user ? `ID: ${user.id}` : "비회원/정보없음"}`);
      }
    } else {
      console.log("방이 존재하지 않거나 비어있습니다.");
    }
    console.log("====================================");
  });

  // 메인 과제 수정
  socket.on(taskEvents.UPDATE_TASK, async (payload, callback) => {
    try {
      const { taskId, body } = payload;
      console.log(`[SOCKET][task:update] 요청 수신`, { taskId, body });

      const inputData = taskHelper.buildUpdateTaskParams({
        userId: socket.user.id,
        taskId,
        body
      });

      const result = await taskService.modifyTask(
        inputData.taskId,
        inputData.userId,
        inputData.taskRequest
      );

      // 브로드캐스트
      const updatedTask = await taskService.getTaskDetail(inputData.taskId, inputData.userId);
      io.to(`task:${taskId}`).emit(taskEvents.TASK_UPDATED, updatedTask);

      respond(callback, {success: true, data: result});
    } catch (err) {
      console.error("[SOCKET][task:update] 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  // 세부과제 상태 업데이트
  socket.on(taskEvents.UPDATE_SUBTASK_STATUS, async (payload, callback) => {
      try {
        const { taskId, subTaskId, status } = payload;
        console.log(`[SOCKET][subTask:update] 요청 수신`, { taskId, subTaskId, status });

        const inputData = taskHelper.buildUpdateSubTaskStatusParams({
          userId: socket.user.id,
          subTaskId,
          status,
        });

        const updatedSubTask = await taskService.updateSubTaskStatus(
          inputData.subTaskId,
          inputData.status,
          inputData.userId
        );

        // 브로드캐스트
        io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_STATUS_UPDATED, {
          ...updatedSubTask,
          updatedAt: updatedSubTask.updatedAt.toISOString(),
        });

        respond(callback, {success: true, data: updatedSubTask});
      } catch (err) {
        console.error("[SOCKET][subTask:state update] 실패", err);
        callback?.({ success: false, reason: err.message });
      }
    },
  );
  // 세부과제 마감일 업데이트
  socket.on(taskEvents.UPDATE_DEADLINE,async (payload, callback) => {
      try {
        const { taskId, subTaskId, endDate } = payload;

        console.log(`[SOCKET][subTask:deadline update] 요청 수신`, {taskId, subTaskId, endDate});
        const inputData = taskHelper.buildUpdateSubTaskDeadlineParams({
          userId: socket.user.id,
          subTaskId,
          endDate
        });

        const updatedSubTask = await taskService.updateSubTaskDeadline(
          inputData.subTaskId,
          inputData.endDate,
          inputData.userId
        );

        // 브로드캐스트
        io.to(`task:${taskId}`).emit(taskEvents.DEADLINE_UPDATED, {
          subTaskId: numericSubTaskId,
          deadline: updatedSubTask.endDate?.toISOString(),
          updatedAt: updatedSubTask.updatedAt.toISOString(),
        });

        respond(callback, {success: true, data: updatedSubTask});
      } catch (err) {
        console.error("[SOCKET][subTask:deadline update] 실패", err);
        callback?.({ success: false, reason: err.message });
      }
    },
  );
  // 세부과제 담당자 설정
  socket.on(taskEvents.SET_ASSIGNEE, async (payload, callback) => {
      try {
        const { taskId, subTaskId, assigneeId } = payload;
        console.log(`[SOCKET][subTask:assignee update] 요청 수신`, {taskId, subTaskId, assigneeId,});

        const inputData = taskHelper.buildUpdateSubTaskAssigneeParams({
          userId: socket.user.id,
          subTaskId,
          assigneeId,
        });

        const updatedSubTask = await taskService.setSubTaskAssignee(
          inputData.subTaskId,
          inputData.assigneeId,
          inputData.userId
        );

        io.to(`task:${taskId}`).emit(taskEvents.ASSIGNEE_UPDATED, {
          subTaskId: updatedSubTask.subTaskId,
          assignee: updatedSubTask?.assigneeId, // 추후 service 로직에서 전체 조회 후 반환 필요
          updatedAt: updatedSubTask.updatedAt?.toISOString()
        });

        respond(callback, {success: true, data: updatedSubTask});
      } catch (err) {
        console.error("[SOCKET][subTask:assignee update] 실패", err);
        callback?.({ success: false, reason: err.message });
      }
    },
  );

  // 세부 과제 생성
  socket.on(taskEvents.CREATE_SUBTASK, async (payload, callback) => {
    try {
      const { taskId, body } = payload;
      console.log(`[SOCKET][subtask:create] 요청 수신`);

      const inputData = taskHelper.buildCreateSubTaskParams({
        userId: socket.user.id,
        taskId,
        body
      });

      const result = await taskService.createSingleSubTask(
        inputData.userId,
        inputData.taskId,
        inputData.dto
      );

      // 방 전체에 새로운 세부과제 정보 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASK_CREATED, result);

      respond(callback, {success: true, data: result});
    } catch (err) {
      console.error("subtask:create 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });
  // 세부 과제 수정
  socket.on(taskEvents.UPDATE_SUBTASKS, async (payload, callback) => {
    try {
      const { taskId, subTasks } = payload;
      console.log(`[SOCKET][subtask:update] 요청 수신`);

      const inputData = taskHelper.buildUpdateSubTaskParams({
        userId: socket.user.id,
        taskId,
        subTasks
      });

      const result = await taskService.updateSelectedSubTasks(
        inputData.userId,
        inputData.taskId,
        inputData.dtoList
      );

      // 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASKS_UPDATE, result);

      respond(callback, {success: true, data: result});
    } catch (err) {
      console.error("subtask:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  })
  // 세부 과제 선택 삭제
  socket.on(taskEvents.DELETED_SUBTASKS, async (payload, callback) => {
    try {
      const { taskId, subTaskIds } = payload;
      console.log(`[SOCKET][subtask:delete] 요청 수신`);

      const inputData = taskHelper.buildDeleteSubTaskParams({
        userId: socket.user.id,
        taskId,
        subTaskIds
      });

      const result = await taskService.deleteSelectedSubTasks(
        inputData.userId,
        inputData.taskId,
        inputData.subTaskIds
      );

      // 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.SUBTASKS_DELETE, result);

      respond(callback, {success: true, data: result});
    } catch (err) {
      console.error("subtask:delete 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  })
  // 세부 과제 전체 삭제
  socket.on(taskEvents.DELETED_ALL_SUBTASKS, async (payload, callback) => {
    try {
      const { taskId } = payload;
      console.log(`[SOCKET][subtask:deletedAll] 요청 수신`);

      const inputData = taskHelper.buildAllDeleteSubTaskParams({
        userId: socket.user.id,
        taskId
      });

      const result = await taskService.deleteAllSubTasks(
        inputData.userId,
        inputData.taskId
      );

      // 브로드캐스트
      io.to(`task:${taskId}`).emit(taskEvents.ALL_SUBTASKS_DELETE, result);

      respond(callback, {success: true, data: result});
    } catch (err) {
      console.error("subtask:deletedAll 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  })

  // 댓글 생성
  socket.on(commentEvents.CREATE_COMMENT, async (payload, callback) => {
    try {
      const { taskId, subTaskId, content } = payload;
      console.log(`[SOCKET][subtask:deletedAll] 요청 수신`);

      const inputData = commentHelper.buildUpdateTaskParams({
        userId: socket.user.id,
        subTaskId,
        content
      });

      const result = await CommentService.createComment(
        inputData.subTaskId, {userId: inputData.userId, content: inputData.content}
      );

      io.to(`task:${taskId}`).emit(commentEvents.CREATED_COMMENT,
        { taskId: Number(taskId), subTaskId: Number(subTaskId), comment: result }
      );

      console.log(`[SOCKET][comment:created] 브로드캐스트 완료`);
      respond(callback, {success: true, data: result});

    } catch (err) {
      console.error(`[SOCKET][comment:create] 실패`, err);
      callback?.({ success: false, reason: err.message });
    }
  });
  // 댓글 수정
  socket.on(commentEvents.UPDATE_COMMENT, async (payload, callback) => {
    try {
      console.log(`[SOCKET][comment:update] 요청 수신`);

      const input = commentHelper.buildUpdateCommentParams({
        userId: socket.user.id,
        ...payload,
      });

      const updatedComment = await CommentService.updateComment(
        input.commentId,
        input.userId,
        input.content
      );

      io.to(`task:${input.taskId}`).emit(commentEvents.UPDATED_COMMENT, {
        taskId: input.taskId,
        subTaskId: input.subTaskId,
        comment: updatedComment,
      });
      respond(callback, {success: true, data: updatedComment});
    } catch (err) {
      console.error(`[SOCKET][comment:update] 실패`, err);
      callback?.({ success: false, message: err.message });
    }
  });
  // 댓글 삭제
  socket.on(commentEvents.DELETE_COMMENT, async (payload, callback) => {
    try {
      console.log(`[SOCKET][comment:delete] 요청 수신`);

      const input = commentHelper.buildDeleteCommentParams({
        userId: socket.user.id,
        ...payload,
      });

      const deleteComment = await CommentService.deleteComment(
        input.commentId,
        input.userId
      );

      io.to(`task:${input.taskId}`).emit(commentEvents.DELETED_COMMENT, {
        taskId: input.taskId,
        subTaskId: input.subTaskId,
        commentId: input.commentId,
      });

      respond(callback, { success: true, data: deleteComment });
    } catch (err) {
      console.error(`[SOCKET][comment:delete] 실패`, err);
      callback?.({ success: false, message: err.message });
    }
  });

  // 팀원 역할 변경 소켓 핸들러 수정
  socket.on(taskEvents.UPDATE_MEMBER, async (payload, callback) => {
    try {
      // 📍 memberId 대신 userId를 받도록 수정
      const { taskId, userId, role } = payload;
      console.log(`[SOCKET][member:update] 요청 수신`);

      const input = taskHelper.buildUpdateMemberRoleParams({
        ...payload,
      });

      const result = await taskService.modifyMemberRole(
        input.taskId,
        input.userId,
        input.role
      );

      io.to(`task:${input.taskId}`).emit(taskEvents.MEMBER_UPDATED, {
        memberId: result.id,
        userId: result.userId,
        taskId: result.taskId,
        role: result.role ? 1 : 0,
      });

      respond(callback, { success: true, data: result });
    } catch (err) {
      console.error("member:update 실패", err);
      callback?.({ success: false, reason: err.message });
    }
  });

  //자료 생성 Socket
  socket.on(referenceEvents.CREATE_REFERENCE, async (payload, callback) => {
    try {
      const { taskId, type, item } = payload;
      console.log(`[SOCKET][reference:create] 요청 수신`, {
        userId: socket.user.id,
        taskId,
        type,
      });

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
      console.log(`[SOCKET][reference:update] 요청 수신`, {
        socketId: socket.id,
        taskId,
        referenceId,
      });

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
      console.log(`[SOCKET][reference:delete] 요청 수신`, {
        socketId: socket.id,
        taskId,
        referenceId,
      });

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
  socket.on(logEvents.CREATE_LOG, async (payload, callback) => {
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
    } catch (err) {
      console.error("log:create 실패", err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
        reason: err.reason ?? err.message,
      });
    }
  });
  // 회의록 수정
  socket.on(logEvents.UPDATE_LOG, async (payload, callback) => {
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
    } catch (err) {
      console.error("log:update 실패", err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
        reason: err.reason ?? err.message,
      });
    }
  });
  // 회의록 삭제
  socket.on(logEvents.DELETE_LOG, async (payload, callback) => {
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
    } catch (err) {
      console.error("log:delete 실패", err);
      callback?.({
        success: false,
        errorCode: err.errorCode ?? "INTERNAL_SERVER_ERROR",
        reason: err.reason ?? err.message,
      });
    }
  });
};

//소켓 응답 헬퍼 함수
function respond(callback, data) {
  if (typeof callback === "function") {
    callback({
      ...data
    });
  }
}
