import branchModel from "../models/branchModel.js";
import { addLog, getActorName } from "../utils/activityLogger.js";

// GET ALL BRANCHES
export const getAllBranches = async (req, res) => {
  try {
    const branches = await branchModel.find().sort({ createdAt: -1 });

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

// CREATE BRANCH
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

    const existingBranch = await branchModel.findOne({
      code: normalizedCode,
    });

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

// UPDATE BRANCH
export const updateBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, contactNumber, managerName, isActive } = req.body;

    const existingBranch = await branchModel.findById(id);

    if (!existingBranch) {
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

    if (address !== undefined) {
      existingBranch.address = String(address).trim();
    }

    if (contactNumber !== undefined) {
      existingBranch.contactNumber = String(contactNumber).trim();
    }

    if (managerName !== undefined) {
      existingBranch.managerName = String(managerName).trim();
    }

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