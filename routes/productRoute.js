import express from "express";
import {
  addProduct,
  listProducts,
  listAdminProducts,
  deleteProduct,
  updateProduct,
  getSingleProduct,
  permanentDelete,
  restoreProduct,
  listDeletedProducts,
  updateStock,
  deductStock,
  addReview,
  canUserReviewProduct,
} from "../controllers/productController.js";

import upload from "../middleware/multer.js";
import adminAuth from "../middleware/adminAuth.js";
import authUser from "../middleware/auth.js";

const router = express.Router();

const productUpload = upload.fields([
  { name: "image1", maxCount: 1 },
  { name: "image2", maxCount: 1 },
  { name: "image3", maxCount: 1 },
  { name: "image4", maxCount: 1 },
  { name: "sizeChartImage", maxCount: 1 },
  { name: "model3d", maxCount: 1 },
  { name: "outfitImage", maxCount: 1 },
]);

// ADD / UPDATE PRODUCT
router.post("/add", adminAuth, productUpload, addProduct);
router.put("/update/:id", adminAuth, productUpload, updateProduct);

// STOCK
router.put("/update-stock/:id", adminAuth, updateStock);
router.post("/deduct-stock", deductStock);

// PUBLIC PRODUCT
router.get("/single/:id", getSingleProduct);
router.get("/list", listProducts);

// REVIEWS
router.get("/can-review/:id", authUser, canUserReviewProduct);
router.post("/review/:id", authUser, addReview);

// ADMIN PRODUCT
router.get("/admin-list", adminAuth, listAdminProducts);

// TRASH / DELETE
router.post("/remove", adminAuth, deleteProduct);
router.post("/restore", adminAuth, restoreProduct);
router.post("/permanent-delete", adminAuth, permanentDelete);
router.get("/trash", adminAuth, listDeletedProducts);

export default router;