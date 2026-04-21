import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
  {
    houseUnit: { type: String, default: "" },
    street: { type: String, default: "" },
    barangay: { type: String, default: "" },
    city: { type: String, default: "" },
    province: { type: String, default: "" },
    region: { type: String, default: "" },
    zipcode: { type: String, default: "" },
    country: { type: String, default: "Philippines" },

    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },

    psgcRegionCode: { type: String, default: "" },
    psgcProvinceCode: { type: String, default: "" },
    psgcMunicipalityCode: { type: String, default: "" },
    psgcBarangayCode: { type: String, default: "" },
  },
  { _id: false }
);

const stylePreferencesSchema = new mongoose.Schema(
  {
    favoriteCategories: {
      type: [String],
      default: [],
    },
    favoriteColors: {
      type: [String],
      default: [],
    },
    favoriteStyleTags: {
      type: [String],
      default: [],
    },
    recentViewedProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product",
      default: [],
    },
    recentCartProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product",
      default: [],
    },
    recentOrderedProducts: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "product",
      default: [],
    },
  },
  { _id: false }
);

const preferencesSchema = new mongoose.Schema(
  {
    favoriteCategories: {
      type: [String],
      default: [],
    },
    preferredSize: {
      type: String,
      default: "",
    },
    preferredColors: {
      type: [String],
      default: [],
    },
    notifyOrders: {
      type: Boolean,
      default: true,
    },
    notifyDrops: {
      type: Boolean,
      default: true,
    },
    defaultAddressId: {
      type: String,
      default: "",
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, default: "" },
    lastName: { type: String, default: "" },
    name: { type: String, default: "" },

    email: { type: String, required: true, unique: true },
    password: { type: String },

    avatar: { type: String, default: "" },

    phone: { type: String, default: "" },
    address: { type: addressSchema, default: () => ({}) },

    isVerified: { type: Boolean, default: false },
    otpExpires: { type: Date },

    resetPasswordOtp: { type: String, default: "" },
    resetPasswordExpires: { type: Date, default: null },

    cartData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    stylePreferences: {
      type: stylePreferencesSchema,
      default: () => ({
        favoriteCategories: [],
        favoriteColors: [],
        favoriteStyleTags: [],
        recentViewedProducts: [],
        recentCartProducts: [],
        recentOrderedProducts: [],
      }),
    },

    preferences: {
      type: preferencesSchema,
      default: () => ({
        favoriteCategories: [],
        preferredSize: "",
        preferredColors: [],
        notifyOrders: true,
        notifyDrops: true,
        defaultAddressId: "",
      }),
    },

    termsAccepted: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },

    isBlocked: {
      type: Boolean,
      default: false,
    },
    blockedAt: {
      type: Date,
      default: null,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
    deactivatedAt: {
      type: Date,
      default: null,
    },

    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
      default: null,
    },

    lastLoginAt: {
      type: Date,
      default: null,
    },
    lastSeenAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true, minimize: false }
);

const userModel = mongoose.models.User || mongoose.model("User", userSchema);

export default userModel;