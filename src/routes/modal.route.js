import { Router } from "express";
import multer from "multer";

import modalController from "../controllers/modal.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createReferenceSchema,
  updateReferenceSchema,
  deleteReferenceSchema,
  createCommunicationSchema,
  updateCommunicationSchema,
  deleteCommunicationSchema,
  createLogSchema,
  updateLogSchema,
  deleteLogSchema,
} from "../validators/modal.schema.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// ─── 자료 ─────────────────────────────────────────────────────────
router.post(
  "/data/:taskId",
  authenticate,
  upload.single("file_url"),
  validate(createReferenceSchema),
  modalController.createReferences
);

router.patch(
  "/data/:taskId/:referenceId",
  authenticate,
  upload.single("file_url"),
  validate(updateReferenceSchema),
  modalController.updateReference
);

router.delete(
  "/data/:taskId/:referenceId",
  authenticate,
  validate(deleteReferenceSchema),
  modalController.deleteReference
);

// ─── 커뮤니케이션 ─────────────────────────────────────────────────
router.post(
  "/communication/:taskId",
  authenticate,
  validate(createCommunicationSchema),
  modalController.createCommunication
);

router.patch(
  "/communication/:taskId/:communicationId",
  authenticate,
  validate(updateCommunicationSchema),
  modalController.updateCommunication
);

router.delete(
  "/communication/:taskId/:communicationId",
  authenticate,
  validate(deleteCommunicationSchema),
  modalController.deleteCommunication
);

// ─── 회의록 ───────────────────────────────────────────────────────
router.post("/log/:taskId", authenticate, validate(createLogSchema), modalController.createLog);

router.patch(
  "/log/:taskId/:logId",
  authenticate,
  validate(updateLogSchema),
  modalController.updateLog
);

router.delete(
  "/log/:taskId/:logId",
  authenticate,
  validate(deleteLogSchema),
  modalController.deleteLog
);

export default router;
