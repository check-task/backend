import userService from "../services/user.service.js";

class UserController {
  async getMyInfo(req, res, next) {
    try {
      console.log("로그인 유저 정보:", req.user);
      const userId = req.user.id;

      const result = await userService.getMyInfo(userId);
      return res.success(result, "내 정보 조회 성공");
    } catch (error) {
      next(error);
    }
  }
  // 프로필 수정
  async updateProfile(req, res, next) {
    try {
      const userId = req.user.id; // 토큰에서 내 ID 추출
      const body = req.body;      // 클라이언트가 보낸 수정할 데이터  
      const result = await userService.updateProfile(userId, body);

      return res.success(result, "프로필 수정 성공");
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();