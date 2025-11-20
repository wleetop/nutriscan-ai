import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysis } from "../types";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert nutritionist and dietician. 
Analyze the provided image of food. 
Identify the food item and estimate its nutritional content.
Specifically, I need the Calories, Glycemic Index (GI), and Purine levels (for Gout management).

IMPORTANT: Return all text fields (foodName, description, healthTips, servingSize, purineContent) in Simplified Chinese (简体中文).

Determine levels (Low/Medium/High) based on standard medical guidelines:
- GI: Low (<55), Medium (56-69), High (>70)
- Purine: Low (<50mg/100g), Medium (50-150mg), High (>150mg)

Return the data in strict JSON format matching the schema.
`;

export const analyzeFoodImage = async (base64Image: string): Promise<FoodAnalysis> => {
  // Remove header if present (e.g., "data:image/jpeg;base64,")
  const cleanBase64 = base64Image.split(',')[1] || base64Image;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64,
            },
          },
          {
            text: "Identify this food and provide nutritional analysis including GI and Purine levels in Chinese.",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Name of the food dish or item in Chinese" },
            calories: { type: Type.NUMBER, description: "Estimated calories per serving" },
            servingSize: { type: Type.STRING, description: "Estimated serving size analyzed (e.g. '100g', '1 bowl') in Chinese" },
            giIndex: { type: Type.NUMBER, description: "Estimated Glycemic Index value" },
            giLevel: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High"],
              description: "Category of GI"
            },
            purineContent: { type: Type.STRING, description: "Estimated purine content string (e.g., '120mg/100g') in Chinese" },
            purineLevel: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High"],
              description: "Category of Purine content"
            },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER, description: "Protein in grams" },
                carbs: { type: Type.NUMBER, description: "Carbohydrates in grams" },
                fat: { type: Type.NUMBER, description: "Fat in grams" },
              },
              required: ["protein", "carbs", "fat"],
            },
            healthTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 short, bullet-point health tips or warnings regarding this food in Chinese"
            },
            description: { type: Type.STRING, description: "Brief description of the food nutritional profile in Chinese" }
          },
          required: ["foodName", "calories", "giIndex", "giLevel", "purineContent", "purineLevel", "macros", "healthTips", "servingSize", "description"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No analysis generated.");
    }

    const data = JSON.parse(response.text) as FoodAnalysis;
    return data;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    throw error;
  }
};