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
}

