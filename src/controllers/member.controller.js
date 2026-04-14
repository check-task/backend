import memberService from "../services/member.service.js";

export const deleteMember = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const requestingUserId = req.user.id;

    const result = await memberService.deleteMember(taskId, requestingUserId);

    return res.status(200).json({
      resultType: "SUCCESS",
      message: "멤버가 삭제되었습니다.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const getTaskMembers = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    const members = await memberService.getTaskMembers(taskId);

    return res.status(200).json({
      resultType: "SUCCESS",
      message: "팀원 목록 조회에 성공했습니다.",
      data: {
        members: members,
        count: members.length,
      },
    });
  } catch (error) {
    next(error);
  }
};
