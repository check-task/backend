import express from "express";

import { userController } from "../controllers/user.controller.js";
import authenticate from "../middlewares/authenticate.middleware.js";
import upload from "../middlewares/upload.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { updateProfileSchema } from "../validators/user.schema.js";

const userRouter = express.Router();

userRouter.get("/me", authenticate, userController.getMyInfo);

userRouter.patch(
  "/profile",
  authenticate,
  upload.single("image"),
  validate(updateProfileSchema),
  userController.updateProfile
);

export default userRouter;
