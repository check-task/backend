import modalRepository from '../repositories/modal.repository.js';

import { UnauthorizedError, NotFoundError } from '../errors/custom.error.js';

class ModalService {
  // 자료
  async createReferences(dto) {
    const { taskId, userId, type, items } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) { throw new UnauthorizedError('권한이 없습니다.') }

    const data = items.map(item => ({
      taskId,
      name: item.name,
      url: type === 'url' ? item.url : null,
      fileUrl: type === 'file' ? item.file_url : null,
    }))

    modalRepository.createRefMany(data);

    const references = await modalRepository.findRefByTaskId(taskId);
    return references;
  }

  async updateReference(dto) {
    const { taskId, referenceId, userId, name, url, fileUrl } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const reference = await modalRepository.findReferenceById(referenceId);
    if (!reference || reference.taskId !== taskId) {
      throw new NotFoundError('자료가 존재하지 않습니다.');
    }

    modalRepository.updateRef(referenceId, {
      ...(name && { name }),
      ...(url && { url, fileUrl: null }),
      ...(fileUrl && { fileUrl, url: null }),
    });

    const updatedReference = await modalRepository.findReferenceById(referenceId);
    return updatedReference;
  }

  async deleteReference({ taskId, referenceId, userId }) {
    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const reference = await modalRepository.findReferenceById(referenceId);
    if (!reference || reference.taskId !== taskId) {
      throw new NotFoundError('자료가 존재하지 않습니다.');
    }

    return modalRepository.deleteRef(referenceId);
  }
  
  // 커뮤니케이션
  async createCommunication(dto) {
    const { taskId, userId, name, url } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    await modalRepository.createCommu({ taskId, name, url });
    return modalRepository.findCommuByTaskId(taskId);
  }

  async updateCommunication(dto) {
    const { taskId, communicationId, userId, name, url } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const communication = await modalRepository.findCommuById(communicationId);
    if (!communication || communication.taskId !== taskId) {
      throw new NotFoundError('커뮤니케이션이 존재하지 않습니다.');
    }

    await modalRepository.updateCommu(communicationId, { ...(name && { name }), ...(url && { url }) });
    return modalRepository.findCommuByTaskId(taskId);
  }

  async deleteCommunication({ taskId, communicationId, userId }) {
    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const communication = await modalRepository.findCommuById(communicationId);
    if (!communication || communication.taskId !== taskId) {
      throw new NotFoundError('커뮤니케이션이 존재하지 않습니다.');
    }

    return modalRepository.deleteCommu(referenceId);
  }

  // 회의록
  async createLog(dto) {
    const { taskId, userId, date, agenda, conclusion, discussion } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    await modalRepository.createLog({ taskId, date, agenda, conclusion, discussion });
    return modalRepository.findLogByTaskId(taskId);
  }

  async updateLog(dto) {
    const { taskId, logId, userId, date, agenda, conclusion, discussion } = dto;

    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const log = await modalRepository.findLogById(logId);
    if (!log || log.taskId !== taskId) throw new NotFoundError('회의록이 존재하지 않습니다.');

    await modalRepository.updateLog(logId, { ...(date && { date }), ...(agenda && { agenda }), ...(conclusion && { conclusion }), ...(discussion && { discussion }) });
    return modalRepository.findLogByTaskId(taskId);
  }

  async deleteLog({ taskId, logId, userId }) {
    const member = await modalRepository.memberCheck(userId, taskId);
    if (!member) throw new UnauthorizedError('권한이 없습니다.');

    const log = await modalRepository.findLogById(logId);
    if (!log || log.taskId !== taskId) throw new NotFoundError('회의록이 존재하지 않습니다.');

    return modalRepository.deleteLog(logId);
  }
}

export default new ModalService();