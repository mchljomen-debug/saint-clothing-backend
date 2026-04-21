export const adminOnly = (req, res, next) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin only.",
    });
  }
  next();
};

export const adminOrStaff = (req, res, next) => {
  if (!["admin", "manager", "staff"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied.",
    });
  }
  next();
};

export const adminOrManager = (req, res, next) => {
  if (!["admin", "manager"].includes(req.user.role)) {
    return res.status(403).json({
      success: false,
      message: "Access denied. Admin or manager only.",
    });
  }
  next();
};