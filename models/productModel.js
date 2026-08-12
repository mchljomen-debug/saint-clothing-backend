import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
    },

    name: {
      type: String,
      default: "",
    },

    rating: {
      type: Number,
      default: 0,
    },

    comment: {
      type: String,
      default: "",
    },

    date: {
      type: Number,
      default: Date.now,
    },
  },
  {
    _id: true,
  }
);

const productSchema = new mongoose.Schema(
  {
    // =========================================================
    // BASIC PRODUCT INFORMATION
    // =========================================================

    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      default: "",
    },

    price: {
      type: Number,
      required: true,
    },

    // =========================================================
    // PRODUCT IMAGES
    // =========================================================

    image: {
      type: String,
      default: "",
    },

    images: [
      {
        type: String,
      },
    ],

    /*
     * Main image used by Style Builder / Build Fit.
     *
     * IMPORTANT:
     * This image should ideally be a tightly cropped transparent
     * PNG containing only the clothing item.
     */
    outfitImage: {
      type: String,
      default: "",
    },

    /*
     * Positioning information for Build Fit.
     *
     * x/y:
     * Position adjustment relative to mannequin.
     *
     * scale:
     * Size multiplier.
     *
     * width/height:
     * Optional explicit size multiplier.
     */
    outfitPosition: {
      x: {
        type: Number,
        default: 0,
      },

      y: {
        type: Number,
        default: 0,
      },

      scale: {
        type: Number,
        default: 1,
      },

      width: {
        type: Number,
        default: 0,
      },

      height: {
        type: Number,
        default: 0,
      },
    },

    /*
     * Visible clothing bounds inside the original PNG.
     *
     * This is useful if an old PNG still contains transparent
     * padding around the clothing.
     *
     * Values are normalized 0-1.
     */
    outfitBounds: {
      left: {
        type: Number,
        default: 0,
      },

      top: {
        type: Number,
        default: 0,
      },

      right: {
        type: Number,
        default: 1,
      },

      bottom: {
        type: Number,
        default: 1,
      },
    },

    sizeChartImage: {
      type: String,
      default: "",
    },

    model3d: {
      type: String,
      default: "",
    },

    // =========================================================
    // CATEGORY
    // =========================================================

    category: {
      type: String,
      required: true,
      trim: true,
    },

    subCategory: {
      type: String,
      default: "",
    },

    sizes: [
      {
        type: String,
      },
    ],

    // =========================================================
    // PRODUCT FLAGS
    // =========================================================

    bestseller: {
      type: Boolean,
      default: false,
    },

    newArrival: {
      type: Boolean,
      default: false,
    },

    onSale: {
      type: Boolean,
      default: false,
    },

    salePercent: {
      type: Number,
      default: 0,
    },

    // =========================================================
    // COLOR / SKU
    // =========================================================

    color: {
      type: String,
      default: "",
    },

    colorHex: {
      type: String,
      default: "",
    },

    groupCode: {
      type: String,
      default: "",
      trim: true,
    },

    sku: {
      type: String,
      default: "",
      trim: true,
    },

    // =========================================================
    // BRANCH
    // =========================================================

    branch: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // =========================================================
    // DELETE / TRASH
    // =========================================================

    isDeleted: {
      type: Boolean,
      default: false,
    },

    deletedAt: {
      type: Date,
      default: null,
    },

    // =========================================================
    // STOCK
    // =========================================================

    stock: {
      type: Map,
      of: Number,
      default: {},
    },

    // =========================================================
    // PRE-ORDER
    // =========================================================

    preorderEnabled: {
      type: Boolean,
      default: true,
    },

    preorderThreshold: {
      type: Number,
      default: 5,
    },

    preorderStock: {
      type: Map,
      of: Number,
      default: {},
    },

    preorderAutoGenerate: {
      type: Boolean,
      default: true,
    },

    preorderAutoStock: {
      type: Number,
      default: 20,
    },

    preorderRestockDate: {
      type: Date,
      default: null,
    },

    preorderNote: {
      type: String,
      default: "",
    },

    // =========================================================
    // REVIEWS
    // =========================================================

    reviews: [
      reviewSchema,
    ],

    // =========================================================
    // STYLE BUILDER
    // =========================================================

    fitType: {
      type: String,
      default: "Regular",
    },

    styleVibe: {
      type: String,
      default: "Streetwear",
    },

    recommendationSection: {
      type: String,
      enum: [
        "top",
        "bottom",
        "both",
        "none",
      ],
      default: "none",
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

  {
    timestamps: true,
  }
);

const productModel =
  mongoose.models.product ||
  mongoose.model("product", productSchema);

export default productModel;