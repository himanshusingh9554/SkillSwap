import React, { useState } from 'react';
import { api } from '../api/client';
import { Sparkles, X, Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

export default function AIEnhanceModal({ isOpen, onClose, onApply }) {
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');
  const [loading, setLoading] = useState(false);
  const [enhanced, setEnhanced] = useState(null);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleEnhance = async (e) => {
    e?.preventDefault();
    if (!draftTitle.trim() || !draftDesc.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ai/enhance-skill', {
        title: draftTitle.trim(),
        description: draftDesc.trim(),
      });
      setEnhanced(data.enhanced);
    } catch (err) {
      console.error('AI enhance error:', err);
      setError(err.message || 'Failed to enhance skill with AI');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (enhanced) {
      onApply(enhanced);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-dropdown w-full max-w-xl max-h-[90vh] rounded-3xl p-6 sm:p-8 flex flex-col border border-brand-500/30 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-600 to-indigo-600 text-white shadow-md shadow-brand-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Skill Enhancer
                <span className="text-[10px] uppercase tracking-wider font-bold bg-brand-500/20 text-brand-300 px-2 py-0.5 rounded-full border border-brand-500/30">
                  Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Turn rough notes into a compelling, structured skill listing.
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

        {/* Input Form */}
        <form onSubmit={handleEnhance} className="mt-5 space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Draft Topic / Idea
            </label>
            <input
              type="text"
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="e.g. 'React basics and building small apps'"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Rough Description or What You Teach
            </label>
            <textarea
              rows={3}
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="e.g. 'I can teach hooks, state, components, and how to connect to APIs in 1 hour sessions'..."
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !draftTitle.trim() || !draftDesc.trim()}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-brand-500/20 disabled:opacity-50 transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Enhancing with Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Professional Listing</span>
              </>
            )}
          </button>
        </form>

        {/* Enhanced Output */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {enhanced && (
          <div className="mt-5 p-4 rounded-2xl bg-slate-900/90 border border-brand-500/30 space-y-3 overflow-y-auto flex-1 animate-fade-in">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-300 uppercase tracking-wider">
                AI Suggested Preview
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md">
                🪙 {enhanced.credits || 20} Credits
              </span>
            </div>

            <div>
              <h4 className="text-sm font-bold text-white">{enhanced.title}</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">{enhanced.description}</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Category:</span>
              <span className="text-[11px] font-bold text-brand-300 bg-brand-500/20 px-2 py-0.5 rounded-md">
                {enhanced.category}
              </span>
            </div>

            {enhanced.keyOutcomes && enhanced.keyOutcomes.length > 0 && (
              <div>
                <span className="text-[11px] font-bold text-slate-300 block mb-1">Key Outcomes:</span>
                <ul className="space-y-1">
                  {enhanced.keyOutcomes.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-1.5 text-xs text-slate-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={handleApply}
              className="w-full mt-3 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
            >
              <span>Apply to Publish Form</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
