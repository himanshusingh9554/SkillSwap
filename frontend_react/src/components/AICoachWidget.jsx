import React, { useState, useRef, useEffect } from 'react';
import { api } from '../api/client';
import { Bot, X, Send, Loader2, Sparkles, MessageCircleQuestion, Database, Brain } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AICoachWidget() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hi! I'm your SkillSwap AI Assistant, powered by our platform knowledge vector store. Ask me anything about skill credits, transactions, publishing skills, or real-time chat!",
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = { sender: 'user', text: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const data = await api.post('/ai/tutor', { message: query });
      setMessages((prev) => [...prev, { sender: 'ai', text: data.reply, sources: data.ragSources }]);
    } catch (err) {
      console.error('AI Coach error:', err);
      setMessages((prev) => [
        ...prev,
        { sender: 'ai', text: "Sorry, I had trouble generating a reply. Please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "How do skill credits work?",
    "How does transaction lifecycle work?",
    "Can I cancel a transaction?",
  ];

  return (
    <div className="fixed bottom-6 right-6 z-40">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 text-white font-bold text-xs shadow-xl shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all duration-200 border border-white/20"
        >
          <Bot className="w-5 h-5 text-brand-200 group-hover:rotate-12 transition-transform" />
          <span>AI Coach</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
        </button>
      )}

      {/* Floating Chat Drawer */}
      {isOpen && (
        <div className="w-80 sm:w-96 h-[480px] glass-dropdown rounded-3xl p-4 flex flex-col border border-brand-500/30 shadow-2xl animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                  SkillSwap AI Coach
                  <span className="text-[9px] uppercase font-bold bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded-full">
                    Gemini
                  </span>
                </h4>
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" /> Online
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-6 h-6 rounded-lg bg-brand-700/60 flex items-center justify-center text-white shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-brand-300" />
                  </div>
                )}
                <div
                  className={`p-3 rounded-2xl max-w-[80%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-600 text-white rounded-br-none'
                      : 'bg-slate-800/80 text-slate-200 border border-white/5 rounded-bl-none'
                  }`}
                >
                  {m.text}
                </div>
                {/* RAG Sources indicator */}
                {m.sources && m.sources.length > 0 && (
                  <div className="flex items-center gap-1 mt-1 text-[9px] text-slate-500">
                    <Database className="w-2.5 h-2.5" />
                    {m.sources.length} RAG source{m.sources.length > 1 ? 's' : ''}
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-6 h-6 rounded-lg bg-brand-700/60 flex items-center justify-center text-white shrink-0">
                  <Loader2 className="w-3 h-3 text-brand-300 animate-spin" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-800/80 text-slate-400 rounded-bl-none text-xs flex items-center gap-1.5">
                  <span>Thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Prompts */}
          <div className="py-2 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(s)}
                className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-white/5 transition-colors"
              >
                {s}
              </button>
            ))}
            <button
              onClick={() => { setIsOpen(false); navigate('/ai-assistant'); }}
              className="text-[10px] whitespace-nowrap px-2.5 py-1 rounded-full bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/20 transition-colors flex items-center gap-1"
            >
              <Sparkles className="w-3 h-3" />
              Full Screen Mode
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="pt-2 border-t border-white/10 flex gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask AI Coach for advice..."
              className="flex-1 bg-slate-900/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white disabled:opacity-50 transition-colors shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
