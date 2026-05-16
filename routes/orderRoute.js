import express from "express";
import {
  placeOrder,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
  createPaymongoCheckout,
  paymongoWebhook,
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
orderRouter.post("/receive", authUser, receiveOrder);
orderRouter.post("/cancel", authUser, cancelOrder);

// ==============================
// PAYMONGO WEBHOOK
// ==============================
// Important: no authUser/adminAuth here.
// PayMongo must be able to call this endpoint.
orderRouter.post("/paymongo-webhook", paymongoWebhook);

// ==============================
// ADMIN ROUTES
// ==============================
orderRouter.get("/list", adminAuth, allOrders);
orderRouter.post("/status", adminAuth, updateStatus);
orderRouter.post("/approve-payment", adminAuth, approveManualPayment);
orderRouter.post("/reject-payment", adminAuth, rejectManualPayment);

export default orderRouter;