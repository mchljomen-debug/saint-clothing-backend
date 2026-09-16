import express from"express";
import authUser from"../middleware/auth.js";
import adminAuth from"../middleware/adminAuth.js";
import{adminOrManager}from"../middleware/roleMiddleware.js";
import{
  generateOutfitSuggestion,
  generateOutfitImage,
  generateSalesInsight
}from"../controllers/aiController.js";

const aiRouter=express.Router();

aiRouter.post("/suggest-fit",authUser,generateOutfitSuggestion);
aiRouter.post("/generate-fit-image",authUser,generateOutfitImage);
aiRouter.post("/sales-insight",adminAuth,adminOrManager,generateSalesInsight);

export default aiRouter;