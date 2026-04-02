import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.GEMINI_API_KEY.
 */
export const getRawApiKey = () => {
  // 1. Try the robustly injected global variable from server.ts (works in preview)
  if (typeof window !== 'undefined' && window.__GEMINI_API_KEY__) {
    console.log('AI API Key found via window.__GEMINI_API_KEY__');
    return window.__GEMINI_API_KEY__;
  }

  // 2. Try standard Vite environment variables (works in Vercel)
  // We check multiple possible names that Vite/Vercel might use
  const viteKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY;
  if (viteKey) {
    console.log('AI API Key found via import.meta.env');
    return viteKey;
  }

  // 3. Try process.env (replaced by Vite define at build time)
  // This is what we defined in vite.config.ts
  const processKey = (typeof process !== 'undefined' && process.env) ? (process.env.GEMINI_API_KEY || process.env.API_KEY) : null;
  if (processKey) {
    console.log('AI API Key found via process.env');
    return processKey;
  }

  // 4. Last resort: check if it was injected into window.process
  if (typeof window !== 'undefined' && window.process?.env?.GEMINI_API_KEY) {
    console.log('AI API Key found via window.process.env');
    return window.process.env.GEMINI_API_KEY;
  }

  if (typeof window !== 'undefined') {
    console.warn('AI API Key not found. Please ensure VITE_GEMINI_API_KEY is set in Vercel and a new deployment is triggered.');
  }

  return null;
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
