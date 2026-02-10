import prisma from "../db.config.js";

class ModalRepository {
  async memberCheck(userId, taskId) {
    return prisma.member.findFirst({
      where: { userId, taskId }
    })
  }

  async findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
    });
  }

  // 자료
  async createRefMany(data) {
    return prisma.reference.createMany({
      data,
    })
  }

  async isTask(taskId) {
    return prisma.task.findFirst({
      where: { id: taskId }
    })
  }

  async findRefByTaskId(taskId) {
    return prisma.reference.findMany({
      where: { taskId },
      select: {
        id: true,
        name: true,
        url: true,
        fileUrl: true
      }
    });
  }

  async findReferenceById(referenceId) {
    return prisma.reference.findUnique({
      where: { id: referenceId },
      select: {
        id: true,
        name: true,
        url: true,
        fileUrl: true,
        updatedAt: true
      }
    });
  }

  async updateRef(referenceId, data) {
    return prisma.reference.update({
      where: { id: referenceId },
      data,
    });
  }

  async deleteRef(referenceId) {
    return prisma.reference.delete({
      where: { id: referenceId },
      select: { id: referenceId }
    });
  }

  // 커뮤니케이션
  async createCommu(data) {
    return prisma.communication.create({ data });
  }

  async findCommuByTaskId(taskId) {
    return prisma.communication.findMany({
      where: { taskId },
      select: {
        id: true,
        name: true,
        url: true,
      }
    });
  }

  async findCommuById(id) {
    return prisma.communication.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        url: true,
        updatedAt: true
      }
    });
  }

  async updateCommu(id, data) {
    return prisma.communication.update({ where: { id }, data });
  }

  async deleteCommu(id) {
    return prisma.communication.delete({ where: { id }, select: { id } });
  }

  // 회의록
  async createLog(data) {
    return prisma.log.create({ data });
  }

  async findLogByTaskId(taskId) {
    return prisma.log.findMany({
      where: { taskId },
      orderBy: { id: 'desc' },
      select: {
        id: true,
        date: true,
        agenda: true,
        conclusion: true,
        discussion: true,
      }
    });
  }

  async findLogById(id) {
    return prisma.log.findUnique({
      where: { id },
      select: {
        id: true,
        date: true,
        agenda: true,
        conclusion: true,
        discussion: true,
      }
    });
  }

  async updateLog(logId, data) {
    return prisma.log.update({ where: { id: logId }, data });
  }

  async deleteLog(id) {
    return prisma.log.delete({ where: { id }, select: { id } });
  }
}

export default new ModalRepository();