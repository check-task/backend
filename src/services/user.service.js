import { prisma } from "../db.config.js";
import { NotFoundError } from "../errors/custom.error.js";
import { responseFromUser } from "../dtos/user.dto.js";

class UserService {
  async getMyInfo(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { folders: true },
    });

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }
    return responseFromUser(user);
  }
}

export default new UserService();