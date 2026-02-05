import { Router } from 'express';
import multer from "multer";

import modalController from '../controllers/modal.controller.js';
import authenticate from '../middlewares/authenticate.middleware.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

//자료
router.post('/data/:taskId', authenticate, upload.single("file_url"), modalController.createReferences);
router.post('/data/:taskId', authenticate, modalController.createReferences);

router.patch('/data/:taskId/:referenceId', upload.single("file_url"), authenticate, modalController.updateReference);
router.patch('/data/:taskId/:referenceId', authenticate, modalController.updateReference);

router.delete('/data/:taskId/:referenceId', authenticate, modalController.deleteReference);

//커뮤니케이션
router.post('/communication/:taskId', authenticate, modalController.createCommunication);
router.patch('/communication/:taskId/:communicationId', authenticate, modalController.updateCommunication);
router.delete('/communication/:taskId/:communicationId', authenticate, modalController.deleteCommunication);

//회의록
router.post('/log/:taskId', authenticate, modalController.createLog);
router.patch('/log/:taskId/:logId', authenticate, modalController.updateLog);
router.delete('/log/:taskId/:logId', authenticate, modalController.deleteLog);

export default router;