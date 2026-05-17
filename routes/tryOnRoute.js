import express from "express";
import upload from "../middleware/multer.js";

import {
  startPerfectTryOn,
  getPerfectTryOnStatus,
  perfectWebhook,
} from "../controllers/tryOnController.js";

const tryOnRouter = express.Router();

/* =========================================
   HEALTH CHECK
========================================= */

tryOnRouter.get("/", (req, res) => {
  res.json({
    success: true,
    message: "SAINT AR TRY-ON API RUNNING",
  });
});

/* =========================================
   AI TRY-ON
========================================= */

/*
  START AI TRY-ON

  BODY IMAGE:
  personImage

  GARMENT:
  garmentImageUrl

  CATEGORY:
  topwear / bottomwear / dress / auto
*/

tryOnRouter.post(
  "/perfect/start",
  upload.single("personImage"),
  startPerfectTryOn
);

/* =========================================
   CHECK AI STATUS
========================================= */

tryOnRouter.get(
  "/perfect/status/:taskId",
  getPerfectTryOnStatus
);

/* =========================================
   PERFECT WEBHOOK
========================================= */

tryOnRouter.post(
  "/perfect/webhook",
  perfectWebhook
);

/* =========================================
   FUTURE REAL-TIME AR
========================================= */

/*
  Future route for:
  - MediaPipe body tracking
  - Shoulder detection
  - Hip tracking
  - Live AR fitting
*/

tryOnRouter.post("/live/body-track", async (req, res) => {
  try {
    res.json({
      success: true,
      message: "LIVE BODY TRACKING READY",
    });
  } catch (error) {
    console.log(error);

    res.status(500).json({
      success: false,
      message: "Body tracking failed",
    });
  }
});

export default tryOnRouter;