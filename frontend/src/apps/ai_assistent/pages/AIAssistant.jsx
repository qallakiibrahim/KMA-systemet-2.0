import React, { useState } from 'react';
import { Send, Bot, User, Key } from 'lucide-react';
import { chatWithAI } from '../api/aiApi';
import { hasApiKey, ensureApiKey } from '../../../shared/utils/aiUtils';
import '../styles/AIAssistant.css';

const AIAssistant = () => {
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hej! Jag är din AI-assistent. Hur kan jag hjälpa dig idag?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasKey, setHasKey] = useState(true);

  React.useEffect(() => {
    const checkKey = async () => {
      const available = await hasApiKey();
      setHasKey(available);
    };
    checkKey();
  }, []);

  const handleConnectAi = async () => {
    const key = await ensureApiKey();
    if (key) {
      setHasKey(true);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(newMessages);
      setMessages(prev => [...prev, { role: 'ai', content: response.response }]);
    } catch (error) {
      console.error('Failed to chat with AI', error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Ursäkta, ett fel uppstod när jag försökte svara. Försök igen senare.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="ai-assistant-container">
      <div className="ai-header">
        <h1>AI Assistent</h1>
        <p>Din personliga hjälpreda för projekt och uppgifter</p>
      </div>

      <div className="chat-container">
        {!hasKey && (
          <div className="ai-setup-overlay">
            <div className="ai-setup-content">
              <Key size={48} className="ai-setup-icon" />
              <h2>AI-nyckel saknas</h2>
              <p>För att använda AI-assistenten behöver du ansluta din egen Gemini API-nyckel.</p>
              <button className="btn-primary" onClick={handleConnectAi}>
                Anslut AI nu
              </button>
            </div>
          </div>
        )}
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.role}`}>
              <div className="message-avatar">
                {msg.role === 'ai' ? <Bot size={24} /> : <User size={24} />}
              </div>
              <div className="message-content">
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper ai">
              <div className="message-avatar">
                <Bot size={24} />
              </div>
              <div className="message-content loading">
                <div className="dot-typing"></div>
              </div>
            </div>
          )}
        </div>

        <form className="chat-input-form" onSubmit={handleSend}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Skriv ditt meddelande här..."
            disabled={isLoading}
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default AIAssistant;
