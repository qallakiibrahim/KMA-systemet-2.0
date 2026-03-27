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
      return { response: 'AI-tjänsten saknar API-nyckel. Kontrollera att du har anslutit din nyckel i inställningarna.' };
    }
    
    const validMessages = messages.filter(msg => msg.content && msg.role);
    
    if (validMessages.length === 0) {
      return { response: 'Inga meddelanden att skicka.' };
    }

    const history = validMessages.slice(0, -1).map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    const lastMessage = validMessages[validMessages.length - 1].content;

    try {
      const chat = ai.chats.create({
        model: 'gemini-3-flash-preview',
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
        history: history
      });

      const response = await chat.sendMessage({ message: lastMessage });
      
      if (response && response.text) {
        return { response: response.text };
      }
    } catch (chatError) {
      console.error('AI Chat Error:', chatError);
      
      // Fallback to basic generateContent
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: [
          { role: 'user', parts: [{ text: SYSTEM_INSTRUCTION }] },
          ...history.map(h => ({ role: h.role, parts: h.parts })),
          { role: 'user', parts: [{ text: lastMessage }] }
        ]
      });

      if (response && response.text) {
        return { response: response.text };
      }
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
