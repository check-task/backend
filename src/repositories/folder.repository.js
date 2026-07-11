import { prisma } from "../db.config.js";

class FolderRepository {
  // 내부 검증용 단일 조회
  async getFolderById(folderId) {
    return await prisma.folder.findUnique({
      where: { id: parseInt(folderId) },
    });
  }

  // 유저의 폴더 개수 조회 (기본 폴더 포함)
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

  // 유저가 특정 이름의 폴더를 이미 가지고 있는지 조회
  async findByUserAndTitle(userId, folderTitle) {
    return await prisma.folder.findFirst({
      where: {
        userId: userId,
        folderTitle: folderTitle,
      },
    });
  }

  async countAssignedTasksByFolderId(folderId) {
    return await prisma.member.count({
      where: { folderId: parseInt(folderId) },
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

  // 4. 폴더 순서 업데이트
  async updateFolderPriority(userId, orderedFolders) {
    // orderedFolders 예시: [{ folderId: 1, rank: 1 }, { folderId: 2, rank: 2 }]
    
    const queries = orderedFolders.map((folder) =>
      prisma.folder.updateMany({
        where: {
          id: parseInt(folder.folderId),
          userId: userId,
        },
        data: {
          rank: folder.rank,
        },
      })
    );

    return await prisma.$transaction(queries);
  }

  // 5. 폴더 상세 조회 (Task, SubTask 포함)
  async getFolderDetailTasks(userId, folderIds) {
    const folders = await prisma.folder.findMany({
      where: {
        id: { in: folderIds },
        userId: userId,
      },
    });

    if (!folders || folders.length === 0) return [];

    const membersInFolders = await prisma.member.findMany({
      where: {
        userId: userId,
        folderId: { in: folderIds },
      },
      include: {
        task: {
          include: {
            subTasks: {
              orderBy: { id: "asc" }, 
            },
          },
        },
      },
      orderBy: {
        task: { deadline: "asc" }, 
      },
    });

    const result = folders.map(folder => {
      const tasksForFolder = membersInFolders
        .filter(member => member.folderId === folder.id)
        .map(member => member.task);

      return {
        folderInfo: folder,
        tasks: tasksForFolder,
      };
    });

    return result;
  }

  // 6. 폴더 삭제 시 과제 일괄 이동
  async moveTasksToFolder(userId, oldFolderId, newFolderId) {
    return await prisma.member.updateMany({
      where: {
        userId: userId,
        folderId: parseInt(oldFolderId),
      },
      data: {
        folderId: parseInt(newFolderId),
      },
    });
  }
}

export const folderRepository = new FolderRepository();