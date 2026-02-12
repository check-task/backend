import { prisma } from '../db.config.js';
import { NotFoundError } from '../errors/custom.error.js';

export const getTaskMembersService = async (taskId) => {
  // 1. taskId 유효성 검사
  if (isNaN(parseInt(taskId))) {
    throw new NotFoundError('INVALID_TASK_ID', '유효하지 않은 과제 ID입니다.');
  }

  // 2. 과제 존재 여부 확인
  const task = await prisma.task.findUnique({
    where: { id: parseInt(taskId) },
  });

  if (!task) {
    throw new NotFoundError('TASK_NOT_FOUND', '해당하는 과제를 찾을 수 없습니다.');
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
    role: (m.role === 0 || m.role === false) ? 'owner' : 'member' // 0: owner, 1: member
  }));
};
