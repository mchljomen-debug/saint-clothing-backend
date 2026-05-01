import Product from "../models/productModel.js";
import branchModel from "../models/branchModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import mongoose from "mongoose";
import { addLog, getActorName } from "../utils/activityLogger.js";
import uploadBufferToCloudinary, {
  uploadProductImageToCloudinary,
} from "../utils/cloudinaryUpload.js";

// ==============================
// HELPERS
// ==============================
const isAdmin = (req) => req.user?.role === "admin";

const normalizeBranchCode = (value) =>
  String(value || "").trim().toLowerCase();

const getBranchFilter = (req) => {
  if (!req.user) return {};
  if (isAdmin(req)) return {};

  const userBranch = normalizeBranchCode(req.user?.branch);
  if (!userBranch) return {};

  return {
    $or: [{ branch: userBranch }, { branch: "all" }],
  };
};

const canAccessProduct = (req, product) => {
  if (!product) return false;
  if (isAdmin(req)) return true;

  const productBranch = normalizeBranchCode(product.branch);
  const userBranch = normalizeBranchCode(req.user?.branch);

  return productBranch === "all" || productBranch === userBranch;
};

const parseBoolean = (value, fallback = false) => {
  if (value === true || value === "true") return true;
  if (value === false || value === "false") return false;
  return fallback;
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const clampSalePercent = (value) => {
  const num = parseNumber(value, 0);
  if (num < 0) return 0;
  if (num > 100) return 100;
  return num;
};

const parseArrayField = (value, fallback = []) => {
  try {
    if (Array.isArray(value)) return value;
    if (typeof value === "string") {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    }
    return fallback;
  } catch {
    return fallback;
  }
};

const normalizeRecommendationSection = (value) => {
  const allowed = ["top", "bottom", "both", "none"];
  const normalized = String(value || "none").trim().toLowerCase();
  return allowed.includes(normalized) ? normalized : "none";
};

const formatProductName = (product) =>
  `${product?.name || "Unknown Product"}${
    product?.sku ? ` (${product.sku})` : ""
  }`;

const resolveBranchCode = async (req, requestedBranch) => {
  if (!isAdmin(req)) {
    const userBranch = normalizeBranchCode(req.user?.branch);
    if (!userBranch) {
      throw new Error("No branch assigned to this account");
    }
    return userBranch;
  }

  const normalizedRequested = normalizeBranchCode(requestedBranch);

  if (!normalizedRequested) {
    throw new Error("Branch is required");
  }

  if (normalizedRequested === "all") {
    return "all";
  }

  const existingBranch = await branchModel.findOne({
    code: normalizedRequested,
    isActive: true,
  });

  if (!existingBranch) {
    throw new Error("Selected branch is invalid or inactive");
  }

  return existingBranch.code;
};

const uploadSingleIfExists = async (
  file,
  folder,
  removeBackground = false
) => {
  if (!file?.buffer) return "";

  const result = removeBackground
    ? await uploadProductImageToCloudinary(file.buffer, folder)
    : await uploadBufferToCloudinary(file.buffer, folder);

  return result.secure_url;
};

// ==============================
// ADD PRODUCT
// ==============================
const addProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      groupCode,
      color,
      colorHex,
      description,
      price,
      category,
      bestseller,
      newArrival,
      sizes,
      stock,
      colors,
      branch,
      onSale,
      salePercent,
      fitType,
      styleVibe,
      recommendationSection,
      styleTags,
      matchWith,
    } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Product name is required",
      });
    }

    if (!sku?.trim()) {
      return res.status(400).json({
        success: false,
        message: "SKU is required",
      });
    }

    if (!category?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category is required",
      });
    }

    const finalBranch = await resolveBranchCode(req, branch);

    const images = [];

    if (req.files?.image1?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image1[0],
        "saint-clothing/products",
        true
      );
      if (url) images.push(url);
    }

    if (req.files?.image2?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image2[0],
        "saint-clothing/products",
        true
      );
      if (url) images.push(url);
    }

    if (req.files?.image3?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image3[0],
        "saint-clothing/products",
        true
      );
      if (url) images.push(url);
    }

    if (req.files?.image4?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image4[0],
        "saint-clothing/products",
        true
      );
      if (url) images.push(url);
    }

    const outfitImage = req.files?.outfitImage?.[0]
      ? await uploadSingleIfExists(
          req.files.outfitImage[0],
          "saint-clothing/outfits",
          true
        )
      : "";

    const model3d = req.files?.model3d?.[0]
      ? await uploadSingleIfExists(
          req.files.model3d[0],
          "saint-clothing/models"
        )
      : "";

    const sizeChartImage = req.files?.sizeChartImage?.[0]
      ? await uploadSingleIfExists(
          req.files.sizeChartImage[0],
          "saint-clothing/size-charts"
        )
      : "";

    const finalOnSale = parseBoolean(onSale, false);
    const finalSalePercent = finalOnSale ? clampSalePercent(salePercent) : 0;

    const parsedStock =
      typeof stock === "string" ? JSON.parse(stock) : stock || {};

    const product = new Product({
      name: String(name).trim(),
      sku: String(sku).trim(),
      groupCode: groupCode ? String(groupCode).trim() : "",
      color: color || "",
      colorHex: colorHex || "",
      description: description || "",
      price: parseNumber(price, 0),
      category: String(category).trim(),
      bestseller: parseBoolean(bestseller, false),
      newArrival: parseBoolean(newArrival, false),
      sizes: parseArrayField(sizes, []),
      stock: parsedStock,
      colors: parseArrayField(colors, []),
      images,
      outfitImage,
      sizeChartImage,
      model3d,
      onSale: finalOnSale,
      salePercent: finalSalePercent,
      branch: finalBranch,
      fitType: fitType || "Regular",
      styleVibe: styleVibe || "Streetwear",
      recommendationSection: normalizeRecommendationSection(
        recommendationSection
      ),
      styleTags: parseArrayField(styleTags, []),
      matchWith: parseArrayField(matchWith, []),
    });

    await product.save();

    await addLog({
      action: "PRODUCT_CREATED",
      message: `Product created: ${formatProductName(product)} in ${
        product.branch
      }`,
      user: getActorName(req, "Admin"),
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Product added successfully",
      product,
    });
  } catch (error) {
    console.error("ADD PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// PUBLIC LIST PRODUCTS
// ==============================
const listProducts = async (req, res) => {
  try {
    const filter = {
      isDeleted: { $ne: true },
    };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("LIST PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// ADMIN / STAFF LIST PRODUCTS
// ==============================
const listAdminProducts = async (req, res) => {
  try {
    const filter = {
      isDeleted: { $ne: true },
      ...getBranchFilter(req),
    };

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("LIST ADMIN PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// GET SINGLE PRODUCT
// ==============================
const getSingleProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined") {
      return res.status(400).json({
        success: false,
        message: "Product ID is missing",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.json({
      success: true,
      product,
    });
  } catch (error) {
    console.error("GET SINGLE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE PRODUCT
// ==============================
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const existingProduct = await Product.findById(id);

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!canAccessProduct(req, existingProduct)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch product",
      });
    }

    const updateData = {};

    if (req.body.name !== undefined)
      updateData.name = String(req.body.name).trim();

    if (req.body.sku !== undefined)
      updateData.sku = String(req.body.sku).trim();

    if (req.body.groupCode !== undefined)
      updateData.groupCode = String(req.body.groupCode).trim();

    if (req.body.color !== undefined) updateData.color = req.body.color;
    if (req.body.colorHex !== undefined) updateData.colorHex = req.body.colorHex;
    if (req.body.description !== undefined)
      updateData.description = req.body.description;
    if (req.body.category !== undefined) updateData.category = req.body.category;

    if (req.body.price !== undefined) {
      updateData.price = parseNumber(req.body.price, existingProduct.price);
    }

    if (req.files?.sizeChartImage?.[0]) {
      updateData.sizeChartImage = await uploadSingleIfExists(
        req.files.sizeChartImage[0],
        "saint-clothing/size-charts"
      );
    }

    if (req.files?.outfitImage?.[0]) {
      updateData.outfitImage = await uploadSingleIfExists(
        req.files.outfitImage[0],
        "saint-clothing/outfits",
        true
      );
    }

    if (req.body.sizes !== undefined) {
      updateData.sizes = parseArrayField(
        req.body.sizes,
        existingProduct.sizes || []
      );
    }

    if (req.body.stock !== undefined) {
      updateData.stock =
        typeof req.body.stock === "string"
          ? JSON.parse(req.body.stock)
          : req.body.stock;
    }

    if (req.body.colors !== undefined) {
      updateData.colors = parseArrayField(
        req.body.colors,
        existingProduct.colors || []
      );
    }

    if (req.body.bestseller !== undefined) {
      updateData.bestseller = parseBoolean(
        req.body.bestseller,
        existingProduct.bestseller
      );
    }

    if (req.body.newArrival !== undefined) {
      updateData.newArrival = parseBoolean(
        req.body.newArrival,
        existingProduct.newArrival
      );
    }

    const nextOnSale =
      req.body.onSale !== undefined
        ? parseBoolean(req.body.onSale, existingProduct.onSale)
        : existingProduct.onSale;

    const nextSalePercent =
      req.body.salePercent !== undefined
        ? clampSalePercent(req.body.salePercent)
        : existingProduct.salePercent || 0;

    updateData.onSale = nextOnSale;
    updateData.salePercent = nextOnSale ? nextSalePercent : 0;

    if (req.body.branch !== undefined) {
      updateData.branch = await resolveBranchCode(req, req.body.branch);
    } else {
      updateData.branch = existingProduct.branch;
    }

    if (req.body.fitType !== undefined) {
      updateData.fitType =
        req.body.fitType || existingProduct.fitType || "Regular";
    }

    if (req.body.styleVibe !== undefined) {
      updateData.styleVibe =
        req.body.styleVibe || existingProduct.styleVibe || "Streetwear";
    }

    if (req.body.recommendationSection !== undefined) {
      updateData.recommendationSection = normalizeRecommendationSection(
        req.body.recommendationSection
      );
    }

    if (req.body.styleTags !== undefined) {
      updateData.styleTags = parseArrayField(
        req.body.styleTags,
        existingProduct.styleTags || []
      );
    }

    if (req.body.matchWith !== undefined) {
      updateData.matchWith = parseArrayField(
        req.body.matchWith,
        existingProduct.matchWith || []
      );
    }

    const newImages = [];

    if (req.files?.image1?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image1[0],
        "saint-clothing/products",
        true
      );
      if (url) newImages.push(url);
    }

    if (req.files?.image2?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image2[0],
        "saint-clothing/products",
        true
      );
      if (url) newImages.push(url);
    }

    if (req.files?.image3?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image3[0],
        "saint-clothing/products",
        true
      );
      if (url) newImages.push(url);
    }

    if (req.files?.image4?.[0]) {
      const url = await uploadSingleIfExists(
        req.files.image4[0],
        "saint-clothing/products",
        true
      );
      if (url) newImages.push(url);
    }

    if (newImages.length > 0) {
      updateData.images = newImages;
    }

    if (req.files?.model3d?.[0]) {
      updateData.model3d = await uploadSingleIfExists(
        req.files.model3d[0],
        "saint-clothing/models"
      );
    }

    const updatedProduct = await Product.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    await addLog({
      action: "PRODUCT_UPDATED",
      message: `Product updated: ${formatProductName(updatedProduct)} in ${
        updatedProduct.branch
      }`,
      user: getActorName(req, "Admin"),
      entityId: updatedProduct._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    console.error("UPDATE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DELETE PRODUCT
// ==============================
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!canAccessProduct(req, product)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch product",
      });
    }

    await Product.findByIdAndUpdate(
      id,
      { isDeleted: true, deletedAt: new Date() },
      { new: true }
    );

    await addLog({
      action: "PRODUCT_DELETED",
      message: `Product moved to trash: ${formatProductName(product)}`,
      user: getActorName(req, "Admin"),
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Product moved to trash",
    });
  } catch (error) {
    console.error("DELETE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// RESTORE PRODUCT
// ==============================
const restoreProduct = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!canAccessProduct(req, product)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch product",
      });
    }

    await Product.findByIdAndUpdate(
      id,
      { isDeleted: false, deletedAt: null },
      { new: true }
    );

    await addLog({
      action: "PRODUCT_RESTORED",
      message: `Product restored: ${formatProductName(product)}`,
      user: getActorName(req, "Admin"),
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Product restored successfully",
    });
  } catch (error) {
    console.error("RESTORE PRODUCT ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// PERMANENT DELETE
// ==============================
const permanentDelete = async (req, res) => {
  try {
    const { id } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!canAccessProduct(req, product)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch product",
      });
    }

    await Product.findByIdAndDelete(id);

    await addLog({
      action: "PRODUCT_PERMANENTLY_DELETED",
      message: `Product permanently deleted: ${formatProductName(product)}`,
      user: getActorName(req, "Admin"),
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Product permanently deleted",
    });
  } catch (error) {
    console.error("PERMANENT DELETE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// LIST DELETED PRODUCTS
// ==============================
const listDeletedProducts = async (req, res) => {
  try {
    const filter = {
      isDeleted: true,
      ...getBranchFilter(req),
    };

    const products = await Product.find(filter).sort({ deletedAt: -1 });

    return res.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error("LIST DELETED PRODUCTS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// UPDATE STOCK
// ==============================
const updateStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock } = req.body;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!canAccessProduct(req, product)) {
      return res.status(403).json({
        success: false,
        message: "Access denied for this branch product",
      });
    }

    product.stock = stock || {};
    await product.save();

    await addLog({
      action: "PRODUCT_STOCK_UPDATED",
      message: `Stock updated for: ${formatProductName(product)}`,
      user: getActorName(req, "Admin"),
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Stock updated successfully",
      product,
    });
  } catch (error) {
    console.error("UPDATE STOCK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// DEDUCT STOCK
// ==============================
const deductStock = async (req, res) => {
  try {
    const { items } = req.body;

    if (!Array.isArray(items) || !items.length) {
      return res.status(400).json({
        success: false,
        message: "Items are required",
      });
    }

    for (const item of items) {
      const { productId, size, quantity } = item;

      const product = await Product.findById(productId);

      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product not found`,
        });
      }

      const sizeKey = String(size || "").toUpperCase();
      const currentQty = Number(product.stock.get(sizeKey) || 0);

      if (currentQty < Number(quantity)) {
        return res.status(400).json({
          success: false,
          message: `Not enough stock for ${product.name} (${sizeKey})`,
        });
      }
    }

    for (const item of items) {
      const { productId, size, quantity } = item;

      const product = await Product.findById(productId);
      const sizeKey = String(size || "").toUpperCase();
      const currentQty = Number(product.stock.get(sizeKey) || 0);

      product.stock.set(sizeKey, currentQty - Number(quantity));
      await product.save();

      await addLog({
        action: "PRODUCT_STOCK_DEDUCTED",
        message: `Stock deducted: ${product.name} (${sizeKey}) -${Number(
          quantity
        )}`,
        user: getActorName(req, "System"),
        entityId: product._id,
        entityType: "Product",
      });
    }

    return res.json({
      success: true,
      message: "Stock deducted successfully",
    });
  } catch (error) {
    console.error("DEDUCT STOCK ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// CAN USER REVIEW PRODUCT
// ==============================
const canUserReviewProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.userId || req.body.userId || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const deliveredOrder = await orderModel.findOne({
      userId,
      status: "Delivered",
      "items.productId": id,
    });

    if (!deliveredOrder) {
      return res.json({
        success: true,
        canReview: false,
      });
    }

    const product = await Product.findById(id);
    const alreadyReviewed = product?.reviews?.some(
      (review) => String(review.userId) === String(userId)
    );

    return res.json({
      success: true,
      canReview: !alreadyReviewed,
    });
  } catch (error) {
    console.error("CAN REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// ==============================
// ADD REVIEW
// ==============================
const addReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId || req.body.userId || req.user?._id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!rating || !comment?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Rating and comment are required",
      });
    }

    const product = await Product.findById(id);

    if (!product || product.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const deliveredOrder = await orderModel.findOne({
      userId,
      status: "Delivered",
      "items.productId": id,
    });

    if (!deliveredOrder) {
      return res.status(400).json({
        success: false,
        message: "You can only review delivered products you purchased",
      });
    }

    const alreadyReviewed = product.reviews.some(
      (review) => String(review.userId) === String(userId)
    );

    if (alreadyReviewed) {
      return res.status(400).json({
        success: false,
        message: "You already reviewed this product",
      });
    }

    const userData = await userModel.findById(userId).lean();

    const userName =
      userData?.name?.trim() ||
      (userData?.email ? userData.email.split("@")[0] : "") ||
      "Verified Buyer";

    const newReview = {
      userId,
      name: userName,
      rating: Number(rating),
      comment: comment.trim(),
      date: Date.now(),
    };

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $push: { reviews: newReview } },
      { new: true }
    );

    await addLog({
      action: "PRODUCT_REVIEW_ADDED",
      message: `Review added for ${formatProductName(product)} by ${userName}`,
      user: userName,
      entityId: product._id,
      entityType: "Product",
    });

    return res.json({
      success: true,
      message: "Review submitted successfully",
      reviews: updatedProduct.reviews,
    });
  } catch (error) {
    console.error("ADD REVIEW ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export {
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
};