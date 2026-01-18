import { prisma } from '../db.config.js';
import Joi from 'joi'; //요청 데이터 유효성 검사
import { NotFoundError, BadRequestError } from '../errors/custom.error.js';

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