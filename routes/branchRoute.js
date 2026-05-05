import express from "express";
import {
  getAllBranches,
  createBranch,
  updateBranch,
  deleteBranch,          
  restoreBranch,         
  permanentDeleteBranch, 
  getDeletedBranches,    
} from "../controllers/branchController.js";

import adminAuth from "../middleware/adminAuth.js";

const branchRouter = express.Router();

branchRouter.get("/list", adminAuth, getAllBranches);
branchRouter.post("/add", adminAuth, createBranch);
branchRouter.put("/update/:id", adminAuth, updateBranch);
branchRouter.delete("/delete/:id", adminAuth, deleteBranch);
branchRouter.post("/restore/:id", adminAuth, restoreBranch);
branchRouter.delete("/permanent-delete/:id", adminAuth, permanentDeleteBranch);
branchRouter.get("/trash", adminAuth, getDeletedBranches);

export default branchRouter;