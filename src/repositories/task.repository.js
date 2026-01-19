import { prisma } from "../db.config.js";

class TaskRepository {
  async getCompletedTasks(userId) {
    return await prisma.task.findMany({
      where: {
        folder: {
          userId: userId,
        },
        
        status: 'COMPLETED',
      },
      include: {
        folder: true,
      },
      orderBy: {
        deadline: 'asc',
      },
    });
  }

  // 폴더 찾기
  async findFolderById(id) {
    return await prisma.folder.findUnique({ where: { id } });
  }

  // 과제 찾기
  async findTaskById(id) {
    return await prisma.task.findUnique({ where: { id } });
  }

  // 과제 생성
  async createTask(data, tx) {
    return await tx.task.create({ data });
  }

  // 과제 수정
  async updateTask(id, data, tx) {
    return await tx.task.update({ where: { id }, data });
  }

  // 과제 세부 사항 조회
  async findTaskDetail(id) {
    return await prisma.task.findUnique({
      where: { id },
      include: {
        subTasks: {
          include: {
            _count: {
              select: { comments: true } 
            }
          }
        },
        references: true,
        logs: true, 
        communications: true 
      }
    });
  }

  // 과제 목록 조회
  async findAllTasks({ type, folderId, sort }) {
    const query = {
        where: {},
        include: {
            folder: true,
            subTasks: true 
        }
    };

    if (type) query.where.type = type === "팀" ? "TEAM" : "PERSONAL";
    if (folderId) query.where.folderId = parseInt(folderId);

    if (sort === '마감일순' || !sort) {
        query.orderBy = { deadline: 'asc' };
    }

    return await prisma.task.findMany(query);
}

  // 세부 과제 일괄 삭제
  async deleteAllSubTasks(taskId, tx) {
    return await tx.subTask.deleteMany({ where: { taskId } });
  }

  // 자료 일괄 삭제
  async deleteAllReferences(taskId, tx) {
    return await tx.reference.deleteMany({ where: { taskId } });
  }

  // 세부 과제 추가
  async addSubTasks(taskId, subTasks, tx) {
    return await tx.subTask.createMany({
      data: subTasks.map(st => ({ ...st, taskId }))
    });
  }

  // 자료 추가
  async addReferences(taskId, refs, tx) {
    return await tx.reference.createMany({
      data: refs.map(r => ({ ...r, taskId }))
    });
  }

  // 과제 삭제
  async deleteTask(id) {
    return await prisma.task.delete({
      where: { id }
    });
  }
}

export default new TaskRepository();
