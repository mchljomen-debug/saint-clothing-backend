import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import validator from "validator";
import userModel from "../models/userModel.js";
import OtpModel from "../models/otpModel.js";
import policyModel from "../models/policyModel.js";
import { sendOTP } from "../utils/sendOtp.js";
import { addLog } from "../utils/activityLogger.js";
import uploadBufferToCloudinary from "../utils/cloudinaryUpload.js";

const createToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "1d" });

const buildFullName = (firstName = "", lastName = "") =>
  `${String(firstName || "").trim()} ${String(lastName || "").trim()}`.trim();

const normalizeAddress = (rawAddress = {}) => ({
  houseUnit: rawAddress?.houseUnit || "",
  street: rawAddress?.street || "",
  barangay: rawAddress?.barangay || "",
  city: rawAddress?.city || "",
  province: rawAddress?.province || "",
  region: rawAddress?.region || "",
  zipcode: rawAddress?.zipcode || "",
  country: rawAddress?.country || "Philippines",

  latitude:
    rawAddress?.latitude !== undefined &&
    rawAddress?.latitude !== null &&
    rawAddress?.latitude !== ""
      ? Number(rawAddress.latitude)
      : null,

  longitude:
    rawAddress?.longitude !== undefined &&
    rawAddress?.longitude !== null &&
    rawAddress?.longitude !== ""
      ? Number(rawAddress.longitude)
      : null,

  psgcRegionCode: rawAddress?.psgcRegionCode || "",
  psgcProvinceCode: rawAddress?.psgcProvinceCode || "",
  psgcMunicipalityCode: rawAddress?.psgcMunicipalityCode || "",
  psgcBarangayCode: rawAddress?.psgcBarangayCode || "",
});

const validateStrongPassword = (password = "") => {
  if (!password) return "Password is required";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password))
    return "Password must include at least 1 uppercase letter";
  if (!/[0-9]/.test(password))
    return "Password must include at least 1 number";
  if (!/[^A-Za-z0-9]/.test(password))
    return "Password must include at least 1 special character";
  return "";
};

