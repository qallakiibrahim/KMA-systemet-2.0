import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.GEMINI_API_KEY.
 */
export const getRawApiKey = () => {
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    console.warn('AI API Key not found in process.env.GEMINI_API_KEY.');
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
