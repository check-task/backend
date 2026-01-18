export const bodyToFolderDto = (body) => {
  if (!body.folderTitle) {
    throw new Error("폴더 이름(folderTitle)은 필수입니다.");
  }

  return {
    folderTitle: body.folderTitle,
    color: body.color || "#000000", // 색상 없으면 기본 검정
  };
};

export const responseFromFolder = (folder) => {
  return {
    folderId: folder.id,
    folderTitle: folder.folderTitle,
    color: folder.color      
  };
};