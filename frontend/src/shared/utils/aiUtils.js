import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.GEMINI_API_KEY.
 */
export const getRawApiKey = () => {
  // 1. Try the robustly injected global variable from server.ts (works in preview)
  if (typeof window !== 'undefined' && window.__GEMINI_API_KEY__) {
    return window.__GEMINI_API_KEY__;
  }

  // 2. Try standard Vite environment variable (works in Vercel if prefixed with VITE_)
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (viteKey) return viteKey;

  // 3. Fallback to process.env (for other environments)
  const key = typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : null;

  if (!key && typeof window !== 'undefined') {
    console.warn('AI API Key not found. Please set GEMINI_API_KEY in Settings (for preview) or VITE_GEMINI_API_KEY (for Vercel).');
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
