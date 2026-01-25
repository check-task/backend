import { folderRepository } from "../repositories/folder.repository.js";
import { FolderDto } from "../dtos/folder.dto.js";
import { NotFoundError, ForbiddenError, InternalServerError } from "../errors/custom.error.js";

class FolderService {
  // 1. 폴더 생성
  async createFolder(userId, body) {
    const folderData = FolderDto.bodyToFolderDto(body);
    
    const newFolder = await folderRepository.addFolder(userId, folderData);
    
    return FolderDto.responseFromFolder(newFolder);
  }

  // 2. 폴더 수정
  async updateFolder(userId, folderId, body) {
    try {
      const folder = await folderRepository.getFolderById(folderId);

      if (!folder) {
        throw new NotFoundError("FOLDER_NOT_FOUND", "해당 폴더를 찾을 수 없습니다.");
      }

      if (folder.userId !== userId) {
        throw new ForbiddenError("PERMISSION_DENIED", "수정 권한이 없습니다.");
      }

      const updateData = {};
      
      if (body.folderTitle) {
        updateData.folderTitle = body.folderTitle;
      }
      
      if (body.color) {
        updateData.color = body.color;
      }

      if (Object.keys(updateData).length === 0) {
        return FolderDto.responseFromFolder(folder);
      }

      const updatedFolder = await folderRepository.updateFolder(userId, folderId, updateData);
      
      return FolderDto.responseFromFolder(updatedFolder);

    } catch (error) {
      console.error("Error in updateFolder:", error);
      if (error.statusCode) throw error;
      throw new InternalServerError();
    }
  }

  // 3. 폴더 삭제
  async deleteFolder(userId, folderId) {
    const folder = await folderRepository.getFolderById(folderId);

    if (!folder) {
      throw new NotFoundError("FOLDER_NOT_FOUND", "해당 폴더를 찾을 수 없습니다.");
    }

    if (folder.userId !== userId) {
      throw new ForbiddenError("PERMISSION_DENIED", "삭제 권한이 없습니다.");
    }

    await folderRepository.removeFolder(userId, folderId);
    return;
  }
}

export const folderService = new FolderService();