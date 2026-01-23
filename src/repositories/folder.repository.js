import { prisma } from "../db.config.js";

export const getFolderById = async (folderId) => {
  return await prisma.folder.findUnique({
    where: { id: parseInt(folderId) },
  });
};

// 1. 폴더 생성
export const addFolder = async (userId, data) => {
  const newFolder = await prisma.folder.create({
    data: {
      userId: userId,
      folderTitle: data.folderTitle,
      color: data.color,
    },
    select: {
        id: true,
        folderTitle: true,
        color: true,
      }
  });
  return newFolder;
};

// 2. 폴더 수정
export const updateFolder = async (userId, folderId, data) => {
  const updatedFolder = await prisma.folder.update({
    where: {
      id: parseInt(folderId),
      userId: userId,
    },
    data: {
      ...data 
    },
    select: {
      id: true,
      folderTitle: true,
      color: true,
    }
  });
  return updatedFolder;
};

// 3. 폴더 삭제
export const removeFolder = async (userId, folderId) => {
  const deletedFolder = await prisma.folder.delete({
    where: {
      id: parseInt(folderId),
      userId: userId,
    },
  });
  return deletedFolder;
};