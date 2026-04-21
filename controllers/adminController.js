import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import userModel from "../models/userModel.js";
import employeeModel from "../models/employeeModel.js";
import branchModel from "../models/branchModel.js";
import jwt from "jsonwebtoken";
import XLSX from "xlsx";
import { addLog, getActorName } from "../utils/activityLogger.js";

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEK_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const toNumber = (value) => Number(value) || 0;

const getProductStockTotal = (product) => {
  if (!product?.stock) return 0;

  if (typeof product.stock === "number") {
    return Number(product.stock) || 0;
  }

  if (typeof product.stock === "object") {
    return Object.values(product.stock).reduce(
      (sum, qty) => sum + (Number(qty) || 0),
      0
    );
  }

  return 0;
};

const isSameDay = (dateA, dateB) => {
  const a = new Date(dateA);
  const b = new Date(dateB);

  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
};

const getOrderDate = (order) =>
  new Date(order.date || order.createdAt || new Date());

const filterOrdersByBranchFromItems = (orders, branch) => {
  return orders.filter((order) =>
    (order.items || []).some((item) => (item.branch || "") === branch)
  );
};

const sanitizeAdminUser = (user) => ({
  _id: user._id,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  name: user.name || "",
  email: user.email || "",
  avatar: user.avatar || "",
  phone: user.phone || "",
  address: user.address || {},
  isVerified: user.isVerified || false,
  isBlocked: user.isBlocked || false,
  isActive: user.isActive !== false,
  isDeleted: user.isDeleted || false,
  blockedAt: user.blockedAt || null,
  deactivatedAt: user.deactivatedAt || null,
  deletedAt: user.deletedAt || null,
  lastLoginAt: user.lastLoginAt || null,
  lastSeenAt: user.lastSeenAt || null,
  createdAt: user.createdAt || null,
  updatedAt: user.updatedAt || null,
});

