import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";
import employeeModel from "../models/employeeModel.js";
import branchModel from "../models/branchModel.js";
import categoryModel from "../models/categoryModel.js";
import heroModel from "../models/heroModel.js";
import policyModel from "../models/policyModel.js";
import orderModel from "../models/orderModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

const normalizeValue = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (value?._id) return String(value._id);
  if (value?.name) return String(value.name);
  if (value?.code) return String(value.code);
  return "";
};

const getItemName = (item, type) => {
  if (type === "ORDER") {
    return item.referenceNumber
      ? `Order ${item.referenceNumber}`
      : `Order #${String(item._id).slice(-8).toUpperCase()}`;
  }

  if (type === "POLICY") {
    return item.title || item.name || "Policy";
  }

  if (type === "HERO") {
    return item.title || item.name || item.heading || "Hero Content";
  }

  if (type === "CATEGORY") {
    return item.name || item.title || "Category";
  }

  if (type === "EMPLOYEE") {
    return item.name || item.fullName || item.email || "Employee";
  }

  if (type === "USER") {
    return item.name || item.fullName || item.email || "User";
  }

  if (type === "BRANCH") {
    return item.name || item.code || "Branch";
  }

  return item.name || item.title || item.email || String(item._id);
};

const getItemCode = (item, type) => {
  if (type === "ORDER") {
    return item.referenceNumber || String(item._id).slice(-8).toUpperCase();
  }

  return item.code || item.sku || item.groupCode || item.slug || "";
};

const getItemBranch = (item) => {
  if (Array.isArray(item.branches) && item.branches.length) {
    return item.branches.map((branch) => normalizeValue(branch)).filter(Boolean).join(", ");
  }

  return normalizeValue(item.branch);
};

const getItemImage = (item, type) => {
  if (type === "ORDER") {
    if (item.deliveryProofImage) return item.deliveryProofImage;
    if (item.paymentProofImage) return item.paymentProofImage;
    if (Array.isArray(item.items) && item.items.length) {
      const firstItem = item.items.find((orderItem) => orderItem?.image);
      if (firstItem?.image) return firstItem.image;
    }
  }

  if (item.image) return item.image;
  if (item.avatar) return item.avatar;
  if (item.paymentProofImage) return item.paymentProofImage;
  if (Array.isArray(item.images) && item.images.length) return item.images[0];
  if (item.desktopImage) return item.desktopImage;
  if (item.mobileImage) return item.mobileImage;
  return "";
};

const getTrashDate = (item, type) => {
  if (type === "ORDER") {
    return item.deliveryProofSubmittedAt || item.updatedAt || item.createdAt || item.date;
  }

  return item.deletedAt || item.updatedAt || item.createdAt;
};

const mapTrashItem = (item, type) => ({
  _id: item._id,
  type,
  name: getItemName(item, type),
  code: getItemCode(item, type),
  status: item.status || item.role || item.category || "",
  branch: getItemBranch(item),
  image: getItemImage(item, type),
  deletedAt: getTrashDate(item, type),
  isDeliveredOrder: type === "ORDER",
  raw: item
});

const modelMap = {
  PRODUCT: productModel,
  USER: userModel,
  EMPLOYEE: employeeModel,
  BRANCH: branchModel,
  CATEGORY: categoryModel,
  HERO: heroModel,
  POLICY: policyModel
};

const restoreCommonFields = (item) => {
  if ("isDeleted" in item) item.isDeleted = false;
  if ("deletedAt" in item) item.deletedAt = null;
  if ("deletedBy" in item) item.deletedBy = "";
};

const restoreUserFields = (item) => {
  if ("isActive" in item) item.isActive = true;
  if ("isBlocked" in item) item.isBlocked = false;
  if ("deactivatedAt" in item) item.deactivatedAt = null;
  if ("blockedAt" in item) item.blockedAt = null;
};

const restoreEmployeeFields = (item) => {
  if ("isActive" in item) item.isActive = true;
  if ("isBlocked" in item) item.isBlocked = false;
  if ("deactivatedAt" in item) item.deactivatedAt = null;
  if ("blockedAt" in item) item.blockedAt = null;
};

const restoreBranchFields = (item) => {
  if ("isActive" in item) item.isActive = true;
};

const restoreCategoryFields = (item) => {
  if ("isActive" in item) item.isActive = true;
};

const restoreHeroFields = (item) => {
  if ("isActive" in item) item.isActive = true;
};

