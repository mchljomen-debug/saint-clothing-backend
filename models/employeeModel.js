import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin", "manager", "staff"],
      default: "staff",
    },

    branch: {
      type: String,
      default: "branch1",
    },

    isBranchManager: {
      type: Boolean,
      default: false,
    },

    picture: {
      type: String,
      default: "",
    },

    resume: {
      type: String,
      default: "",
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const employeeModel =
  mongoose.models.employee || mongoose.model("employee", employeeSchema);

export default employeeModel;