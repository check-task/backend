import { folderRepository } from "../repositories/folder.repository.js";
import { FolderDto } from "../dtos/folder.dto.js";
import { NotFoundError, ForbiddenError, InternalServerError, BadRequestError } from "../errors/custom.error.js";

class FolderService {
  
  // 1. 폴더 생성
  async createFolder(userId, body) {
    const currentCount = await folderRepository.countByUserId(userId);
    if (currentCount >= 5) {
      throw new BadRequestError("MAX_FOLDER_LIMIT", "폴더는 최대 5개까지만 생성할 수 있습니다.");
    }

    const folderData = FolderDto.bodyToFolderDto(body);

    const duplicateColorFolder = await folderRepository.findByUserAndColor(userId, folderData.color);
    if (duplicateColorFolder) {
      throw new BadRequestError("DUPLICATE_COLOR", "이미 사용 중인 색상입니다. 다른 색상을 선택해주세요.");
    }
    
    const newFolder = await folderRepository.addFolder(userId, folderData);
    return FolderDto.responseFromFolder(newFolder);
  }

  // 2. 폴더 수정
  async updateFolder(userId, folderId, body) {
    // (1) 폴더 존재 및 권한 확인
    const folder = await folderRepository.getFolderById(folderId);
    if (!folder) throw new NotFoundError("FOLDER_NOT_FOUND", "해당 폴더를 찾을 수 없습니다.");
    if (folder.userId !== userId) throw new ForbiddenError("FORBIDDEN", "수정 권한이 없습니다.");

    const updateData = FolderDto.updateBodyToFolderDto(body);

    if (Object.keys(updateData).length === 0) {
      return FolderDto.responseFromFolder(folder);
    }

    // (4) 색상이 변경되는 경우에만 중복 체크
    if (updateData.color && updateData.color !== folder.color) {
      const duplicateColorFolder = await folderRepository.findByUserAndColor(userId, updateData.color);
      
      // 내 폴더가 아닌 다른 폴더가 이미 그 색상을 쓰고 있다면 에러
      if (duplicateColorFolder) {
         throw new BadRequestError("DUPLICATE_COLOR", "이미 사용 중인 색상입니다.");
      }
    }

    const updatedFolder = await folderRepository.updateFolder(userId, folderId, updateData);
    return FolderDto.responseFromFolder(updatedFolder);
  }

  // 3. 폴더 삭제
  async deleteFolder(userId, folderId) {
    const folder = await folderRepository.getFolderById(folderId);
    if (!folder) throw new NotFoundError("FOLDER_NOT_FOUND", "해당 폴더를 찾을 수 없습니다.");
    if (folder.userId !== userId) throw new ForbiddenError("FORBIDDEN", "삭제 권한이 없습니다.");

    await folderRepository.removeFolder(userId, folderId);
  }
}

export const folderService = new FolderService();