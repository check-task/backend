import express from "express";
import userController from "../controllers/user.controller.js";
// import { checkAuth } from "../middlewares/auth.middleware.js";

const userRouter = express.Router();

userRouter.get('/me', /*checkAuth*/ userController.getMyInfo);

export default userRouter;