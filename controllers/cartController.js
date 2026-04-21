import userModel from "../models/userModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

// ==============================
// NORMALIZE CART DATA
// ==============================
const normalizeCartData = (cartData = {}) => {
  if (!cartData || typeof cartData !== "object" || Array.isArray(cartData)) {
    return {};
  }

  const normalized = {};

  for (const productId of Object.keys(cartData)) {
    const sizes = cartData[productId];

    if (!sizes || typeof sizes !== "object" || Array.isArray(sizes)) continue;

    normalized[String(productId)] = {};

    for (const size of Object.keys(sizes)) {
      const normalizedSize = String(size).toUpperCase();
      const qty = Number(sizes[size] || 0);

      if (qty > 0) {
        normalized[String(productId)][normalizedSize] = qty;
      }
    }

    if (Object.keys(normalized[String(productId)]).length === 0) {
      delete normalized[String(productId)];
    }
  }

  return normalized;
};

// ==============================
// ADD TO CART
// ==============================
const addToCart = async (req, res) => {
  try {
    const { itemId, size, quantity = 1 } = req.body;
    const userId = req.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!itemId || !size) {
      return res.status(400).json({
        success: false,
        message: "Item ID and size required",
      });
    }

    const normalizedItemId = String(itemId);
    const normalizedSize = String(size).toUpperCase();
    const qtyToAdd = Number(quantity || 1);

    if (!Number.isFinite(qtyToAdd) || qtyToAdd <= 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be greater than 0",
      });
    }

    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cartData = normalizeCartData(
      JSON.parse(JSON.stringify(userData.cartData || {}))
    );

    if (!cartData[normalizedItemId]) {
      cartData[normalizedItemId] = {};
    }

    cartData[normalizedItemId][normalizedSize] =
      Number(cartData[normalizedItemId][normalizedSize] || 0) + qtyToAdd;

    userData.cartData = cartData;
    userData.markModified("cartData");
    await userData.save();

    // 🔥 LOG
    await addLog({
      action: "CART_ADD",
      message: `Added to cart: ${normalizedItemId} (${normalizedSize}) x${qtyToAdd}`,
      user: getActorName(req, "Customer"),
      entityId: normalizedItemId,
      entityType: "Cart",
    });

    return res.json({
      success: true,
      message: "Added to cart",
      cartData,
    });
  } catch (error) {
    console.log("ADD TO CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE CART
// ==============================
const updateCart = async (req, res) => {
  try {
    const { itemId, productId, size, quantity } = req.body;
    const userId = req.userId;

    const finalItemId = itemId || productId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!finalItemId || !size) {
      return res.status(400).json({
        success: false,
        message: "Item ID and size required",
      });
    }

    const normalizedItemId = String(finalItemId);
    const normalizedSize = String(size).toUpperCase();
    const nextQty = Number(quantity || 0);

    if (!Number.isFinite(nextQty) || nextQty < 0) {
      return res.status(400).json({
        success: false,
        message: "Quantity must be 0 or greater",
      });
    }

    const userData = await userModel.findById(userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cartData = normalizeCartData(
      JSON.parse(JSON.stringify(userData.cartData || {}))
    );

    if (!cartData[normalizedItemId] && nextQty <= 0) {
      return res.json({
        success: true,
        message: "Cart updated",
        cartData,
      });
    }

    if (!cartData[normalizedItemId]) {
      cartData[normalizedItemId] = {};
    }

    if (nextQty <= 0) {
      if (cartData[normalizedItemId][normalizedSize] !== undefined) {
        delete cartData[normalizedItemId][normalizedSize];
      }

      if (Object.keys(cartData[normalizedItemId]).length === 0) {
        delete cartData[normalizedItemId];
      }
    } else {
      cartData[normalizedItemId][normalizedSize] = nextQty;
    }

    userData.cartData = cartData;
    userData.markModified("cartData");
    await userData.save();

    // 🔥 LOG
    await addLog({
      action: "CART_UPDATED",
      message: `Cart updated: ${normalizedItemId} (${normalizedSize}) → qty ${nextQty}`,
      user: getActorName(req, "Customer"),
      entityId: normalizedItemId,
      entityType: "Cart",
    });

    return res.json({
      success: true,
      message: "Cart updated",
      cartData,
    });
  } catch (error) {
    console.log("UPDATE CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET USER CART
// ==============================
const getUserCart = async (req, res) => {
  try {
    const userData = await userModel.findById(req.userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const cartData = normalizeCartData(userData.cartData || {});

    return res.json({
      success: true,
      cartData,
    });
  } catch (error) {
    console.log("GET USER CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// CLEAR CART
// ==============================
const clearCart = async (req, res) => {
  try {
    const userData = await userModel.findById(req.userId);

    if (!userData) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    userData.cartData = {};
    userData.markModified("cartData");
    await userData.save();

    // 🔥 LOG (IMPORTANT ONLY)
    await addLog({
      action: "CART_CLEARED",
      message: "User cleared cart",
      user: getActorName(req, "Customer"),
      entityType: "Cart",
    });

    return res.json({
      success: true,
      message: "Cart cleared",
      cartData: {},
    });
  } catch (error) {
    console.log("CLEAR CART ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export { addToCart, updateCart, getUserCart, clearCart };