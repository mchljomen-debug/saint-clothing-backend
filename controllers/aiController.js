
import "dotenv/config";
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const getResponseText = response => {
  if (typeof response?.text === "string") return response.text.trim();
  const candidates = response?.candidates || response?.response?.candidates || [];
  return (candidates?.[0]?.content?.parts || [])
    .filter(part => typeof part?.text === "string")
    .map(part => part.text)
    .join("\n")
    .trim();
};

const safeNumber = value => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const detectImageMimeType = base64 => {
  const value = String(base64 || "").replace(/\s/g, "");

  if (value.startsWith("iVBORw0KGgo")) return "image/png";
  if (value.startsWith("/9j/")) return "image/jpeg";

  try {
    const header = Buffer.from(value.slice(0, 32), "base64");
    if (
      header.length >= 12 &&
      header.toString("ascii", 0, 4) === "RIFF" &&
      header.toString("ascii", 8, 12) === "WEBP"
    ) {
      return "image/webp";
    }
  } catch {
    return "";
  }

  return "";
};

const prepareImage = (image, label) => {
  if (!image || typeof image !== "object" || typeof image.data !== "string") {
    throw new Error(`${label} image data is missing.`);
  }

  let data = image.data.trim();
  let declaredMimeType = String(image.mimeType || image.mime_type || "")
    .toLowerCase()
    .split(";")[0]
    .trim();

  const dataUrlMatch = data.match(/^data:([^;,]+);base64,([\s\S]+)$/i);

  if (dataUrlMatch) {
    declaredMimeType = String(dataUrlMatch[1]).toLowerCase().trim();
    data = dataUrlMatch[2];
  }

  data = data.replace(/\s/g, "");

  if (!data || !/^[A-Za-z0-9+/]+={0,2}$/.test(data) || data.length % 4 === 1) {
    throw new Error(`${label} image contains invalid base64 data.`);
  }

  const detectedMimeType = detectImageMimeType(data);
  const supportedMimeTypes = ["image/png", "image/jpeg", "image/webp"];

  if (!detectedMimeType || !supportedMimeTypes.includes(detectedMimeType)) {
    throw new Error(
      `${label} image must be a valid PNG, JPEG, or WebP file. Received MIME type: ${declaredMimeType || "unknown"}.`
    );
  }

  if (declaredMimeType && declaredMimeType !== detectedMimeType) {
    console.log(
      `[AI] ${label} MIME type corrected: ${declaredMimeType} -> ${detectedMimeType}`
    );
  }

  console.log(
    `[AI] ${label}: ${detectedMimeType}, ${Math.round(data.length / 1024)} KB base64`
  );

  return {
    inlineData: {
      mimeType: detectedMimeType,
      data
    }
  };
};

export const generateOutfitSuggestion = async (req, res) => {
  try {
    const { top, bottom, style } = req.body;

    const prompt = `
You are a professional fashion stylist.

Top:
${JSON.stringify(top, null, 2)}

Bottom:
${JSON.stringify(bottom, null, 2)}

Style:
${style || "modern streetwear"}

Explain why this outfit works in a modern streetwear fashion style.

Keep response short and clean.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    return res.json({
      success: true,
      suggestion: getResponseText(response)
    });
  } catch (error) {
    console.error("Gemini Text Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI style analysis failed"
    });
  }
};

export const generateOutfitImage = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing in Render environment variables."
      });
    }

    const { top, bottom, mannequin, style } = req.body || {};

    if (!mannequin?.data) {
      return res.status(400).json({
        success: false,
        message: "Mannequin image is missing."
      });
    }

    if (!top?.image?.data && !bottom?.image?.data) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one product image."
      });
    }

    let mannequinPart;
    let topPart = null;
    let bottomPart = null;

    try {
      mannequinPart = prepareImage(mannequin, "Mannequin");

      if (top?.image?.data) {
        topPart = prepareImage(top.image, "Top");
      }

      if (bottom?.image?.data) {
        bottomPart = prepareImage(bottom.image, "Bottom");
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: error.message || "Invalid outfit image."
      });
    }

    const parts = [
      {
        text: `
Create a realistic full-body fashion e-commerce catalog image.

Main goal:
Make the mannequin naturally wear the selected outfit.

Style direction:
${style || "modern Saint Clothing streetwear"}

Rules:
- Use the mannequin image as the base body and pose.
- Make the selected top look naturally worn on the mannequin.
- Make the selected bottom look naturally worn on the mannequin.
- Preserve the product colors, graphics, logos, texture, and silhouette.
- Centered full-body product catalog photo.
- Clean black studio background.
- No extra models.
- No extra clothes.
- No floating clothes.
- No text.
- No watermark.
`
      },
      mannequinPart
    ];

    if (topPart) parts.push(topPart);
    if (bottomPart) parts.push(bottomPart);

    console.log("[AI] Generating outfit image:", {
      top: top?.name || "None",
      bottom: bottom?.name || "None",
      mannequinMimeType: mannequinPart.inlineData.mimeType,
      topMimeType: topPart?.inlineData.mimeType || "None",
      bottomMimeType: bottomPart?.inlineData.mimeType || "None"
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE]
      }
    });

    const candidates = response?.candidates || response?.response?.candidates || [];
    const responseParts = candidates?.[0]?.content?.parts || [];
    let image = "";

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        const mimeType = part.inlineData.mimeType || "image/png";
        image = `data:${mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!image) {
      return res.status(500).json({
        success: false,
        message: "Gemini did not return an image. Your API key may not support image generation."
      });
    }

    return res.json({
      success: true,
      image
    });
  } catch (error) {
    console.error("Gemini Image Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI image generation failed",
      details: error.response?.data || null
    });
  }
};

