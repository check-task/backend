import { prisma } from "../db.config.js";

export const getUserData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },

    include: { folders: true },
  });

  return user;
};

export const updateProfile = async (userId, data) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      nickname: data.nickname,
      phoneNum: data.phoneNum,
      email: data.email,
      profileImage: data.profileImage,
    },
  });
  return updatedUser;
}

//탈퇴한 회원인지 확인
export const checkDeletedUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, deletedAt: true },
  });
  return user;
}