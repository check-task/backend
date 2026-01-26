export class UserDto {
  static bodyToProfileDto(body) {
    return {
      nickname: body.nickname,
      phoneNum: body.phoneNum,
      email: body.email,
      profileImage: body.profileImage,
      deadlineAlarm: body.deadlineAlarm,
      taskAlarm: body.taskAlarm,
    };
  }

  static responseFromUser(user) {
    return {
      userId: user.id,
      nickname: user.nickname,
      phoneNum: user.phoneNum,
      email: user.email,
      profileImage: user.profileImage,
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
  }

  static responseFromUpdatedUser(user) {
    return {
      userId: user.id,
      nickname: user.nickname,
      phoneNum: user.phoneNum || user.phoneNumber,
      email: user.email,
      profileImage: user.profileImage,
      updatedAt: user.updatedAt,
    };
  }
}