import { BadRequestError } from "../errors/custom.error.js";
import { TaskRequestDTO } from "../dtos/task.dto.js";

class TaskHandler {
  buildUpdateTaskParams({ userId, taskId, body }) {
    if (!body || Object.keys(body).length === 0) {throw new BadRequestError( "DATA_NOT_PROVIDED", "수정할 데이터가 전달되지 않았습니다.");}
        
    return {
      taskId: Number(taskId),
      userId,
      taskRequest: TaskRequestDTO.toUpdate(body),
    };
  }

  buildUpdateSubTaskStatusParams({ userId, subTaskId, status }) {
    if (!subTaskId) {throw new BadRequestError("INVALID_SUBTASK_ID", "서브태스크 ID가 필요합니다.")}
    if (!status) {throw new BadRequestError("INVALID_STATUS", "상태 값이 필요합니다.");}

    return {
      subTaskId: Number(subTaskId),
      userId,
      status: status.toUpperCase(),
    };
  }

  buildUpdateSubTaskDeadlineParams({ userId, subTaskId, endDate }) {
    if (!subTaskId) {throw new BadRequestError("INVALID_SUBTASK_ID", "서브태스크 ID가 필요합니다.");}

    // 마감일은 미지정(null)으로 되돌릴 수 있습니다.
    if (endDate === null || endDate === undefined || endDate === "") {
      return {
        subTaskId: Number(subTaskId),
        endDate: null,
        userId,
      };
    }

    const deadlineDate = new Date(endDate);
    if (isNaN(deadlineDate.getTime())) {throw new BadRequestError("INVALID_DATE", "유효하지 않은 날짜 형식입니다.");}

    return {
      subTaskId: Number(subTaskId),
      endDate: deadlineDate,
      userId,
    };
  }

  buildUpdateSubTaskAssigneeParams({ userId, subTaskId, assigneeId, assigneeIds }) {
    if (!subTaskId) {throw new BadRequestError("INVALID_SUBTASK_ID", "서브태스크 ID가 필요합니다.");}
  
    let normalizedAssigneeId = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
      normalizedAssigneeId = Number(assigneeId);
  
      if (isNaN(normalizedAssigneeId)) {
        throw new BadRequestError("INVALID_ASSIGNEE_ID", "유효하지 않은 담당자 ID입니다.");
      }
    }

    let normalizedAssigneeIds;
    if (assigneeIds !== undefined && assigneeIds !== null) {
      if (!Array.isArray(assigneeIds)) {
        throw new BadRequestError(
          "INVALID_ASSIGNEE_IDS",
          "assigneeIds는 배열이어야 합니다.",
        );
      }
      normalizedAssigneeIds = assigneeIds.map((id) => {
        const isPositiveIntegerFormat =
          typeof id === "number"
            ? Number.isInteger(id)
            : typeof id === "string" && /^\d+$/.test(id);

        const parsed = isPositiveIntegerFormat ? Number(id) : NaN;

        if (
          !isPositiveIntegerFormat ||
          !Number.isSafeInteger(parsed) ||
          parsed <= 0
        ) {
          throw new BadRequestError(
            "INVALID_ASSIGNEE_ID",
            "유효하지 않은 담당자 ID입니다.",
          );
        }
        return parsed;
      });
    }

    return {
      subTaskId: Number(subTaskId),
      userId,
      assigneeId: normalizedAssigneeId,
      assigneeIds: normalizedAssigneeIds,
    };
  }

  buildCreateSubTaskParams({ userId, taskId, data }) {
    if (!taskId) {throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다.");}
    if (!data || Object.keys(data).length === 0) {throw new BadRequestError("DATA_NOT_PROVIDED", "생성할 데이터가 없습니다.");}
  
    return {
      userId,
      taskId: Number(taskId),
      dto: TaskRequestDTO.toCreateSubTask(data),
    };
  }

  buildUpdateSubTaskParams({ userId, taskId, data }) {
    if (!taskId) {throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다.");}
    if (!data || Object.keys(data).length === 0) {throw new BadRequestError("DATA_NOT_PROVIDED", "수정할 데이터가 없습니다.");}

    const dtoList = data.map(({ subTaskId, ...rest }) => ({
      subTaskId: Number(subTaskId),
      ...TaskRequestDTO.toSubUpdate(rest),
    }));

    return {
      userId,
      taskId: Number(taskId),
      dtoList
    };
  }

  buildDeleteSubTaskParams({ userId, taskId, subTaskIds }) {
    if (!taskId) {throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다.");}
    if (!subTaskIds || Object.keys(subTaskIds).length === 0) {throw new BadRequestError("DATA_NOT_PROVIDED", "수정할 데이터가 없습니다.");}

    return {
      userId,
      taskId: Number(taskId),
      subTaskIds: subTaskIds.map(Number)
    }
  }

  buildAllDeleteSubTaskParams({ userId, taskId }) {
    if (!taskId) {throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다.");}

    return {
      userId,
      taskId: Number(taskId)
    }
  }

  buildUpdateMemberRoleParams({ taskId, userId, targetUserId, role }) {
    if (!taskId) { throw new BadRequestError("INVALID_TASK_ID", "taskId가 필요합니다."); }
    if (!userId) { throw new BadRequestError("INVALID_USER_ID", "userId가 필요합니다.");}
    if (!targetUserId) { throw new BadRequestError("INVALID_TARGET_USER_ID", "targetUserId가 필요합니다.");}
    if (role === undefined || role === null) { throw new BadRequestError("INVALID_ROLE", "role이 필요합니다."); }

    return {
      taskId: Number(taskId),
      userId: Number(userId),
      targetUserId: Number(targetUserId),
      role: Number(role),
    };
  }
}

export default new TaskHandler();