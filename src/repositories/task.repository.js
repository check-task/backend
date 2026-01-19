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
  async findAllTasks({ userId, type, folderId, sort }) {
    console.log("userid:", userId);
    const query = {
      where: {},
      include: {
        folder: true,
        subTasks: true, 
        priorities: {
          where: { userId: userId } 
        }
      }
    };

    if (type) {
      query.where.type = (type === "TEAM") ? "TEAM" : "PERSONAL";
    }
    if (folderId) {
      query.where.folderId = parseInt(folderId);
    }

    if (sort === 'DEADLINE') {
      query.orderBy = { deadline: 'asc' };
    }

    const tasks = await prisma.task.findMany(query);

    const processedTasks = tasks.map(task => {
      // 진행률 계산
      const total = task.subTasks.length;
      const completed = task.subTasks.filter(st => st.status === 'COMPLETED').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      const myRank = task.priorities[0]?.rank ?? 999;

      return { ...task, progress, myRank };
    });

    if (!sort || sort === 'PRIORITY') {
      return processedTasks.sort((a, b) => a.myRank - b.myRank);
    } else if (sort === 'PROGRASSRATE') {
      return processedTasks.sort((a, b) => b.progress - a.progress);
    }
    
    return processedTasks;
  }

  // 우선 순위 변경
  async upsertTaskPriority(userId, taskId, rank, tx = prisma) {
    return await tx.taskPirority.upsert({
      where: {
        userId_taskId: { 
          userId: userId,
          taskId: taskId
        }
      },
      update: {
        rank: rank 
      },
      create: {
        userId: userId,
        taskId: taskId,
        rank: rank 
      }
    });
  }

  // 멤버 존재 여부 확인
  async findMemberInTask (taskId, memberId) {
    return await prisma.member.findFirst({
      where: {
        id: memberId,
        taskId: taskId
      }
    });
  }

  // 대상 멤버 제외 역할 member로 전환
  async resetOtherMembersRole(taskId, excludeMemberId, tx = prisma) {
    return await tx.member.updateMany({
      where: {
        taskId: taskId,
        id: { not: excludeMemberId } // 대상 멤버는 제외
      },
      data: { 
        role: true 
      }
    });
  }

  // 멤버 역할 업데이트
  async updateMemberRole(memberId, isMember) {
    return await prisma.member.update({
      where: {id: memberId},
      data: {role: isMember}
    });
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

  // 초대 코드 생성 및 업데이트
  async updateTaskInviteCode(taskId, inviteCode, tx = prisma) {
    // 1년 후 만료일로 설정
    const oneYearLater = new Date();
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    
    return await tx.task.update({
      where: { id: taskId },
      data: {
        inviteCode,
        inviteExpiredAt: oneYearLater
      },
      select: {
        inviteCode: true,
        inviteExpiredAt: true
      }
    });
  }
}

export default new TaskRepository();
