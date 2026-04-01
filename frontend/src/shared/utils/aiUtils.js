import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.GEMINI_API_KEY.
 */
export const getRawApiKey = () => {
  // Use the robustly injected global variable from server.ts
  const key = typeof window !== 'undefined' ? window.__GEMINI_API_KEY__ : null;

  if (!key) {
    console.warn('AI API Key not found in window.__GEMINI_API_KEY__. Check server injection.');
  }

  return key;
};

/**
 * Gets a GoogleGenAI instance with the current API key.
 */
export const getAiInstance = async () => {
  const apiKey = getRawApiKey();
  if (!apiKey) {
    console.error('No Gemini API key found. AI features will not work.');
    return null;
  }
  return new GoogleGenAI({ apiKey });
};
