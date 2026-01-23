import express from "express";
import userController from "../controllers/user.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import upload from "../middlewares/upload.middleware.js";

const userRouter = express.Router();

userRouter.get('/me', authenticate, userController.getMyInfo);

userRouter.patch('/profile', authenticate, upload.single('image'), userController.updateProfile);

export default userRouter;