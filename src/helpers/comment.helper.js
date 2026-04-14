import { BadRequestError } from "../errors/custom.error.js";
import { TaskRequestDTO } from "../dtos/task.dto.js";

class CommentHandler {
  buildUpdateTaskParams({ userId, subTaskId, content }) {
    if (!taskId) { throw new BadRequestError("INVALID_TASK_ID", "과제 ID가 필요합니다."); }
    if (!content || Object.keys(body).length === 0) { throw new BadRequestError( "DATA_NOT_PROVIDED", "수정할 데이터가 전달되지 않았습니다."); }
        
    return {
      subTaskId: Number(subTaskId),
      userId,
      content
    };
  }

  buildUpdateCommentParams({ userId, taskId, subTaskId, commentId, content }) {
    if (!commentId) { throw new BadRequestError("INVALID_COMMENT_ID", "댓글 ID가 필요합니다."); }
    if (!content || content.trim().length === 0) { throw new BadRequestError("EMPTY_CONTENT", "댓글 내용이 없습니다."); }

    return {
      userId,
      taskId: Number(taskId),
      subTaskId: Number(subTaskId),
      commentId: Number(commentId),
      content: content.trim(),
    };
  }


}

export default new CommentHandler();