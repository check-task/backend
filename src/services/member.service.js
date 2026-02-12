import { prisma } from '../db.config.js';

export const getTaskMembersService = async (taskId) => {
  // 1. 해당 taskId를 가진 모든 멤버를 조회
  const members = await prisma.member.findMany({
    where: {
      taskId: parseInt(taskId), // URL 파라미터는 문자열이므로 숫자로 변환
    },
    include: {
      user: { // 유저 테이블의 상세 정보를 포함
        select: {
          id: true,
          nickname: true,
          email: true,
          profileImage: true,
        },
      },
    },
  });

  // 2. 화면에 필요한 필드만 반환 (프로필이미지, 닉네임, 역할)
  return members.map((m) => ({
    profileImage: m.user.profileImage,
    nickname: m.user.nickname,
    role: m.role === 0 ? 'owner' : 'member'  // 0: owner, 1: member
  }));
};
