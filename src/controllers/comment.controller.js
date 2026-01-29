import { CommentService } from '../services/comment.service.js';
import { validateCreateComment, validateUpdateComment } from '../dtos/comment.dto.js';
import { BadRequestError } from '../errors/custom.error.js';

// 댓글 생성 컨트롤러
export const createCommentController = async (req, res, next) => {
  try {
    const { subTaskId } = req.params;
    
    // 요청 본문 유효성 검사 및 DTO 변환
    const commentDto = validateCreateComment(req.body);
    
    // 서비스 레이어 호출
    const result = await CommentService.createComment(subTaskId, commentDto);
    
    // 성공 응답
    res.status(201).json({
      resultType: "SUCCESS",
      message: "댓글이 등록되었습니다.",
      data: {
        comment_id: result.comment_id,
        sub_task_id: result.sub_task_id,
        content: result.content,
        created_at: result.created_at
      }
    });
  } catch (error) {
    console.error('Controller error:', error);
    next(error);
  }
};

// 댓글 수정 컨트롤러
export const updateCommentController = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;  // authenticate 미들웨어에서 설정된 사용자 ID

    // 요청 본문 유효성 검사
    const { content } = validateUpdateComment(req.body);

    // 서비스 레이어 호출
    const result = await CommentService.updateComment(commentId, userId, content);

    // 성공 응답
    res.status(200).json({
      resultType: "SUCCESS",
      message: "댓글이 수정되었습니다.",
      data: {
        comment_id: result.comment_id,
        content: result.content
      }
    });
  } catch (error) {
    console.error('Update Comment Controller Error:', error);
    next(error);
  }
};

// 댓글 삭제 컨트롤러
export const deleteCommentController = async (req, res, next) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    // 서비스 레이어 호출
    await CommentService.deleteComment(commentId, userId);

    // 성공 응답
    res.status(200).json({
      resultType: 'SUCCESS',
      message: '댓글이 삭제되었습니다.',
      data: null
    });
  } catch (error) {
    console.error('Delete Comment Controller Error:', error);
    
    // 에러 유형에 따라 적절한 상태 코드와 메시지 설정
    if (error.status === 403) {
      return res.status(403).json({
        resultType: 'FAIL',
        code: 403,
        errorCode: 'FORBIDDEN',
        reason: '삭제 권한이 없습니다.',
        data: null
      });
    } else if (error.name === 'NotFoundError') {
      return res.status(404).json({
        resultType: 'FAIL',
        code: 404,
        errorCode: error.errorCode || 'COMMENT_NOT_FOUND',
        reason: error.reason || '댓글을 찾을 수 없습니다.',
        data: null
      });
    } else if (error.name === 'BadRequestError') {
      return res.status(400).json({
        resultType: 'FAIL',
        code: 400,
        errorCode: error.errorCode || 'INVALID_REQUEST',
        reason: error.message || '잘못된 요청입니다.',
        data: null
      });
    }
    
    // 기타 서버 에러
    res.status(500).json({
      resultType: 'FAIL',
      code: 500,
      errorCode: 'INTERNAL_SERVER_ERROR',
      reason: '서버 내부 오류가 발생했습니다.',
      data: null
    });
  }
};