import "dotenv/config";
import { GoogleGenAI, Modality } from "@google/genai";

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
${style || "modern streetwear"}

Explain why this outfit works in a modern streetwear fashion style.
Keep response short and clean.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return res.json({
      success: true,
      suggestion: response.text || "",
    });
  } catch (error) {
    console.error("Gemini Text Error:", error);

    return res.status(500).json({
      success: false,
      message: error.message || "AI style analysis failed",
    });
  }
};

/* ==============================
   AI GENERATED OUTFIT IMAGE
============================== */
export const generateOutfitImage = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        success: false,
        message: "GEMINI_API_KEY is missing in Render environment variables.",
      });
    }

    const { top, bottom, mannequin, style } = req.body;

    if (!mannequin?.data) {
      return res.status(400).json({
        success: false,
        message: "Mannequin image is missing.",
      });
    }

    if (!top?.image?.data && !bottom?.image?.data) {
      return res.status(400).json({
        success: false,
        message: "Please select at least one product image.",
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
`,
      },
      {
        inlineData: {
          mimeType: mannequin.mimeType || "image/png",
          data: mannequin.data,
        },
      },
    ];

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
      model: "gemini-2.0-flash-preview-image-generation",
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidates =
      response?.candidates ||
      response?.response?.candidates ||
      [];

    const responseParts =
      candidates?.[0]?.content?.parts || [];

    let image = "";

    for (const part of responseParts) {
      if (part.inlineData?.data) {
        image = `data:${part.inlineData.mimeType || "image/png"};base64,${
          part.inlineData.data
        }`;
        break;
      }
    }

    if (!image) {
      console.error(
        "Gemini Image Response Without Image:",
        JSON.stringify(response, null, 2)
      );

      return res.status(500).json({
        success: false,
        message:
          "Gemini did not return an image. Check if image generation is enabled for your API key.",
      });
    }

    return res.json({
      success: true,
      image,
    });
  } catch (error) {
    console.error("Gemini Image Error:", error);
    console.error("Gemini Image Error Message:", error.message);
    console.error("Gemini Image Error Response:", error.response?.data);

    return res.status(500).json({
      success: false,
      message: error.message || "AI image generation failed",
      details: error.response?.data || null,
    });
  }
};