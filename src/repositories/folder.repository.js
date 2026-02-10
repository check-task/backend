import { prisma } from "../db.config.js";

class FolderRepository {
  // 내부 검증용 단일 조회 (수정/삭제 시 필요하므로 유지)
  async getFolderById(folderId) {
    return await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
    });
  }

  // 1. 폴더 생성
  async addFolder(userId, data) {
    const newFolder = await prisma.folder.create({
      data: {
        userId: userId,
        folderTitle: data.folderTitle,
        color: data.color,
      },
      select: {
        id: true,
        userId: true,
        folderTitle: true,
        color: true,
      }
    });
    return newFolder;
  }

  // 2. 폴더 수정
  async updateFolder(userId, folderId, data) {
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
        userId: true,
        folderTitle: true,
        color: true,
      }
    });
    return updatedFolder;
  }

  // 3. 폴더 삭제
  async removeFolder(userId, folderId) {
    const deletedFolder = await prisma.folder.delete({
      where: {
        id: parseInt(folderId),
        userId: userId,
      },
    });
    return deletedFolder;
  }
}

export const folderRepository = new FolderRepository();