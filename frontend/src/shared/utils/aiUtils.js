import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.GEMINI_API_KEY.
 */
export const getRawApiKey = () => {
  // Try window.__GEMINI_API_KEY__ (injected by server.ts)
  if (typeof window !== 'undefined' && window.__GEMINI_API_KEY__) {
    return window.__GEMINI_API_KEY__;
  }
  
  // Try window.process.env (injected by server.ts)
  if (typeof window !== 'undefined' && window.process?.env?.GEMINI_API_KEY) {
    return window.process.env.GEMINI_API_KEY;
  }
  
  // Try standard process.env (replaced by Vite define)
  const key = process.env.GEMINI_API_KEY;

  if (!key) {
    console.warn('AI API Key not found in environment variables.');
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
