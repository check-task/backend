import Joi from 'joi';
import { BadRequestError } from '../errors/custom.error.js';

// 댓글 생성 유효성 검사 스키마
const createCommentSchema = Joi.object({
  user_id: Joi.number().integer().required().messages({
    'number.base': '사용자 ID는 숫자여야 합니다.',
    'any.required': '사용자 ID는 필수 입력값입니다.'
  }),
  content: Joi.string().trim().required().messages({
    'string.empty': '댓글 내용을 입력해주세요.',
    'any.required': '댓글 내용은 필수 입력값입니다.'
  })
});

// 댓글 수정 유효성 검사 스키마
const updateCommentSchema = Joi.object({
  content: Joi.string().trim().required().messages({
    'string.empty': '댓글 내용을 입력해주세요.',
    'any.required': '댓글 내용은 필수 입력값입니다.'
  })
});

// 댓글 생성 DTO 변환 및 유효성 검사
export const validateCreateComment = (data) => {
  const { error, value } = createCommentSchema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new BadRequestError('INVALID_INPUT', `유효성 검사 실패: ${errorMessage}`);
  }
  
  // 내부 로직에서는 camelCase 사용
  return {
    userId: value.user_id,
    content: value.content
  };
};

// 댓글 수정 DTO 변환 및 유효성 검사
export const validateUpdateComment = (data) => {
  const { error, value } = updateCommentSchema.validate(data, { abortEarly: false });
  
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new BadRequestError('INVALID_INPUT', `유효성 검사 실패: ${errorMessage}`);
  }
  
  return {
    content: value.content
  };
};

// 댓글 응답 DTO
export class CommentResponseDto {
  static from(comment) {
    return {
      comment_id: comment.id,
      sub_task_id: comment.subTask?.id,
      user_id: comment.user?.id,
      content: comment.content,
      created_at: comment.createdAt
    };
  }
}