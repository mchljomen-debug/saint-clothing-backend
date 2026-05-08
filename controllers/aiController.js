import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

export const generateOutfitSuggestion = async (req, res) => {
  try {
    const { top, bottom, style } = req.body;

    const prompt = `
You are a professional fashion stylist.

Top:
${top}

Bottom:
${bottom}

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
    console.error("Gemini Error:", error);

    res.status(500).json({
      success: false,
      message: "AI generation failed",
    });
  }
};