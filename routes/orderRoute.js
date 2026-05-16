import express from "express";
import {
  placeOrder,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
  createPaymongoCheckout,
  paymongoWebhook,
  updateTrackingNumber,
  allOrders,
  userOrders,
  updateStatus,
  receiveOrder,
  cancelOrder,
} from "../controllers/orderController.js";

import adminAuth from "../middleware/adminAuth.js";
import authUser from "../middleware/auth.js";
import upload from "../middleware/multer.js";

const orderRouter = express.Router();

// ==============================
// USER ROUTES
// ==============================
orderRouter.post("/place", authUser, placeOrder);

orderRouter.post(
  "/create-paymongo-checkout",
  authUser,
  createPaymongoCheckout
);

orderRouter.post(
  "/submit-payment-proof",
  authUser,
  upload.single("paymentProofImage"),
  submitPaymentProof
);

orderRouter.post("/userorders", authUser, userOrders);

orderRouter.post(
  "/receive",
  authUser,
  upload.single("deliveryProofImage"),
  receiveOrder
);

orderRouter.post("/cancel", authUser, cancelOrder);

// ==============================
// PAYMONGO WEBHOOK
// ==============================
orderRouter.post("/paymongo-webhook", paymongoWebhook);

// ==============================
// ADMIN ROUTES
// ==============================
orderRouter.get("/list", adminAuth, allOrders);
orderRouter.post("/status", adminAuth, updateStatus);
orderRouter.post("/tracking", adminAuth, updateTrackingNumber);
orderRouter.post("/approve-payment", adminAuth, approveManualPayment);
orderRouter.post("/reject-payment", adminAuth, rejectManualPayment);

export default orderRouter;