const buildDashboardData = async (user) => {
  const isAdmin = user.role === "admin";
  const branchCode = user.branch || "all";

  let products = await productModel.find({}).sort({ createdAt: -1 });
  let orders = await orderModel.find({}).sort({ date: -1, createdAt: -1 });
  let users = isAdmin
    ? await userModel.find({ isDeleted: { $ne: true } }).sort({ createdAt: -1 })
    : [];
  const employees = isAdmin
    ? await employeeModel.find({}).sort({ createdAt: -1 })
    : await employeeModel.find({ branch: branchCode }).sort({ createdAt: -1 });

  if (!isAdmin) {
    products = products.filter((p) => (p.branch || "") === branchCode);
    orders = filterOrdersByBranchFromItems(orders, branchCode);
  }

  const paidOrders = orders.filter(
    (order) => order.payment === true || order.payment === "true"
  );

  const totalRevenue = paidOrders.reduce(
    (sum, order) => sum + toNumber(order.amount),
    0
  );
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalUsers = isAdmin ? users.length : 0;
  const totalEmployees = employees.length;

  const lowStockProducts = products
    .map((p) => ({
      _id: p._id,
      name: p.name,
      category: p.category || "Uncategorized",
      subCategory: p.subCategory || "Uncategorized",
      branch: p.branch || "main",
      price: toNumber(p.price),
      stock: getProductStockTotal(p),
      image: Array.isArray(p.image) ? p.image[0] : "",
    }))
    .filter((p) => p.stock <= 10)
    .sort((a, b) => a.stock - b.stock);

  const categoryMap = {};
  const subCategoryMap = {};
  products.forEach((product) => {
    const category = product.category || "Uncategorized";
    const subCategory = product.subCategory || "Uncategorized";
    categoryMap[category] = (categoryMap[category] || 0) + 1;
    subCategoryMap[subCategory] = (subCategoryMap[subCategory] || 0) + 1;
  });

  const productSalesMap = {};
  orders.forEach((order) => {
    (order.items || []).forEach((item) => {
      if (!isAdmin && (item.branch || "") !== branchCode) return;

      const name = item.name || item.productName || "Unknown Product";
      const quantity = toNumber(item.quantity);
      const revenue = toNumber(item.price) * quantity;

      if (!productSalesMap[name]) {
        productSalesMap[name] = { name, sold: 0, revenue: 0 };
      }

      productSalesMap[name].sold += quantity;
      productSalesMap[name].revenue += revenue;
    });
  });

  const topProducts = Object.values(productSalesMap)
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 8);

  const recentOrders = orders.slice(0, 8);

  const today = new Date();
  const weeklyLabels = [];
  const weeklyData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);

    const label = WEEK_NAMES[d.getDay()];
    const dayTotal = paidOrders
      .filter((order) => isSameDay(getOrderDate(order), d))
      .reduce((sum, order) => sum + toNumber(order.amount), 0);

    weeklyLabels.push(label);
    weeklyData.push(dayTotal);
  }

  const monthlyLabels = [];
  const monthlyRevenue = [];
  const monthlyNetProfit = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const month = d.getMonth();
    const year = d.getFullYear();

    const monthlyOrders = paidOrders.filter((order) => {
      const od = getOrderDate(order);
      return od.getMonth() === month && od.getFullYear() === year;
    });

    const revenue = monthlyOrders.reduce(
      (sum, order) => sum + toNumber(order.amount),
      0
    );
    const profit = Math.floor(revenue * 0.3);

    monthlyLabels.push(MONTH_NAMES[month]);
    monthlyRevenue.push(revenue);
    monthlyNetProfit.push(profit);
  }

  const netProfit = monthlyNetProfit.reduce((sum, value) => sum + value, 0);
  const netProfitMargin =
    totalRevenue > 0 ? Math.floor((netProfit / totalRevenue) * 100) : 0;

  const branchSummaryMap = {};

  if (isAdmin) {
    products.forEach((product) => {
      const code = product.branch || "main";

      if (!branchSummaryMap[code]) {
        branchSummaryMap[code] = {
          branch: code,
          products: 0,
          revenue: 0,
          orders: 0,
        };
      }

      branchSummaryMap[code].products += 1;
    });

    orders.forEach((order) => {
      const countedBranches = new Set();

      (order.items || []).forEach((item) => {
        const code = item.branch || "main";

        if (!branchSummaryMap[code]) {
          branchSummaryMap[code] = {
            branch: code,
            products: 0,
            revenue: 0,
            orders: 0,
          };
        }

        branchSummaryMap[code].revenue +=
          toNumber(item.price) * toNumber(item.quantity);

        if (!countedBranches.has(code)) {
          branchSummaryMap[code].orders += 1;
          countedBranches.add(code);
        }
      });
    });
  }

  return {
    stats: {
      totalRevenue,
      totalOrders,
      totalProducts,
      totalUsers,
      totalEmployees,
      netProfit,
      netProfitMargin,
      lowStockCount: lowStockProducts.length,
    },
    weeklySales: {
      labels: weeklyLabels,
      data: weeklyData,
    },
    monthlySales: {
      labels: monthlyLabels,
      revenue: monthlyRevenue,
      netProfit: monthlyNetProfit,
    },
    categorySales: {
      labels: Object.keys(categoryMap),
      data: Object.values(categoryMap),
    },
    subCategorySales: {
      labels: Object.keys(subCategoryMap),
      data: Object.values(subCategoryMap),
    },
    recentOrders,
    topProducts,
    lowStockProducts,
    branchSummary: Object.values(branchSummaryMap),
  };
};

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    const cleanEmail = email?.toLowerCase().trim();
    const cleanPassword = String(password || "").trim();

    if (
      cleanEmail === process.env.ADMIN_EMAIL?.toLowerCase().trim() &&
      cleanPassword === String(process.env.ADMIN_PASSWORD || "").trim()
    ) {
      const token = jwt.sign(
        {
          email: cleanEmail,
          role: "admin",
          branch: "all",
          name: "Main Admin",
        },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );

      await addLog({
        action: "ADMIN_LOGIN",
        message: `Admin logged in: ${cleanEmail}`,
        user: "Main Admin",
        entityType: "Admin",
      });

      return res.json({
        success: true,
        token,
        user: {
          name: "Main Admin",
          email: cleanEmail,
          role: "admin",
          branch: "all",
        },
      });
    }

    const employee = await employeeModel.findOne({
      email: cleanEmail,
      isActive: true,
    });

    if (!employee) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (String(employee.password).trim() !== cleanPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid credentials",
      });
    }

    if (employee.role === "staff") {
      return res.status(403).json({
        success: false,
        message:
          "Staff accounts are not allowed to log in to the administration panel.",
      });
    }

    const userRole = employee.role;
    const userBranch = userRole === "admin" ? "all" : employee.branch;

    const token = jwt.sign(
      {
        id: employee._id,
        email: employee.email,
        role: userRole,
        branch: userBranch,
        name: employee.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    await addLog({
      action: "ADMIN_LOGIN",
      message: `Admin panel login: ${employee.name}`,
      user: employee.name,
      entityId: employee._id,
      entityType: "Employee",
    });

    return res.json({
      success: true,
      token,
      user: {
        id: employee._id,
        name: employee.name,
        email: employee.email,
        role: userRole,
        branch: userBranch,
      },
    });
  } catch (err) {
    console.log("adminLogin error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const getDashboardStats = async (req, res) => {
  try {
    const dashboardData = await buildDashboardData(req.user);

    return res.json({
      success: true,
      ...dashboardData,
    });
  } catch (err) {
    console.log("getDashboardStats error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const exportDashboardExcel = async (req, res) => {
  try {
    const dashboardData = await buildDashboardData(req.user);

    const workbook = XLSX.utils.book_new();

    const overviewSheet = XLSX.utils.json_to_sheet([
      {
        View: req.user.role === "admin" ? "Admin" : "Branch",
        Branch: req.user.role === "admin" ? "All Branches" : req.user.branch,
        Total_Revenue: dashboardData.stats.totalRevenue,
        Total_Orders: dashboardData.stats.totalOrders,
        Total_Products: dashboardData.stats.totalProducts,
        Total_Users: dashboardData.stats.totalUsers,
        Total_Employees: dashboardData.stats.totalEmployees,
        Net_Profit: dashboardData.stats.netProfit,
        Net_Profit_Margin: `${dashboardData.stats.netProfitMargin}%`,
        Low_Stock_Count: dashboardData.stats.lowStockCount,
      },
    ]);

    const weeklySheet = XLSX.utils.json_to_sheet(
      dashboardData.weeklySales.labels.map((label, index) => ({
        Day: label,
        Sales: dashboardData.weeklySales.data[index] || 0,
      }))
    );

    const monthlySheet = XLSX.utils.json_to_sheet(
      dashboardData.monthlySales.labels.map((label, index) => ({
        Month: label,
        Revenue: dashboardData.monthlySales.revenue[index] || 0,
        Net_Profit: dashboardData.monthlySales.netProfit[index] || 0,
      }))
    );

    const categorySheet = XLSX.utils.json_to_sheet(
      dashboardData.categorySales.labels.map((label, index) => ({
        Category: label,
        Count: dashboardData.categorySales.data[index] || 0,
      }))
    );

    const subCategorySheet = XLSX.utils.json_to_sheet(
      dashboardData.subCategorySales.labels.map((label, index) => ({
        SubCategory: label,
        Count: dashboardData.subCategorySales.data[index] || 0,
      }))
    );

    const topProductsSheet = XLSX.utils.json_to_sheet(
      dashboardData.topProducts.map((item) => ({
        Product: item.name,
        Units_Sold: item.sold,
        Revenue: item.revenue,
      }))
    );

    const lowStockSheet = XLSX.utils.json_to_sheet(
      dashboardData.lowStockProducts.map((item) => ({
        Product: item.name,
        Category: item.category,
        SubCategory: item.subCategory,
        Branch: item.branch,
        Price: item.price,
        Stock: item.stock,
      }))
    );

    const recentOrdersSheet = XLSX.utils.json_to_sheet(
      dashboardData.recentOrders.map((order) => ({
        Order_ID: String(order._id),
        Customer: `${order.address?.firstName || ""} ${order.address?.lastName || ""}`.trim(),
        Amount: toNumber(order.amount),
        Status: order.status || "Pending",
        Payment_Method: order.paymentMethod || "COD",
        Date: new Date(order.date || order.createdAt).toLocaleString(),
      }))
    );

    const branchSummarySheet = XLSX.utils.json_to_sheet(
      (dashboardData.branchSummary || []).map((item) => ({
        Branch: item.branch,
        Products: item.products,
        Orders: item.orders,
        Revenue: item.revenue,
      }))
    );

    XLSX.utils.book_append_sheet(workbook, overviewSheet, "Overview");
    XLSX.utils.book_append_sheet(workbook, weeklySheet, "Weekly Sales");
    XLSX.utils.book_append_sheet(workbook, monthlySheet, "Monthly Sales");
    XLSX.utils.book_append_sheet(workbook, categorySheet, "Categories");
    XLSX.utils.book_append_sheet(workbook, subCategorySheet, "SubCategories");
    XLSX.utils.book_append_sheet(workbook, topProductsSheet, "Top Products");
    XLSX.utils.book_append_sheet(workbook, lowStockSheet, "Low Stock");
    XLSX.utils.book_append_sheet(workbook, recentOrdersSheet, "Recent Orders");

    if (req.user.role === "admin") {
      XLSX.utils.book_append_sheet(workbook, branchSummarySheet, "Branches");
    }

    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=dashboard-${
        req.user.role === "admin" ? "admin" : req.user.branch
      }.xlsx`
    );

    return res.send(excelBuffer);
  } catch (err) {
    console.log("exportDashboardExcel error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to export dashboard excel",
    });
  }
};

export const getAllUsers = async (req, res) => {
  try {
    const users = await userModel
      .find({})
      .sort({ createdAt: -1 })
      .select("-password -resetPasswordOtp -resetPasswordExpires")
      .lean();

    return res.json({
      success: true,
      users: users.map(sanitizeAdminUser),
    });
  } catch (err) {
    console.log("getAllUsers error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const blockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = true;
    user.blockedAt = new Date();
    await user.save();

    await addLog({
      action: "USER_BLOCKED",
      message: `User blocked: ${user.name || user.email}`,
      user: getActorName(req, "Admin"),
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "User blocked successfully",
    });
  } catch (err) {
    console.log("blockUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const unblockUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isBlocked = false;
    user.blockedAt = null;
    await user.save();

    await addLog({
      action: "USER_UNBLOCKED",
      message: `User unblocked: ${user.name || user.email}`,
      user: getActorName(req, "Admin"),
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "User unblocked successfully",
    });
  } catch (err) {
    console.log("unblockUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const deactivateUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    await addLog({
      action: "USER_DEACTIVATED",
      message: `User deactivated: ${user.name || user.email}`,
      user: getActorName(req, "Admin"),
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (err) {
    console.log("deactivateUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const reactivateUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isActive = true;
    user.deactivatedAt = null;
    await user.save();

    await addLog({
      action: "USER_REACTIVATED",
      message: `User reactivated: ${user.name || user.email}`,
      user: getActorName(req, "Admin"),
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "User reactivated successfully",
    });
  } catch (err) {
    console.log("reactivateUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const softDeleteUser = async (req, res) => {
  try {
    const { userId } = req.body;

    const user = await userModel.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.isActive = false;
    user.deactivatedAt = new Date();
    user.isBlocked = true;
    user.blockedAt = new Date();

    await user.save();

    await addLog({
      action: "USER_DELETED",
      message: `User deleted: ${user.name || user.email}`,
      user: getActorName(req, "Admin"),
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (err) {
    console.log("softDeleteUser error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const getAllEmployees = async (req, res) => {
  try {
    const employees = await employeeModel.find().sort({ createdAt: -1 });

    return res.json({
      success: true,
      employees,
    });
  } catch (err) {
    console.log("getAllEmployees error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

export const createEmployee = async (req, res) => {
  try {
    const { name, email, password, role, branch } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please fill all required fields",
      });
    }

    if (!["admin", "manager", "staff"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    const existing = await employeeModel.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        message: "Employee email already exists",
      });
    }

    const resumeFile = req.files?.resume?.[0]?.filename || "";
    const pictureFile = req.files?.picture?.[0]?.filename || "";

    const branchValue = role === "admin" ? "all" : branch || "branch1";
    const managerFlag = role === "manager";

    const newEmployee = new employeeModel({
      name,
      email: normalizedEmail,
      password: String(password).trim(),
      role,
      branch: branchValue,
      isBranchManager: managerFlag,
      resume: resumeFile,
      picture: pictureFile,
      isActive: true,
    });

    await newEmployee.save();

    if (managerFlag && branchValue !== "all") {
      await branchModel.findOneAndUpdate(
        { code: branchValue },
        { managerName: name },
        { new: true }
      );
    }

    await addLog({
      action: "EMPLOYEE_CREATED",
      message: `Employee created: ${newEmployee.name} (${newEmployee.role})`,
      user: getActorName(req, "Admin"),
      entityId: newEmployee._id,
      entityType: "Employee",
    });

    return res.json({
      success: true,
      message: "Employee created successfully",
      employee: newEmployee,
    });
  } catch (err) {
    console.log("createEmployee error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, branch, isActive } = req.body;

    const employee = await employeeModel.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const oldRole = employee.role;
    const oldBranch = employee.branch;
    const oldName = employee.name;

    const normalizedEmail = email ? email.toLowerCase().trim() : employee.email;

    if (normalizedEmail !== employee.email) {
      const existing = await employeeModel.findOne({
        email: normalizedEmail,
        _id: { $ne: id },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: "Employee email already exists",
        });
      }
    }

    const newRole = role || employee.role;
    const newBranch = newRole === "admin" ? "all" : branch || employee.branch;
    const newManagerFlag = newRole === "manager";

    if ((oldRole === "manager" || employee.isBranchManager) && oldBranch !== "all") {
      await branchModel.findOneAndUpdate(
        { code: oldBranch, managerName: oldName },
        { managerName: "" },
        { new: true }
      );
    }

    employee.name = name || employee.name;
    employee.email = normalizedEmail;
    employee.role = newRole;
    employee.branch = newBranch;
    employee.isBranchManager = newManagerFlag;
    employee.isActive =
      isActive === undefined
        ? employee.isActive
        : isActive === true || isActive === "true";

    if (password && String(password).trim()) {
      employee.password = String(password).trim();
    }

    const resumeFile = req.files?.resume?.[0]?.filename;
    const pictureFile = req.files?.picture?.[0]?.filename;

    if (resumeFile) employee.resume = resumeFile;
    if (pictureFile) employee.picture = pictureFile;

    await employee.save();

    if (newManagerFlag && newBranch !== "all") {
      await branchModel.findOneAndUpdate(
        { code: newBranch },
        { managerName: employee.name },
        { new: true }
      );
    }

    await addLog({
      action: "EMPLOYEE_UPDATED",
      message: `Employee updated: ${employee.name} (${employee.role})`,
      user: getActorName(req, "Admin"),
      entityId: employee._id,
      entityType: "Employee",
    });

    return res.json({
      success: true,
      message: "Employee updated successfully",
      employee,
    });
  } catch (err) {
    console.log("updateEmployee error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await employeeModel.findById(id);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    if (
      (employee.role === "manager" || employee.isBranchManager) &&
      employee.branch &&
      employee.branch !== "all"
    ) {
      await branchModel.findOneAndUpdate(
        { code: employee.branch, managerName: employee.name },
        { managerName: "" },
        { new: true }
      );
    }

    await employeeModel.findByIdAndDelete(id);

    await addLog({
      action: "EMPLOYEE_DELETED",
      message: `Employee removed: ${employee.name} (${employee.role})`,
      user: getActorName(req, "Admin"),
      entityId: employee._id,
      entityType: "Employee",
    });

    return res.json({
      success: true,
      message: "Employee removed successfully",
    });
  } catch (err) {
    console.log("deleteEmployee error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Server error",
    });
  }
};