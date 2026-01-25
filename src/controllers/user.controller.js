import { userService } from "../services/user.service.js";
import { uploadToS3 } from "../middlewares/upload.middleware.js";

class UserController {
  // 1. 내 정보 조회
  getMyInfo = async (req, res, next) => {
    try {
      console.log("로그인 유저 정보:", req.user);
      const userId = req.user.id;

      const result = await userService.getMyInfo(userId);
      return res.success(result, "내 정보 조회 성공");
    } catch (error) {
      next(error);
    }
  };

  // 2. 프로필 수정
  updateProfile = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const body = req.body;

      let imageUrl = null;

      if (req.file) {
        // S3에 업로드하고 URL 받기
        imageUrl = await uploadToS3(req.file);
      }

      // 서비스에 전달할 데이터 객체 생성 (이미지가 있으면 덮어씌움)
      const updateData = {
        ...body,
        ...(imageUrl && { profileImage: imageUrl }), // imageUrl이 있을 때만 추가
      };

      const result = await userService.updateProfile(userId, updateData);

      return res.success(result, "프로필 수정 성공");
    } catch (error) {
      next(error);
    }
  };
}

export const userController = new UserController();