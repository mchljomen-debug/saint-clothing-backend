import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import branchModel from "../models/branchModel.js";
import heroModel from "../models/heroModel.js";
import policyModel from "../models/policyModel.js";
import orderModel from "../models/orderModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

const mapTrashItem = (item, type) => ({
  _id: item._id,
  type,
  name:
    item.name ||
    item.title ||
    item.email ||
    item.referenceNumber ||
    String(item._id),
  code: item.code || item.sku || item.groupCode || "",
  status: item.status || "",
  branch: item.branch || "",
  image:
    item.image ||
    item.avatar ||
    item.paymentProofImage ||
    item.images?.[0] ||
    "",
  deletedAt: item.deletedAt || item.updatedAt || item.createdAt,
  raw: item,
});

const modelMap = {
  PRODUCT: productModel,
  USER: userModel,
  BRANCH: branchModel,
  HERO: heroModel,
  POLICY: policyModel,
  ORDER: orderModel,
};

export const getGlobalTrash = async (req, res) => {
  try {
    const [products, users, branches, heroes, policies, orders] =
      await Promise.all([
        productModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
        userModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
        branchModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
        heroModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
        policyModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
        orderModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      ]);

    const trash = [
      ...products.map((item) => mapTrashItem(item, "PRODUCT")),
      ...users.map((item) => mapTrashItem(item, "USER")),
      ...branches.map((item) => mapTrashItem(item, "BRANCH")),
      ...heroes.map((item) => mapTrashItem(item, "HERO")),
      ...policies.map((item) => mapTrashItem(item, "POLICY")),
      ...orders.map((item) => mapTrashItem(item, "ORDER")),
    ].sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    return res.json({
      success: true,
      count: trash.length,
      trash,
    });
  } catch (error) {
    console.log("GET GLOBAL TRASH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load trash",
    });
  }
};

export const restoreTrashItem = async (req, res) => {
  try {
    const { id, type } = req.body;
    const normalizedType = String(type || "").toUpperCase();

    const Model = modelMap[normalizedType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid trash type",
      });
    }

    const item = await Model.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Trash item not found",
      });
    }

    item.isDeleted = false;
    item.deletedAt = null;
    item.deletedBy = "";

    if (normalizedType === "USER") {
      item.isActive = true;
      item.isBlocked = false;
      item.deactivatedAt = null;
      item.blockedAt = null;
    }

    await item.save();

    await addLog({
      action: `${normalizedType}_RESTORED`,
      message: `${normalizedType} restored: ${item.name || item.title || item.email || item._id}`,
      user: getActorName(req, "Admin"),
      entityId: item._id,
      entityType: normalizedType,
    });

    return res.json({
      success: true,
      message: `${normalizedType} restored successfully`,
      item,
    });
  } catch (error) {
    console.log("RESTORE TRASH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to restore item",
    });
  }
};

export const permanentDeleteTrashItem = async (req, res) => {
  try {
    const { id, type } = req.body;
    const normalizedType = String(type || "").toUpperCase();

    const Model = modelMap[normalizedType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid trash type",
      });
    }

    const item = await Model.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Trash item not found",
      });
    }

    await Model.findByIdAndDelete(id);

    await addLog({
      action: `${normalizedType}_PERMANENTLY_DELETED`,
      message: `${normalizedType} permanently deleted: ${item.name || item.title || item.email || item._id}`,
      user: getActorName(req, "Admin"),
      entityId: item._id,
      entityType: normalizedType,
    });

    return res.json({
      success: true,
      message: `${normalizedType} permanently deleted`,
    });
  } catch (error) {
    console.log("PERMANENT DELETE TRASH ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to permanently delete item",
    });
  }
};