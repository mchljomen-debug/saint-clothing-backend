import productModel from "../models/productModel.js";
import userModel from "../models/userModel.js";

const DEFAULT_LIMIT = 4;

const uniqueStrings = (arr = []) =>
  [...new Set(arr.filter(Boolean).map((v) => String(v).trim()))];

const normalizeCategoryPartners = (category) => {
  switch (String(category || "").trim()) {
    case "Tshirt":
      return ["Jorts", "Mesh Shorts", "Long Sleeve", "Crop Jersey"];
    case "Long Sleeve":
      return ["Tshirt", "Jorts", "Mesh Shorts"];
    case "Jorts":
      return ["Tshirt", "Long Sleeve", "Crop Jersey"];
    case "Mesh Shorts":
      return ["Tshirt", "Long Sleeve", "Crop Jersey"];
    case "Crop Jersey":
      return ["Jorts", "Mesh Shorts", "Long Sleeve"];
    default:
      return ["Tshirt", "Long Sleeve", "Jorts", "Mesh Shorts", "Crop Jersey"];
  }
};

const getTags = (product) => uniqueStrings(product?.styleTags || []);
const getMatches = (product) => uniqueStrings(product?.matchWith || []);

const scoreAgainstSeed = (candidate, seedProducts = [], userProfile = null) => {
  let score = 0;

  for (const seed of seedProducts) {
    if (!seed) continue;

    const preferredCategories = normalizeCategoryPartners(seed.category);

    if (preferredCategories.includes(candidate.category)) score += 8;
    if (candidate.category === seed.category) score -= 2;

    if (seed.color && candidate.color && seed.color === candidate.color) score += 6;
    if (seed.styleVibe && candidate.styleVibe && seed.styleVibe === candidate.styleVibe) score += 5;
    if (seed.fitType && candidate.fitType && seed.fitType === candidate.fitType) score += 3;

    const seedTags = getTags(seed);
    const candidateTags = getTags(candidate);
    const sharedTags = candidateTags.filter((tag) => seedTags.includes(tag));
    score += sharedTags.length * 3;

    const seedMatchWith = getMatches(seed);
    if (seedMatchWith.includes(candidate.category)) score += 7;
  }

  if (candidate.bestseller) score += 2;
  if (candidate.newArrival) score += 1;
  if (candidate.onSale) score += 1;

  if (userProfile) {
    const favCategories = uniqueStrings(userProfile.favoriteCategories);
    const favColors = uniqueStrings(userProfile.favoriteColors);
    const favTags = uniqueStrings(userProfile.favoriteStyleTags);

    if (favCategories.includes(candidate.category)) score += 5;
    if (candidate.color && favColors.includes(candidate.color)) score += 4;

    const candidateTags = getTags(candidate);
    const profileSharedTags = candidateTags.filter((tag) => favTags.includes(tag));
    score += profileSharedTags.length * 2;
  }

  return score;
};

const buildUserProfileFromDocs = async (userId) => {
  if (!userId) return null;

  const user = await userModel.findById(userId).lean();
  if (!user) return null;

  return user.stylePreferences || null;
};

const getProductsByIds = async (ids = []) => {
  const cleanIds = uniqueStrings(ids);
  if (!cleanIds.length) return [];

  const docs = await productModel.find({
    _id: { $in: cleanIds },
    isDeleted: { $ne: true },
  }).lean();

  const docMap = new Map(docs.map((doc) => [String(doc._id), doc]));
  return cleanIds.map((id) => docMap.get(String(id))).filter(Boolean);
};

export const getRecommendations = async (req, res) => {
  try {
    const {
      productId = null,
      productIds = [],
      category = "",
      color = "",
      userId = null,
      limit = DEFAULT_LIMIT,
    } = req.body || {};

    let seedProducts = [];

    if (productId) {
      const seed = await productModel.findById(productId).lean();
      if (seed) seedProducts.push(seed);
    }

    if (Array.isArray(productIds) && productIds.length) {
      const moreSeeds = await getProductsByIds(productIds);
      seedProducts = [...seedProducts, ...moreSeeds];
    }

    if (!seedProducts.length && category) {
      seedProducts.push({
        category,
        color,
        styleVibe: "",
        fitType: "",
        styleTags: [],
        matchWith: normalizeCategoryPartners(category),
      });
    }

    if (!seedProducts.length) {
      return res.json({
        success: true,
        products: [],
      });
    }

    const excludeIds = new Set(seedProducts.map((p) => String(p._id)).filter(Boolean));
    const userProfile = await buildUserProfileFromDocs(userId);

    const candidates = await productModel.find({
      isDeleted: { $ne: true },
    }).lean();

    const ranked = candidates
      .filter((item) => !excludeIds.has(String(item._id)))
      .map((item) => ({
        ...item,
        recommendationScore: scoreAgainstSeed(item, seedProducts, userProfile),
      }))
      .sort((a, b) => {
        if (b.recommendationScore !== a.recommendationScore) {
          return b.recommendationScore - a.recommendationScore;
        }

        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      })
      .slice(0, Number(limit) || DEFAULT_LIMIT);

    return res.json({
      success: true,
      products: ranked,
    });
  } catch (error) {
    console.error("GET RECOMMENDATIONS ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const trackUserStyleSignal = async (req, res) => {
  try {
    const { userId, productId, signalType } = req.body || {};

    if (!userId || !productId || !signalType) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields",
      });
    }

    const product = await productModel.findById(productId).lean();
    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (!user.stylePreferences) {
      user.stylePreferences = {};
    }

    const prefs = user.stylePreferences;

    prefs.favoriteCategories = uniqueStrings([
      ...(prefs.favoriteCategories || []),
      product.category,
    ]);

    if (product.color) {
      prefs.favoriteColors = uniqueStrings([
        ...(prefs.favoriteColors || []),
        product.color,
      ]);
    }

    prefs.favoriteStyleTags = uniqueStrings([
      ...(prefs.favoriteStyleTags || []),
      ...(product.styleTags || []),
    ]);

    const targetMap = {
      view: "recentViewedProducts",
      cart: "recentCartProducts",
      order: "recentOrderedProducts",
    };

    const targetField = targetMap[signalType];
    if (targetField) {
      const existing = (prefs[targetField] || []).map((id) => String(id));
      const next = [String(productId), ...existing.filter((id) => id !== String(productId))].slice(0, 12);
      prefs[targetField] = next;
    }

    user.markModified("stylePreferences");
    await user.save();

    return res.json({
      success: true,
      message: "Style signal tracked",
    });
  } catch (error) {
    console.error("TRACK STYLE SIGNAL ERROR:", error);
    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};