import { Router } from "express";
import { LoginController } from "../controllers/login.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";

const router = Router();
const loginController = new LoginController();

router.get("/check-email", loginController.checkEmail.bind(loginController));
router.post("/email/send", loginController.sendCode.bind(loginController));
router.post("/email/resend", loginController.resendCode.bind(loginController));
router.post("/email/verify", loginController.verifyCode.bind(loginController));
router.post("/signup", loginController.signup.bind(loginController));
router.post("/signin", loginController.login.bind(loginController));
router.delete(
  "/local/withdraw",
  authenticate,
  loginController.withdraw.bind(loginController),
);
router.post("/local/restore", loginController.restore.bind(loginController));

router.patch(
  "/password",
  authenticate,
  loginController.changePassword.bind(loginController),
);
router.post(
  "/password/reset/send",
  loginController.sendPasswordResetCode.bind(loginController),
);
router.post(
  "/password/reset/verify",
  loginController.verifyPasswordResetCode.bind(loginController),
);
router.post(
  "/password/reset",
  loginController.confirmPasswordReset.bind(loginController),
);

export default router;
