import express from "express";
import adminAuth from "../middleware/adminAuth.js";
import upload from "../middleware/multer.js";
import {
  listCategories,
  addCategory,
  updateCategory,
  deleteCategory,
  getDeletedCategories,
  restoreCategory,
  permanentDeleteCategory,
} from "../controllers/categoryController.js";

const categoryRouter = express.Router();

categoryRouter.get("/list", listCategories);

categoryRouter.post("/add", adminAuth, upload.single("image"), addCategory);

categoryRouter.put(
  "/update/:id",
  adminAuth,
  upload.single("image"),
  updateCategory
);

categoryRouter.post("/delete", adminAuth, deleteCategory);

/* GLOBAL TRASH SUPPORT */
categoryRouter.get("/trash", adminAuth, getDeletedCategories);
categoryRouter.post("/restore", adminAuth, restoreCategory);
categoryRouter.post("/permanent-delete", adminAuth, permanentDeleteCategory);

export default categoryRouter;