import mongoose from "mongoose";

const inventoryLogSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },

    productName: {
      type: String,
      required: true,
      trim: true,
    },

    sku: {
      type: String,
      default: "N/A",
      trim: true,
    },

    branch: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    size: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },

    stockType: {
      type: String,
      enum: ["Actual", "Pre-order"],
      default: "Actual",
    },

    action: {
      type: String,
      enum: ["RESTOCK", "DEDUCT", "ADJUSTMENT", "PREORDER_UPDATE"],
      default: "ADJUSTMENT",
    },

    oldQty: {
      type: Number,
      default: 0,
    },

    newQty: {
      type: Number,
      default: 0,
    },

    difference: {
      type: Number,
      default: 0,
    },

    updatedBy: {
      type: String,
      default: "Admin",
      trim: true,
    },
  },
  { timestamps: true }
);

const inventoryLogModel =
  mongoose.models.inventoryLog ||
  mongoose.model("inventoryLog", inventoryLogSchema);

export default inventoryLogModel;