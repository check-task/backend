import { NotFoundError } from "../errors/custom.error.js";
import { responseFromUser } from "../dtos/user.dto.js";
import { getUserData } from "../repositories/user.repository.js";

class UserService {
  async getMyInfo(userId) {
    const user = await getUserData(userId);

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }
    return responseFromUser(user);
  }
}

export default new UserService();