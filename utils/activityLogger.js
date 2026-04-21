import ActivityLog from "../models/activityLogModel.js";

export const getActorName = (req, fallback = "System") => {
  return (
    req?.user?.name ||
    req?.user?.email ||
    req?.user?.role ||
    fallback
  );
};

export const addLog = async ({
  action,
  message,
  user,
  entityId = null,
  entityType = "",
}) => {
  try {
    if (!action || !message) return;

    await ActivityLog.create({
      action: String(action).trim(),
      message: String(message).trim(),
      user: user ? String(user).trim() : "System",
      entityId,
      entityType: entityType ? String(entityType).trim() : "",
    });
  } catch (err) {
    console.log("LOG ERROR:", err.message);
  }
};