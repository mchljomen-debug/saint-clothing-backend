import categoryModel from "../models/categoryModel.js";
import uploadBufferToCloudinary from "../utils/cloudinaryUpload.js";

const DEFAULT_CATEGORIES = [
  "Tshirt",
  "Long Sleeve",
  "Jorts",
  "Mesh Shorts",
  "Crop Jersey",
];

const escapeRegex = (text) => {
  return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

const uploadCategoryImage = async (file) => {
  if (!file?.buffer) return "";

  const result = await uploadBufferToCloudinary(
    file.buffer,
    "saint-clothing/categories"
  );

  return result.secure_url;
};

export const seedDefaultCategories = async () => {
  for (const name of DEFAULT_CATEGORIES) {
    const exists = await categoryModel.findOne({
      name: { $regex: `^${escapeRegex(name)}$`, $options: "i" },
    });

    if (!exists) {
      await categoryModel.create({ name });
    }
  }
};

export const listCategories = async (req, res) => {
  try {
    await seedDefaultCategories();

    const categories = await categoryModel
      .find({ isActive: true })
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      categories,
    });
  } catch (error) {
    console.error("LIST CATEGORIES ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const addCategory = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Category name is required",
      });
    }

    const cleanName = name.trim();

    const exists = await categoryModel.findOne({
      name: { $regex: `^${escapeRegex(cleanName)}$`, $options: "i" },
    });

    if (exists) {
      if (!exists.isActive) {
        exists.isActive = true;

        if (req.file) {
          exists.image = await uploadCategoryImage(req.file);
        }

        await exists.save();

        return res.json({
          success: true,
          message: "Category restored",
          category: exists,
        });
      }

      return res.status(400).json({
        success: false,
        message: "Category already exists",
      });
    }

    const image = req.file ? await uploadCategoryImage(req.file) : "";

    const category = await categoryModel.create({
      name: cleanName,
      image,
    });

    res.json({
      success: true,
      message: "Category added",
      category,
    });
  } catch (error) {
    console.error("ADD CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const updateData = {};

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
        });
      }

      updateData.name = name.trim();
    }

    if (req.file) {
      updateData.image = await uploadCategoryImage(req.file);
    }

    const category = await categoryModel.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: "Category updated",
      category,
    });
  } catch (error) {
    console.error("UPDATE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Category ID is required",
      });
    }

    const category = await categoryModel.findByIdAndUpdate(
      id,
      { isActive: false },
      { new: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    res.json({
      success: true,
      message: "Category removed",
      category,
    });
  } catch (error) {
    console.error("DELETE CATEGORY ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};