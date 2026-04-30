import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import upload from "../middleware/multer.js";
import {
  listCategories,
  addCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

const categoryRouter = express.Router();

categoryRouter.get("/list", listCategories);
categoryRouter.post("/add", adminAuth, upload.single("image"), addCategory);
categoryRouter.put("/update/:id", adminAuth, upload.single("image"), updateCategory);
categoryRouter.post("/delete", adminAuth, deleteCategory);

export default categoryRouter;