import prisma from "../db.config.js";

class ModalRepository {
  async memberCheck(userId, taskId) {
    return prisma.member.findUnique({
      where: { userId_taskId: { userId, taskId } },
    })
  }

  // 자료
  async createRefMany(data) {
    return prisma.reference.createMany({
      data,
    })
  }

  async findRefByTaskId(taskId) {
    return prisma.reference.findMany({
      where: { taskId },
    });
  }

  async findReferenceById(referenceId) {
    return prisma.reference.findUnique({
      where: { id: referenceId },
    });
  }

  async findTaskById(taskId) {
    return prisma.task.findUnique({
      where: { id: taskId },
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
    });
  }

  // 커뮤니케이션
  async createCommu(data) {
    return prisma.communication.create({ data });
  }

  async findCommuByTaskId(taskId) {
    return prisma.communication.findMany({
      where: { taskId },
    });
  }

  async findCommuById(id) {
    return prisma.communication.findUnique({ where: { id } });
  }

  async updateCommu(id, data) {
    return prisma.communication.update({ where: { id }, data });
  }

  async deleteCommu(id) {
    return prisma.communication.delete({ where: { id } });
  }

  // 회의록
  async createLog(data) {
    return prisma.log.create({ data });
  }

  async findLogByTaskId(taskId) {
    return prisma.log.findMany({
      where: { taskId },
      orderBy: { id: 'desc' },
    });
  }

  async findLogById(id) {
    return prisma.log.findUnique({ where: { id } });
  }

  async updateLog(id, data) {
    return prisma.log.update({ where: { id }, data });
  }

  async deleteLog(id) {
    return prisma.log.delete({ where: { id } });
  }
}

export default new ModalRepository();