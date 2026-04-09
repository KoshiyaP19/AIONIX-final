import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';

const SAMPLE_QUESTIONS = [
  "Which service currently has the lowest health percent?",
  "What is the overall system health and AI confidence?",
  "Tell me the exact timestamp and details of the last critical anomaly."
];

const ChatPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! I am AIONIX, your platform AI. Ask me anything about the current service state, live logs, or anomalies!' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    
    // Add user message to UI
    const updatedMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await axios.post('https://aionix-final.onrender.com/chat', {
        message: userMsg,
        // send history excluding the newly added user message (or including, chat.py handles just standard history)
        history: messages
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.data.reply }]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error connecting to AI Service. Please ensure the backend and AI Engine are running.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 p-4 bg-primary text-white rounded-full shadow-lg hover:bg-cyan-400 transition-all duration-300 z-50 flex items-center justify-center transform hover:scale-105"
        aria-label="Toggle AI Chat"
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[32rem] bg-panel border-2 border-slate-700/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          
          {/* Header */}
          <div className="bg-slate-800 p-4 border-b border-slate-700 flex items-center justify-between shadow-sm">
            <div className="flex items-center space-x-2">
              <Bot className="text-primary" size={24} />
              <h3 className="font-bold text-white tracking-wide">AIONIX AI</h3>
            </div>
            <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-medium border border-green-500/30">
              Online
            </span>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-darkbg custom-scrollbar">
            {messages.map((msg, idx) => (
              <div 
                key={idx} 
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-500' : 'bg-primary/20 border border-primary/30'}`}>
                  {msg.role === 'user' ? <User size={16} className="text-white" /> : <Bot size={16} className="text-primary" />}
                </div>
                
                {/* Message Bubble */}
                <div className={`p-3 rounded-2xl ${
                  msg.role === 'user' 
                    ? 'bg-indigo-500 text-white rounded-tr-none' 
                    : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-tl-none ProseMirror text-sm leading-relaxed max-w-full overflow-hidden'
                }`}>
                  {msg.role === 'user' ? (
                    msg.content
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {messages.length === 1 && (
              <div className="flex flex-col gap-2 mt-2 ml-14 max-w-[85%] mr-auto">
                <span className="text-xs text-slate-500 font-semibold mb-1">Suggested Questions:</span>
                {SAMPLE_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(q)}
                    className="text-left text-xs bg-slate-800 hover:bg-slate-700 focus:bg-slate-700 focus:ring-1 focus:ring-primary border border-slate-700 text-cyan-100 py-2.5 px-3.5 rounded-xl transition-all shadow-sm"
                  >
                    {q}
                  </button>
                ))}
              </div>
            )}
            
            {isLoading && (
              <div className="flex gap-3 max-w-[85%] mr-auto">
                <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Bot size={16} className="text-primary" />
                </div>
                <div className="p-3 bg-slate-800 rounded-2xl rounded-tl-none border border-slate-700 flex items-center space-x-2">
                  <Loader2 size={16} className="text-primary animate-spin" />
                  <span className="text-sm text-slate-400">Analyzing...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-4 bg-slate-800 border-t border-slate-700">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about logs, anomalies..."
                className="flex-1 bg-darkbg border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="bg-primary hover:bg-cyan-400 text-white rounded-xl px-4 py-2.5 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={18} />
              </button>
            </form>
          </div>
        </div>
      )}
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: #334155;
          border-radius: 10px;
        }
      `}</style>
    </>
  );
};

export default ChatPanel;
