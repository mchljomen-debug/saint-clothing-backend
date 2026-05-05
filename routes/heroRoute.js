import express from "express";
import { getHero, updateHero } from "../controllers/heroController.js";
import adminAuth from "../middleware/adminAuth.js";
import heroUpload from "../middleware/heroUpload.js";

const heroRouter = express.Router();

heroRouter.get("/", getHero);

heroRouter.put(
  "/",
  adminAuth,
  heroUpload.fields([
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  updateHero
);

export default heroRouter;