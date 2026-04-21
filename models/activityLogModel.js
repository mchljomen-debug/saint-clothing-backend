import mongoose from "mongoose";

const activityLogSchema = new mongoose.Schema(
  {
    action: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    user: { type: String, default: "System", trim: true },
    entityId: { type: mongoose.Schema.Types.ObjectId, default: null },
    entityType: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

const ActivityLog =
  mongoose.models.ActivityLog ||
  mongoose.model("ActivityLog", activityLogSchema);

export default ActivityLog;