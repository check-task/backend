import { BadRequestError } from "../errors/custom.error.js";

export class FolderDto {
  // 1. 요청 데이터를 DTO로 변환
  static bodyToFolderDto(body) {
    if (!body.folderTitle || body.folderTitle.trim() === "") {
      throw new BadRequestError("INVALID_INPUT_VALUE", "폴더 이름은 필수입니다.");
    }

    if (body.folderTitle.length > 11) {
      throw new BadRequestError("INVALID_FOLDER_TITLE", "폴더 이름은 최대 11자까지만 가능합니다.");
    }

    if (!body.color || body.color.trim() === "") {
      throw new BadRequestError("COLOR_REQUIRED", "색상은 필수 선택 사항입니다.");
    }

    const trimmedColor = body.color.trim();
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;

    // 7자리(# 포함) Hex 코드가 아니면 에러
    if (!colorRegex.test(trimmedColor)) {
      throw new BadRequestError("INVALID_COLOR", "색상은 #을 포함한 7자리 Hex 코드여야 합니다.");
    }

    return {
      folderTitle: body.folderTitle.trim(),
      color: trimmedColor, // 검증 통과한 색상 그대로 반환
    };
  }

  // 2. 수정용 (값이 있을 때만 검사)
  static updateBodyToFolderDto(body) {
    const updateData = {};

    // 제목이 존재하고, 공백이 아닐 때만 업데이트 목록에 추가
    if (body.folderTitle && body.folderTitle.trim() !== "") {
      if (body.folderTitle.trim().length > 11) {
        throw new BadRequestError("INVALID_FOLDER_TITLE", "폴더 이름은 최대 11자까지만 가능합니다.");
      }
      updateData.folderTitle = body.folderTitle.trim();
    }

    // 색상이 존재하고, 공백이 아닐 때만 업데이트 목록에 추가
    if (body.color && body.color.trim() !== "") {
      const trimmedColor = body.color.trim();
      const colorRegex = /^#[0-9A-Fa-f]{6}$/;
      if (!colorRegex.test(trimmedColor)) {
        throw new BadRequestError("INVALID_COLOR", "색상은 #을 포함한 7자리 Hex 코드여야 합니다.");
      }
      updateData.color = trimmedColor;
    }

    return updateData;
  }

  // 2. DB 데이터를 응답 데이터로 변환
  static responseFromFolder(folder) {
    return {
      folderId: folder.id,
      userId: folder.userId,
      folderTitle: folder.folderTitle,
      color: folder.color      
    };
  }
}