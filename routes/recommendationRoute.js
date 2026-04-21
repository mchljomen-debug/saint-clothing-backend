import express from "express";
import {
  getRecommendations,
  trackUserStyleSignal,
} from "../controllers/recommendationController.js";

const recommendationRouter = express.Router();

recommendationRouter.get("/test", (req, res) => {
  res.json({
    success: true,
    message: "Recommendation route is active",
  });
});

recommendationRouter.post("/list", getRecommendations);
recommendationRouter.post("/track", trackUserStyleSignal);

export default recommendationRouter;