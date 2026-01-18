import * as folderRepository from "../repositories/folder.repository.js";
import * as folderDto from "../dtos/folder.dto.js";

// 1. 폴더 생성
export const createFolder = async (userId, body) => {
  const folderData = folderDto.bodyToFolderDto(body);
  const newFolder = await folderRepository.addFolder(userId, folderData);  
  return folderDto.responseFromFolder(newFolder);
};

// 2. 폴더 수정
export const updateFolder = async (userId, folderId, body) => {
  const folderData = folderDto.bodyToFolderDto(body);
  const updatedFolder = await folderRepository.updateFolder(userId, folderId, folderData);
  return folderDto.responseFromFolder(updatedFolder);
};

// 3. 폴더 삭제
export const deleteFolder = async (userId, folderId) => {
  await folderRepository.removeFolder(userId, folderId);
  return;
};