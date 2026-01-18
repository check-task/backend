import { CommentRepository } from '../repositories/comment.repository.js';
import { CreateCommentDto, CommentResponseDto } from '../dtos/comment.dto.js';
import { NotFoundError } from '../errors/custom.error.js';

export class CommentService {
  static async createComment(subTaskId, createCommentDto) {
    // 하위 업무 존재 여부 확인
    const subTask = await CommentRepository.findSubTaskById(subTaskId);
    if (!subTask) {
      throw new NotFoundError('SubTask not found');
    }

    // 사용자 존재 여부 확인
    const user = await CommentRepository.findUserById(createCommentDto.userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    // 댓글 생성
    const comment = await CommentRepository.createComment(createCommentDto, subTaskId);
    return CommentResponseDto.from(comment);
  }
}