import { CommentRepository } from '../repositories/comment.repository.js';
import { CommentResponseDto } from '../dtos/comment.dto.js';
import { NotFoundError, ForbiddenError } from '../errors/custom.error.js';

export class CommentService {
  // 댓글 생성
  static async createComment(subTaskId, createCommentDto) {
    try {
      // 하위 업무 존재 여부 확인
      const subTask = await CommentRepository.findSubTaskById(subTaskId);
      if (!subTask) {
        throw new NotFoundError('SUBTASK_NOT_FOUND', '하위 업무를 찾을 수 없습니다.');
      }

      // 사용자 존재 여부 확인
      const user = await CommentRepository.findUserById(createCommentDto.userId);
      if (!user) {
        throw new NotFoundError('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
      }

      // 댓글 생성
      const comment = await CommentRepository.createComment(createCommentDto, subTaskId);
      
      // 응답 DTO 형태로 변환
      return CommentResponseDto.from(comment);
    } catch (error) {
      console.error('Create Comment Service Error:', error);
      throw error;
    }
  }

  // 댓글 수정
  static async updateComment(commentId, userId, content) {
    try {
      // 댓글 존재 여부 및 소유자 확인
      const comment = await CommentRepository.findCommentById(commentId);
      
      if (!comment) {
        throw new NotFoundError('COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
      }

      // 댓글 작성자만 수정 가능
      if (comment.user.id !== userId) {
        throw new ForbiddenError('PERMISSION_DENIED', '댓글 수정 권한이 없습니다.');
      }

      // 댓글 수정
      const updatedComment = await CommentRepository.updateComment(commentId, content);
      
      // 응답 DTO 형태로 변환
      return CommentResponseDto.from(updatedComment);
    } catch (error) {
      console.error('Update Comment Service Error:', error);
      throw error;
    }
  }

  // 댓글 삭제
  static async deleteComment(commentId, userId) {
    try {
      // 댓글 존재 여부 확인
      const comment = await CommentRepository.findCommentById(commentId);
      
      if (!comment) {
        throw new NotFoundError('COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
      }

      // 댓글 작성자만 삭제 가능
      if (comment.user.id !== userId) {
        const error = new Error('삭제 권한이 없습니다.');
        error.status = 403;
        throw error;
      }

      // 댓글 삭제
      await CommentRepository.deleteComment(commentId);
    } catch (error) {
      console.error('Delete Comment Service Error:', error);
      throw error;
    }
  }
}