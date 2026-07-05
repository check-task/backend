import express from "express";

import { folderController } from "../controllers/folder.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  createFolderSchema,
  updateFolderSchema,
  deleteFolderSchema,
} from "../validators/folder.schema.js";

const router = express.Router();

router.post("/", authenticate, validate(createFolderSchema), folderController.createFolder);
router.patch("/priority", authenticate, folderController.updateFolderPriority);
router.patch("/:folderId", authenticate, validate(updateFolderSchema), folderController.updateFolder);
router.delete("/:folderId", authenticate, validate(deleteFolderSchema), folderController.deleteFolder);
router.get("/:folderId", authenticate, folderController.getFolderDetail);

export default router;
