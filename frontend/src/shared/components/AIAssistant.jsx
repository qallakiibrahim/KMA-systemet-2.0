import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageCircle, X } from 'lucide-react';
import '../styles/Chatbot.css';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const newMessages = [...messages, { role: 'user', text: input }];
    setMessages(newMessages);
    setInput('');

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
      });

      setMessages([...newMessages, { role: 'assistant', text: response.text }]);
    } catch (error) {
      console.error('AI Error', error);
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
        <h3>AI Assistent</h3>
        <button onClick={() => setIsOpen(false)} className="close-btn">
          <X size={20} />
        </button>
      </div>
      <div className="chat-window">
        {messages.map((m, i) => (
          <div key={i} className={`message ${m.role}`}>
            {m.text}
          </div>
        ))}
      </div>
      <div className="chat-input">
        <input 
          value={input} 
          onChange={(e) => setInput(e.target.value)} 
          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          placeholder="Fråga AI..."
        />
        <button onClick={handleSend}>Skicka</button>
      </div>
    </div>
  );
};

export default AIAssistant;
