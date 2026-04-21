import heroModel from "../models/heroModel.js";

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
];

export const getHero = async (req, res) => {
  try {
    let hero = await heroModel.findOne();

    if (!hero) {
      hero = await heroModel.create({
        tickerEnabled: true,
        tickerText:
          "Welcome back, {name}! Ready to explore the latest from Saint Clothing?",
        slides: defaultSlides,
      });
    }

    return res.json({
      success: true,
      hero,
    });
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
        tickerText:
          "Welcome back, {name}! Ready to explore the latest from Saint Clothing?",
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
    const tickerEnabled =
      body.tickerEnabled === "true" || body.tickerEnabled === true;
    const tickerText = body.tickerText || "";

    const oldSlides = Array.isArray(hero.slides) ? hero.slides : defaultSlides;

    const mergedSlides = [0, 1, 2].map((index) => {
      const oldSlide = oldSlides[index] || defaultSlides[index];
      const incoming = incomingSlides[index] || {};
      const fileKey = `image${index + 1}`;
      const uploadedFile = files[fileKey]?.[0];

      return {
        title: incoming.title ?? oldSlide.title ?? "",
        subtitle: incoming.subtitle ?? oldSlide.subtitle ?? "",
        description: incoming.description ?? oldSlide.description ?? "",
        cta: incoming.cta ?? oldSlide.cta ?? "",
        action: ["collection", "bestseller", "latest"].includes(incoming.action)
          ? incoming.action
          : oldSlide.action || "collection",
        image: uploadedFile
          ? `/uploads/hero/${uploadedFile.filename}`
          : incoming.image ?? oldSlide.image ?? "",
      };
    });

    hero.tickerEnabled = tickerEnabled;
    hero.tickerText = tickerText;
    hero.slides = mergedSlides;

    await hero.save();

    return res.json({
      success: true,
      message: "Hero updated successfully",
      hero,
    });
  } catch (error) {
    console.log("UPDATE HERO ERROR:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update hero",
    });
  }
};