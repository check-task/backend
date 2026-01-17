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

// 회의록
export class CreateLogDto {
    constructor({ taskId, userId, date, agenda, conclusion, discussion }) {
      this.taskId = taskId;
      this.userId = userId;
      this.date = date;
      this.agenda = agenda || null;
      this.conclusion = conclusion || null;
      this.discussion = discussion || null;
  
      this.validate();
    }
  
    validate() {
      if (!this.taskId || isNaN(this.taskId)) {
        throw new BadRequestError('taskId가 올바르지 않습니다.');
      }
      if (!this.userId) {
        throw new BadRequestError('userId가 필요합니다.');
      }
      if (!this.date) {
        throw new BadRequestError('회의 일자(date)가 필요합니다.');
      }
      // YYYY.MM.DD 형식 체크
      if (!/^\d{4}\.\d{2}\.\d{2}$/.test(this.date)) {
        throw new BadRequestError('회의 일자 형식이 올바르지 않습니다. (YYYY.MM.DD)');
      }
    }
}

export class UpdateLogDto {
    constructor({ taskId, logId, userId, date, agenda, conclusion, discussion }) {
      this.taskId = taskId;
      this.logId = logId;
      this.userId = userId;
      this.date = date;
      this.agenda = agenda;
      this.conclusion = conclusion;
      this.discussion = discussion;
  
      this.validate();
    }
  
    validate() {
      if (!this.taskId || isNaN(this.taskId)) {
        throw new BadRequestError('taskId가 올바르지 않습니다.');
      }
      if (!this.logId || isNaN(this.logId)) {
        throw new BadRequestError('logId가 올바르지 않습니다.');
      }
      if (!this.userId) {
        throw new BadRequestError('userId가 필요합니다.');
      }
      if (!this.date && !this.agenda && !this.conclusion && !this.discussion) {
        throw new BadRequestError('수정할 값이 없습니다.');
      }
      if (this.date && !/^\d{4}\.\d{2}\.\d{2}$/.test(this.date)) {
        throw new BadRequestError('회의 일자 형식이 올바르지 않습니다. (YYYY.MM.DD)');
      }
    }
}