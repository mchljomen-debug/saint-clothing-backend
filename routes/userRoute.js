import express from "express";
import authUser from "../middleware/auth.js";
import upload from "../middleware/multer.js";
import {
  checkEmail,
  sendOtpController,
  verifyOtp,
  registerUser,
  loginUser,
  getCurrentUser,
  updateUserProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  getTermsAndConditions,
  getPreferences,
  updatePreferences,
} from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get("/terms", getTermsAndConditions);

userRouter.post("/check-email", checkEmail);
userRouter.post("/send-otp", sendOtpController);
userRouter.post("/verify-otp", verifyOtp);
userRouter.post("/register", registerUser);
userRouter.post("/login", loginUser);
userRouter.post("/me", authUser, getCurrentUser);

userRouter.get("/preferences", authUser, getPreferences);
userRouter.put("/preferences", authUser, updatePreferences);

userRouter.post(
  "/update-profile/:userId",
  authUser,
  upload.single("avatar"),
  updateUserProfile
);

userRouter.post("/change-password", authUser, changePassword);
userRouter.post("/forgot-password", forgotPassword);
userRouter.post("/reset-password", resetPassword);

export default userRouter;