export const generateSalesInsight = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing."
      });
    }

    const {
      overview,
      productPerformance,
      categoryPerformance,
      lowStockProducts,
      salesTrend
    } = req.body || {};

    if (!overview) {
      return res.status(400).json({
        success: false,
        message: "Sales overview is required."
      });
    }

    const data = {
      business: {
        name: "Saint Clothing",
        country: "Philippines"
      },
      currency: {
        code: "PHP",
        symbol: "₱",
        name: "Philippine Peso"
      },
      overview: {
        totalRevenue: safeNumber(overview.totalRevenue),
        totalOrders: safeNumber(overview.totalOrders),
        paidOrders: safeNumber(overview.paidOrders),
        totalUnitsSold: safeNumber(overview.totalUnitsSold),
        netProfit: safeNumber(overview.netProfit),
        netProfitMargin: safeNumber(overview.netProfitMargin),
        totalProducts: safeNumber(overview.totalProducts),
        totalUsers: safeNumber(overview.totalUsers),
        lowStockCount: safeNumber(overview.lowStockCount)
      },
      productPerformance: Array.isArray(productPerformance)
        ? productPerformance.slice(0, 40)
        : [],
      categoryPerformance: Array.isArray(categoryPerformance)
        ? categoryPerformance
        : [],
      lowStockProducts: Array.isArray(lowStockProducts)
        ? lowStockProducts.slice(0, 20)
        : [],
      salesTrend: salesTrend || {}
    };

    const prompt = `
You are the professional sales analyst for Saint Clothing, a clothing business operating in the Philippines.

Analyze ONLY the supplied Saint Clothing sales report data below.

${JSON.stringify(data, null, 2)}

CURRENCY RULES:
- The official currency for this entire report is Philippine Peso.
- Currency code: PHP.
- Currency symbol: ₱.
- Every monetary value in the supplied data is already in Philippine Peso.
- totalRevenue is Philippine Peso.
- netProfit is Philippine Peso.
- product prices are Philippine Peso.
- product revenue is Philippine Peso.
- category revenue is Philippine Peso.
- sales trend revenue is Philippine Peso.
- Do not perform any currency conversion.
- Always display monetary figures using the ₱ symbol.
- Never use the dollar symbol $.
- Never use USD.
- Never describe any monetary amount as dollars.
- Do not assume monetary values are US dollars.
- Example: 15000 must be written as ₱15,000.
- Example: 1250 must be written as ₱1,250.
- Example: 999.50 must be written as ₱999.50.

Write one concise professional Sales Insight suitable for the Saint Clothing administrative sales report.

The insight should:
- summarize overall sales performance
- use the supplied revenue, orders, units sold and profit figures where useful
- identify the strongest-selling product when the supplied sales data supports it
- identify the strongest category when the supplied data supports it
- mention products with zero or weak sales only when useful
- mention important low-stock inventory risks
- provide one or two practical business recommendations based only on the supplied data
- use exact supplied figures where useful
- format every monetary figure as Philippine Peso using ₱
- never use $ or USD
- never convert PHP into another currency
- never invent causes for sales performance
- never invent sales
- never invent customers
- never invent percentages
- never invent forecasts
- never invent products
- never invent inventory information
- never claim something increased or decreased unless the supplied trend data supports that conclusion
- if there is insufficient sales data for a conclusion, clearly say so
- do not mention Gemini
- do not mention AI
- do not use a heading
- do not use bullet points
- return only one insight paragraph
- keep the response around 90 to 150 words
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    let insight = getResponseText(response);

    if (!insight) {
      return res.status(500).json({
        success: false,
        message: "No sales insight was returned."
      });
    }

    insight = insight
      .replace(/\bUSD\b/gi, "PHP")
      .replace(/\bUS\s+dollars?\b/gi, "Philippine pesos")
      .replace(/\bU\.S\.\s+dollars?\b/gi, "Philippine pesos")
      .replace(/\bdollars?\b/gi, "Philippine pesos")
      .replace(/\$(?=\s?\d)/g, "₱");

    return res.json({
      success: true,
      insight,
      currency: {
        code: "PHP",
        symbol: "₱",
        name: "Philippine Peso"
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Sales Insight Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Sales insight generation failed",
      details: error.response?.data || null
    });
  }
};

export const generateInventoryInsight = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing."
      });
    }

    const { overview, products, inventoryLogs } = req.body || {};

    if (!overview) {
      return res.status(400).json({
        success: false,
        message: "Inventory overview is required."
      });
    }

    const inventoryProducts = Array.isArray(products) ? products.slice(0, 100) : [];
    const logs = Array.isArray(inventoryLogs) ? inventoryLogs.slice(0, 100) : [];

    const data = {
      business: {
        name: "Saint Clothing",
        country: "Philippines"
      },
      overview: {
        totalProducts: safeNumber(overview.totalProducts),
        totalActualUnits: safeNumber(overview.totalActualUnits),
        totalPreorderUnits: safeNumber(overview.totalPreorderUnits),
        healthyProducts: safeNumber(overview.healthyProducts),
        lowStockProducts: safeNumber(overview.lowStockProducts),
        criticalProducts: safeNumber(overview.criticalProducts),
        preorderProducts: safeNumber(overview.preorderProducts),
        outOfStockProducts: safeNumber(overview.outOfStockProducts)
      },
      products: inventoryProducts.map(product => ({
        name: product?.name || "Unnamed Product",
        sku: product?.sku || "N/A",
        category: product?.category || "Unknown",
        actualStock: safeNumber(product?.actualStock),
        preorderStock: safeNumber(product?.preorderStock),
        status: product?.status || "Unknown",
        stockBySize: product?.stockBySize || {},
        preorderBySize: product?.preorderBySize || {},
        preorderEnabled: product?.preorderEnabled !== false,
        preorderThreshold: safeNumber(product?.preorderThreshold),
        preorderRestockDate: product?.preorderRestockDate || null
      })),
      recentInventoryMovements: logs.map(log => ({
        productName: log?.productName || "Unknown Product",
        sku: log?.sku || "N/A",
        stockType: log?.stockType || "Actual",
        size: log?.size || "-",
        oldQty: safeNumber(log?.oldQty),
        newQty: safeNumber(log?.newQty),
        difference: safeNumber(log?.difference),
        date: log?.createdAt || log?.updatedAt || null
      }))
    };

    const prompt = `
