import express from "express";
import {
  placeOrder,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
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

orderRouter.post("/place", authUser, placeOrder);
orderRouter.post("/submit-payment-proof", authUser, upload.single("paymentProofImage"), submitPaymentProof);
orderRouter.post("/userorders", authUser, userOrders);
orderRouter.post("/receive", authUser, receiveOrder);
orderRouter.post("/cancel", authUser, cancelOrder);

orderRouter.post("/list", adminAuth, allOrders);
orderRouter.post("/status", adminAuth, updateStatus);
orderRouter.post("/approve-payment", adminAuth, approveManualPayment);
orderRouter.post("/reject-payment", adminAuth, rejectManualPayment);

export default orderRouter;