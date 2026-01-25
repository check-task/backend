import { prisma } from "../db.config.js";

class UserRepository {
  // 내 정보 조회
  async getUserData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { folders: true },
    });

    return user;
  }

  // 프로필 수정
  async updateProfile(userId, data) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data 
      },
    });
    return updatedUser;
  }

  // 탈퇴한 회원인지 확인
  async checkDeletedUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    return user;
  }
}

export const userRepository = new UserRepository();

export const checkDeletedUser = (userId) => userRepository.checkDeletedUser(userId);
export const getUserData = (userId) => userRepository.getUserData(userId);
export const updateProfile = (userId, data) => userRepository.updateProfile(userId, data);