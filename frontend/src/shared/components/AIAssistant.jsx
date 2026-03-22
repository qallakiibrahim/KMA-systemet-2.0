import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';
import { chatWithAI } from '../../apps/ai_assistent/api/aiApi';
import '../styles/Chatbot.css';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { role: 'ai', content: 'Hej! Hur kan jag hjälpa dig idag?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await chatWithAI(newMessages);
      setMessages(prev => [...prev, { role: 'ai', content: response.response }]);
    } catch (error) {
      console.error('AI Error', error);
      setMessages(prev => [...prev, { role: 'ai', content: 'Ett fel uppstod. Försök igen.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button className="ai-fab" onClick={() => setIsOpen(true)}>
        <MessageCircle size={24} />
      </button>
    );
  }

  return (
    <div className="ai-assistant">
      <div className="ai-header">
        <div className="header-title">
          <Bot size={20} />
          <span>AI Assistent</span>
        </div>
        <button onClick={() => setIsOpen(false)} className="close-btn">
          <X size={20} />
        </button>
      </div>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            <div className="message-icon">
              {m.role === 'ai' ? <Bot size={16} /> : <User size={16} />}
            </div>
            <div className="message-text">
              {m.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="message ai">
            <div className="message-icon">
              <Bot size={16} />
            </div>
            <div className="message-text loading">
              <div className="dot-typing"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <div className="chat-input">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Fråga AI..."
          disabled={isLoading}
        />
        <button onClick={handleSend} disabled={isLoading || !input.trim()}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default AIAssistant;
