import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  console.log('Testing Gemini API with key starting with:', apiKey ? apiKey.substring(0, 8) + '...' : 'MISSING');
  
  if (!apiKey) {
    console.error('ERROR: No API key found in environment!');
    return;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: 'Hello, are you working?',
    });
    console.log('SUCCESS! AI Response:', response.text);
  } catch (error) {
    console.error('FAILURE! Gemini API Error:', error.message);
  }
}

testGemini();
