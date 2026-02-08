import { prisma } from "../db.config.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
dayjs.extend(timezone);

class TaskRepository {
  // 완료 과제 조회
  async getCompletedTasks(userId) {
    return await prisma.task.findMany({
      where: {
        members: { some: { userId: userId } },
        deadline: {
          lt: new Date(), 
        },
      },
      include: {
        folder: true,
      },
      orderBy: {
        deadline: 'desc', 
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
    const now = new Date();

    const query = {
      where: {
        members: {
          some: {
            userId: userId
          }
        },
        deadline: {
            gte: now
          }
      },
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
    } else if (sort === 'PROGRESSRATE') {
      return processedTasks.sort((a, b) => b.progress - a.progress);
    }

    return processedTasks;
  }

  // 우선 순위 변경
  async upsertTaskPriority(userId, taskId, rank, tx = prisma) {
    return await tx.taskPriority.upsert({
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

  // 멤버 생성
  async createMember(userId, taskId, role, tx = prisma) {
    return await tx.member.create({
      data: {
        userId,
        taskId,
        role: role ? true : false, // true: member, false: owner
      },
    });
  }

  // 멤버 존재 여부 확인
  async findMemberInTask(taskId, memberId) {
    return await prisma.member.findFirst({
      where: {
        id: memberId,
        taskId: taskId
      }
    });
  }

// 나머지 멤버 역할 리셋
async resetOtherMembersRole(taskId, memberId, tx) {
  return await tx.member.updateMany({
    where: {
      taskId: taskId,
      id: { not: memberId }, 
    },
    data: {
      role: false, 
    },
  });
}

// 대상 멤버 역할 업데이트
async updateMemberRole(memberId, isAdmin, tx) {
  return await tx.member.update({
    where: { id: memberId },
    data: { role: isAdmin },
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
    // 1일 후 만료일로 설정
    // 1일 후 만료일로 설정 (한국 시간 기준)
    const oneDayLater = dayjs().add(9, "hour").add(1, "day").toDate(); // 9시간 차이 보정 UTC +9시간
    console.log("oneDayLater (KST):", oneDayLater);


    return await tx.task.update({
      where: { id: taskId }, //팀과제만 가능 (개인과제는 초대 코드로 참여 불가)
      data: {
        inviteCode,
        inviteExpiredAt: oneDayLater
      },
      select: {
        inviteCode: true,
        inviteExpiredAt: true
      }
    });
  }

  async findMaxRank(userId, tx= prisma) {
    const result = await tx.taskPriority.aggregate({
      _max: {
        rank: true
      },
      where: {
        userId: userId
      }
    });

    return result._max.rank || 0;
  }
}

export default new TaskRepository();
