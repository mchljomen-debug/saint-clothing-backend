import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import {
  listCategories,
  addCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const categoryRouter = express.Router();

categoryRouter.get("/list", listCategories);
categoryRouter.post("/add", adminAuth, addCategory);
categoryRouter.post("/delete", adminAuth, deleteCategory);

export default categoryRouter;