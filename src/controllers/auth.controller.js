import { KakaoAuthService } from "../services/auth.service.js";
import { UnauthorizedError } from "../errors/custom.error.js";

export class AuthController{
    constructor(){
        this.kakaoAuthService = new KakaoAuthService();
    }

    //카카오 회원 탈퇴
    async kakaoWithdraw(req, res, next){
        try{
            if(!req.user){
                throw new UnauthorizedError("UNAUTHORIZED","인증 정보가 없습니다");
            }
            
            await this.kakaoAuthService.withdrawKakaoUser(req.user);

            return res.status(200).json({
                resultType: "SUCCESS",
                message: "카카오 회원 탈퇴가 완료되었습니다."
            });
        }catch (error){
            next(error);
        }
    }

    //카카오 로그아웃
    async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (refreshToken){
        await this.kakaoAuthService.revokeRefreshToken(refreshToken);
      }
      const isProd = process.env.NODE_ENV === "production";
      
      //refresh token 쿠키 삭제
      res.clearCookie("refreshToken",{
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
        path: "/",
      });

      return res.status(200).json({
        resultType: "SUCCESS",
        message: "카카오 로그아웃이 완료되었습니다."
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next){
    try{
      console.log("🍪 cookies:", req.cookies);
      
      const refreshToken = req.cookies?.refreshToken;
      if(!refreshToken){throw new UnauthorizedError("UNAUTHORIZED","Refresh Token이 없습니다.");}
      
      const newAccessToken = await this.kakaoAuthService.refreshAccessToken(refreshToken);

      return res.status(200).json({
        resultType: "SUCCESS",
        data: {
          accessToken: newAccessToken,
          accessTokenExpireIn: 3600,
        }
      });
    }catch (error){
      next(error);
    }
  }
}



