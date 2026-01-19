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

  // 댓글 수정
  static async updateComment(commentId, userId, content) {
    // 댓글 존재 여부 및 소유자 확인
    const comment = await CommentRepository.findCommentById(commentId);
    if (!comment) {
      throw new NotFoundError('COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
    }

    // 댓글 작성자만 수정 가능
    if (comment.userId !== userId) {
      const error = new Error('수정 권한이 없습니다.');
      error.status = 403;
      throw error;
    }

    // 댓글 수정
    const updatedComment = await CommentRepository.updateComment(commentId, content);
    return CommentResponseDto.from(updatedComment);
  }
}