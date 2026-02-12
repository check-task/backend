import { getTaskMembersService } from '../services/member.service.js';

export const getTaskMembers = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const members = await getTaskMembersService(taskId);

    return res.status(200).json({
      resultType: "SUCCESS",
      error: null,
      success: {
        members: members,
        count: members.length
      }
    });
  } catch (error) {
    next(error); // 에러 핸들러로 전달
  }
};
