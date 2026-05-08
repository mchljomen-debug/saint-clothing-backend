import express from "express";
import { generateOutfitSuggestion } from "../controllers/aiController.js";

const aiRouter = express.Router();

aiRouter.post("/suggest-fit", generateOutfitSuggestion);

export default aiRouter;