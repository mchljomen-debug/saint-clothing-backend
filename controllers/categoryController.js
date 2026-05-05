import categoryModel from "../models/categoryModel.js";
import uploadBufferToCloudinary from "../utils/cloudinaryUpload.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

const DEFAULT_CATEGORIES = [
  {
    name: "Tshirt",
    section: "top",
    matchWith: ["Jorts", "Mesh Shorts", "Pants", "Long Sleeve", "Crop Jersey"],
  },
  {
    name: "Long Sleeve",
    section: "top",
    matchWith: ["Tshirt", "Jorts", "Mesh Shorts", "Pants"],
  },
  {
    name: "Jorts",
    section: "bottom",
    matchWith: ["Tshirt", "Long Sleeve", "Crop Jersey"],
  },
  {
    name: "Mesh Shorts",
    section: "bottom",
    matchWith: ["Tshirt", "Long Sleeve", "Crop Jersey"],
  },
  {
    name: "Crop Jersey",
    section: "top",
    matchWith: ["Jorts", "Mesh Shorts", "Pants", "Long Sleeve"],
  },
  {
    name: "Pants",
    section: "bottom",
    matchWith: ["Tshirt", "Long Sleeve", "Crop Jersey"],
  },
];

const escapeRegex = (text) =>
  String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const uploadCategoryImage = async (file) => {
  if (!file?.buffer) return "";

  const result = await uploadBufferToCloudinary(
    file.buffer,
    "saint-clothing/categories"
  );

  return result.secure_url;
};

export const seedDefaultCategories = async () => {
  for (const item of DEFAULT_CATEGORIES) {
    const exists = await categoryModel.findOne({
      name: { $regex: `^${escapeRegex(item.name)}$`, $options: "i" },
    });

    if (!exists) {
      await categoryModel.create({
        ...item,
        isActive: true,
        isDeleted: false,
        deletedAt: null,
        deletedBy: "",
      });
      continue;
    }

    if (exists.isDeleted) continue;

    let changed = false;

    if (!exists.section || exists.section === "other") {
      exists.section = item.section;
      changed = true;
    }

    if (!Array.isArray(exists.matchWith) || exists.matchWith.length === 0) {
      exists.matchWith = item.matchWith;
      changed = true;
    }

    if (changed) await exists.save();
  }
};

