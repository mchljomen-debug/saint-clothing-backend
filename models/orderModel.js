import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "product",
      required: true,
    },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    price: { type: Number, required: true },
    quantity: { type: Number, required: true },
    size: { type: String, default: "S" },
    onSale: { type: Boolean, default: false },
    salePercent: { type: Number, default: 0 },
    category: { type: String, default: "" },
    sku: { type: String, default: "" },
    groupCode: { type: String, default: "" },

    // Pre-order item details
    isPreorder: { type: Boolean, default: false },
    expectedRestockDate: { type: Date, default: null },
    preorderNote: { type: String, default: "" },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true,
    },

    items: [orderItemSchema],

    address: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      houseUnit: String,
      street: String,
      barangay: String,
      city: String,
      province: String,
      region: String,
      zipcode: String,
      country: { type: String, default: "Philippines" },
      latitude: { type: Number, default: null },
      longitude: { type: Number, default: null },
      psgcRegionCode: String,
      psgcProvinceCode: String,
      psgcMunicipalityCode: String,
      psgcBarangayCode: String,
    },

    amount: { type: Number, required: true },

    status: {
      type: String,
      default: "Order Placed",
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "GCash", "Maya", "GoTyme"],
      default: "COD",
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "verifying", "paid", "failed", "cod_pending"],
      default: "cod_pending",
    },

    payment: {
      type: Boolean,
      default: false,
    },

    referenceNumber: {
      type: String,
      default: "",
    },

    paymentProofImage: {
      type: String,
      default: "",
    },

    branch: {
      type: String,
      default: "branch1",
    },

    // Whole-order preorder marker
    isPreorder: {
      type: Boolean,
      default: false,
    },

    // Delivery estimate for normal orders and preorder orders
    deliveryEstimate: {
      minDays: { type: Number, default: 0 },
      maxDays: { type: Number, default: 0 },
      label: { type: String, default: "" },
      range: { type: String, default: "" },
      shipsOn: { type: Date, default: null },
    },

    // Main preorder ship date shown as "Ships on [date]"
    preorderShipDate: {
      type: Date,
      default: null,
    },

    date: {
      type: Number,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const orderModel =
  mongoose.models.order || mongoose.model("order", orderSchema);

export default orderModel;