import axios from "axios";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import Product from "../models/productModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";
import uploadBufferToCloudinary from "../utils/cloudinaryUpload.js";

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
  if (value === "paymongo" || value === "online payment") return "PayMongo";

  return "COD";
};

const isOnlinePayment = (method) =>
  ["GCash", "Maya", "GoTyme", "PayMongo"].includes(
    normalizePaymentMethod(method)
  );

const isManualPayment = (method) =>
  ["GCash", "Maya", "GoTyme"].includes(normalizePaymentMethod(method));

const isAdmin = (req) => req.user?.role === "admin";

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

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
  if (item?.image && String(item.image).trim()) return String(item.image).trim();
  if (Array.isArray(product?.images) && product.images.length > 0)
    return product.images[0];
  if (product?.image && String(product.image).trim())
    return String(product.image).trim();

  return "";
};

const getCustomerNameFromOrder = (order) =>
  `${order?.address?.firstName || ""} ${
    order?.address?.lastName || ""
  }`.trim() || "Customer";

const getCustomerNameFromAddress = (address) =>
  `${address?.firstName || ""} ${address?.lastName || ""}`.trim() ||
  "Customer";

const getMapValue = (mapLike, key) => {
  const sizeKey = String(key || "").toUpperCase();

  if (mapLike instanceof Map) return Number(mapLike.get(sizeKey) || 0);

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
  const paymentStatus = String(order?.paymentStatus || "").trim().toLowerCase();

  if (method === "COD") return true;
  if (method === "PayMongo")
    return ["pending", "paid", "failed"].includes(paymentStatus);

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

    if (!orderBranch) orderBranch = productBranch;

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
      image: getProductImage(product, item),
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
    } else {
      const available = getStockValue(product, sizeKey);

      if (available < quantity) {
        const err = new Error(`Stock issue for ${product.name} (${sizeKey})`);
        err.statusCode = 400;
        throw err;
      }

      setMapValue(product, "stock", sizeKey, available - quantity);
    }

    await product.save();

    await addLog({
      action: preorderMode
        ? "ORDER_PREORDER_STOCK_DEDUCTED"
        : "ORDER_STOCK_DEDUCTED",
      message: `${
        preorderMode ? "Pre-order stock" : "Stock"
      } deducted for order item: ${product.name} (${sizeKey}) -${quantity}`,
      user: "System",
      entityId: product._id,
      entityType: "Product",
    });
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
    } else {
      const available = getStockValue(product, sizeKey);
      setMapValue(product, "stock", sizeKey, available + quantity);
    }

    await product.save();

    await addLog({
      action: item.isPreorder
        ? "ORDER_PREORDER_STOCK_RESTORED"
        : "ORDER_STOCK_RESTORED",
      message: `${
        item.isPreorder ? "Pre-order stock" : "Stock"
      } restored for order item: ${product.name} (${sizeKey}) +${quantity}`,
      user: "System",
      entityId: product._id,
      entityType: "Product",
    });
  }
};

