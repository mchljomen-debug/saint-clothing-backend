import express from "express";
import upload from "../middleware/multer.js";
import {
  startPerfectTryOn,
  getPerfectTryOnStatus,
  perfectWebhook,
} from "../controllers/tryOnController.js";

const tryOnRouter = express.Router();

tryOnRouter.post(
  "/perfect/start",
  upload.single("personImage"),
  startPerfectTryOn
);

tryOnRouter.get("/perfect/status/:taskId", getPerfectTryOnStatus);

tryOnRouter.post("/perfect/webhook", perfectWebhook);

export default tryOnRouter;