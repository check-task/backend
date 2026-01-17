import { BadRequestError } from '../errors/custom.error.js';

// 자료
export class CreateReferenceDto {
  constructor({ taskId, userId, type, items }) {
    this.taskId = taskId;
    this.userId = userId;
    this.type = type;
    this.items = items;

    this.validate();
  }

  validate() {
    if (!this.taskId || isNaN(this.taskId)) {
      throw new BadRequestError('taskId가 올바르지 않습니다.');
    }

    if (!this.userId) {
      throw new BadRequestError('userId가 필요합니다.');
    }

    if (!['url', 'file'].includes(this.type)) {
      throw new BadRequestError('type이 올바르지 않습니다.');
    }

    if (!Array.isArray(this.items) || this.items.length === 0) {
      throw new BadRequestError('items는 필수입니다.');
    }

    for (const item of this.items) {
      if (!item.name) {
        throw new BadRequestError('name은 필수입니다.');
      }

      if (this.type === 'url' && !item.url) {
        throw new BadRequestError('url은 필수입니다.');
      }

      if (this.type === 'file' && !item.file_url) {
        throw new BadRequestError('file_url은 필수입니다.');
      }
    }
  }
}

export class UpdateReferenceDto {
  constructor({ taskId, referenceId, userId, name, url, file_url }) {
    this.taskId = taskId;
    this.referenceId = referenceId;
    this.userId = userId;
    this.name = name;
    this.url = url;
    this.fileUrl = file_url;

    this.validate();
  }

  validate() {
    if (!this.taskId || isNaN(this.taskId)) {
      throw new BadRequestError('taskId가 올바르지 않습니다.');
    }

    if (!this.referenceId || isNaN(this.referenceId)) {
      throw new BadRequestError('referenceId가 올바르지 않습니다.');
    }

    if (!this.userId) {
      throw new BadRequestError('userId가 필요합니다.');
    }

    if (!this.name && !this.url && !this.fileUrl) {
      throw new BadRequestError('수정할 값이 없습니다.');
    }
  }
}

// 커뮤니케이션
export class CreateCommunicationDto {
    constructor({ taskId, userId, name, url }) {
      this.taskId = taskId;
      this.userId = userId;
      this.name = name;
      this.url = url;
  
      this.validate();
    }
  
    validate() {
      if (!this.taskId || isNaN(this.taskId)) {
        throw new BadRequestError('taskId가 올바르지 않습니다.');
      }
      if (!this.userId) {
        throw new BadRequestError('userId가 필요합니다.');
      }
      if (!this.name) {
        throw new BadRequestError('name은 필수입니다.');
      }
      if (!this.url) {
        throw new BadRequestError('url은 필수입니다.');
      }
    }
}

export class UpdateCommunicationDto {
    constructor({ taskId, communicationId, userId, name, url }) {
      this.taskId = taskId;
      this.communicationId = communicationId;
      this.userId = userId;
      this.name = name;
      this.url = url;
  
      this.validate();
    }
  
    validate() {
      if (!this.taskId || isNaN(this.taskId)) {
        throw new BadRequestError('taskId가 올바르지 않습니다.');
      }
      if (!this.communicationId || isNaN(this.communicationId)) {
        throw new BadRequestError('communicationId가 올바르지 않습니다.');
      }
      if (!this.userId) {
        throw new BadRequestError('userId가 필요합니다.');
      }
      if (!this.name && !this.url) {
        throw new BadRequestError('수정할 값이 없습니다.');
      }
    }
}