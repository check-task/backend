import { prisma } from "../db.config.js";
import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";
dayjs.extend(utc);
dayjs.extend(timezone);

class TaskRepository {
  // 완료 과제 조회
  async getCompletedTasks(userId, folderIds = null) {
    return await prisma.task.findMany({
      where: {
      deadline: { lt: new Date() },
      members: { 
        some: { 
          userId: userId,
          ...(folderIds && { folderId: { in: folderIds } }) 
        } 
      },
    },
      include: {
        members: {
          where: { userId: userId },
          include: { folder: true }
        }
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

  // 폴더 찾기 (지정안함 폴더)
  async findFolderByUserIdAndName(userId, folderName) {
    return await prisma.folder.findFirst({
      where: {
        userId: userId,
        folderTitle: folderName,
      },
    });
  }

  // 과제 찾기
  async findTaskById(id) {
    return await prisma.task.findUnique({ where: { id } });
  }

  // 과제 생성
  async createTask(data, tx = prisma) {
    return await tx.task.create({ data });
  }

  // 과제 수정
  async updateTask(id, data, tx = prisma) {
    return await tx.task.update({ where: { id }, data });
  }

  // 폴더 수정하기
  async updateMemberFolder({ userId, taskId, folderId }) {
    return await prisma.member.update({
      where: {
        userId_taskId: {
          userId,
          taskId,
        },
      },
      data: {
        folderId,
      },
    });
  }

  // 과제 세부 사항 조회
  async findTaskDetail(taskId, userId) {
    const task = await prisma.task.findUnique({
      where: { id: parseInt(taskId) },
      include: {
        members: {
          where: { userId: parseInt(userId) },
          include: { folder: true }
        },
        subTasks: {
          orderBy: { endDate: { sort: 'asc', nulls: 'last' } }, // 마감일 시간순 정렬 (미지정은 맨 뒤)
          include: {
            comments: {
              include: {
                user: { select: { nickname: true, profileImage: true } }
              },
              orderBy: { createdAt: 'asc' } // 오래된 순으로 정렬
            },
            subTaskAssignees: {
              include: {
                member: {
                  include: {
                    user: { select: { id: true, nickname: true, profileImage: true } }
                  }
                }
              }
            },
            _count: {
              select: {
                comments: true
              }
            }
          }
        },
        references: true,
        logs: true,
        communications: true
      }
    });

    if (!task) return task;

    // 완료된 세부 과제는 목록 아래로 (각 그룹 내에서는 위에서 지정한 마감일 순서 유지 - stable sort)
    return {
      ...task,
      subTasks: [...task.subTasks].sort(
        (a, b) => (a.status === 'COMPLETED') - (b.status === 'COMPLETED'),
      ),
    };
  }

  // 과제 목록 조회
  async findAllTasks({ userId, type, folderId, sort, status }) {
    const now = new Date();

    const query = {
      where: {
        members: {
          some: {
            userId: userId,
            ...(folderId 
              ? (folderId === 'null' || folderId === 'undefined'
                ? { folderId: null }
                : { folderId: parseInt(folderId) }) 
              : {})
          }
        },
        ...(type ? { type: type === "TEAM" ? "TEAM" : "PERSONAL" } : {}),
      },
      include: {
        members: {
          where: { userId: userId },
          include: { folder: true }
        },
        subTasks: {
          orderBy: { endDate: { sort: 'asc', nulls: 'last' } } // 마감일 시간순 정렬 (미지정은 맨 뒤)
        },
        priorities: {
          where: { userId: userId }
        }
      }
    };

    if (status === 'PROGRESS') {
      query.where.deadline = {
        gte: now
      };
    }

    // if (type) {
    //   query.where.type = (type === "TEAM") ? "TEAM" : "PERSONAL";
    // }
    // if (folderId) {
    //   query.where.folderId = parseInt(folderId);
    // }

    if (sort === 'DEADLINE') {
      query.orderBy = { deadline: 'asc' };
    }

    const tasks = await prisma.task.findMany(query);

    const processedTasks = tasks.map(task => {
      const myMemberInfo = task.members[0]; // 내 멤버 정보
      const folder = myMemberInfo?.folder || null;

      // 진행률 계산
      const total = task.subTasks.length;
      const completed = task.subTasks.filter(st => st.status === 'COMPLETED').length;
      const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

      const myRank = task.priorities[0]?.rank ?? 999;

      return { 
        ...task, 
        folder, 
        folderId: folder?.id || null, // folderId를 명시적으로 추가
        progress, 
        myRank 
      };
    });

    if (!sort || sort === 'PRIORITY') {
      return processedTasks.sort((a, b) => a.myRank - b.myRank);
    } else if (sort === 'PROGRESSRATE') {
      return processedTasks.sort((a, b) => a.progress - b.progress); 
    }

    return processedTasks;
  }

  async updateTaskDeadline(taskId, deadline, tx = prisma) {
    return await tx.task.update({
      where: { id: taskId },
      data: { deadline }
    });
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
  async createMember(userId, taskId, role, folderId, tx = prisma) {
    return await tx.member.create({
      data: {
        userId,
        taskId,
        role: role ? true : false, // true: member, false: owner
        folderId: folderId || null
      },
    });
  }

  // 나머지 멤버 역할 리셋 (방장 한 명을 제외하고 모두 멤버로)
  async resetOtherMembersRole(taskId, userId, tx) {
    return await tx.member.updateMany({
      where: {
        taskId: parseInt(taskId),
        userId: { not: parseInt(userId) }, 
      },
      data: {
        role: true, 
      },
    });
  }

  // 대상 멤버 역할 업데이트
  async updateMemberRole(memberId, dbRoleValue, tx) {
    return await tx.member.update({
      where: { id: memberId },
      data: { role: dbRoleValue }, 
    });
  }

  // 멤버 존재 여부 확인
  async findMemberInTask(taskId, userId) {
    return await prisma.member.findFirst({
      where: {
        taskId: parseInt(taskId),
        userId: parseInt(userId) 
      },
      select: {
        id: true,
        userId: true,
        taskId: true,
        role: true,
      }
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

  // 세부 과제 찾기
  async findSubTaskById(id, tx) {
    return await tx.subTask.findUnique({
      where: { id },
      include: {
        subTaskAssignees: {
          include: {
            member: {
              include: {
                user: {
                  include: {
                    alarmSetting: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // 세부 과제 생성 
  async createSubTask(data, tx = prisma) {
    return await tx.subTask.create({
      data: {
        title: data.title,
        endDate: data.endDate,
        status: data.status ?? "PENDING",
        isAlarm: data.isAlarm ?? true,
        taskId: data.taskId,
        ...(Array.isArray(data.assigneeMemberIds) && data.assigneeMemberIds.length > 0
          ? {
              subTaskAssignees: {
                create: data.assigneeMemberIds.map((memberId) => ({ memberId })),
              },
            }
          : {}),
      },
      include: {
        subTaskAssignees: {
          include: {
            member: {
              include: {
                user: {
                  include: {
                    alarmSetting: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  // 세부 과제 수정
  async updateSubTask(id, data, tx) {
    return await tx.subTask.update({
      where: { id },
      data,
      include: {
        subTaskAssignees: {
          include: {
            member: {
              include: {
                user: {
                  include: {
                    alarmSetting: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async replaceSubTaskAssignees(subTaskId, memberIds, tx) {
    if (!tx) {
      return await prisma.$transaction((innerTx) =>
        this.replaceSubTaskAssignees(subTaskId, memberIds, innerTx),
      );
    }
    await tx.subTaskAssignee.deleteMany({ where: { subTaskId } });
    const uniqueMemberIds = Array.isArray(memberIds)
      ? [...new Set(memberIds)]
      : [];
    if (uniqueMemberIds.length === 0) {
      return [];
    }
    const data = uniqueMemberIds.map((memberId) => ({ subTaskId, memberId }));
    await tx.subTaskAssignee.createMany({ data });
    return data;
  }
  
  // 세부 과제 알림 찾기
  async findAlarmBySubTaskId(subTaskId, tx) {
    return await tx.userAlarm.findFirst({
      where: { subTaskId }
    });
  }
  
  // 세부 과제 알림 추가
  async createAlarm(data, tx) {
    return await tx.userAlarm.create({ data });
  }
  
  // 세부 과제 알림 업데이트
  async updateAlarm(id, data, tx) {
    return await tx.userAlarm.update({
      where: { id },
      data
    });
  }
  
  // 세부 과제 알림 삭제
  async deleteAlarm(id, tx) {
    return await tx.userAlarm.delete({
      where: { id }
    });
  }

  // 세부 과제 추가
  async addSubTasks(taskId, subTasks, tx) {
    return await tx.subTask.createMany({
      data: subTasks.map(st => ({ ...st, taskId }))
    });
  }

  // 세부 과제 삭제
  async deleteSubTasksByIds(subTaskIds, tx = prisma) {
    return await tx.subTask.deleteMany({
      where: {
        id: { in: subTaskIds }
      }
    });
  }

  // 세부 과제 전체 삭제
  async deleteAllSubTasksByTaskId(taskId, tx = prisma) {
    return await tx.subTask.deleteMany({
      where: { taskId }
    });
  }

  // task 기준 subTask id 조회
  async findSubTaskIdsByTaskId(taskId, tx = prisma) {
    return await tx.subTask.findMany({
      where: { taskId },
      select: { id: true }
    });
  }

  // 자료 추가
  async addReferences(taskId, refs, tx) {
    return await tx.reference.createMany({
      data: refs.map(r => ({ ...r, taskId }))
    });
  }

  // 커뮤니케이션 추가
  async addCommunications(taskId, comms, tx = prisma) {
  return await tx.communication.createMany({
    data: comms.map(c => ({
      taskId,
      name: c.name,
      url: c.url
    }))
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
    const expiredAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    return await tx.task.update({
      where: { id: taskId },
      data: {
        inviteCode,
        inviteExpiredAt: expiredAt
      },
      select: {
        inviteCode: true,
        inviteExpiredAt: true
      }
    });
  }


  // 멤버 삭제
  async deleteMember(memberId) {
    const deleted = await prisma.member.delete({
      where: {
        id: memberId
      },
    });
    return deleted ? true : false;
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

  // 코드로 과제 찾기
  async findTaskByCode(inviteCode) {
    return await prisma.task.findFirst({
      where: {
        inviteCode: inviteCode,
        type: 'TEAM',
      },
    });
  }
}

export default new TaskRepository();
