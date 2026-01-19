import { prisma } from "../db.config.js";

export const getUserData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },

    include: { folders: true  },
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