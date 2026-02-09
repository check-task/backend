import { NotFoundError, BadRequestError } from "../errors/custom.error.js";
import { UserDto } from "../dtos/user.dto.js";
import { userRepository } from "../repositories/user.repository.js";

class UserService {
  // 1. 내 정보 조회
  async getMyInfo(userId) {
    const user = await userRepository.getUserData(userId);

    if (!user) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }
    
    // DTO 클래스 사용
    return UserDto.responseFromUser(user);
  }

  // 2. 프로필 수정
  async updateProfile(userId, body) {
    if (body.nickname && body.nickname.length > 100) {
      throw new BadRequestError("INVALID_NICKNAME", "닉네임은 최대 100자까지만 가능합니다.");
    }

    const isUserExist = await userRepository.getUserData(userId);
    if (!isUserExist) {
      throw new NotFoundError("USER_NOT_FOUND", "해당 사용자를 찾을 수 없습니다.");
    }

    if (isUserExist.deletedAt) {
      throw new NotFoundError("USER_NOT_FOUND", "탈퇴한 사용자입니다.");
    }

    // DTO 클래스 사용
    const updateData = UserDto.bodyToProfileDto(body);
    const fieldsToUpdate = Object.values(updateData).filter(v => v !== undefined);

    if (fieldsToUpdate.length === 0) {
      return UserDto.responseFromUpdatedUser(isUserExist);
    }
    
    const updatedUser = await userRepository.updateProfile(userId, updateData);
    
    return UserDto.responseFromUpdatedUser(updatedUser);
  }
}

export const userService = new UserService();