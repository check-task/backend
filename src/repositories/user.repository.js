import { prisma } from "../db.config.js";

export const getUserData = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },

    include: { folders: true  },
  });

  return user;
};