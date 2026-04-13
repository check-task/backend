import { BadRequestError } from "../errors/custom.error.js";
import { TaskRequestDTO } from "../dtos/task.dto.js";

class TaskHandler {
  buildUpdateTaskParams({ userId, taskId, body, files }) {
    if (!body || Object.keys(body).length === 0) {throw new BadRequestError( "DATA_NOT_PROVIDED", "수정할 데이터가 전달되지 않았습니다.");}
        
    return {
      taskId: Number(taskId),
      userId,
      taskRequest: TaskRequestDTO.toUpdate(body),
      files,
    };
  }

  buildUpdateSubTaskParams({ userId, subTaskId, status }) {
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
    if (!endDate) {throw new BadRequestError("INVALID_DATE", "마감일이 필요합니다.");}
  
    const deadlineDate = new Date(endDate);
    if (isNaN(deadlineDate.getTime())) {throw new BadRequestError("INVALID_DATE", "유효하지 않은 날짜 형식입니다.");}
  
    return {
      subTaskId: Number(subTaskId),
      userId,
      endDate: deadlineDate,
    };
  }

  buildUpdateSubTaskAssigneeParams({ userId, subTaskId, assigneeId }) {
    if (!subTaskId) {throw new BadRequestError("INVALID_SUBTASK_ID", "서브태스크 ID가 필요합니다.");}
  
    let normalizedAssigneeId = null;
    if (assigneeId !== undefined && assigneeId !== null && assigneeId !== "") {
      normalizedAssigneeId = Number(assigneeId);
  
      if (isNaN(normalizedAssigneeId)) {throw new BadRequestError("INVALID_ASSIGNEE_ID", "유효하지 않은 담당자 ID입니다.");}
    }
  
    return {
      subTaskId: Number(subTaskId),
      userId,
      assigneeId: normalizedAssigneeId,
    };
  }

  buildCreateSubTaskParams({ userId, taskId, body }) {
    if (!taskId) {
      throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다.");
    }
  
    if (!body || Object.keys(body).length === 0) {
      throw new BadRequestError("DATA_NOT_PROVIDED", "생성할 데이터가 없습니다.");
    }
  
    return {
      userId,
      taskId: Number(taskId),
      dto: TaskRequestDTO.toCreateSubTask(body),
    };
  }
}

export default new TaskHandler();