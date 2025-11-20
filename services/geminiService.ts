import { GoogleGenAI, Type, Modality } from "@google/genai";
import { FoodAnalysis } from "../types";

// Initialize the client with the environment variable
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const SYSTEM_INSTRUCTION = `
You are an expert AI Nutritionist and Dietician.

TASK:
Analyze the provided image to identify the food and estimate its nutritional content.

LANGUAGE REQUIREMENT:
You MUST return the following fields in Simplified Chinese (简体中文):
- foodName (The name of the dish)
- servingSize (e.g., "1碗", "100克")
- purineContent (e.g., "50毫克/100克")
- description (A brief nutritional summary)
- healthTips (Advice specifically in Chinese)

ANALYSIS LOGIC:
1. **Focus**: Identify the single most prominent food item or the main dish in the image.
2. **Unclear Images**: If the image is blurry or contains multiple dishes, analyze the most central or largest distinct food item. Make a best-guess estimate if details are ambiguous.
3. **Non-Food Images**: If the image does clearly NOT contain food, return "未检测到食物" as the 'foodName', set all nutrient numbers to 0, and explain in the 'description' that no food was found.

CALCULATION STANDARDS:
- **GI (Glycemic Index)**: Low (<55), Medium (56-69), High (>70).
- **Purine**: Low (<50mg/100g), Medium (50-150mg), High (>150mg).

Output must be strict JSON matching the schema.
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
            text: "Identify the main food item in this image and provide a detailed nutritional analysis in Simplified Chinese (简体中文).",
          },
        ],
      },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "Name of the food in Chinese" },
            calories: { type: Type.NUMBER, description: "Calories per serving (kcal)" },
            servingSize: { type: Type.STRING, description: "Serving size description in Chinese" },
            giIndex: { type: Type.NUMBER, description: "Glycemic Index value" },
            giLevel: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High"],
              description: "GI Category"
            },
            purineContent: { type: Type.STRING, description: "Purine content string in Chinese" },
            purineLevel: { 
              type: Type.STRING, 
              enum: ["Low", "Medium", "High"],
              description: "Purine Category"
            },
            macros: {
              type: Type.OBJECT,
              properties: {
                protein: { type: Type.NUMBER, description: "Protein (g)" },
                carbs: { type: Type.NUMBER, description: "Carbs (g)" },
                fat: { type: Type.NUMBER, description: "Fat (g)" },
              },
              required: ["protein", "carbs", "fat"],
            },
            healthTips: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "3 health tips in Chinese"
            },
            description: { type: Type.STRING, description: "Brief nutritional summary in Chinese" }
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

export const generateFoodSpeech = async (data: FoodAnalysis): Promise<string | undefined> => {
    // Construct a script that fits the "Sexy/Teasing" persona requested
    // We inject the "Say in a..." instruction directly into the text prompt for the TTS model
    const textToSay = `
      请用一种极其性感、妩媚、妖娆且充满挑逗的声音说：
      
      "嗯~ 让我仔细看看... 亲爱的，你今天要吃${data.foodName}吗？
      这就对了... 它的热量是${data.calories}千卡... 
      ${data.healthTips[0]}...
      虽然有点罪恶，但我不介意你坏一点点...
      慢慢享用哦，我会一直看着你的..."
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text: textToSay }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is usually a warm female voice
                    },
                },
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        return base64Audio;
    } catch (error) {
        console.error("TTS Generation Failed:", error);
        throw error;
    }
};