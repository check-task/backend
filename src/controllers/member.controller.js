import { getTaskMembersService } from '../services/member.service.js';
import { BadRequestError } from '../errors/custom.error.js';

export const getTaskMembers = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    
    if (!taskId) {
      throw new BadRequestError('MISSING_TASK_ID', '과제 ID가 필요합니다.');
    }

    const members = await getTaskMembersService(taskId);

    return res.status(200).json({
      resultType: 'SUCCESS',
      message: '팀원 목록 조회에 성공했습니다.',
      data: {
        members: members,
        count: members.length
      }
    });
  } catch (error) {
    next(error);
  }
};