const placeOrder = async (req, res) => {
  try {
    const { userId, items, amount, address, paymentMethod, deliveryEstimate } =
      req.body;

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

    if (hasPreorderItems && normalizedPaymentMethod === "COD") {
      return res.status(400).json({
        success: false,
        message:
          "Cash on Delivery is not available for pre-order items. Please use PayMongo.",
      });
    }

    const latestRestockDate = normalizedItems
      .filter((item) => item.isPreorder && item.expectedRestockDate)
      .map((item) => new Date(item.expectedRestockDate))
      .sort((a, b) => b - a)[0];

    const preorderShipDate = hasPreorderItems
      ? addDays(latestRestockDate || new Date(), 2)
      : null;

    const finalDeliveryEstimate = hasPreorderItems
      ? {
          minDays: Number(deliveryEstimate?.minDays || 5),
          maxDays: Number(deliveryEstimate?.maxDays || 7),
          label: "Pre-order delivery",
          range: deliveryEstimate?.range || "",
          shipsOn: preorderShipDate,
        }
      : {
          minDays: Number(deliveryEstimate?.minDays || 0),
          maxDays: Number(deliveryEstimate?.maxDays || 0),
          label: deliveryEstimate?.label || "",
          range: deliveryEstimate?.range || "",
          shipsOn: null,
        };

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
        normalizedPaymentMethod === "COD" ? "Order Placed" : "Pending Payment",
      branch: orderBranch,
      referenceNumber: "",
      paymentProofImage: "",
      paymongoCheckoutId: "",
      paymongoPaymentIntentId: "",
      paymongoPaymentId: "",
      courier: "J&T Express",
      jntTrackingNumber: "",
      jntTrackingUrl: "",
      trackingUpdatedAt: null,
      deliveryProofImage: "",
      deliveryProofNote: "",
      deliveryProofSubmittedAt: null,
      isPreorder: hasPreorderItems,
      deliveryEstimate: finalDeliveryEstimate,
      preorderShipDate,
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
      preorderShipDate,
      deliveryEstimate: finalDeliveryEstimate,
    });
  } catch (error) {
    console.error("ORDER ERROR:", error);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

const createPaymongoCheckout = async (req, res) => {
  try {
    const { orderId } = req.body;
    const authUserId = req.userId || req.user?.id || req.user?._id;

    if (!process.env.PAYMONGO_SECRET_KEY) {
      return res.status(500).json({
        success: false,
        message: "PAYMONGO_SECRET_KEY is missing in backend .env",
      });
    }

    if (!process.env.FRONTEND_URL) {
      return res.status(500).json({
        success: false,
        message: "FRONTEND_URL is missing in backend .env",
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

    if (order.paymentStatus === "paid" || order.payment === true) {
      return res.status(400).json({
        success: false,
        message: "This order is already paid",
      });
    }

    const amountInCentavos = Math.round(Number(order.amount || 0) * 100);

    if (amountInCentavos < 100) {
      return res.status(400).json({
        success: false,
        message: "Invalid PayMongo amount",
      });
    }

    const paymongoResponse = await axios.post(
      "https://api.paymongo.com/v1/checkout_sessions",
      {
        data: {
          attributes: {
            send_email_receipt: true,
            show_description: true,
            show_line_items: true,
            description: `Saint Clothing Order ${order._id}`,
            line_items: [
              {
                currency: "PHP",
                amount: amountInCentavos,
                name: `Saint Clothing Order #${String(order._id)
                  .slice(-8)
                  .toUpperCase()}`,
                quantity: 1,
              },
            ],
            payment_method_types: ["gcash", "paymaya", "card"],
            success_url: `${process.env.FRONTEND_URL}/payment-submitted?orderId=${order._id}`,
            cancel_url: `${process.env.FRONTEND_URL}/orders?payment=cancelled&orderId=${order._id}`,
            metadata: {
              orderId: String(order._id),
            },
          },
        },
      },
      {
        headers: {
          Authorization:
            "Basic " +
            Buffer.from(`${process.env.PAYMONGO_SECRET_KEY}:`).toString(
              "base64"
            ),
          "Content-Type": "application/json",
        },
      }
    );

    const checkoutSession = paymongoResponse.data.data;

    order.paymentMethod = "PayMongo";
    order.paymentStatus = "pending";
    order.status = "Pending Payment";
    order.paymongoCheckoutId = checkoutSession.id;

    await order.save();

    await addLog({
      action: "PAYMONGO_CHECKOUT_CREATED",
      message: `PayMongo checkout created for order: ${order._id}`,
      user: getCustomerNameFromOrder(order),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      checkoutUrl: checkoutSession.attributes.checkout_url,
      checkoutId: checkoutSession.id,
    });
  } catch (error) {
    console.error(
      "CREATE PAYMONGO CHECKOUT ERROR:",
      error.response?.data || error.message
    );

    return res.status(500).json({
      success: false,
      message:
        error.response?.data?.errors?.[0]?.detail ||
        error.response?.data?.errors?.[0]?.message ||
        error.message ||
        "Failed to create PayMongo checkout",
    });
  }
};

const markOrderAsPaidFromPaymongo = async (order, paymentData = {}) => {
  if (!order.payment) {
    await deductOrderStock(order.items);
  }

  order.payment = true;
  order.paymentStatus = "paid";
  order.status = "Order Placed";
  order.paymongoPaymentId = paymentData?.id || order.paymongoPaymentId || "";
  order.paymongoPaymentIntentId =
    paymentData?.attributes?.payment_intent_id ||
    paymentData?.attributes?.payment_intent ||
    order.paymongoPaymentIntentId ||
    "";

  await order.save();

  await userModel.findByIdAndUpdate(order.userId, { cartData: {} });

  await addLog({
    action: order.isPreorder ? "PREORDER_PAYMONGO_PAID" : "ORDER_PAYMONGO_PAID",
    message: order.isPreorder
      ? `PayMongo payment completed for pre-order: ${order._id}`
      : `PayMongo payment completed for order: ${order._id}`,
    user: "PayMongo",
    entityId: order._id,
    entityType: "Order",
  });
};

const paymongoWebhook = async (req, res) => {
  try {
    const event = req.body?.data;
    const eventType = event?.attributes?.type;
    const eventData = event?.attributes?.data;

    console.log("PAYMONGO WEBHOOK EVENT:", eventType);

    const checkoutSessionId =
      eventData?.attributes?.checkout_session_id ||
      eventData?.attributes?.checkout_session ||
      eventData?.id ||
      "";

    const paymentIntentId =
      eventData?.attributes?.payment_intent_id ||
      eventData?.attributes?.payment_intent ||
      "";

    let order = null;

    if (checkoutSessionId) {
      order = await orderModel.findOne({
        paymongoCheckoutId: checkoutSessionId,
      });
    }

    if (!order && paymentIntentId) {
      order = await orderModel.findOne({
        paymongoPaymentIntentId: paymentIntentId,
      });
    }

    if (!order) {
      console.log("PAYMONGO WEBHOOK: Order not found for event");
      return res.json({ success: true });
    }

    if (
      eventType === "checkout_session.payment.paid" ||
      eventType === "payment.paid"
    ) {
      if (order.paymentStatus !== "paid") {
        await markOrderAsPaidFromPaymongo(order, eventData);
      }
    }

    if (
      eventType === "checkout_session.payment.failed" ||
      eventType === "payment.failed"
    ) {
      order.payment = false;
      order.paymentStatus = "failed";
      order.status = "Payment Failed";
      await order.save();
    }

    return res.json({ success: true });
  } catch (error) {
    console.error("PAYMONGO WEBHOOK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const updateTrackingNumber = async (req, res) => {
  try {
    const { orderId, jntTrackingNumber } = req.body;

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

    const cleanTracking = String(jntTrackingNumber || "").trim();

    if (!cleanTracking) {
      return res.status(400).json({
        success: false,
        message: "J&T tracking number is required",
      });
    }

    order.courier = "J&T Express";
    order.jntTrackingNumber = cleanTracking;
    order.jntTrackingUrl = "https://www.jtexpress.ph/track-and-trace";
    order.trackingUpdatedAt = new Date();

    if (["Order Placed", "Packing"].includes(order.status)) {
      order.status = "Shipped";
    }

    await order.save();

    await addLog({
      action: "ORDER_JNT_TRACKING_UPDATED",
      message: `J&T tracking updated for order: ${order._id} - ${cleanTracking}`,
      user: getActorName(req, "Admin"),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "J&T tracking number updated",
      order,
    });
  } catch (error) {
    console.error("UPDATE TRACKING ERROR:", error);
    return res.status(500).json({
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

    if (!req.file?.buffer) {
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

    if (!isManualPayment(normalizedPaymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Only manual payment methods can submit payment proof",
      });
    }

    const uploadedProof = await uploadBufferToCloudinary(
      req.file.buffer,
      "saint-clothing/payment-proofs"
    );

    order.paymentMethod = normalizedPaymentMethod;
    order.referenceNumber = referenceNumber.trim();
    order.paymentProofImage = uploadedProof.secure_url;
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

    if (!isManualPayment(method)) {
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

    if (!isManualPayment(method)) {
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
    const authUserId = req.userId || req.user?._id || req.user?.id;
    const bodyUserId = req.body?.userId;
    const finalUserId = authUserId || bodyUserId;

    const all = await orderModel.find({ userId: finalUserId }).sort({
      createdAt: -1,
    });

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
    const method = normalizePaymentMethod(order.paymentMethod);
    const currentPaymentStatus = String(order.paymentStatus || "")
      .trim()
      .toLowerCase();

    if (
      isOnlinePayment(method) &&
      method !== "COD" &&
      currentPaymentStatus !== "paid" &&
      ["Packing", "Shipped", "Out for Delivery", "Delivered"].includes(
        normalized
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot update delivery. Payment is not paid yet.",
      });
    }

    order.status = normalized;

    if (normalized === "Delivered" && method === "COD") {
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

    return res.json({
      success: true,
      message: "Status Updated",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const receiveOrder = async (req, res) => {
  try {
    const { orderId, deliveryProofNote } = req.body;
    const authUserId = req.userId || req.user?._id || req.user?.id;

    const order = await orderModel.findOne({
      _id: orderId,
      userId: authUserId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const currentStatus = normalizeStatus(order.status);
    const method = normalizePaymentMethod(order.paymentMethod);
    const currentPaymentStatus = String(order.paymentStatus || "")
      .trim()
      .toLowerCase();

    if (currentStatus !== "Out for Delivery") {
      return res.status(400).json({
        success: false,
        message: "Only orders out for delivery can be marked as received",
      });
    }

    if (
      isOnlinePayment(method) &&
      method !== "COD" &&
      currentPaymentStatus !== "paid"
    ) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark as received. Payment is not paid yet.",
      });
    }

    if (!req.file?.buffer) {
      return res.status(400).json({
        success: false,
        message: "Delivery proof photo is required",
      });
    }

    const uploadedProof = await uploadBufferToCloudinary(
      req.file.buffer,
      "saint-clothing/delivery-proofs"
    );

    order.deliveryProofImage = uploadedProof.secure_url;
    order.deliveryProofNote = deliveryProofNote || "";
    order.deliveryProofSubmittedAt = new Date();
    order.status = "Delivered";

    if (method === "COD") {
      order.payment = true;
      order.paymentStatus = "paid";
    }

    await order.save();

    await addLog({
      action: "ORDER_DELIVERY_PROOF_SUBMITTED",
      message: `Delivery proof submitted for order: ${order._id}`,
      user: getCustomerNameFromOrder(order),
      entityId: order._id,
      entityType: "Order",
    });

    return res.json({
      success: true,
      message: "Order marked as received with delivery proof",
      deliveryProofImage: order.deliveryProofImage,
      order,
    });
  } catch (error) {
    console.error("RECEIVE ORDER ERROR:", error);

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

    if (
      order.status !== "Cancelled" &&
      order.paymentStatus !== "pending" &&
      order.paymentStatus !== "failed"
    ) {
      await restoreOrderStock(order.items);
    }

    order.status = "Cancelled";
    order.payment = false;

    if (isOnlinePayment(order.paymentMethod)) {
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
  createPaymongoCheckout,
  paymongoWebhook,
  updateTrackingNumber,
  submitPaymentProof,
  approveManualPayment,
  rejectManualPayment,
  allOrders,
  userOrders,
  updateStatus,
  receiveOrder,
  cancelOrder,
};