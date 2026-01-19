export const bodyToProfileDto = (body) => {
  return {
    nickname: body.nickname,
    phoneNum: body.phoneNum,
    email: body.email,
    profileImage: body.profileImage,
  };
};

export const responseFromUser = (user) => {
  return {
    userId: user.id,
    nickname: user.nickname,
    phoneNum: user.phoneNum,
    email: user.email,
    profileImage: user.profileImage,
    phoneNum: user.phoneNum,
    deadlineAlarm: user.deadlineAlarm,
    taskAlarm: user.taskAlarm,
    folders: user.folders 
      ? user.folders.map((folder) => ({ 
          folderId: folder.id,
          name: folder.folderTitle,
          color: folder.color,
        })) 
      : [],
  };
};

export const responseFromUpdatedUser = (user) => {
  return {
    userId: user.id,
    nickname: user.nickname,
    phoneNum: user.phoneNum || user.phoneNumber,
    email: user.email,
    profileImage: user.profileImage,
    updatedAt: user.updatedAt,
  };
};