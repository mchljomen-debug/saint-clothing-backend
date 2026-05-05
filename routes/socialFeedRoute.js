import express from "express";
import {
  getSocialFeed,
  updateSocialFeed,
} from "../controllers/socialFeedController.js";
import adminAuth from "../middleware/adminAuth.js";

const socialFeedRouter = express.Router();

socialFeedRouter.get("/", getSocialFeed);
socialFeedRouter.put("/", adminAuth, updateSocialFeed);

export default socialFeedRouter;