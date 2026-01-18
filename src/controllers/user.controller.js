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
}

export default new UserController();