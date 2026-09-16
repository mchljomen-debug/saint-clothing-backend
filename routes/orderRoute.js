import express from"express";
import{
  placeOrder,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
  createPaymongoCheckout,
  paymongoWebhook,
  getPaymentStatus,
  updateTrackingNumber,
  allOrders,
  userOrders,
  updateStatus,
  receiveOrder,
  cancelOrder
}from"../controllers/orderController.js";
import adminAuth from"../middleware/adminAuth.js";
import authUser from"../middleware/auth.js";
import upload from"../middleware/multer.js";
import{adminOrStaff}from"../middleware/roleMiddleware.js";

const orderRouter=express.Router();

orderRouter.post(
  "/place",
  authUser,
  placeOrder
);

orderRouter.post(
  "/create-paymongo-checkout",
  authUser,
  createPaymongoCheckout
);

orderRouter.post(
  "/payment-status",
  authUser,
  getPaymentStatus
);

orderRouter.post(
  "/submit-payment-proof",
  authUser,
  upload.single("paymentProofImage"),
  submitPaymentProof
);

orderRouter.post(
  "/userorders",
  authUser,
  userOrders
);

orderRouter.post(
  "/receive",
  authUser,
  upload.single("deliveryProofImage"),
  receiveOrder
);

orderRouter.post(
  "/cancel",
  authUser,
  cancelOrder
);

orderRouter.post(
  "/paymongo-webhook",
  paymongoWebhook
);

orderRouter.get(
  "/list",
  adminAuth,
  adminOrStaff,
  allOrders
);

orderRouter.post(
  "/status",
  adminAuth,
  adminOrStaff,
  updateStatus
);

orderRouter.post(
  "/tracking",
  adminAuth,
  adminOrStaff,
  updateTrackingNumber
);

orderRouter.post(
  "/approve-payment",
  adminAuth,
  adminOrStaff,
  approveManualPayment
);

orderRouter.post(
  "/reject-payment",
  adminAuth,
  adminOrStaff,
  rejectManualPayment
);

export default orderRouter;