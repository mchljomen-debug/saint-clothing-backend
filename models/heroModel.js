import mongoose from "mongoose";

/* =========================
   HERO SLIDE SCHEMA
========================= */
const heroSlideSchema = new mongoose.Schema(
  {
    title: { type: String, default: "" },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    cta: { type: String, default: "" },
    action: {
      type: String,
      enum: ["collection", "bestseller", "latest", "ar"],
      default: "collection",
    },
    image: { type: String, default: "" },
  },
  { _id: false }
);

/* =========================
   HERO MAIN SCHEMA
========================= */
const heroSchema = new mongoose.Schema(
  {
    tickerEnabled: {
      type: Boolean,
      default: true,
    },

    newUserGreeting: {
      type: String,
      default: "Welcome",
    },

    returningUserGreeting: {
      type: String,
      default: "Welcome back",
    },

    tickerText: {
      type: String,
      default:
        "{greeting}, {name}! Try our mobile AR fitting experience and explore the latest from Saint Clothing.",
    },

    slides: {
      type: [heroSlideSchema],
      default: [
        {
          title: "Saint Clothing",
          subtitle: "Modern Streetwear Essentials",
          description:
            "Clean silhouettes, premium everyday wear, and a monochrome identity built for a modern streetwear brand.",
          cta: "Shop Collection",
          action: "collection",
          image: "",
        },
        {
          title: "Virtual Try-On",
          subtitle: "AR Fitting Experience On Mobile",
          description:
            "Preview selected Saint Clothing pieces through your phone using our mobile AR try-on feature.",
          cta: "Try AR On Mobile",
          action: "ar",
          image: "",
        },
        {
          title: "Core Uniform",
          subtitle: "Minimal Pieces. Strong Identity.",
          description:
            "Everyday essentials refined for a sharper streetwear identity.",
          cta: "View Best Sellers",
          action: "bestseller",
          image: "",
        },
        {
          title: "New Drop",
          subtitle: "Refined Fits For Everyday Wear",
          description:
            "Fresh silhouettes and elevated staples for the latest Saint release.",
          cta: "View Latest Collection",
          action: "latest",
          image: "",
        },
      ],
    },
  },
  {
    timestamps: true,
  }
);

const heroModel =
  mongoose.models.hero || mongoose.model("hero", heroSchema);

export default heroModel;