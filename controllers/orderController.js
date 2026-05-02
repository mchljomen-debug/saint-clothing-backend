import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Product from "../models/productModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

const normalizeStatus = (status) => {
  const value = String(status || "").trim().toLowerCase();

  if (value === "pending") return "Order Placed";
  if (value === "order placed") return "Order Placed";
  if (value === "packing") return "Packing";
  if (value === "shipped") return "Shipped";
  if (value === "out for delivery") return "Out for Delivery";
  if (value === "delivered") return "Delivered";
  if (value === "pending payment") return "Pending Payment";
  if (value === "payment failed") return "Payment Failed";
  if (value === "cancelled") return "Cancelled";

  return "Order Placed";
};

const normalizePaymentMethod = (method) => {
  const value = String(method || "").trim().toLowerCase();

  if (value === "cod" || value === "cash on delivery") return "COD";
  if (value === "gcash") return "GCash";
  if (value === "maya" || value === "paymaya") return "Maya";
  if (value === "gotyme" || value === "go tyme") return "GoTyme";

  return "COD";
};

const isAdmin = (req) => req.user?.role === "admin";

const normalizeAddress = (address = {}) => ({
  firstName: address?.firstName || "",
  lastName: address?.lastName || "",
  email: address?.email || "",
  phone: address?.phone || "",
  houseUnit: address?.houseUnit || "",
  street: address?.street || "",
  barangay: address?.barangay || "",
  city: address?.city || "",
  province: address?.province || "",
  region: address?.region || "",
  zipcode: address?.zipcode || "",
  country: address?.country || "Philippines",
  latitude:
    address?.latitude !== undefined &&
    address?.latitude !== null &&
    address?.latitude !== ""
      ? Number(address.latitude)
      : null,
  longitude:
    address?.longitude !== undefined &&
    address?.longitude !== null &&
    address?.longitude !== ""
      ? Number(address.longitude)
      : null,
  psgcRegionCode: address?.psgcRegionCode || "",
  psgcProvinceCode: address?.psgcProvinceCode || "",
  psgcMunicipalityCode: address?.psgcMunicipalityCode || "",
  psgcBarangayCode: address?.psgcBarangayCode || "",
});

const getProductImage = (product, item) => {
  if (item?.image && String(item.image).trim()) {
    return String(item.image).trim();
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0];
  }

  if (product?.image && String(product.image).trim()) {
    return String(product.image).trim();
  }

  return "";
};

const getCustomerNameFromOrder = (order) => {
  return (
    `${order?.address?.firstName || ""} ${order?.address?.lastName || ""}`.trim() ||
    "Customer"
  );
};

const getCustomerNameFromAddress = (address) => {
  return (
    `${address?.firstName || ""} ${address?.lastName || ""}`.trim() ||
    "Customer"
  );
};

const getMapValue = (mapLike, key) => {
  const sizeKey = String(key || "").toUpperCase();

  if (mapLike instanceof Map) {
    return Number(mapLike.get(sizeKey) || 0);
  }

  return Number(mapLike?.[sizeKey] || 0);
};

const setMapValue = (product, field, key, value) => {
  const sizeKey = String(key || "").toUpperCase();
  const safeValue = Math.max(0, Number(value) || 0);

  if (product?.[field] instanceof Map) {
    product[field].set(sizeKey, safeValue);
    return;
  }

  product[field] = {
    ...(product[field] || {}),
    [sizeKey]: safeValue,
  };
};

const getStockValue = (product, sizeKey) => getMapValue(product?.stock, sizeKey);

const getPreorderValue = (product, sizeKey) =>
  getMapValue(product?.preorderStock, sizeKey);

const isPreorderMode = (product, sizeKey) => {
  const actualStock = getStockValue(product, sizeKey);
  const preorderStock = getPreorderValue(product, sizeKey);
  const threshold = Number(product?.preorderThreshold ?? 5);

  return (
    product?.preorderEnabled !== false &&
    actualStock <= threshold &&
    preorderStock > 0
  );
};

const shouldShowOrderInLists = (order) => {
  const method = normalizePaymentMethod(order?.paymentMethod);
  const paymentStatus = String(order?.paymentStatus || "")
    .trim()
    .toLowerCase();

  if (method === "COD") return true;

  return ["verifying", "paid", "failed"].includes(paymentStatus);
};

