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
      enum: ["collection", "bestseller", "latest"],
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
    /* TOGGLE TICKER */
    tickerEnabled: {
      type: Boolean,
      default: true,
    },

    /* ✅ NEW USER GREETING */
    newUserGreeting: {
      type: String,
      default: "Welcome",
    },

    /* ✅ RETURNING USER GREETING */
    returningUserGreeting: {
      type: String,
      default: "Welcome back",
    },

    /* ✅ DYNAMIC TICKER TEXT */
    tickerText: {
      type: String,
      default:
        "{greeting}, {name}! Ready to explore the latest from Saint Clothing?",
    },

    /* HERO SLIDES */
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
          title: "Core Uniform",
          subtitle: "Minimal Pieces. Strong Identity",
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

/* =========================
   EXPORT MODEL
========================= */
const heroModel =
  mongoose.models.hero || mongoose.model("hero", heroSchema);

export default heroModel;