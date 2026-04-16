import { BadRequestError } from "../errors/custom.error.js";

const ALLOWED_COLORS = [
  "#818892", 
  "#F55757", 
  "#FFC93F", 
  "#6EC77B", 
  "#A177E2", 
  "#081221", 
  "#B5BAC4"
];

export class FolderDto {
  // 1. 요청 데이터를 DTO로 변환
  static bodyToFolderDto(body) {
    if (!body.folderTitle || body.folderTitle.trim() === "") {
      throw new BadRequestError("INVALID_INPUT_VALUE", "폴더 이름은 필수입니다.");
    }

    if (body.folderTitle.length > 10) {
      throw new BadRequestError("INVALID_FOLDER_TITLE", "폴더 이름은 최대 10자까지만 가능합니다.");
    }

    if (!body.color || body.color.trim() === "") {
      throw new BadRequestError("COLOR_REQUIRED", "색상은 필수 선택 사항입니다.");
    }

    const trimmedColor = body.color.trim().toUpperCase();
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;

    if (!ALLOWED_COLORS.includes(trimmedColor)) {
      throw new BadRequestError("INVALID_COLOR", "허용되지 않는 색상입니다.");
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
      if (body.folderTitle.trim().length > 10) {
        throw new BadRequestError("INVALID_FOLDER_TITLE", "폴더 이름은 최대 10자까지만 가능합니다.");
      }
      updateData.folderTitle = body.folderTitle.trim();
    }

    // 색상이 존재하고, 공백이 아닐 때만 업데이트 목록에 추가
    if (body.color && body.color.trim() !== "") {
      const trimmedColor = body.color.trim().toUpperCase();
      if (!ALLOWED_COLORS.includes(trimmedColor)) {
        throw new BadRequestError("INVALID_COLOR", "허용되지 않는 색상입니다.");
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