import { folderRepository } from "../repositories/folder.repository.js";
import { FolderDto } from "../dtos/folder.dto.js";
import { NotFoundError, ForbiddenError, InternalServerError, BadRequestError } from "../errors/custom.error.js";

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
      // 검증을 위해 getFolderById 사용 (Repository에 남아있어야 함)
      const folder = await folderRepository.getFolderById(folderId);

      if (!folder) {
        throw new NotFoundError("FOLDER_NOT_FOUND", "해당 폴더를 찾을 수 없습니다.");
      }

      if (folder.userId !== userId) {
        throw new ForbiddenError("FORBIDDEN", "수정 권한이 없습니다.");
      }

      const updateData = {};
      
      if (body.folderTitle && body.folderTitle.trim() !== "") {
        const trimmedTitle = body.folderTitle.trim();
        
        if (trimmedTitle.length > 11) {
          throw new BadRequestError("INVALID_LENGTH", "폴더 이름은 공백 포함 11자 이내여야 합니다.");
        }
        updateData.folderTitle = trimmedTitle;
      }
      
      if (body.color && body.color.trim() !== "") {
        const trimmedColor = body.color.trim();
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;

        if (!colorRegex.test(trimmedColor)) {
          throw new BadRequestError("INVALID_COLOR", "색상은 #을 포함한 7자리 Hex 코드여야 합니다.");
        }
        updateData.color = trimmedColor;
      }

      if (Object.keys(updateData).length === 0) {
        return FolderDto.responseFromFolder(folder);
      }

      // 3. DB 업데이트
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
      throw new ForbiddenError("FORBIDDEN", "삭제 권한이 없습니다.");
    }

    await folderRepository.removeFolder(userId, folderId);
    return;
  }
}

export const folderService = new FolderService();