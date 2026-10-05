import React, { useState, useRef, useEffect } from 'react';
import { api, API_BASE } from '../api/client';
import {
  Bot, Send, Loader2, Sparkles, Database,
  FileText, MessageCircle, ChevronDown, Zap, ArrowLeft, Cpu
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const SUGGESTED_QUESTIONS = [
  "How do skill credits work and how do I earn them?",
  "What is the lifecycle of a skill transaction?",
  "Can I cancel a transaction and get my credits back?",
  "What categories of skills can I publish?",
  "How does real-time chat work on SkillSwap?",
  "What is the AI Smart Matcher feature?",
  "What should I do if a provider doesn't show up?",
  "What tech stack powers the SkillSwap platform?",
];

const DEFAULT_MODELS = [
  'gemini-3.5-flash-lite',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-2.5-flash',
];

export default function AIResumeChatPage() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: "👋 Hi! I'm the **SkillSwap AI Assistant**.\n\nAsk me anything about how the platform works, credit rules, real-time messaging, transactions, or publishing skills.\n\nMy answers are powered by an **In-Memory Vector Database** indexing our platform knowledge base, with multi-model Gemini LLM fallback!",
      modelUsed: 'gemini-3.5-flash-lite'
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState('auto');
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  const [ragStats, setRagStats] = useState(null);
  const [showSources, setShowSources] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    fetchRagStats();
    fetchModels();
  }, []);

  const fetchRagStats = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/rag-stats`);
      const data = await res.json();
      setRagStats(data.stats);
      if (data.stats?.candidateModels) {
        setAvailableModels(data.stats.candidateModels);
      }
    } catch (err) {
      console.error('Failed to fetch RAG stats:', err);
    }
  };

  const fetchModels = async () => {
    try {
      const res = await fetch(`${API_BASE}/ai/models`);
      const data = await res.json();
      if (data?.models?.length > 0) {
        setAvailableModels(data.models);
      }
    } catch (err) {
      // fallback to DEFAULT_MODELS
    }
  };

  const handleSend = async (textToSend = input) => {
    const query = textToSend.trim();
    if (!query || loading) return;

    const userMsg = { sender: 'user', text: query };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          model: selectedModel === 'auto' ? undefined : selectedModel,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'AI error');

      setMessages(prev => [...prev, {
        sender: 'ai',
        text: data.reply,
        sources: data.ragSources,
        mode: data.mode,
        modelUsed: data.modelUsed,
      }]);

      if (data.ragStats) setRagStats(data.ragStats);
      if (data.availableModels) setAvailableModels(data.availableModels);
    } catch (err) {
      console.error('AI Chat error:', err);
      setMessages(prev => [...prev, {
        sender: 'ai',
        text: "Sorry, I encountered an issue connecting to the AI service. Please make sure the backend server is running.",
        modelUsed: 'offline-error'
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-slate-700/60 text-brand-300 px-1 py-0.5 rounded text-[11px]">$1</code>')
      .replace(/\n/g, '<br/>');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0b0f19] flex">
      {/* Sidebar — Vector DB & Models Info Panel */}
      <aside className="hidden lg:flex flex-col w-80 border-r border-white/5 bg-[#0d1220] p-5 gap-5">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Dashboard
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-brand-500/25">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">SkillSwap AI</h2>
            <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse" />
              Vector Knowledge Base Active
            </span>
          </div>
        </div>

        {/* Model Selector Card */}
        <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-white/10 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-brand-400" />
              Active LLM Model
            </span>
            <span className="text-[9px] bg-brand-500/20 text-brand-300 px-1.5 py-0.5 rounded font-mono">
              Try Any
            </span>
          </div>

          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="w-full bg-[#0a0e17] border border-white/15 text-white text-xs rounded-xl px-2.5 py-2 focus:outline-none focus:border-brand-500 transition-colors"
          >
            <option value="auto">⚡ Auto (All Models Fallback)</option>
            {availableModels.map((m) => (
              <option key={m} value={m}>
                🤖 {m}
              </option>
            ))}
          </select>
          <p className="text-[10px] text-slate-400 leading-tight">
            Select a specific model or keep on Auto to try candidate models sequentially.
          </p>
        </div>

        {/* Vector DB Stats */}
        {ragStats && (
          <div className="space-y-2.5">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Vector Store Stats</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                <Database className="w-3.5 h-3.5 text-brand-400 mb-1" />
                <p className="text-lg font-black text-white">{ragStats.totalItems ?? ragStats.totalChunks ?? 17}</p>
                <p className="text-[10px] text-slate-500">Knowledge Items</p>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-900/80 border border-white/5">
                <FileText className="w-3.5 h-3.5 text-emerald-400 mb-1" />
                <p className="text-lg font-black text-white">{ragStats.vocabularySize || 414}</p>
                <p className="text-[10px] text-slate-500">Vocabulary Terms</p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/50 border border-white/5 space-y-1.5">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Embedding:</span>
                <span className="font-semibold text-brand-300 bg-brand-500/10 px-2 py-0.5 rounded text-[10px]">
                  {ragStats.embeddingMode || 'Vector Engine'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-300 pt-1 border-t border-white/5">
                <Zap className="w-3 h-3 text-amber-400 shrink-0" />
                <span>projectKnowledge.json</span>
              </div>
            </div>
          </div>
        )}

        {/* How It Works */}
        <div className="space-y-2 mt-auto">
          <h3 className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Pipeline Flow</h3>
          <div className="space-y-1.5 text-[11px] text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-brand-900/60 text-brand-300 flex items-center justify-center text-[10px] font-bold">1</span>
              <span>Vector Similarity Search</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-indigo-900/60 text-indigo-300 flex items-center justify-center text-[10px] font-bold">2</span>
              <span>Context Retrieval & Prompt</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-4 rounded-md bg-purple-900/60 text-purple-300 flex items-center justify-center text-[10px] font-bold">3</span>
              <span>Multi-Model Gemini Fallback</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Chat Header */}
        <div className="flex items-center justify-between gap-3 px-5 py-3.5 border-b border-white/5 bg-[#0d1220]/80 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-brand-500/20">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                SkillSwap Assistant
                <span className="text-[9px] uppercase font-bold bg-gradient-to-r from-brand-500/20 to-purple-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/20">
                  Vector RAG
                </span>
              </h3>
              <p className="text-[10px] text-slate-500">Ask about credits, transactions, skills, and platform rules</p>
            </div>
          </div>

          {/* Model Selector Dropdown in Header */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-900 border border-white/10 px-2.5 py-1 rounded-xl text-xs">
              <Cpu className="w-3.5 h-3.5 text-brand-400" />
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer"
              >
                <option value="auto" className="bg-slate-900 text-white">Auto (Try All)</option>
                {availableModels.map((m) => (
                  <option key={m} value={m} className="bg-slate-900 text-white">
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-xl border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Online
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.map((m, idx) => (
            <div key={idx} className={`flex gap-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-700/60 to-purple-700/60 flex items-center justify-center text-white shrink-0 mt-1">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div className={`max-w-[85%] sm:max-w-[75%] space-y-2`}>
                <div
                  className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-brand-600 to-indigo-600 text-white rounded-br-sm'
                      : 'bg-[#141b2d] border border-white/5 text-slate-200 rounded-bl-sm shadow-md'
                  }`}
                  dangerouslySetInnerHTML={{ __html: formatText(m.text) }}
                />

                {/* Model and Sources Badges */}
                <div className="flex flex-wrap items-center gap-2 text-[10px]">
                  {m.modelUsed && (
                    <span className="bg-slate-800/80 text-brand-300 border border-brand-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <Sparkles className="w-2.5 h-2.5 text-brand-400" />
                      {m.modelUsed}
                    </span>
                  )}

                  {m.sources && m.sources.length > 0 && (
                    <button
                      onClick={() => setShowSources(showSources === idx ? null : idx)}
                      className="flex items-center gap-1 text-slate-400 hover:text-brand-300 transition-colors py-0.5"
                    >
                      <Database className="w-3 h-3 text-brand-400" />
                      <span>{m.sources.length} Vector Match{m.sources.length > 1 ? 'es' : ''}</span>
                      <ChevronDown className={`w-3 h-3 transition-transform ${showSources === idx ? 'rotate-180' : ''}`} />
                    </button>
                  )}
                </div>

                {/* Sources Accordion */}
                {showSources === idx && m.sources && m.sources.length > 0 && (
                  <div className="mt-1 space-y-1.5 p-2.5 rounded-xl bg-[#090d16] border border-white/5 animate-fade-in text-[11px]">
                    {m.sources.map((s, sIdx) => (
                      <div key={sIdx} className="p-2 rounded-lg bg-slate-900/60 border border-white/5 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-200 text-[11px]">{s.title || `Source ${sIdx + 1}`}</span>
                          <span className="text-[10px] text-brand-300 bg-brand-500/10 px-1.5 py-0.5 rounded font-mono">
                            {Math.round((s.score || 0) * 100)}% match
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 line-clamp-3">{s.chunk}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start animate-fade-in">
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-brand-700/60 to-purple-700/60 flex items-center justify-center text-white shrink-0">
                <Bot className="w-3.5 h-3.5" />
              </div>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-[#141b2d] border border-white/5 flex items-center gap-2 text-xs text-slate-400">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />
                <span>
                  Searching vector database & trying model: {selectedModel === 'auto' ? 'Auto Fallback' : selectedModel}...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions Chips */}
        {messages.length <= 2 && (
          <div className="px-5 py-2 border-t border-white/5 bg-[#0d1220]/40">
            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Suggested Questions</p>
            <div className="flex flex-wrap gap-1.5">
              {SUGGESTED_QUESTIONS.map((q, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(q)}
                  disabled={loading}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-brand-600/30 text-slate-300 hover:text-white border border-white/5 hover:border-brand-500/30 transition-all text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-[#0d1220]/80 backdrop-blur-sm shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything about SkillSwap (credits, chat, transactions, skills)..."
              disabled={loading}
              className="flex-1 px-4 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 text-white text-xs font-semibold hover:from-brand-500 hover:to-indigo-500 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shadow-md shadow-brand-500/20"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Ask AI</span>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
