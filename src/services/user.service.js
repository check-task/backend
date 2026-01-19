import { NotFoundError, BadRequestError } from "../errors/custom.error.js";
import { responseFromUser, responseFromUpdatedUser, bodyToProfileDto } from "../dtos/user.dto.js";
import { getUserData, updateProfile } from "../repositories/user.repository.js";

class UserService {
  async getMyInfo(userId) {
    const user = await getUserData(userId);

    if (!user) {
      throw new NotFoundError(
        "USER_NOT_FOUND", 
        "해당 사용자를 찾을 수 없습니다."
      );
    }
    return responseFromUser(user);
  }


// 프로필 수정
  async updateProfile(userId, body) {
    if (body.nickname && body.nickname.length > 10) {
      throw new BadRequestError(
        "INVALID_NICKNAME",               
        "닉네임은 최대 10자까지만 가능합니다."
      );
    }    

    const isUserExist = await getUserData(userId);
    if (!isUserExist) {
      throw new NotFoundError(
        "USER_NOT_FOUND", 
        "해당 사용자를 찾을 수 없습니다."
      );
    }
    const updateData = bodyToProfileDto(body);
    const updatedUser = await updateProfile(userId, updateData);  
    return responseFromUpdatedUser(updatedUser);
  }
}

export default new UserService();

