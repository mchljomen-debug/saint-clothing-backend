import express from "express";

import authUser from "../middleware/auth.js";

import {
  addToCart,
  updateCart,
  getUserCart,
  clearCart,
} from "../controllers/cartController.js";

const cartRouter = express.Router();

/* ==============================
   CART ROUTES
============================== */

cartRouter.post("/add", authUser, addToCart);

cartRouter.post("/update", authUser, updateCart);

cartRouter.post("/get", authUser, getUserCart);

cartRouter.post("/clear", authUser, clearCart);

export default cartRouter;