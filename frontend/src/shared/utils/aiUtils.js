import { GoogleGenAI } from '@google/genai';

/**
 * Gets the API key from the environment.
 * The platform injects the selected key into process.env.API_KEY.
 */
const getRawApiKey = () => {
  // In Vite/React, process.env might not be directly available or might be shimmed.
  // We check multiple possible locations where the platform might inject it.
  return (
    (typeof process !== 'undefined' && process.env ? process.env.API_KEY || process.env.GEMINI_API_KEY : null) ||
    (import.meta.env ? import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.VITE_API_KEY : null) ||
    null
  );
};

/**
 * Checks if an API key is available without triggering a selection dialog.
 */
export const hasApiKey = async () => {
  if (typeof window.aistudio === 'undefined') {
    return !!getRawApiKey();
  }
  try {
    return await window.aistudio.hasSelectedApiKey();
  } catch (error) {
    console.error('Error checking for API key:', error);
    return false;
  }
};

/**
 * Checks if the user has selected an API key.
 * If not, opens the selection dialog.
 * Returns the API key if successful, null otherwise.
 */
export const ensureApiKey = async () => {
  if (typeof window.aistudio === 'undefined') {
    return getRawApiKey();
  }

  try {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
    
    return getRawApiKey();
  } catch (error) {
    console.error('Error ensuring API key:', error);
    return null;
  }
};

/**
 * Gets a GoogleGenAI instance with the current API key.
 */
export const getAiInstance = async () => {
  const apiKey = await ensureApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
};
