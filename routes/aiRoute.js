import express from "express";
import authUser from "../middleware/auth.js";
import {
  generateOutfitSuggestion,
  generateOutfitImage,
} from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.post("/suggest-fit", authUser, generateOutfitSuggestion);
aiRouter.post("/generate-fit-image", authUser, generateOutfitImage);

export default aiRouter;