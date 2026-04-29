import mongoose from "mongoose";

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

const heroSchema = new mongoose.Schema(
  {
    tickerEnabled: { type: Boolean, default: true },

    newUserGreeting: { type: String, default: "Welcome" },
    returningUserGreeting: { type: String, default: "Welcome back" },

    tickerText: {
      type: String,
      default:
        "{greeting}, {name}! Ready to explore the latest from Saint Clothing?",
    },

    slides: {
      type: [heroSlideSchema],
      default: [],
    },
  },
  { timestamps: true }
);

const heroModel = mongoose.models.hero || mongoose.model("hero", heroSchema);

export default heroModel;