export const listCategories = async (req, res) => {
  try {
    await seedDefaultCategories();

    const categories = await categoryModel
      .find({
        isDeleted: { $ne: true },
      })
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("LIST CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name, section = "other", matchWith = "[]" } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const cleanName = name.trim();

    let parsedMatchWith = [];

    try {
      parsedMatchWith = Array.isArray(matchWith)
        ? matchWith
        : JSON.parse(matchWith || "[]");
    } catch {
      parsedMatchWith = [];
    }

    const exists = await categoryModel.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: "i" },
    });

    if (exists && exists.isDeleted) {
      exists.isDeleted = false;
      exists.deletedAt = null;
      exists.deletedBy = "";
      exists.isActive = true;
      exists.section = section;
      exists.matchWith = parsedMatchWith;

      if (req.file) {
        exists.image = await uploadCategoryImage(req.file);
      }

      await exists.save();

      await addLog({
        action: "CATEGORY_RESTORED",
        message: `Category "${exists.name}" restored from trash`,
        user: getActorName(req, "Admin"),
        entityId: exists._id,
        entityType: "Category",
      });

      return res.json({
        success: true,
        message: "Category restored",
        category: exists,
      });
    }

    if (exists && !exists.isActive) {
      exists.isActive = true;
      exists.isDeleted = false;
      exists.deletedAt = null;
      exists.deletedBy = "";
      exists.section = section;
      exists.matchWith = parsedMatchWith;

      if (req.file) {
        exists.image = await uploadCategoryImage(req.file);
      }

      await exists.save();

      await addLog({
        action: "CATEGORY_RESTORED",
        message: `Category "${exists.name}" restored`,
        user: getActorName(req, "Admin"),
        entityId: exists._id,
        entityType: "Category",
      });

      return res.json({
        success: true,
        message: "Category restored",
        category: exists,
      });
    }

    if (exists) {
      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const image = req.file ? await uploadCategoryImage(req.file) : "";

    const category = await categoryModel.create({
      name: cleanName,
      image,
      section,
      matchWith: parsedMatchWith,
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      deletedBy: "",
    });

    await addLog({
      action: "CATEGORY_CREATED",
      message: `Category "${category.name}" created`,
      user: getActorName(req, "Admin"),
      entityId: category._id,
      entityType: "Category",
    });

    return res.json({
      success: true,
      message: "Category added",
      category,
    });
  } catch (error) {
    console.error("ADD CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, section, matchWith } = req.body;

    const category = await categoryModel.findOne({
      _id: id,
      isDeleted: { $ne: true },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const oldName = category.name;

    if (name !== undefined) {
      const cleanName = String(name || "").trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Category name cannot be empty",
        });
      }

      category.name = cleanName;
    }

    if (section !== undefined) {
      category.section = section;
    }

    if (matchWith !== undefined) {
      try {
        category.matchWith = Array.isArray(matchWith)
          ? matchWith
          : JSON.parse(matchWith || "[]");
      } catch {
        category.matchWith = [];
      }
    }

    if (req.file) {
      category.image = await uploadCategoryImage(req.file);
    }

    await category.save();

    await addLog({
      action: "CATEGORY_UPDATED",
      message:
        oldName !== category.name
          ? `Category "${oldName}" updated to "${category.name}"`
          : `Category "${category.name}" updated`,
      user: getActorName(req, "Admin"),
      entityId: category._id,
      entityType: "Category",
    });

    return res.json({
      success: true,
      message: "Category updated",
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (category.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Category is already in trash",
      });
    }

    category.isActive = false;
    category.isDeleted = true;
    category.deletedAt = new Date();
    category.deletedBy = getActorName(req, "Admin");

    await category.save();

    await addLog({
      action: "CATEGORY_DELETED",
      message: `Category "${category.name}" moved to trash`,
      user: getActorName(req, "Admin"),
      entityId: category._id,
      entityType: "Category",
    });

    return res.json({
      success: true,
      message: "Category moved to trash",
      category,
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getDeletedCategories = async (req, res) => {
  try {
    const categories = await categoryModel
      .find({ isDeleted: true })
      .sort({ deletedAt: -1 });

    return res.json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    console.error("GET DELETED CATEGORIES ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const restoreCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!category.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Category is not in trash",
      });
    }

    category.isActive = true;
    category.isDeleted = false;
    category.deletedAt = null;
    category.deletedBy = "";

    await category.save();

    await addLog({
      action: "CATEGORY_RESTORED",
      message: `Category "${category.name}" restored from trash`,
      user: getActorName(req, "Admin"),
      entityId: category._id,
      entityType: "Category",
    });

    return res.json({
      success: true,
      message: "Category restored",
      category,
    });
  } catch (error) {
    console.error("RESTORE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const permanentDeleteCategory = async (req, res) => {
  try {
    const { id } = req.body;

    const category = await categoryModel.findById(id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    if (!category.isDeleted) {
      return res.status(400).json({
        success: false,
        message: "Category must be in trash before permanent delete",
      });
    }

    await categoryModel.findByIdAndDelete(id);

    await addLog({
      action: "CATEGORY_PERMANENTLY_DELETED",
      message: `Category "${category.name}" permanently deleted`,
      user: getActorName(req, "Admin"),
      entityId: category._id,
      entityType: "Category",
    });

    return res.json({
      success: true,
      message: "Category permanently deleted",
    });
  } catch (error) {
    console.error("PERMANENT DELETE CATEGORY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};