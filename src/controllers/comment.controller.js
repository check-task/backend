import { prisma } from '../db.config.js';
import Joi from 'joi'; //요청 데이터 유효성 검사
import { NotFoundError, BadRequestError } from '../errors/custom.error.js';

// 댓글 수정 유효성 검사 스키마
const updateCommentSchema = Joi.object({
  content: Joi.string().trim().required().messages({
    'string.empty': '댓글 내용을 입력해주세요.',
    'any.required': '댓글 내용은 필수 입력값입니다.'
  })
});

// 댓글 수정 서비스 함수
const updateCommentService = async (commentId, userId, content) => {
  try {
    // 댓글 존재 여부 및 소유자 확인
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: { user: { select: { id: true } } }
    });

    if (!comment) {
      throw new NotFoundError('COMMENT_NOT_FOUND', '댓글을 찾을 수 없습니다.');
    }

    // 댓글 작성자만 수정 가능
    if (comment.user.id !== userId) {
      const error = new Error('수정 권한이 없습니다.');
      error.status = 403;
      throw error;
    }

    // 댓글 수정
    const updatedComment = await prisma.comment.update({
      where: { id: parseInt(commentId) },
      data: { content },
      include: {
        user: { select: { id: true, nickname: true } },
        subTask: { select: { id: true, title: true } }
      }
    });

    // 응답 DTO 형태로 변환
    return {
      comment_id: updatedComment.id,
      content: updatedComment.content,
      user_id: updatedComment.user.id,
      sub_task_id: updatedComment.subTask.id,
      created_at: updatedComment.createdAt
    };
  } catch (error) {
    console.error('Update Comment Service Error:', error);
    throw error;
  }
};

// 유효성 검사 스키마
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

// DTO 변환 및 유효성 검사
const toCreateCommentDto = (data) => {
  const { error, value } = createCommentSchema.validate(data, { abortEarly: false });
  if (error) {
    const errorMessage = error.details.map(detail => detail.message).join(', ');
    throw new BadRequestError('INVALID_INPUT', `유효성 검사 실패: ${errorMessage}`);
  }
  //내부 로직에서는 camelCase 사용
  return {
    userId: value.user_id,
    content: value.content
  };
};

//repository 함수들
const findSubTaskById = async (subTaskId) => { //subtask 존재여부 확인
  try {
    return await prisma.subTask.findUnique({ 
      where: { id: parseInt(subTaskId) } 
    });
  } catch (error) {
    console.error('Error finding subTask:', error);
    throw new Error('서버 오류가 발생했습니다.');
  }
};
// user 존재 여부 확인
const findUserById = async (userId) => {
  try {
    return await prisma.user.findUnique({ 
      where: { id: userId } 
    });
  } catch (error) {
    console.error('Error finding user:', error);
    throw new Error('서버 오류가 발생했습니다.');
  }
};
//댓글저장
const saveComment = async (createCommentDto, subTaskId) => {
  try {
    return await prisma.comment.create({
      data: {
        content: createCommentDto.content,
        subTask: { connect: { id: parseInt(subTaskId) } },
        user: { connect: { id: createCommentDto.userId } }
      },
      // 응답에 필요한 필드만 선택
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            nickname: true
          }
        },
        subTask: {
          select: {
            id: true,
            title: true
          }
        }
      }
      /*
      include: {
        user: { select: { id: true, nickname: true } },
        subTask: { select: { id: true, title: true } }
      }*/
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    throw new Error('댓글 생성 중 오류가 발생했습니다.');
  }
};

// Service 함수
const createCommentService = async (subTaskId, createCommentDto) => {
  try {
    //subtask 존재여부 확인
    const subTask = await findSubTaskById(subTaskId); 
    if (!subTask) {
      throw new NotFoundError('SUBTASK_NOT_FOUND', '하위 업무를 찾을 수 없습니다.');
    }
    //user 존재 여부 확인
    const user = await findUserById(createCommentDto.userId);
    if (!user) {
      throw new NotFoundError('USER_NOT_FOUND', '사용자를 찾을 수 없습니다.');
    }
    //댓글저장
    const comment = await saveComment(createCommentDto, subTaskId);
    //응답 dto 형태로 가공
    return {
      comment_id: comment.id,
      sub_task_id: comment.subTask.id,
      user_id: comment.user.id,
      content: comment.content,
      created_at: comment.createdAt
    };
  } catch (error) {
    console.error('Service error:', error);
    throw error;
  }
};

// 댓글 삭제 서비스 함수
const deleteCommentService = async (commentId, userId) => {
  try {
    // 댓글 존재 여부 및 소유자 확인
    const comment = await prisma.comment.findUnique({
      where: { id: parseInt(commentId) },
      include: { user: { select: { id: true } } }
    });

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
    await prisma.comment.delete({
      where: { id: parseInt(commentId) }
    });
  } catch (error) {
    console.error('Delete Comment Service Error:', error);
    throw error;
  }
};

// 컨트롤러
export const createCommentController = async (req, res, next) => {
  try {
    const { subTaskId } = req.params;
    
    // 요청 본문 유효성 검사 및 DTO 변환
    const commentDto = toCreateCommentDto(req.body);
    
    // 서비스 레이어 호출
    const result = await createCommentService(subTaskId, commentDto);
    
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
    const userId = req.user.id; // authenticate 미들웨어에서 설정된 사용자 ID

    // 요청 본문 유효성 검사
    const { error, value } = updateCommentSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map(detail => detail.message).join(', ');
      throw new BadRequestError('INVALID_INPUT', `유효성 검사 실패: ${errorMessage}`);
    }

    // 서비스 레이어 호출
    const result = await updateCommentService(
      commentId,
      userId,
      value.content
    );

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
    const userId = req.user.id; // 인증 미들웨어에서 설정된 사용자 ID

    // 서비스 레이어 호출
    await deleteCommentService(commentId, userId);

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
        resultType: 'ERROR',
        message: '삭제 권한이 없습니다.'
      });
    } else if (error.name === 'NotFoundError') {
      return res.status(404).json({
        resultType: 'ERROR',
        message: '댓글을 찾을 수 없습니다.'
      });
    } else if (error.name === 'BadRequestError') {
      return res.status(400).json({
        resultType: 'ERROR',
        message: error.message || '잘못된 요청입니다.'
      });
    }
    
    // 기타 서버 에러
    res.status(500).json({
      resultType: 'ERROR',
      message: '서버 내부 오류가 발생했습니다.'
    });
  }
};