const validateAndNormalizeItems = async (items) => {
  let orderBranch = null;
  const normalizedItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      const err = new Error("Product not found");
      err.statusCode = 404;
      throw err;
    }

    const productBranch = product.branch || "branch1";

    if (!orderBranch) {
      orderBranch = productBranch;
    }

    if (orderBranch !== productBranch) {
      const err = new Error(
        "All items in one checkout must be from the same branch"
      );
      err.statusCode = 400;
      throw err;
    }

    const sizeKey = String(item.size || "S").toUpperCase();
    const quantity = Number(item.quantity || 0);

    if (quantity <= 0) {
      const err = new Error("Invalid quantity");
      err.statusCode = 400;
      throw err;
    }

    const actualStock = getStockValue(product, sizeKey);
    const preorderStock = getPreorderValue(product, sizeKey);
    const preorderMode = isPreorderMode(product, sizeKey);

    if (!preorderMode && actualStock < quantity) {
      const err = new Error(`Not enough stock for ${product.name} (${sizeKey})`);
      err.statusCode = 400;
      throw err;
    }

    if (preorderMode && preorderStock < quantity) {
      const err = new Error(
        `Pre-order stock not enough for ${product.name} (${sizeKey})`
      );
      err.statusCode = 400;
      throw err;
    }

    const savedImage = getProductImage(product, item);

    normalizedItems.push({
      ...item,
      productId: item.productId,
      size: sizeKey,
      quantity,
      price: Number(item.price || product.price || 0),
      onSale: !!item.onSale,
      salePercent: Number(item.salePercent || 0),
      branch: productBranch,
      category: item.category || product.category || "",
      sku: item.sku || product.sku || "",
      groupCode: item.groupCode || product.groupCode || "",
      image: savedImage,
      name: item.name || product.name || "",
      isPreorder: preorderMode,
      expectedRestockDate: product.preorderRestockDate || null,
      preorderNote: product.preorderNote || "",
    });
  }

  return {
    orderBranch: orderBranch || "branch1",
    normalizedItems,
  };
};

const deductOrderStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      const err = new Error("Product not found during stock deduction");
      err.statusCode = 404;
      throw err;
    }

    const sizeKey = String(item.size || "S").toUpperCase();
    const quantity = Number(item.quantity || 0);
    const preorderMode = item.isPreorder || isPreorderMode(product, sizeKey);

    if (preorderMode) {
      const availablePreorder = getPreorderValue(product, sizeKey);

      if (availablePreorder < quantity) {
        const err = new Error(
          `Pre-order stock issue for ${product.name} (${sizeKey})`
        );
        err.statusCode = 400;
        throw err;
      }

      setMapValue(
        product,
        "preorderStock",
        sizeKey,
        availablePreorder - quantity
      );

      await product.save();

      await addLog({
        action: "ORDER_PREORDER_STOCK_DEDUCTED",
        message: `Pre-order stock deducted for order item: ${
          product.name
        } (${sizeKey}) -${quantity}`,
        user: "System",
        entityId: product._id,
        entityType: "Product",
      });
    } else {
      const available = getStockValue(product, sizeKey);

      if (available < quantity) {
        const err = new Error(`Stock issue for ${product.name} (${sizeKey})`);
        err.statusCode = 400;
        throw err;
      }

      setMapValue(product, "stock", sizeKey, available - quantity);

      await product.save();

      await addLog({
        action: "ORDER_STOCK_DEDUCTED",
        message: `Stock deducted for order item: ${
          product.name
        } (${sizeKey}) -${quantity}`,
        user: "System",
        entityId: product._id,
        entityType: "Product",
      });
    }
  }
};

const restoreOrderStock = async (items) => {
  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) continue;

    const sizeKey = String(item.size || "S").toUpperCase();
    const quantity = Number(item.quantity || 0);

    if (item.isPreorder) {
      const availablePreorder = getPreorderValue(product, sizeKey);
      setMapValue(
        product,
        "preorderStock",
        sizeKey,
        availablePreorder + quantity
      );

      await product.save();

      await addLog({
        action: "ORDER_PREORDER_STOCK_RESTORED",
        message: `Pre-order stock restored for order item: ${
          product.name
        } (${sizeKey}) +${quantity}`,
        user: "System",
        entityId: product._id,
        entityType: "Product",
      });
    } else {
      const available = getStockValue(product, sizeKey);
      setMapValue(product, "stock", sizeKey, available + quantity);

      await product.save();

      await addLog({
        action: "ORDER_STOCK_RESTORED",
        message: `Stock restored for order item: ${
          product.name
        } (${sizeKey}) +${quantity}`,
        user: "System",
        entityId: product._id,
        entityType: "Product",
      });
    }
  }
};

