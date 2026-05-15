import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

/* ==============================
   TEXT STYLE SUGGESTION
============================== */
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
${style}

Explain why this outfit works in a modern streetwear fashion style.
Keep response short and clean.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    res.json({
      success: true,
      suggestion: response.text,
    });
  } catch (error) {
    console.error("Gemini Text Error:", error);

    res.status(500).json({
      success: false,
      message: "AI style analysis failed",
    });
  }
};

/* ==============================
   AI GENERATED OUTFIT IMAGE
============================== */
export const generateOutfitImage = async (req, res) => {
  try {
    const { top, bottom, mannequin, style } = req.body;

    if (!top?.image?.data && !bottom?.image?.data) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one product image.",
      });
    }

    const parts = [];

    parts.push({
      text: `
Create a clean fashion e-commerce outfit preview.

Goal:
Make the mannequin look like it is naturally wearing the selected clothing.

Style:
${style || "modern streetwear"}

Instructions:
- Use the mannequin body as the base pose.
- Place the top clothing naturally on the upper body.
- Place the bottom clothing naturally on the lower body.
- Keep the clothing design, color, logo, and texture close to the reference product images.
- Keep a clean studio background.
- Full body mannequin view.
- No extra text.
- No watermark.
- No distorted body.
- No duplicate clothes.
`,
    });

    if (mannequin?.data) {
      parts.push({
        inlineData: {
          mimeType: mannequin.mimeType || "image/png",
          data: mannequin.data,
        },
      });
    }

    if (top?.image?.data) {
      parts.push({
        inlineData: {
          mimeType: top.image.mimeType || "image/png",
          data: top.image.data,
        },
      });
    }

    if (bottom?.image?.data) {
      parts.push({
        inlineData: {
          mimeType: bottom.image.mimeType || "image/png",
          data: bottom.image.data,
        },
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: parts,
    });

    let image = "";

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData?.data) {
        image = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (!image) {
      return res.status(500).json({
        success: false,
        message: "AI did not return an image.",
      });
    }

    res.json({
      success: true,
      image,
    });
  } catch (error) {
    console.error("Gemini Image Error:", error);

    res.status(500).json({
      success: false,
      message: "AI image generation failed",
    });
  }
};