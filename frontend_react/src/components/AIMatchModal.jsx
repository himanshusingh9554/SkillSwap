import React, { useState } from 'react';
import { api } from '../api/client';
import SkillCard from './SkillCard';
import { Sparkles, X, Search, Loader2, Lightbulb } from 'lucide-react';

export default function AIMatchModal({ isOpen, onClose, onRequest, onChat }) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ai/match', { query: query.trim() });
      setResult(data);
    } catch (err) {
      console.error('AI match error:', err);
      setError(err.message || 'Failed to match skills with AI');
    } finally {
      setLoading(false);
    }
  };

  const samplePrompts = [
    'I want to teach Python in exchange for Guitar lessons',
    'Graphic design expert seeking conversational Spanish partner',
    'Looking for web development basics and fitness coaching',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-dropdown w-full max-w-2xl max-h-[90vh] rounded-3xl p-6 sm:p-8 flex flex-col border border-brand-500/30 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-600 to-purple-600 text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Smart Matchmaker
                <span className="text-[10px] uppercase tracking-wider font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Tell AI what skills you have and what you want to learn.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="mt-5">
          <div className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g., 'I offer Python & SQL and want to learn conversational French'..."
              className="w-full bg-slate-900/80 border border-brand-500/30 rounded-2xl py-3.5 pl-4 pr-32 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20 transition-all"
            />
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50 transition-all"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Find Matches</span>
            </button>
          </div>

          {/* Sample prompt pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-3">
            <span className="text-[11px] text-slate-400 flex items-center gap-1 mr-1">
              <Lightbulb className="w-3 h-3 text-amber-400" /> Ideas:
            </span>
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setQuery(p)}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/60 hover:bg-slate-800 text-slate-300 border border-white/5 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </form>

        {/* Results Body */}
        <div className="flex-1 overflow-y-auto mt-6 pr-1 space-y-4">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {result && (
            <div className="space-y-4 animate-fade-in">
              {result.aiAdvice && (
                <div className="p-3.5 rounded-2xl bg-brand-950/40 border border-brand-500/30 text-xs text-brand-200 flex items-start gap-2.5">
                  <Sparkles className="w-4 h-4 text-brand-400 mt-0.5 shrink-0" />
                  <div>
                    <strong className="font-semibold block text-white mb-0.5">AI Recommendation:</strong>
                    {result.aiAdvice}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Top Recommended Swaps ({result.matches?.length || 0})
                </h4>

                {result.matches && result.matches.length > 0 ? (
                  <div className="grid grid-cols-1 gap-3">
                    {result.matches.map((skill) => (
                      <SkillCard
                        key={skill._id}
                        skill={skill}
                        onRequest={(id) => {
                          onRequest(id);
                          onClose();
                        }}
                        onChat={(uid) => {
                          onChat(uid);
                          onClose();
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    No high-confidence matches found for this request. Try adjusting your description!
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
