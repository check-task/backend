import { Router } from 'express';
import modalController from '../controllers/modal.controller.js';

const router = Router();

//자료
router.post('/data/:taskId', modalController.createReferences);
router.patch('/data/:taskId/:referenceId', modalController.updateReference);
router.delete('/data/:taskId/:referenceId', modalController.deleteReference);

//커뮤니케이션
router.post('/communication/:taskId', modalController.createCommunication);
router.patch('/communication/:taskId/:communicationId', modalController.updateCommunication);
router.delete('/communication/:taskId/:communicationId', modalController.deleteCommunication);

//회의록
router.post('/log/:taskId', modalController.createLog);
router.patch('/log/:taskId/:logId', modalController.updateLog);
router.delete('/log/:taskId/:logId', modalController.deleteLog);

export default router;