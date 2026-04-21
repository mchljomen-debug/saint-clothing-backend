import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    name: { type: String, default: "" },
    rating: { type: Number, default: 0 },
    comment: { type: String, default: "" },
    date: { type: Number, default: Date.now },
  },
  { _id: true }
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    price: { type: Number, required: true },
    image: { type: String, default: "" },
    images: [{ type: String }],

    sizeChartImage: { type: String, default: "" },

    model3d: { type: String, default: "" },

    category: { type: String, required: true, trim: true },
    subCategory: { type: String, default: "" },
    sizes: [{ type: String }],
    bestseller: { type: Boolean, default: false },
    newArrival: { type: Boolean, default: false },
    onSale: { type: Boolean, default: false },
    salePercent: { type: Number, default: 0 },

    color: { type: String, default: "" },
    colorHex: { type: String, default: "" },
    groupCode: { type: String, default: "", trim: true },
    sku: { type: String, default: "", trim: true },

    branch: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    isDeleted: { type: Boolean, default: false },

    stock: {
      type: Map,
      of: Number,
      default: {},
    },

    reviews: [reviewSchema],

    fitType: {
      type: String,
      default: "Regular",
    },
    styleVibe: {
      type: String,
      default: "Streetwear",
    },
    styleTags: {
      type: [String],
      default: [],
    },
    matchWith: {
      type: [String],
      default: [],
    },
  },
  { timestamps: true }
);

const productModel =
  mongoose.models.product || mongoose.model("product", productSchema);

export default productModel;