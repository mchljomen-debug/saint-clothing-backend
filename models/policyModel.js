import mongoose from "mongoose";

const termItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },
    text: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: false }
);

const policyItemSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    content: {
      type: [termItemSchema],
      default: [],
    },
    requiredOnRegister: {
      type: Boolean,
      default: false,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const policySchema = new mongoose.Schema(
  {
    slug: {
      type: String,
      required: true,
      unique: true,
      default: "main",
    },
    version: {
      type: String,
      required: true,
      default: () => new Date().toISOString().slice(0, 10),
    },
    title: {
      type: String,
      required: true,
      default: "Saint Clothing Policies",
    },
    description: {
      type: String,
      default:
        "Store rules, terms, privacy, shipping, returns, and payment policies.",
    },
    policies: {
      type: [policyItemSchema],
      default: [
        {
          key: "privacy-policy",
          title: "Privacy Policy",
          content: [],
          requiredOnRegister: false,
          sortOrder: 1,
          isActive: true,
        },
        {
          key: "terms-and-conditions",
          title: "Terms and Conditions",
          content: [],
          requiredOnRegister: true,
          sortOrder: 2,
          isActive: true,
        },
        {
          key: "shipping-policy",
          title: "Shipping Policy",
          content: [],
          requiredOnRegister: false,
          sortOrder: 3,
          isActive: true,
        },
        {
          key: "return-refund-policy",
          title: "Return and Refund Policy",
          content: [],
          requiredOnRegister: false,
          sortOrder: 4,
          isActive: true,
        },
        {
          key: "payment-policy",
          title: "Payment Policy",
          content: [],
          requiredOnRegister: false,
          sortOrder: 5,
          isActive: true,
        },
      ],
    },
    updatedBy: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const policyModel =
  mongoose.models.Policy || mongoose.model("Policy", policySchema);

export default policyModel;