import socialFeedModel from "../models/socialFeedModel.js";

export const getSocialFeed = async (req, res) => {
  try {
    let feed = await socialFeedModel.findOne();

    if (!feed) {
      feed = await socialFeedModel.create({
        enabled: true,
        title: "Latest From Saint Social",
        subtitle:
          "Follow the latest drops, outfits, and AR try-on updates from Saint Clothing.",
        embedCode: "",
      });
    }

    return res.json({
      success: true,
      feed,
    });
  } catch (error) {
    console.log("GET SOCIAL FEED ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load social feed",
    });
  }
};

export const updateSocialFeed = async (req, res) => {
  try {
    let feed = await socialFeedModel.findOne();

    if (!feed) {
      feed = new socialFeedModel();
    }

    feed.enabled = req.body.enabled === true || req.body.enabled === "true";
    feed.title = req.body.title || "Latest From Saint Social";
    feed.subtitle =
      req.body.subtitle ||
      "Follow the latest drops, outfits, and AR try-on updates from Saint Clothing.";
    feed.embedCode = req.body.embedCode || "";

    await feed.save();

    return res.json({
      success: true,
      message: "Social feed updated successfully",
      feed,
    });
  } catch (error) {
    console.log("UPDATE SOCIAL FEED ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update social feed",
    });
  }
};