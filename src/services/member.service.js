import { prisma } from "../db.config.js";
import { NotFoundError, ForbiddenError } from "../errors/custom.error.js";
import taskRepository from "../repositories/task.repository.js";
import alarmRepository from "../repositories/alarm.repository.js";

class MemberService {
  async getTaskMembers(taskId) {
    // 1. taskId 유효성 검사
    if (isNaN(parseInt(taskId))) {
      throw new NotFoundError(
        "INVALID_TASK_ID",
        "유효하지 않은 과제 ID입니다.",
      );
    }

    // 2. 과제 존재 여부 확인
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
    });

    if (!task) {
      throw new NotFoundError(
        "TASK_NOT_FOUND",
        "해당하는 과제를 찾을 수 없습니다.",
      );
    }

    // 3. 해당 taskId를 가진 모든 멤버를 조회
    const members = await prisma.member.findMany({
      where: {
        taskId: parseInt(taskId),
      },
      include: {
        user: {
          select: {
            id: true,
            nickname: true,
            email: true,
            profileImage: true,
          },
        },
      },
    });

    // 4. 화면에 필요한 필드만 반환 (아이디, 프로필이미지, 닉네임, 역할)
    return members.map((m) => ({
      id: m.user.id,
      profileImage: m.user.profileImage,
      nickname: m.user.nickname,
      role: m.role === 0 || m.role === false ? "owner" : "member", // 0: owner, 1: member
    }));
  }

  async deleteMember(taskId, requestingUserId) {
  // 과제 존재 여부 확인
    const currentTask = await taskRepository.findTaskById(taskId);
    if (!currentTask) {
      throw new NotFoundError("삭제하려는 과제가 존재하지 않습니다.");
    }

    const requestingMember = await taskRepository.findMemberInTask(taskId, requestingUserId);
    if (!requestingMember) throw new ForbiddenError("FORBIDDEN", "해당 과제의 멤버가 아닙니다.");

    // 팀장이면 과제 전체 삭제
    if (requestingMember.role === false) {
      await taskRepository.deleteTask(parseInt(taskId));
      return { deleted: "task", taskId: parseInt(taskId) };
    }

    // 팀원이면 본인 멤버만 삭제
    return await prisma.$transaction(async (tx) => {
      await alarmRepository.deleteAlarmsByUserIdAndTaskId(
        requestingMember.userId,
        parseInt(taskId),
        tx,
      );
      await tx.subTask.updateMany({
        where: { assigneeId: requestingMember.id },
        data: { assigneeId: null },
      });
      await tx.member.delete({ where: { id: requestingMember.id } });
      return {
        deleted: "member",
        memberId: requestingMember.id,
        userId: requestingMember.userId,
        taskId: requestingMember.taskId,
      };
    });
  }
}

export default new MemberService();
