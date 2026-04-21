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

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Branch name and code are required",
      });
    }

    const normalizedName = String(name).trim();
    const normalizedCode = String(code).trim().toLowerCase();

    const existingBranch = await branchModel.findOne({ code: normalizedCode });

    if (existingBranch) {
      return res.status(400).json({
        success: false,
        message: "Branch code already exists",
      });
    }

    const newBranch = new branchModel({
      name: normalizedName,
      code: normalizedCode,
      address: address ? String(address).trim() : "",
      contactNumber: contactNumber ? String(contactNumber).trim() : "",
      managerName: managerName ? String(managerName).trim() : "",
      isActive: true,
    });

    await newBranch.save();

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

    const oldName = existingBranch.name;
    const oldCode = existingBranch.code;
    const oldStatus = existingBranch.isActive;
    const oldManagerName = existingBranch.managerName;
    const oldAddress = existingBranch.address;
    const oldContactNumber = existingBranch.contactNumber;

    existingBranch.name =
      name !== undefined ? String(name).trim() : existingBranch.name;

    existingBranch.address =
      address !== undefined ? String(address).trim() : existingBranch.address;

    existingBranch.contactNumber =
      contactNumber !== undefined
        ? String(contactNumber).trim()
        : existingBranch.contactNumber;

    existingBranch.managerName =
      managerName !== undefined
        ? String(managerName).trim()
        : existingBranch.managerName;

    existingBranch.isActive =
      isActive !== undefined
        ? isActive === true || isActive === "true"
        : existingBranch.isActive;

    await existingBranch.save();

    let updateMessage = `Branch updated: ${existingBranch.name} (${existingBranch.code})`;

    if (oldStatus !== existingBranch.isActive) {
      updateMessage = existingBranch.isActive
        ? `Branch reactivated: ${existingBranch.name} (${existingBranch.code})`
        : `Branch deactivated: ${existingBranch.name} (${existingBranch.code})`;
    } else if (oldName !== existingBranch.name) {
      updateMessage = `Branch renamed: ${oldName} -> ${existingBranch.name} (${oldCode})`;
    } else if (oldManagerName !== existingBranch.managerName) {
      updateMessage = `Branch manager updated: ${existingBranch.name} (${existingBranch.code}) - ${oldManagerName || "None"} -> ${existingBranch.managerName || "None"}`;
    } else if (
      oldAddress !== existingBranch.address ||
      oldContactNumber !== existingBranch.contactNumber
    ) {
      updateMessage = `Branch details updated: ${existingBranch.name} (${existingBranch.code})`;
    }

    await addLog({
      action: "BRANCH_UPDATED",
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