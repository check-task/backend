import folderService from "../services/folder.service.js";
import { BadRequestError } from "../errors/custom.error.js";

class FolderController {
  constructor() {
    this.folderService = folderService;
  }

  // 1. 폴더 생성
  createFolder = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await folderService.createFolder(userId, req.body);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "폴더 생성 성공",
        data: result,
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
      const result = await folderService.updateFolder(
        userId,
        folderId,
        req.body,
      );

      res.status(200).json({
        resultType: "SUCCESS",
        message: "폴더 수정 성공",
        data: result,
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
      const { moveTasks } = req.query; 
      const isMoveTasks = moveTasks === 'true';

      await folderService.deleteFolder(userId, folderId, isMoveTasks);

      res.status(200).json({
        resultType: "SUCCESS",
        message: isMoveTasks ? "과제 이동 및 폴더 삭제 성공" : "폴더 삭제 성공",
      });
    } catch (err) {
      next(err);
    }
  };

  updateFolderPriority = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { orderedFolders } = req.body; 

      await folderService.updateFolderPriority(userId, orderedFolders);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "폴더 순서가 일괄 변경되었습니다.",
        data: null,
      });
    } catch (err) {
      next(err);
    }
  }

  // 4. 폴더 상세 페이지 조회
  getFolderDetail = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const folderIds = req.params.folderId
        .split(',')
        .map(id => parseInt(id.trim(), 10))
        .filter(id => !isNaN(id));

        if (folderIds.length === 0) {
        throw new BadRequestError(
          "VALIDATION_ERROR", 
          "유효한 폴더 ID가 제공되지 않았습니다."
        );
      }

      const result = await folderService.getFolderDetail(userId, folderIds);

      res.status(200).json({
        resultType: "SUCCESS",
        message: "폴더 상세 정보 및 과제 목록 조회 성공",
        data: result,
      });
    } catch (err) {
      next(err);
    }
  };
};

export const folderController = new FolderController();
