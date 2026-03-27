import { GoogleGenAI } from '@google/genai';

/**
 * Checks if the user has selected an API key.
 * If not, opens the selection dialog.
 * Returns the API key if successful, null otherwise.
 */
export const ensureApiKey = async () => {
  if (typeof window.aistudio === 'undefined') {
    console.warn('AI Studio environment not detected. Falling back to environment variables.');
    return process.env.GEMINI_API_KEY || process.env.API_KEY || null;
  }

  try {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
      // Assume success and proceed
    }
    
    // The key is injected into process.env.API_KEY by the platform
    const apiKey = process.env.API_KEY || process.env.GEMINI_API_KEY;
    return apiKey;
  } catch (error) {
    console.error('Error ensuring API key:', error);
    if (error.message && error.message.includes('Requested entity was not found')) {
      // Reset and prompt again if the key is invalid
      await window.aistudio.openSelectKey();
    }
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
