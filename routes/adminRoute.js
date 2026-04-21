import express from "express";
import upload from "../middleware/multer.js";
import {
  adminLogin,
  getDashboardStats,
  getAllUsers,
  blockUser,
  unblockUser,
  deactivateUser,
  reactivateUser,
  softDeleteUser,
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  exportDashboardExcel,
} from "../controllers/adminController.js";
import adminAuth from "../middleware/adminAuth.js";
import { adminOnly, adminOrStaff } from "../middleware/roleMiddleware.js";

const router = express.Router();

router.post("/admin-login", adminLogin);

router.get("/dashboard", adminAuth, adminOrStaff, getDashboardStats);
router.get(
  "/dashboard/export-excel",
  adminAuth,
  adminOrStaff,
  exportDashboardExcel
);

// ✅ users
router.get("/users", adminAuth, adminOnly, getAllUsers);
router.post("/users/block", adminAuth, adminOnly, blockUser);
router.post("/users/unblock", adminAuth, adminOnly, unblockUser);
router.post("/users/deactivate", adminAuth, adminOnly, deactivateUser);
router.post("/users/reactivate", adminAuth, adminOnly, reactivateUser);
router.post("/users/delete", adminAuth, adminOnly, softDeleteUser);

// ✅ employees
router.get("/employees", adminAuth, adminOnly, getAllEmployees);

router.post(
  "/employees",
  adminAuth,
  adminOnly,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "picture", maxCount: 1 },
  ]),
  createEmployee
);

router.put(
  "/employees/:id",
  adminAuth,
  adminOnly,
  upload.fields([
    { name: "resume", maxCount: 1 },
    { name: "picture", maxCount: 1 },
  ]),
  updateEmployee
);

router.delete("/employees/:id", adminAuth, adminOnly, deleteEmployee);

export default router;