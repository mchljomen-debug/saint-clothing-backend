import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";

import authUser from "../middleware/auth.js";
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

const avatarDir = path.join(process.cwd(), "uploads", "avatars");
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, avatarDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname || ".jpg");
    cb(null, `avatar-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

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