const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address, paymentMethod } = req.body;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User identification failed",
      });
    }

    if (!items || !items.length) {
      return res.status(400).json({
        success: false,
        message: "No order items provided",
      });
    }

    const normalizedPaymentMethod = normalizePaymentMethod(paymentMethod);
    const { orderBranch, normalizedItems } = await validateAndNormalizeItems(
      items
    );
    const normalizedAddress = normalizeAddress(address);

    const hasPreorderItems = normalizedItems.some((item) => item.isPreorder);

    const newOrder = new orderModel({
      userId,
      items: normalizedItems,
      address: normalizedAddress,
      amount,
      paymentMethod: normalizedPaymentMethod,
      payment: false,
      paymentStatus:
        normalizedPaymentMethod === "COD" ? "cod_pending" : "pending",
      status:
        normalizedPaymentMethod === "COD"
          ? hasPreorderItems
            ? "Order Placed"
            : "Order Placed"
          : "Pending Payment",
      branch: orderBranch,
      referenceNumber: "",
      paymentProofImage: "",
      isPreorder: hasPreorderItems,
      date: Date.now(),
    });

    await newOrder.save();

    if (normalizedPaymentMethod === "COD") {
      await deductOrderStock(normalizedItems);
      await userModel.findByIdAndUpdate(userId, { cartData: {} });
    }

    await addLog({
      action: hasPreorderItems ? "PREORDER_CREATED" : "ORDER_CREATED",
      message: hasPreorderItems
        ? `Pre-order placed: ${newOrder._id} via ${normalizedPaymentMethod}`
        : `Order placed: ${newOrder._id} via ${normalizedPaymentMethod}`,
      user: getCustomerNameFromAddress(normalizedAddress),
      entityId: newOrder._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: hasPreorderItems
        ? "Pre-order placed successfully"
        : "Order placed successfully",
      orderId: newOrder._id,
      isPreorder: hasPreorderItems,
    });
  } catch (error) {
    console.error("ORDER ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const submitPaymentProof = async (req, res) => {
  try {
    const { orderId, referenceNumber, paymentMethod } = req.body;
    const authUserId = req.userId || req.user?.id || req.user?._id;

    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: "Order ID is required",
      });
    }

    if (!referenceNumber?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Reference number is required",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Payment proof image is required",
      });
    }

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!authUserId || String(order.userId) !== String(authUserId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access to this order",
      });
    }

    const normalizedPaymentMethod = normalizePaymentMethod(
      paymentMethod || order.paymentMethod
    );

    if (!["GCash", "Maya", "GoTyme"].includes(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Only manual payment methods can submit payment proof",
      });
    }

    order.paymentMethod = normalizedPaymentMethod;
    order.referenceNumber = referenceNumber.trim();
    order.paymentProofImage = req.file.filename;
    order.payment = false;
    order.paymentStatus = "verifying";
    order.status = "Pending Payment";

    await order.save();

    await userModel.findByIdAndUpdate(order.userId, { cartData: {} });

    await addLog({
      action: "ORDER_PAYMENT_PROOF_SUBMITTED",
      message: `Payment proof submitted for order: ${order._id} via ${normalizedPaymentMethod}`,
      user: getCustomerNameFromOrder(order),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "Payment proof submitted successfully",
      paymentProofImage: order.paymentProofImage,
      order,
    });
  } catch (error) {
    console.error("SUBMIT PAYMENT PROOF ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const approveManualPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isAdmin(req) && order.branch !== req.user?.branch) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch order",
      });
    }

    const method = normalizePaymentMethod(order.paymentMethod);

    if (!["GCash", "Maya", "GoTyme"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Only manual payment orders can be approved here",
      });
    }

    if (order.payment) {
      return res.json({
        success: true,
        message: "Payment already approved",
      });
    }

    await deductOrderStock(order.items);

    order.payment = true;
    order.paymentStatus = "paid";
    order.status = "Order Placed";
    await order.save();

    await addLog({
      action: order.isPreorder
        ? "PREORDER_MANUAL_PAYMENT_APPROVED"
        : "ORDER_MANUAL_PAYMENT_APPROVED",
      message: order.isPreorder
        ? `Manual payment approved for pre-order: ${order._id}`
        : `Manual payment approved for order: ${order._id}`,
      user: getActorName(req, "Admin"),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: order.isPreorder
        ? "Manual payment approved and pre-order stock deducted"
        : "Manual payment approved and stock deducted",
    });
  } catch (error) {
    console.error("APPROVE MANUAL PAYMENT ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const rejectManualPayment = async (req, res) => {
  try {
    const { orderId } = req.body;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isAdmin(req) && order.branch !== req.user?.branch) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch order",
      });
    }

    const method = normalizePaymentMethod(order.paymentMethod);

    if (!["GCash", "Maya", "GoTyme"].includes(method)) {
      return res.status(400).json({
        success: false,
        message: "Only manual payment orders can be rejected here",
      });
    }

    order.payment = false;
    order.paymentStatus = "failed";
    order.status = "Payment Failed";
    await order.save();

    await addLog({
      action: order.isPreorder
        ? "PREORDER_MANUAL_PAYMENT_REJECTED"
        : "ORDER_MANUAL_PAYMENT_REJECTED",
      message: order.isPreorder
        ? `Manual payment rejected for pre-order: ${order._id}`
        : `Manual payment rejected for order: ${order._id}`,
      user: getActorName(req, "Admin"),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "Manual payment rejected",
    });
  } catch (error) {
    console.error("REJECT MANUAL PAYMENT ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const allOrders = async (req, res) => {
  try {
    const filter = !isAdmin(req) ? { branch: req.user.branch } : {};
    const all = await orderModel.find(filter).sort({ createdAt: -1 });
    const orders = all.filter(shouldShowOrderInLists);

    return res.json({ success: true, orders: orders || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const userOrders = async (req, res) => {
  try {
    const { userId } = req.body;
    const all = await orderModel.find({ userId }).sort({ createdAt: -1 });
    const orders = all.filter(shouldShowOrderInLists);

    return res.json({ success: true, orders: orders || [] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const { orderId, status } = req.body;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (!isAdmin(req) && order.branch !== req.user?.branch) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch order",
      });
    }

    const normalized = normalizeStatus(status);
    order.status = normalized;

    if (normalized === "Delivered" && order.paymentMethod === "COD") {
      order.payment = true;
      order.paymentStatus = "paid";
    }

    await order.save();

    await addLog({
      action: "ORDER_STATUS_UPDATED",
      message: `Order status updated: ${order._id} -> ${normalized}`,
      user: getActorName(req, "Admin"),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({ success: true, message: "Status Updated" });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

const receiveOrder = async (req, res) => {
  try {
    const { orderId, userId } = req.body;

    const order = await orderModel.findOne({ _id: orderId, userId });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const currentStatus = normalizeStatus(order.status);

    if (currentStatus !== "Out for Delivery") {
      return res.status(400).json({
        success: false,
        message: "Only orders out for delivery can be marked as received",
      });
    }

    order.status = "Delivered";

    if (order.paymentMethod === "COD") {
      order.payment = true;
      order.paymentStatus = "paid";
    }

    await order.save();

    await addLog({
      action: "ORDER_RECEIVED",
      message: `Order received by customer: ${order._id}`,
      user: getCustomerNameFromOrder(order),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "Order marked as received",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.body;
    const authUserId = req.userId || req.user?._id || req.user?.id;

    const order = await orderModel.findById(orderId);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (String(order.userId) !== String(authUserId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (["Delivered", "Shipped", "Out for Delivery"].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: "This order can no longer be cancelled",
      });
    }

    if (order.paymentMethod === "COD" && order.status !== "Cancelled") {
      await restoreOrderStock(order.items);
    }

    order.status = "Cancelled";
    order.payment = false;

    if (["GCash", "Maya", "GoTyme"].includes(order.paymentMethod)) {
      order.paymentStatus = "failed";
    }

    await order.save();

    await addLog({
      action: order.isPreorder ? "PREORDER_CANCELLED" : "ORDER_CANCELLED",
      message: order.isPreorder
        ? `Pre-order cancelled: ${order._id}`
        : `Order cancelled: ${order._id}`,
      user: getCustomerNameFromOrder(order),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "Order cancelled successfully",
    });
  } catch (error) {
    console.error("CANCEL ORDER ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
  placeOrder,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
  allOrders,
  userOrders,
  updateStatus,
  receiveOrder,
  cancelOrder,
};