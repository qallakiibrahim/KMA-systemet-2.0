import { GoogleGenAI } from '@google/genai';
import { getAiInstance } from '../../../shared/utils/aiUtils';
import { aiToolDeclarations, aiToolsImplementation } from './aiTools';

const SYSTEM_INSTRUCTION = `
Du är en hjälpsam AI-assistent för ett ledningssystem (SafeQMS). 
Systemet hanterar processer, risker, avvikelser, dokument, kalenderhändelser och uppgifter.
Ditt mål är att hjälpa användaren att navigera i systemet, förstå dess data och ge råd om hur man förbättrar verksamheten.
Svara alltid på svenska. Var professionell men vänlig.

VIKTIGT: Du har tillgång till verktyg för att hämta data från databasen. 
När användaren frågar om specifik information (t.ex. "vilka processer har vi?" eller "visa mina uppgifter"), använd motsvarande verktyg.
Användarens företag-ID (company_id) kommer att tillhandahållas i kontexten. Använd det alltid när du anropar verktygen.
`;

export const chatWithAI = async (messages, userProfile) => {
  try {
    const ai = await getAiInstance();
    
    if (!ai) {
      return { response: 'AI-tjänsten saknar API-nyckel. Kontrollera att du har anslutit din nyckel i inställningarna. Om du nyss har anslutit den, prova att ladda om sidan.' };
    }

    const companyId = userProfile?.company_id;
    if (!companyId) {
      return { response: 'Kunde inte hitta ditt företags-ID. Kontrollera att du är inloggad och kopplad till ett företag.' };
    }
    
    const validMessages = messages.filter(msg => msg.content && msg.role);
    
    // Gemini API requires the first message to be from the user.
    let chatMessages = [...validMessages];
    if (chatMessages.length > 0 && chatMessages[0].role === 'ai') {
      chatMessages.shift(); // Skip the initial AI greeting
    }

    if (chatMessages.length === 0) {
      return { response: 'Inga meddelanden att skicka.' };
    }

    // Add company_id context to the first message or as a system hint
    const contents = chatMessages.map(msg => ({
      role: msg.role === 'ai' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));

    // Prepend a context message if it's the first turn
    if (contents.length > 0 && contents[0].role === 'user') {
      contents[0].parts.unshift({ 
        text: `[KONTEXT: Användarens företags-ID är ${companyId}. Använd detta ID för alla databasanrop.]\n` 
      });
    }

    let currentContents = [...contents];
    let finalResponseText = '';

    // Loop to handle potential multiple rounds of function calling
    for (let i = 0; i < 5; i++) {
      console.log(`AI Loop ${i + 1}, sending contents:`, currentContents);
      
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: currentContents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          tools: [{ functionDeclarations: aiToolDeclarations }],
        }
      });

      console.log('AI Response received:', response);
      
      const candidate = response.candidates?.[0];
      const message = candidate?.content;
      
      if (!message) {
        throw new Error('Inget svar från AI-modellen.');
      }

      // Add model's response to history
      currentContents.push(message);

      const functionCalls = response.functionCalls;
      if (functionCalls && functionCalls.length > 0) {
        console.log('AI requested function calls:', functionCalls);
        
        const functionResponses = [];
        for (const call of functionCalls) {
          const { name, args, id } = call;
          const toolFunc = aiToolsImplementation[name];
          
          if (toolFunc) {
            try {
              // Ensure company_id is passed if requested
              const result = await toolFunc(args);
              functionResponses.push({
                name,
                id,
                response: { result }
              });
            } catch (toolError) {
              console.error(`Error executing tool ${name}:`, toolError);
              functionResponses.push({
                name,
                id,
                response: { error: toolError.message }
              });
            }
          } else {
            functionResponses.push({
              name,
              id,
              response: { error: `Verktyget ${name} hittades inte.` }
            });
          }
        }

        // Add function responses to history and continue loop
        currentContents.push({
          role: 'tool',
          parts: functionResponses.map(res => ({
            functionResponse: res
          }))
        });
        
        continue; // Next iteration to let the model process the tool results
      }

      // No more function calls, we have the final text
      finalResponseText = response.text || '';
      break;
    }

    return { response: finalResponseText || 'Ursäkta, jag kunde inte generera ett svar.' };

  } catch (error) {
    console.error('AI Chat error details:', error);
    let errorMessage = 'Ursäkta, jag fick ett tekniskt fel.';
    
    if (error.message) {
      if (error.message.includes('API_KEY_INVALID') || error.message.includes('API key not valid')) {
        errorMessage = 'AI-nyckeln är ogiltig. Kontrollera att GEMINI_API_KEY i "Settings" är korrekt.';
      } else if (error.message.includes('model not found') || error.message.includes('404')) {
        errorMessage = 'AI-modellen kunde inte nås. Kontrollera din åtkomst eller försök igen senare.';
      } else {
        errorMessage = `Tekniskt fel: ${error.message}`;
      }
    }
    
    return { response: errorMessage };
  }
};

