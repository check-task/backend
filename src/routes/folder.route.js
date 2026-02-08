import express from "express";
import { folderController } from "../controllers/folder.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = express.Router();

router.get("/", authenticate, folderController.getFolder);
router.post("/", authenticate, folderController.createFolder);
router.patch("/:folderId", authenticate, folderController.updateFolder);
router.delete("/:folderId", authenticate, folderController.deleteFolder);

export default router;