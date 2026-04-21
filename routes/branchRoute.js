import express from "express";
import {
  getAllBranches,
  createBranch,
  updateBranch,
} from "../controllers/branchController.js";
import adminAuth from "../middleware/adminAuth.js";
import { adminOnly } from "../middleware/roleMiddleware.js";

const router = express.Router();

// PUBLIC - needed by frontend product page to show real branch names
router.get("/list", getAllBranches);

// ADMIN ONLY
router.post("/add", adminAuth, adminOnly, createBranch);
router.put("/update/:id", adminAuth, adminOnly, updateBranch);

export default router;