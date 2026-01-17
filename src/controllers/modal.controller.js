import { stateHandler } from '../middlewares/state.middleware.js';

import modalService from '../services/modal.service.js';

class ModalController {
    // 자료
    async createReferences(req, res, next) {
      try {
        const dto = new CreateReferenceDto({
            taskId: Number(req.params.taskId),
            //userId: req.user.id,
            userId: req.body.userId,
            type: req.query.type,
            items: req.body.items,
        });
  
        const data = await modalService.createReferences(dto);
        return stateHandler(res, '자료 생성 성공', data)
      } catch (err) {
        next(err)
      }
    }

    async updateReference(req, res, next) {
        try {
          const dto = new UpdateReferenceDto({
            taskId: Number(req.params.taskId),
            referenceId: Number(req.params.referenceId),
            userId: req.user.id,
            ...req.body,
          });
    
          const data = await modalService.updateReference(dto);
          return stateHandler(res, '자료 수정 성공', data);
        } catch (err) {
          next(err);
        }
    }

    async deleteReference(req, res, next) {
        try {
          const data = await modalService.deleteReference({
            taskId: Number(req.params.taskId),
            referenceId: Number(req.params.referenceId),
            userId: req.user.id,
          });
    
          return stateHandler(res, '자료 삭제 성공', data);
        } catch (err) {
          next(err);
        }
    }

    // 커뮤니케이션
    async createCommunication(req, res, next) {
        try {
          const dto = new CreateCommunicationDto({
            taskId: Number(req.params.taskId),
            userId: req.body.userId,
            name: req.body.name,
            url: req.body.url,
          });
    
          const data = await communicationService.createCommunication(dto);
          return stateHandler(res, '커뮤니케이션 생성 성공', data);
        } catch (err) {
          next(err);
        }
    }
    
    async updateCommunication(req, res, next) {
        try {
          const dto = new UpdateCommunicationDto({
            taskId: Number(req.params.taskId),
            communicationId: Number(req.params.communicationId),
            userId: req.body.userId,
            ...req.body,
          });
    
          const data = await communicationService.updateCommunication(dto);
          return stateHandler(res, '커뮤니케이션 수정 성공', data);
        } catch (err) {
          next(err);
        }
    }
    
    async deleteCommunication(req, res, next) {
        try {
          const data = await communicationService.deleteCommunication({
            taskId: Number(req.params.taskId),
            communicationId: Number(req.params.communicationId),
            userId: req.body.userId,
          });
    
          return stateHandler(res, '커뮤니케이션 삭제 성공', data);
        } catch (err) {
          next(err);
        }
    }
    
    // 회의록
    async createLog(req, res, next) {
        try {
          const dto = new CreateLogDto({
            taskId: Number(req.params.taskId),
            userId: req.body.userId,
            date: req.body.date,
            agenda: req.body.agenda,
            conclusion: req.body.conclusion,
            discussion: req.body.discussion,
          });
    
          const data = await logService.createLog(dto);
          return stateHandler(res, '회의록 생성 성공', data);
        } catch (err) {
          next(err);
        }
    }
    
    async updateLog(req, res, next) {
        try {
          const dto = new UpdateLogDto({
            taskId: Number(req.params.taskId),
            logId: Number(req.params.logId),
            userId: req.body.userId,
            ...req.body,
          });
    
          const data = await logService.updateLog(dto);
          return stateHandler(res, '회의록 수정 성공', data);
        } catch (err) {
          next(err);
        }
    }
    
    async deleteLog(req, res, next) {
        try {
          const data = await logService.deleteLog({
            taskId: Number(req.params.taskId),
            logId: Number(req.params.logId),
            userId: req.body.userId,
          });
    
          return stateHandler(res, '회의록 삭제 성공', data);
        } catch (err) {
          next(err);
        }
    }
}

export default new ModalController();