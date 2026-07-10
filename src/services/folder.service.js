import { folderRepository } from "../repositories/folder.repository.js";
import { FolderDto } from "../dtos/folder.dto.js";
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
  BadRequestError,
} from "../errors/custom.error.js";

class FolderService {
  // 1. 폴더 생성
  async createFolder(userId, body) {
    const currentCount = await folderRepository.countByUserId(userId);
    if (currentCount >= 6) {
      throw new BadRequestError(
        "MAX_FOLDER_LIMIT",
        "폴더는 최대 6개까지만 생성할 수 있습니다.",
      );
    }

    const folderData = FolderDto.bodyToFolderDto(body);

    const duplicateNameFolder = await folderRepository.findByUserAndTitle(
      userId,
      folderData.folderTitle,
    );
    if (duplicateNameFolder) {
      throw new BadRequestError(
        "DUPLICATE_NAME",
        "이미 존재하는 폴더 이름입니다.",
      );
    }

    const duplicateColorFolder = await folderRepository.findByUserAndColor(
      userId,
      folderData.color,
    );
    if (duplicateColorFolder) {
      throw new BadRequestError(
        "DUPLICATE_COLOR",
        "이미 사용 중인 색상입니다. 다른 색상을 선택해주세요.",
      );
    }

    const newFolder = await folderRepository.addFolder(userId, folderData);
    return FolderDto.responseFromFolder(newFolder);
  }

  // 2. 폴더 수정
  async updateFolder(userId, folderId, body) {
    // (1) 폴더 존재 및 권한 확인
    const folder = await folderRepository.getFolderById(folderId);
    if (!folder)
      throw new NotFoundError(
        "FOLDER_NOT_FOUND",
        "해당 폴더를 찾을 수 없습니다.",
      );
    if (folder.userId !== userId)
      throw new ForbiddenError("FORBIDDEN", "수정 권한이 없습니다.");

    if (folder.folderTitle === "지정안함") {
    throw new BadRequestError(
      "PROTECTED_FOLDER",
      "'지정안함' 폴더는 수정할 수 없습니다."
    );
  }

    const updateData = FolderDto.updateBodyToFolderDto(body);

    if (Object.keys(updateData).length === 0) {
      return FolderDto.responseFromFolder(folder);
    }

    // 이름이 변경되는 경우, 중복 이름 확인
    if (
      updateData.folderTitle &&
      updateData.folderTitle !== folder.folderTitle
    ) {
      const duplicateNameFolder = await folderRepository.findByUserAndTitle(
        userId,
        updateData.folderTitle,
      );
      if (duplicateNameFolder) {
        throw new BadRequestError(
          "DUPLICATE_NAME",
          "이미 존재하는 폴더 이름입니다.",
        );
      }
    }

    // (4) 색상이 변경되는 경우에만 중복 체크
    if (updateData.color && updateData.color !== folder.color) {
      const duplicateColorFolder = await folderRepository.findByUserAndColor(
        userId,
        updateData.color,
      );

      // 내 폴더가 아닌 다른 폴더가 이미 그 색상을 쓰고 있다면 에러
      if (duplicateColorFolder) {
        throw new BadRequestError(
          "DUPLICATE_COLOR",
          "이미 사용 중인 색상입니다.",
        );
      }
    }

    const updatedFolder = await folderRepository.updateFolder(
      userId,
      folderId,
      updateData,
    );
    return FolderDto.responseFromFolder(updatedFolder);
  }

  // 3. 폴더 삭제
  async deleteFolder(userId, folderId, isMoveTasks = false) {
    const folder = await folderRepository.getFolderById(folderId);
    if (!folder)
      throw new NotFoundError(
        "FOLDER_NOT_FOUND",
        "해당 폴더를 찾을 수 없습니다.",
      );
    if (folder.userId !== userId)
      throw new ForbiddenError("FORBIDDEN", "삭제 권한이 없습니다.");

    if (folder.folderTitle === "지정안함") {
    throw new BadRequestError(
      "PROTECTED_FOLDER",
      "'지정안함' 폴더는 삭제할 수 없습니다."
    );
  }

    const assignedTaskCount = await folderRepository.countAssignedTasksByFolderId(folderId);
    if (assignedTaskCount > 0) {
      if (!isMoveTasks) {
        throw new BadRequestError(
          "FOLDER_NOT_EMPTY",
          "폴더 내부에 과제(완료된 과제 포함)가 존재하여 삭제할 수 없습니다."
        );
        } else {
        const defaultFolder = await folderRepository.findByUserAndTitle(userId, "지정안함");
        
        if (!defaultFolder) {
          throw new InternalServerError(
            "DEFAULT_FOLDER_NOT_FOUND",
            "'지정안함' 기본 폴더를 찾을 수 없어 과제를 이동할 수 없습니다."
          );
        }
        await folderRepository.moveTasksToFolder(userId, folderId, defaultFolder.id);
      }
    }

    await folderRepository.removeFolder(userId, folderId);
  }

  // 4. 폴더 순서 업데이트
  async updateFolderPriority(userId, orderedFolders) {
    if (!orderedFolders || !Array.isArray(orderedFolders)) {
      throw new BadRequestError(
        "INVALID_DATA",
        "순서 변경 데이터가 올바르지 않습니다."
      );
    }

    await folderRepository.updateFolderPriority(userId, orderedFolders);
  }

  // 5. 폴더 상세 조회
  async getFolderDetail(userId, folderIds) {
    const result = await folderRepository.getFolderDetailTasks(userId, folderIds);

    if (!result || result.length === 0) {
      throw new NotFoundError(
        "FOLDER_NOT_FOUND",
        "해당 폴더를 찾을 수 없거나 접근 권한이 없습니다."
      );
    }

    return result;
  }
}

export default new FolderService();
