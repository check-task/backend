import userService from "../services/user.service.js";

class UserController {
  async getMyInfo(req, res, next) {
    try {
      // 나중에 req.user.id 변경
      const userId = req.query.userId ? parseInt(req.query.userId) : 1;

      const result = await userService.getMyInfo(userId);

      return res.success(result, "내 정보 조회 성공");
    } catch (error) {
      next(error);
    }
  }
}

export default new UserController();