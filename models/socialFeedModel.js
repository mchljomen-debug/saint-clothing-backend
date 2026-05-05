import mongoose from "mongoose";

const socialFeedSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: true,
    },
    title: {
      type: String,
      default: "Latest From Saint Social",
    },
    subtitle: {
      type: String,
      default:
        "Follow the latest drops, outfits, and AR try-on updates from Saint Clothing.",
    },
    embedCode: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

const socialFeedModel =
  mongoose.models.socialFeed ||
  mongoose.model("socialFeed", socialFeedSchema);

export default socialFeedModel;