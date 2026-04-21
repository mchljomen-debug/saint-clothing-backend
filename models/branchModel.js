import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    address: { type: String, default: "" },
    contactNumber: { type: String, default: "" },
    managerName: { type: String, default: "" }, 
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const branchModel =
  mongoose.models.branch || mongoose.model("branch", branchSchema);

export default branchModel;