const restorePolicyFields = (item) => {
  if ("isActive" in item) item.isActive = true;
};

export const getGlobalTrash = async (req, res) => {
  try {
    const [
      products,
      users,
      employees,
      branches,
      categories,
      heroes,
      policies,
      orders
    ] = await Promise.all([
      productModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      userModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      employeeModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      branchModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      categoryModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      heroModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      policyModel.find({ isDeleted: true }).sort({ deletedAt: -1 }),
      orderModel.find({ status: "Delivered" }).sort({ updatedAt: -1 })
    ]);

    const trash = [
      ...products.map((item) => mapTrashItem(item, "PRODUCT")),
      ...users.map((item) => mapTrashItem(item, "USER")),
      ...employees.map((item) => mapTrashItem(item, "EMPLOYEE")),
      ...branches.map((item) => mapTrashItem(item, "BRANCH")),
      ...categories.map((item) => mapTrashItem(item, "CATEGORY")),
      ...heroes.map((item) => mapTrashItem(item, "HERO")),
      ...policies.map((item) => mapTrashItem(item, "POLICY")),
      ...orders.map((item) => mapTrashItem(item, "ORDER"))
    ].sort((a, b) => new Date(b.deletedAt || 0) - new Date(a.deletedAt || 0));

    const counts = trash.reduce((acc, item) => {
      acc[item.type] = (acc[item.type] || 0) + 1;
      return acc;
    }, {});

    return res.json({
      success: true,
      count: trash.length,
      counts,
      trash
    });
  } catch (error) {
    console.log("GET GLOBAL TRASH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load trash"
    });
  }
};

export const restoreTrashItem = async (req, res) => {
  try {
    const { id, type } = req.body;
    const normalizedType = String(type || "").trim().toUpperCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Trash item ID is required"
      });
    }

    if (normalizedType === "ORDER") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders are completed records and cannot be restored"
      });
    }

    const Model = modelMap[normalizedType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid trash type"
      });
    }

    const item = await Model.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Trash item not found"
      });
    }

    if (item.isDeleted !== true) {
      return res.status(400).json({
        success: false,
        message: `${normalizedType} is not currently in trash`
      });
    }

    restoreCommonFields(item);

    if (normalizedType === "USER") restoreUserFields(item);
    if (normalizedType === "EMPLOYEE") restoreEmployeeFields(item);
    if (normalizedType === "BRANCH") restoreBranchFields(item);
    if (normalizedType === "CATEGORY") restoreCategoryFields(item);
    if (normalizedType === "HERO") restoreHeroFields(item);
    if (normalizedType === "POLICY") restorePolicyFields(item);

    await item.save();

    await addLog({
      action: `${normalizedType}_RESTORED`,
      message: `${normalizedType} restored: ${getItemName(item, normalizedType)}`,
      user: getActorName(req, "Admin"),
      entityId: item._id,
      entityType: normalizedType
    });

    return res.json({
      success: true,
      message: `${normalizedType} restored successfully`,
      item
    });
  } catch (error) {
    console.log("RESTORE TRASH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to restore item"
    });
  }
};

export const permanentDeleteTrashItem = async (req, res) => {
  try {
    const { id, type } = req.body;
    const normalizedType = String(type || "").trim().toUpperCase();

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Trash item ID is required"
      });
    }

    if (normalizedType === "ORDER") {
      return res.status(400).json({
        success: false,
        message: "Delivered orders are completed records and cannot be permanently deleted"
      });
    }

    const Model = modelMap[normalizedType];

    if (!Model) {
      return res.status(400).json({
        success: false,
        message: "Invalid trash type"
      });
    }

    const item = await Model.findById(id);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Trash item not found"
      });
    }

    if (item.isDeleted !== true) {
      return res.status(400).json({
        success: false,
        message: `${normalizedType} is not currently in trash`
      });
    }

    const itemName = getItemName(item, normalizedType);
    const entityId = item._id;

    await Model.findByIdAndDelete(id);

    await addLog({
      action: `${normalizedType}_PERMANENTLY_DELETED`,
      message: `${normalizedType} permanently deleted: ${itemName}`,
      user: getActorName(req, "Admin"),
      entityId,
      entityType: normalizedType
    });

    return res.json({
      success: true,
      message: `${normalizedType} permanently deleted`
    });
  } catch (error) {
    console.log("PERMANENT DELETE TRASH ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Failed to permanently delete item"
    });
  }
};