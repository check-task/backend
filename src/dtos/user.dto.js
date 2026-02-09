export class UserDto {
  static bodyToProfileDto(body) {
    return {
      nickname: body.nickname && body.nickname.trim() !== "" ? body.nickname.trim() : undefined,
      phoneNum: body.phoneNum && body.phoneNum.trim() !== "" ? body.phoneNum.trim() : undefined,
      email: body.email && body.email.trim() !== "" ? body.email.trim() : undefined,
      profileImage: body.profileImage ? body.profileImage : undefined,
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
            folderTitle: folder.folderTitle,
            color: folder.color,
          }))
        : [],
    };
  }

  static responseFromUpdatedUser(user) {
    return {
      userId: user.id,
      nickname: user.nickname,
      phoneNum: user.phoneNum,
      email: user.email,
      profileImage: user.profileImage,
      updatedAt: user.updatedAt,
    };
  }
}