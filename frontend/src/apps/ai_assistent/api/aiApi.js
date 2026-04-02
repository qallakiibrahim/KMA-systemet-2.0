import { GoogleGenAI } from '@google/genai';
import { getAiInstance } from '../../../shared/utils/aiUtils';

const SYSTEM_INSTRUCTION = `
Du är en hjälpsam AI-assistent för ett ledningssystem. 
Systemet hanterar processer, risker, avvikelser, dokument, kalenderhändelser och uppgifter.
Ditt mål är att hjälpa användaren att navigera i systemet, förstå dess data och ge råd om hur man förbättrar verksamheten.
Svara alltid på svenska. Var professionell men vänlig.
`;

export const chatWithAI = async (messages) => {
  try {
    const ai = await getAiInstance();
    
    if (!ai) {
      return { response: 'AI-tjänsten saknar API-nyckel. Kontrollera att du har anslutit din nyckel i inställningarna. Om du nyss har anslutit den, prova att ladda om sidan.' };
    }
    
    const validMessages = messages.filter(msg => msg.content && msg.role);
    
    // Gemini API requires the first message to be from the user.
    // If the first message is from AI, we skip it or prepend a dummy user message.
    let chatMessages = [...validMessages];
    if (chatMessages.length > 0 && chatMessages[0].role === 'ai') {
      chatMessages.shift(); // Skip the initial AI greeting
    }

    if (chatMessages.length === 0) {
      return { response: 'Inga meddelanden att skicka.' };
    }

    const contents = chatMessages.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    try {
      console.log('Sending to AI model:', contents);
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        }
      });
      
      console.log('AI Response received:', response);
      if (response && response.text) {
        return { response: response.text };
      }
    } catch (chatError) {
      console.error('AI Chat Error Details:', chatError);
      throw chatError;
    }

    throw new Error('Inget svar från AI-modellen.');
  } catch (error) {
    console.error('AI Chat error details:', error);
    let errorMessage = 'Ursäkta, jag fick ett tekniskt fel.';
    
    if (error.message) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
        errorMessage = 'AI-nyckeln är ogiltig. Kontrollera att GEMINI_API_KEY i "Settings" är korrekt (den ska börja med AIza).';
      } else if (error.message.includes('model not found') || error.message.includes('404')) {
        errorMessage = 'AI-modellen kunde inte nås. Kontrollera din åtkomst eller försök igen senare.';
      } else {
        errorMessage = `Tekniskt fel: ${error.message}`;
      }
    }
    
    return { response: errorMessage };
  }
};
