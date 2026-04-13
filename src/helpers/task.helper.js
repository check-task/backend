import { BadRequestError } from "../errors/custom.error";
import { TaskRequestDTO } from "../dtos/task.dto";

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
}

export default new TaskHandler();