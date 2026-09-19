import express from"express";
import{
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
getInventoryLogs
}from"../controllers/productController.js";
import upload from"../middleware/multer.js";
import adminAuth from"../middleware/adminAuth.js";
import authUser from"../middleware/auth.js";
import{adminOnly,adminOrStaff,adminOrManager}from"../middleware/roleMiddleware.js";

const router=express.Router();

const productUpload=upload.fields([
{name:"image1",maxCount:1},
{name:"image2",maxCount:1},
{name:"image3",maxCount:1},
{name:"image4",maxCount:1},
{name:"sizeChartImage",maxCount:1},
{name:"model3d",maxCount:1},
{name:"outfitImage",maxCount:1}
]);

router.post("/add",adminAuth,adminOrStaff,productUpload,addProduct);
router.put("/update/:id",adminAuth,adminOrStaff,productUpload,updateProduct);
router.put("/update-stock/:id",adminAuth,adminOrManager,updateStock);
router.post("/deduct-stock",adminAuth,adminOrManager,deductStock);
router.get("/inventory-logs",adminAuth,adminOrManager,getInventoryLogs);

router.get("/single/:id",getSingleProduct);
router.get("/list",listProducts);
router.get("/can-review/:id",authUser,canUserReviewProduct);
router.post("/review/:id",authUser,addReview);

router.get("/admin-list",adminAuth,adminOrStaff,listAdminProducts);

router.post("/remove",adminAuth,adminOnly,deleteProduct);
router.post("/restore",adminAuth,adminOnly,restoreProduct);
router.post("/permanent-delete",adminAuth,adminOnly,permanentDelete);
router.get("/trash",adminAuth,adminOnly,listDeletedProducts);

export default router;