const sanitizeUser = (user) => ({
  _id: user._id,
  id: user._id,
  firstName: user.firstName || "",
  lastName: user.lastName || "",
  name: user.name || buildFullName(user.firstName, user.lastName),
  email: user.email || "",
  avatar: user.avatar || "",
  phone: user.phone || "",
  address: user.address || {},
  stylePreferences: user.stylePreferences || {
    favoriteCategories: [],
    favoriteColors: [],
    favoriteStyleTags: [],
    recentViewedProducts: [],
    recentCartProducts: [],
    recentOrderedProducts: [],
  },
  preferences: user.preferences || {
    favoriteCategories: [],
    preferredSize: "",
    preferredColors: [],
    notifyOrders: true,
    notifyDrops: true,
    defaultAddressId: "",
  },
  termsAccepted: user.termsAccepted || false,
  termsAcceptedAt: user.termsAcceptedAt || null,
  termsAcceptedVersion: user.termsAcceptedVersion || "",
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

const getOrCreateMainPolicy = async () => {
  let doc = await policyModel.findOne({ slug: "main" });

  if (!doc) {
    doc = await policyModel.create({
      slug: "main",
      version: new Date().toISOString().slice(0, 10),
      title: "Saint Clothing Policies",
      description:
        "Store rules, terms, privacy, shipping, returns, and payment policies.",
      policies: [
        {
          key: "privacy-policy",
          title: "Privacy Policy",
          content: [
            "Your personal information is used for account access, order processing, delivery coordination, and customer support.",
          ],
          requiredOnRegister: false,
          sortOrder: 1,
          isActive: true,
        },
        {
          key: "terms-and-conditions",
          title: "Terms and Conditions",
          content: [
            "By creating an account or placing an order with Saint Clothing, you agree to provide accurate and complete information during registration, checkout, and profile updates.",
            "You are responsible for maintaining the confidentiality of your account credentials and for all activity that happens under your account.",
            "Orders are subject to product availability, stock confirmation, and payment verification.",
            "False payment claims may lead to order cancellation or account restriction.",
            "Continued use of the platform means you accept the latest revised terms.",
          ],
          requiredOnRegister: true,
          sortOrder: 2,
          isActive: true,
        },
        {
          key: "shipping-policy",
          title: "Shipping Policy",
          content: [
            "Orders are processed after confirmation and shipped based on serviceable areas and courier timelines.",
          ],
          requiredOnRegister: false,
          sortOrder: 3,
          isActive: true,
        },
        {
          key: "return-refund-policy",
          title: "Return and Refund Policy",
          content: [
            "Returns and refunds are subject to item condition, proof of purchase, and approval by the store team.",
          ],
          requiredOnRegister: false,
          sortOrder: 4,
          isActive: true,
        },
        {
          key: "payment-policy",
          title: "Payment Policy",
          content: [
            "Accepted payment methods may include Cash on Delivery, GCash, Maya, GoTyme, and other approved methods displayed during checkout.",
          ],
          requiredOnRegister: false,
          sortOrder: 5,
          isActive: true,
        },
      ],
    });
  }

  return doc;
};

export const getTermsAndConditions = async (req, res) => {
  try {
    const doc = await getOrCreateMainPolicy();

    const terms = (doc.policies || []).find(
      (item) => item.key === "terms-and-conditions" && item.isActive !== false
    );

    return res.json({
      success: true,
      version: doc.version,
      title: terms?.title || "Terms and Conditions",
      content: terms?.content || [],
      requiredOnRegister: terms?.requiredOnRegister ?? true,
      updatedAt: doc.updatedAt,
    });
  } catch (err) {
    console.log("GET TERMS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const checkEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.json({ exists: false });
    }

    const user = await userModel.findOne({ email });
    return res.json({ exists: !!user });
  } catch (err) {
    console.log("CHECK EMAIL ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const sendOtpController = async (req, res) => {
  try {
    const { email } = req.body;

    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await OtpModel.findOneAndUpdate(
      { email },
      {
        email,
        otp,
        expiresAt: Date.now() + 60 * 1000,
        verified: false,
      },
      { upsert: true }
    );

    await sendOTP(email, otp);

    await addLog({
      action: "REGISTRATION_OTP_SENT",
      message: `Registration OTP sent to ${email}`,
      user: email,
      entityType: "Auth",
    });

    return res.json({
      success: true,
      message: "OTP sent (valid 1 min)",
    });
  } catch (err) {
    console.log("SEND OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await OtpModel.findOne({ email });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP not requested",
      });
    }

    if (record.expiresAt < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired",
      });
    }

    if (record.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Wrong OTP",
      });
    }

    record.verified = true;
    await record.save();

    await addLog({
      action: "REGISTRATION_OTP_VERIFIED",
      message: `Registration OTP verified for ${email}`,
      user: email,
      entityType: "Auth",
    });

    return res.json({
      success: true,
      message: "Email verified",
    });
  } catch (err) {
    console.log("VERIFY OTP ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const registerUser = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      password,
      confirmPassword,
      acceptedTerms,
    } = req.body;

    const cleanFirstName = String(firstName || "").trim();
    const cleanLastName = String(lastName || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanFirstName) {
      return res.status(400).json({
        success: false,
        message: "First name is required",
      });
    }

    if (!cleanLastName) {
      return res.status(400).json({
        success: false,
        message: "Last name is required",
      });
    }

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const existingUser = await userModel.findOne({ email: cleanEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    const passwordError = validateStrongPassword(password);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    if (String(password) !== String(confirmPassword || "")) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    if (acceptedTerms !== true) {
      return res.status(400).json({
        success: false,
        message: "You must agree to the Terms & Conditions",
      });
    }

    const otp = await OtpModel.findOne({ email: cleanEmail, verified: true });

    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "Email not verified",
      });
    }

    const policyDoc = await getOrCreateMainPolicy();
    const currentTermsVersion =
      policyDoc?.version || new Date().toISOString().slice(0, 10);

    const hashed = await bcrypt.hash(password, 10);
    const fullName = buildFullName(cleanFirstName, cleanLastName);

    const user = await userModel.create({
      firstName: cleanFirstName,
      lastName: cleanLastName,
      name: fullName,
      email: cleanEmail,
      password: hashed,
      cartData: {},
      avatar: "",
      phone: "",
      address: {},
      isVerified: true,
      termsAccepted: true,
      termsAcceptedAt: new Date(),
      termsAcceptedVersion: currentTermsVersion,
      isBlocked: false,
      isActive: true,
      isDeleted: false,
      lastLoginAt: null,
      lastSeenAt: null,
      stylePreferences: {
        favoriteCategories: [],
        favoriteColors: [],
        favoriteStyleTags: [],
        recentViewedProducts: [],
        recentCartProducts: [],
        recentOrderedProducts: [],
      },
      preferences: {
        favoriteCategories: [],
        preferredSize: "",
        preferredColors: [],
        notifyOrders: true,
        notifyDrops: true,
        defaultAddressId: "",
      },
    });

    await OtpModel.deleteOne({ email: cleanEmail });

    const freshUser = await userModel.findById(user._id).lean();

    await addLog({
      action: "USER_REGISTERED",
      message: `New user registered: ${fullName}`,
      user: fullName,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      token: createToken(freshUser._id),
      user: sanitizeUser(freshUser),
    });
  } catch (err) {
    console.log("REGISTER USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    const user = await userModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isDeleted) {
      return res.status(403).json({
        success: false,
        message: "This account is unavailable",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated",
      });
    }

    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.status(400).json({
        success: false,
        message: "Incorrect password",
      });
    }

    user.lastLoginAt = new Date();
    user.lastSeenAt = new Date();
    await user.save();

    await addLog({
      action: "USER_LOGIN",
      message: `User logged in: ${user.name || user.email}`,
      user: user.name || user.email,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      token: createToken(user._id),
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.log("LOGIN USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await userModel.findById(userId).lean();

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    await userModel.findByIdAndUpdate(userId, {
      $set: { lastSeenAt: new Date() },
    });

    return res.json({
      success: true,
      user: sanitizeUser({
        ...user,
        lastSeenAt: new Date(),
      }),
    });
  } catch (err) {
    console.log("GET CURRENT USER ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.params.userId;
    const authUserId = req.userId || req.body.userId;

    if (!authUserId || String(authUserId) !== String(userId)) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized profile update",
      });
    }

    let { firstName, lastName, email, phone, address } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked accounts cannot update profile",
      });
    }

    if (email && !validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    if (email && email !== user.email) {
      const normalizedEmail = String(email).trim().toLowerCase();

      const emailTaken = await userModel.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (emailTaken) {
        return res.status(400).json({
          success: false,
          message: "Email already in use",
        });
      }
    }

    if (typeof address === "string") {
      try {
        address = JSON.parse(address);
      } catch (parseError) {
        console.log("ADDRESS PARSE ERROR:", parseError);
        console.log("RAW ADDRESS VALUE:", address);

        return res.status(400).json({
          success: false,
          message: "Invalid address format",
        });
      }
    }

    if (firstName !== undefined) user.firstName = String(firstName).trim();
    if (lastName !== undefined) user.lastName = String(lastName).trim();

    if (firstName !== undefined || lastName !== undefined) {
      user.name = buildFullName(user.firstName, user.lastName);
    }

    if (email !== undefined) user.email = String(email).trim().toLowerCase();
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = normalizeAddress(address);

    if (req.file) {
      const uploadedAvatar = await uploadBufferToCloudinary(
        req.file.buffer,
        "saint-clothing/avatars"
      );

      user.avatar = uploadedAvatar.secure_url;
    }

    user.lastSeenAt = new Date();
    await user.save();

    const freshUser = await userModel.findById(userId).lean();

    await addLog({
      action: "USER_PROFILE_UPDATED",
      message: `Profile updated: ${freshUser.name || freshUser.email}`,
      user: freshUser.name || freshUser.email,
      entityId: freshUser._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "Profile updated successfully",
      user: sanitizeUser(freshUser),
    });
  } catch (err) {
    console.log("UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const getPreferences = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const user = await userModel.findById(userId).select(
      "preferences isDeleted"
    );

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.json({
      success: true,
      preferences: user.preferences || {
        favoriteCategories: [],
        preferredSize: "",
        preferredColors: [],
        notifyOrders: true,
        notifyDrops: true,
        defaultAddressId: "",
      },
    });
  } catch (err) {
    console.log("GET PREFERENCES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const updatePreferences = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const {
      favoriteCategories,
      preferredSize,
      preferredColors,
      notifyOrders,
      notifyDrops,
      defaultAddressId,
    } = req.body;

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.preferences = {
      favoriteCategories: Array.isArray(favoriteCategories)
        ? favoriteCategories
        : user.preferences?.favoriteCategories || [],
      preferredSize:
        typeof preferredSize === "string"
          ? preferredSize
          : user.preferences?.preferredSize || "",
      preferredColors: Array.isArray(preferredColors)
        ? preferredColors
        : user.preferences?.preferredColors || [],
      notifyOrders:
        typeof notifyOrders === "boolean"
          ? notifyOrders
          : user.preferences?.notifyOrders ?? true,
      notifyDrops:
        typeof notifyDrops === "boolean"
          ? notifyDrops
          : user.preferences?.notifyDrops ?? true,
      defaultAddressId:
        typeof defaultAddressId === "string"
          ? defaultAddressId
          : user.preferences?.defaultAddressId || "",
    };

    user.lastSeenAt = new Date();

    await user.save();

    await addLog({
      action: "USER_PREFERENCES_UPDATED",
      message: `Preferences updated: ${user.name || user.email}`,
      user: user.name || user.email,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "Preferences updated successfully",
      preferences: user.preferences,
    });
  } catch (err) {
    console.log("UPDATE PREFERENCES ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const changePassword = async (req, res) => {
  try {
    const userId = req.userId || req.body.userId;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    const user = await userModel.findById(userId);

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const isSameAsOld = await bcrypt.compare(newPassword, user.password);

    if (isSameAsOld) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.lastSeenAt = new Date();

    await user.save();

    await addLog({
      action: "USER_PASSWORD_CHANGED",
      message: `Password changed: ${user.name || user.email}`,
      user: user.name || user.email,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (err) {
    console.log("CHANGE PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!validator.isEmail(cleanEmail)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email",
      });
    }

    const user = await userModel.findOne({ email: cleanEmail });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (user.isBlocked) {
      return res.status(403).json({
        success: false,
        message: "Blocked accounts cannot reset password",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordOtp = otp;
    user.resetPasswordExpires = Date.now() + 5 * 60 * 1000;

    await user.save();
    await sendOTP(cleanEmail, otp);

    await addLog({
      action: "USER_FORGOT_PASSWORD_REQUESTED",
      message: `Forgot password requested: ${user.name || user.email}`,
      user: user.name || user.email,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "Reset code sent to email",
    });
  } catch (err) {
    console.log("FORGOT PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword, confirmPassword } = req.body;
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail || !otp || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const passwordError = validateStrongPassword(newPassword);
    if (passwordError) {
      return res.status(400).json({
        success: false,
        message: passwordError,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match",
      });
    }

    const user = await userModel.findOne({ email: cleanEmail });

    if (!user || user.isDeleted) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.resetPasswordOtp || !user.resetPasswordExpires) {
      return res.status(400).json({
        success: false,
        message: "No reset request found",
      });
    }

    if (user.resetPasswordExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: "Reset code expired",
      });
    }

    if (String(user.resetPasswordOtp) !== String(otp)) {
      return res.status(400).json({
        success: false,
        message: "Invalid reset code",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordOtp = "";
    user.resetPasswordExpires = null;
    user.lastSeenAt = new Date();

    await user.save();

    await addLog({
      action: "USER_PASSWORD_RESET",
      message: `Password reset successful: ${user.name || user.email}`,
      user: user.name || user.email,
      entityId: user._id,
      entityType: "User",
    });

    return res.json({
      success: true,
      message: "Password reset successfully",
    });
  } catch (err) {
    console.log("RESET PASSWORD ERROR:", err);
    return res.status(500).json({
      success: false,
      message: err.message,
    });
  }
};