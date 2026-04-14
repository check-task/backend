import {
  CreateReferenceDto,
  UpdateReferenceDto,
  CreateCommunicationDto,
  UpdateCommunicationDto,
  CreateLogDto,
  UpdateLogDto,
} from "../dtos/modal.dto.js";
import { BadRequestError } from "../errors/custom.error.js";

class ModalHelper {
  // 자료
  buildCreateReferenceDto({ taskId, userId, type, item }) {
    if (!taskId) throw new BadRequestError("taskId 필요");
    if (!type) throw new BadRequestError("type 필요");
    if (!item) throw new BadRequestError("item 필요");

    return new CreateReferenceDto({
      taskId: Number(taskId),
      userId,
      type,
      items: [item],
    });
  }

  buildUpdateReferenceDto({
      taskId,
      referenceId,
      userId,
      name,
      url,
      file_url,
  }) {
    return new UpdateReferenceDto({
      taskId: Number(taskId),
      referenceId: Number(referenceId),
      userId,
      name,
      url,
      file_url,
    });
  }

    // 커뮤니케이션
    buildCreateCommunicationDto({ taskId, userId, name, url }) {
      return new CreateCommunicationDto({
        taskId: Number(taskId),
        userId,
        name,
        url,
      });
    }

    buildUpdateCommunicationDto({
      taskId,
      communicationId,
      userId,
      name,
      url,
    }) {
      return new UpdateCommunicationDto({
        taskId: Number(taskId),
        communicationId: Number(communicationId),
        userId,
        name,
        url,
      });
    }

    // 회의록
    buildCreateLogDto({
      taskId,
      userId,
      date,
      agenda,
      conclusion,
      discussion,
    }) {
      return new CreateLogDto({
        taskId: Number(taskId),
        userId,
        date: new Date(date),
        agenda: agenda || null,
        conclusion: conclusion || null,
        discussion: discussion || null,
      });
    }

    buildUpdateLogDto({ taskId, logId, userId, date, agenda, conclusion, discussion, }) {
      return new UpdateLogDto({
        taskId: Number(taskId),
        logId: Number(logId),
        userId,
        ...(date && { date: new Date(date) }),
        agenda,
        conclusion,
        discussion,
      });
  }
}

export default new ModalHelper();