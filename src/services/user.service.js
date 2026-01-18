import { responseFromUser } from "../dtos/user.dto.js";

class UserService {
  async getMyInfo(userId){
    return responseFromUser(userId);
  }
}

export default new UserService();