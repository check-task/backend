import { prisma } from "../db.config.js";

class FolderRepository {
  // 내부 검증용 단일 조회
  async getFolderById(folderId) {
    return await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
    });
  }

  // 유저의 폴더 개수 조회 (기본 폴더 포함됨)
  async countByUserId(userId) {
    return await prisma.folder.count({
      where: { userId: userId },
    });
  }

  // 유저가 특정 색상을 이미 사용 중인지 조회
  async findByUserAndColor(userId, color) {
    return await prisma.folder.findFirst({
      where: {
        userId: userId,
        color: color,
      },
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