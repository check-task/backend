import { Router } from "express";
import { LoginController } from "../controllers/login.controller.js";

const router = Router();
const loginController = new LoginController();

router.post("/", loginController.signup.bind(loginController));
router.get("/check-email", loginController.checkEmail.bind(loginController));
router.post("/email/send", loginController.sendCode.bind(loginController));
router.post("/email/resend", loginController.resendCode.bind(loginController));
router.post("/email/verify", loginController.verifyCode.bind(loginController));
router.post("/signup", loginController.signup.bind(loginController));
router.post("/signin", loginController.login.bind(loginController));

export default router;
