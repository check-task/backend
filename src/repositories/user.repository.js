import { prisma } from "../db.config.js";

const COLOR_GROUPS = [
  ["#818892"],  
  ["#F55757"], 
  ["#FFC93F"], 
  ["#6EC77B"],
  ["#A177E2"],
  ["#081221", "#B5BAC4"]
];

const getColorIndex = (colorHex) => {
  const upperColor = colorHex.toUpperCase();
  return COLOR_GROUPS.findIndex(group => 
    group.some(c => c.toUpperCase() === upperColor)
  );
};

class UserRepository {
  // 내 정보 조회
  async getUserData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        folders: { orderBy: { id: "asc" } }, 
        alarmSetting: true 
      },
    });

    if (user && user.folders) {
      user.folders.sort((a, b) => {
        const indexA = getColorIndex(a.color);
        const indexB = getColorIndex(b.color);

        if (indexA === indexB) return a.id - b.id; 
        return indexA - indexB;
      });
    }

    return user;
  }

  // 프로필 수정 (알림 시간은 UserAlarmSetting)
  async updateProfile(userId, data) {
    const { deadlineAlarm, taskAlarm, ...userFields } = data;
    const cleanUser = Object.fromEntries(
      Object.entries(userFields).filter(([, v]) => v !== undefined),
    );
    const hasAlarmUpdate =
      deadlineAlarm !== undefined || taskAlarm !== undefined;

    if (Object.keys(cleanUser).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: cleanUser,
      });
    }

    if (hasAlarmUpdate) {
      await prisma.userAlarmSetting.upsert({
        where: { userId },
        create: {
          userId,
          deadlineAlarm: deadlineAlarm ?? 24,
          taskAlarm: taskAlarm ?? 24,
        },
        update: {
          ...(deadlineAlarm !== undefined && { deadlineAlarm }),
          ...(taskAlarm !== undefined && { taskAlarm }),
        },
      });
    }

    const updatedUser = await prisma.user.findUnique({
      where: { id: userId },
      include: { 
        folders: { orderBy: { id: "asc" } }, 
        alarmSetting: true 
      },
    });

    if (updatedUser && updatedUser.folders) {
      updatedUser.folders.sort((a, b) => {
        const indexA = getColorIndex(a.color);
        const indexB = getColorIndex(b.color);

        if (indexA === indexB) return a.id - b.id;
        return indexA - indexB;
      });
    }

    return updatedUser;
  }

  // 탈퇴한 회원인지 확인
  async checkDeletedUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, deletedAt: true },
    });
    return user;
  }
}

export const userRepository = new UserRepository();

export const checkDeletedUser = (userId) => userRepository.checkDeletedUser(userId);
export const getUserData = (userId) => userRepository.getUserData(userId);
export const updateProfile = (userId, data) => userRepository.updateProfile(userId, data);