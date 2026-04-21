import ActivityLog from "../models/activityLogModel.js";

export const getLogs = async (req, res) => {
  try {
    const logs = await ActivityLog.find().sort({ createdAt: -1 }).lean();

    return res.status(200).json({
      success: true,
      count: logs.length,
      logs,
    });
  } catch (err) {
    console.log("GET LOGS ERROR:", err.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch logs",
    });
  }
};