You are the professional inventory analyst for Saint Clothing, a clothing business operating in the Philippines.

Analyze ONLY the supplied Saint Clothing inventory data below.

${JSON.stringify(data, null, 2)}

Write one concise professional Inventory Insight suitable for the Saint Clothing administrative inventory management page.

The insight should:
- summarize the current overall inventory condition
- use exact actual stock and pre-order quantities when useful
- identify products that are completely out of stock
- identify products with critical or low stock when useful
- identify the product or products with the lowest actual inventory when supported by the supplied data
- identify important size-specific shortages using stockBySize
- mention zero-stock sizes when they create an important availability issue
- mention pre-order availability when relevant
- mention upcoming restock dates only when supplied
- use recent inventory movements only when they provide useful inventory context
- prioritize urgent inventory risks
- provide one or two practical restocking recommendations based only on the supplied data
- distinguish actual inventory from pre-order inventory
- never invent sales information
- never invent customer demand
- never call a product popular
- never call a product best-selling
- never call a product fast-selling
- never call a product high-demand
- never assume low stock means strong sales
- never assume a stock decrease represents a sale
- never assume a stock increase represents a supplier delivery
- never invent stock quantities
- never invent inventory movements
- never invent restock dates
- never invent causes for low stock
- never predict future demand
- if there is insufficient information for a conclusion, clearly say so
- do not mention Gemini
- do not mention AI
- do not use a heading
- do not use bullet points
- return only one insight paragraph
- keep the response around 90 to 150 words
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });

    const insight = getResponseText(response);

    if (!insight) {
      return res.status(500).json({
        success: false,
        message: "No inventory insight was returned."
      });
    }

    return res.json({
      success: true,
      insight,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Inventory Insight Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "Inventory insight generation failed",
      details: error.response?.data || null
    });
  }
};