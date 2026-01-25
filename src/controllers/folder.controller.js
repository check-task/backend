import { folderService } from "../services/folder.service.js";

class FolderController {
  // 1. 폴더 생성
  createFolder = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await folderService.createFolder(userId, req.body);
      
      res.status(201).json({ 
        resultType: "SUCCESS", 
        message: "폴더 생성 성공",
        data: result 
      });
    } catch (err) {
      next(err);
    }
  };

  // 2. 폴더 수정
  updateFolder = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { folderId } = req.params;
      const result = await folderService.updateFolder(userId, folderId, req.body);
      
      res.status(200).json({ 
        resultType: "SUCCESS",
        message: "폴더 수정 성공",
        data: result 
      });
    } catch (err) {
      next(err);
    }
  };

  // 3. 폴더 삭제
  deleteFolder = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { folderId } = req.params;
      
      await folderService.deleteFolder(userId, folderId);
      
      res.status(200).json({ 
        resultType: "SUCCESS", 
        message: "폴더 삭제 성공" 
      });
    } catch (err) {
      next(err);
    }
  };
}

export const folderController = new FolderController();