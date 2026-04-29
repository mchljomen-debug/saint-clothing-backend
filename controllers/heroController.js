import heroModel from "../models/heroModel.js";
import { cloudinary } from "../config/cloudinary.js";

const defaultSlides = [
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
    subtitle: "Minimal Pieces. Strong Identity.",
    description: "Everyday essentials refined for a sharper streetwear identity.",
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
];

const uploadToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "saint-clothing/hero",
        resource_type: "image",
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    stream.end(file.buffer);
  });
};

export const getHero = async (req, res) => {
  try {
    let hero = await heroModel.findOne();

    if (!hero) {
      hero = await heroModel.create({
        tickerEnabled: true,
        newUserGreeting: "Welcome",
        returningUserGreeting: "Welcome back",
        tickerText:
          "{greeting}, {name}! Ready to explore the latest from Saint Clothing?",
        slides: defaultSlides,
      });
    }

    return res.json({ success: true, hero });
  } catch (error) {
    console.log("GET HERO ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load hero",
    });
  }
};

export const updateHero = async (req, res) => {
  try {
    let hero = await heroModel.findOne();

    if (!hero) {
      hero = new heroModel({
        tickerEnabled: true,
        newUserGreeting: "Welcome",
        returningUserGreeting: "Welcome back",
        tickerText:
          "{greeting}, {name}! Ready to explore the latest from Saint Clothing?",
        slides: defaultSlides,
      });
    }

    const body = req.body || {};
    const files = req.files || {};

    const safeJsonParse = (value, fallback) => {
      try {
        return value ? JSON.parse(value) : fallback;
      } catch {
        return fallback;
      }
    };

    const incomingSlides = safeJsonParse(body.slides, []);
    const oldSlides = Array.isArray(hero.slides) ? hero.slides : defaultSlides;

    const mergedSlides = [];

    for (let index = 0; index < 3; index++) {
      const oldSlide = oldSlides[index] || defaultSlides[index];
      const incoming = incomingSlides[index] || {};
      const fileKey = `image${index + 1}`;
      const uploadedFile = files[fileKey]?.[0];

      let imageUrl = incoming.image ?? oldSlide.image ?? "";

      if (uploadedFile) {
        imageUrl = await uploadToCloudinary(uploadedFile);
      }

      mergedSlides.push({
        title: incoming.title ?? oldSlide.title ?? "",
        subtitle: incoming.subtitle ?? oldSlide.subtitle ?? "",
        description: incoming.description ?? oldSlide.description ?? "",
        cta: incoming.cta ?? oldSlide.cta ?? "",
        action: ["collection", "bestseller", "latest"].includes(incoming.action)
          ? incoming.action
          : oldSlide.action || "collection",
        image: imageUrl,
      });
    }

    hero.tickerEnabled =
      body.tickerEnabled === "true" || body.tickerEnabled === true;

    hero.newUserGreeting = body.newUserGreeting || "Welcome";
    hero.returningUserGreeting = body.returningUserGreeting || "Welcome back";

    hero.tickerText =
      body.tickerText ||
      "{greeting}, {name}! Ready to explore the latest from Saint Clothing?";

    hero.slides = mergedSlides;

    await hero.save();

    return res.json({
      success: true,
      message: "Hero updated successfully",
      hero,
    });
  } catch (error) {
    console.log("UPDATE HERO ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to update hero",
    });
  }
};