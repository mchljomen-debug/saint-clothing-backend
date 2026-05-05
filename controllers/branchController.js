import branchModel from "../models/branchModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

export const getAllBranches = async (req, res) => {
  try {
    const branches = await branchModel
      .find({ isDeleted: { $ne: true } })
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      branches,
    });
  } catch (error) {
    console.log("getAllBranches error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createBranch = async (req, res) => {
  try {
    const { name, code, address, contactNumber, managerName } = req.body;

    const normalizedName = String(name || "").trim();
    const normalizedCode = String(code || "").trim().toLowerCase();

    if (!normalizedName || !normalizedCode) {
      return res.status(400).json({
        success: false,
        message: "Branch name and code are required",
      });
    }

    const existingBranch = await branchModel.findOne({ code: normalizedCode });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch code already exists",
      });
    }

    const newBranch = await branchModel.create({
      name: normalizedName,
      code: normalizedCode,
      address: address ? String(address).trim() : "",
      contactNumber: contactNumber ? String(contactNumber).trim() : "",
      managerName: managerName ? String(managerName).trim() : "",
      isActive: true,
      isDeleted: false,
      deletedAt: null,
      deletedBy: "",
    });

    await addLog({
      action: "BRANCH_CREATED",
      message: `Branch created: ${newBranch.name} (${newBranch.code})`,
      user: getActorName(req, "Admin"),
      entityId: newBranch._id,
      entityType: "Branch",
    });

    return res.json({
      success: true,
      message: "Branch created successfully",
      branch: newBranch,
    });
  } catch (error) {
    console.log("createBranch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contactNumber, managerName, isActive } = req.body;

    const existingBranch = await branchModel.findById(id);

    if (!existingBranch || existingBranch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    const oldBranch = {
      name: existingBranch.name,
      code: existingBranch.code,
      address: existingBranch.address,
      contactNumber: existingBranch.contactNumber,
      managerName: existingBranch.managerName,
      isActive: existingBranch.isActive,
    };

    if (name !== undefined) {
      const cleanName = String(name).trim();

      if (!cleanName) {
        return res.status(400).json({
          success: false,
          message: "Branch name cannot be empty",
        });
      }

      existingBranch.name = cleanName;
    }

    if (address !== undefined) existingBranch.address = String(address).trim();
    if (contactNumber !== undefined)
      existingBranch.contactNumber = String(contactNumber).trim();
    if (managerName !== undefined)
      existingBranch.managerName = String(managerName).trim();

    if (isActive !== undefined) {
      existingBranch.isActive =
        isActive === true || String(isActive).toLowerCase() === "true";
    }

    await existingBranch.save();

    let action = "BRANCH_UPDATED";
    let updateMessage = `Branch updated: ${existingBranch.name} (${existingBranch.code})`;

    if (oldBranch.isActive !== existingBranch.isActive) {
      action = existingBranch.isActive
        ? "BRANCH_REACTIVATED"
        : "BRANCH_DEACTIVATED";

      updateMessage = existingBranch.isActive
        ? `Branch reactivated: ${existingBranch.name} (${existingBranch.code})`
        : `Branch deactivated: ${existingBranch.name} (${existingBranch.code})`;
    } else if (oldBranch.name !== existingBranch.name) {
      action = "BRANCH_RENAMED";
      updateMessage = `Branch renamed: ${oldBranch.name} -> ${existingBranch.name} (${existingBranch.code})`;
    } else if (oldBranch.managerName !== existingBranch.managerName) {
      action = "BRANCH_MANAGER_UPDATED";
      updateMessage = `Branch manager updated: ${existingBranch.name} (${existingBranch.code}) - ${
        oldBranch.managerName || "None"
      } -> ${existingBranch.managerName || "None"}`;
    } else if (
      oldBranch.address !== existingBranch.address ||
      oldBranch.contactNumber !== existingBranch.contactNumber
    ) {
      action = "BRANCH_DETAILS_UPDATED";
      updateMessage = `Branch details updated: ${existingBranch.name} (${existingBranch.code})`;
    }

    await addLog({
      action,
      message: updateMessage,
      user: getActorName(req, "Admin"),
      entityId: existingBranch._id,
      entityType: "Branch",
    });

    return res.json({
      success: true,
      message: "Branch updated successfully",
      branch: existingBranch,
    });
  } catch (error) {
    console.log("updateBranch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const deleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await branchModel.findById(id);

    if (!branch || branch.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    branch.isDeleted = true;
    branch.deletedAt = new Date();
    branch.deletedBy = getActorName(req, "Admin");
    branch.isActive = false;

    await branch.save();

    await addLog({
      action: "BRANCH_DELETED",
      message: `Branch moved to trash: ${branch.name} (${branch.code})`,
      user: getActorName(req, "Admin"),
      entityId: branch._id,
      entityType: "Branch",
    });

    return res.json({
      success: true,
      message: "Branch moved to trash successfully",
      branch,
    });
  } catch (error) {
    console.log("deleteBranch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getDeletedBranches = async (req, res) => {
  try {
    const branches = await branchModel
      .find({ isDeleted: true })
      .sort({ deletedAt: -1 });

    return res.json({
      success: true,
      branches,
    });
  } catch (error) {
    console.log("getDeletedBranches error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const restoreBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await branchModel.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    branch.isDeleted = false;
    branch.deletedAt = null;
    branch.deletedBy = "";
    branch.isActive = true;

    await branch.save();

    await addLog({
      action: "BRANCH_RESTORED",
      message: `Branch restored: ${branch.name} (${branch.code})`,
      user: getActorName(req, "Admin"),
      entityId: branch._id,
      entityType: "Branch",
    });

    return res.json({
      success: true,
      message: "Branch restored successfully",
      branch,
    });
  } catch (error) {
    console.log("restoreBranch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const permanentDeleteBranch = async (req, res) => {
  try {
    const { id } = req.params;

    const branch = await branchModel.findById(id);

    if (!branch) {
      return res.status(404).json({
        success: false,
        message: "Branch not found",
      });
    }

    await branchModel.findByIdAndDelete(id);

    await addLog({
      action: "BRANCH_PERMANENTLY_DELETED",
      message: `Branch permanently deleted: ${branch.name} (${branch.code})`,
      user: getActorName(req, "Admin"),
      entityId: branch._id,
      entityType: "Branch",
    });

    return res.json({
      success: true,
      message: "Branch permanently deleted",
    });
  } catch (error) {
    console.log("permanentDeleteBranch error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};