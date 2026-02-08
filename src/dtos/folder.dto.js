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

    return {
      folderTitle: body.folderTitle.trim(), 
      color: body.color || "#000000", // 색상 없으면 기본 검정
    };
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

  static responseFromFolderList(folder) {
    return {
      folders: folder.map(folder => ({
        folderId: folder.id,
        userId: folder.userId,
        folderTitle: folder.folderTitle,
        color: folder.color
      }))
    };
  }
}