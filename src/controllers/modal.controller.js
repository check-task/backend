import {
  CreateReferenceDto,
  UpdateReferenceDto,
  CreateCommunicationDto,
  UpdateCommunicationDto,
  CreateLogDto,
  UpdateLogDto,
} from "../dtos/modal.dto.js";
import { NotFoundError, BadRequestError } from "../errors/custom.error.js";
import { uploadToS3 } from "../middlewares/upload.middleware.js";
import modalService from "../services/modal.service.js";

class ModalController {
  // 자료
  async createReferences(req, res, next) {
    try {
      const { type } = req.query;
      let items;

      if (type === "file") {
        if (!req.file) {
          throw new NotFoundError("업로드된 파일이 없습니다.");
        }

        const originalName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
        const file_url = await uploadToS3({ ...req.file, originalname: originalName });
        items = [
          {
            name: req.body.name ?? originalName,
            file_name: originalName,
            file_url,
          },
        ];
      }

      if (type === "url") {
        if (!req.body.url) {
          throw new BadRequestError("url은 필수입니다.");
        }

        items = [
          {
            name: req.body.name,
            url: req.body.url,
          },
        ];
      }

      const dto = new CreateReferenceDto({
        taskId: req.params.taskId,
        userId: req.user.id,
        type,
        items,
      });

      const data = await modalService.createReferences(dto);
      return res.success(data, "자료 생성 성공");
    } catch (err) {
      next(err);
    }
  }

  async updateReference(req, res, next) {
    try {
      //S3 업로드 후 URL을 전달하도록 변경
      let fileUrl = req.body.file_url ?? undefined;
      let fileName = req.body.file_name ?? undefined;
      
      if (req.file) {
        fileUrl = await uploadToS3(req.file);
        fileName = req.file.originalname;
      }
      const dto = new UpdateReferenceDto({
        taskId: req.params.taskId,
        referenceId: req.params.referenceId,
        userId: req.user.id,
        ...req.body,
        file_url: fileUrl,
        file_name: fileName,
      });

      const data = await modalService.updateReference(dto);
      return res.success(data, "자료 수정 성공");
    } catch (err) {
      next(err);
    }
  }

  async deleteReference(req, res, next) {
    try {
      const data = await modalService.deleteReference({
        taskId: req.params.taskId,
        referenceId: req.params.referenceId,
        userId: req.user.id,
      });

      return res.success(data, "자료 삭제 성공");
    } catch (err) {
      next(err);
    }
  }

  // 커뮤니케이션
  async createCommunication(req, res, next) {
    try {
      const dto = new CreateCommunicationDto({
        taskId: req.params.taskId,
        userId: req.user.id,
        name: req.body.name,
        url: req.body.url,
      });

      const data = await modalService.createCommunication(dto);
      return res.success(data, "커뮤니케이션 생성 성공");
    } catch (err) {
      next(err);
    }
  }

  async updateCommunication(req, res, next) {
    try {
      const dto = new UpdateCommunicationDto({
        taskId: req.params.taskId,
        communicationId: req.params.communicationId,
        userId: req.user.id,
        ...req.body,
      });

      const data = await modalService.updateCommunication(dto);
      return res.success(data, "커뮤니케이션 수정 성공");
    } catch (err) {
      next(err);
    }
  }

  async deleteCommunication(req, res, next) {
    try {
      const data = await modalService.deleteCommunication({
        taskId: req.params.taskId,
        communicationId: req.params.communicationId,
        userId: req.user.id,
      });

      return res.success(data, "커뮤니케이션 삭제 성공");
    } catch (err) {
      next(err);
    }
  }

  // 회의록
  async createLog(req, res, next) {
    try {
      const dto = new CreateLogDto({
        taskId: req.params.taskId,
        userId: req.user.id,
        date: new Date(req.body.date),
        agenda: req.body.agenda,
        conclusion: req.body.conclusion,
        discussion: req.body.discussion,
      });

      const data = await modalService.createLog(dto);
      return res.success(data, "회의록 생성 성공");
    } catch (err) {
      next(err);
    }
  }

  async updateLog(req, res, next) {
    try {
      const dto = new UpdateLogDto({
        taskId: req.params.taskId,
        logId: req.params.logId,
        userId: req.user.id,
        ...req.body,
        ...(req.body.date && { date: new Date(req.body.date) }),
      });

      const data = await modalService.updateLog(dto);
      return res.success(data, "회의록 수정 성공");
    } catch (err) {
      next(err);
    }
  }

  async deleteLog(req, res, next) {
    try {
      const data = await modalService.deleteLog({
        taskId: req.params.taskId,
        logId: req.params.logId,
        userId: req.user.id,
      });

      return res.success(data, "회의록 삭제 성공");
    } catch (err) {
      next(err);
    }
  }
}

export default new ModalController();
