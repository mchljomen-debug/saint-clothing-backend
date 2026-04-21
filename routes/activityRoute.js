import express from "express";
import { getLogs } from "../controllers/activityController.js";
import adminAuth from "../middleware/adminAuth.js";

const activityRouter = express.Router();

activityRouter.get("/list", adminAuth, getLogs);

export default activityRouter;