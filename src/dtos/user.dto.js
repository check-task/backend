export const responseFromUser = (user) => {
  return {
    userId: user.id,
    nickname: user.nickname,
    email: user.email,
    profileImage: user.profileImage, // 프로필 이미지 추가
    phoneNumber: user.phoneNumber,   
    folders: user.folders.map((folder) => ({ 
      folderId: folder.id,
      name: folder.folderTitle,
      color: folder.color,
    })),
  };
};