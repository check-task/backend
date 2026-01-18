import { prisma } from "../db.config.js";
import { NotFoundError } from "../errors.js";

class UserService {
  async getMyInfo(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { folders: true },
    });

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }

    return {
      userId: user.id,
      nickname: user.nickname,
      email: user.email,
      profileImage: user.profileImage,
      phoneNumber: user.phoneNumber,
      folders: user.folders.map((folder) => ({
        folderId: folder.id,
        name: folder.folderTitle,
        color: folder.color,
      })),
    };
  }
}

// 클래스를 생성(new)해서 내보냅니다.
export default new UserService();