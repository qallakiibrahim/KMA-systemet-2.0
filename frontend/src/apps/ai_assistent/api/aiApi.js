import { GoogleGenAI } from '@google/genai';

export const chatWithAI = async (prompt) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return { response: response.text };
  } catch (error) {
    console.error('AI Chat error:', error);
    throw error;
  }
};
