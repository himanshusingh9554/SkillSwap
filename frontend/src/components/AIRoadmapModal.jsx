import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Map, X, Loader2, Calendar, Clock, CheckCircle, Sparkles } from 'lucide-react';

export default function AIRoadmapModal({ isOpen, onClose, initialSkillA = '', initialSkillB = '' }) {
  const [mySkill, setMySkill] = useState(initialSkillA);
  const [partnerSkill, setPartnerSkill] = useState(initialSkillB);
  const [weeks] = useState(4);
  const [roadmap, setRoadmap] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGenerate = async (skillA = mySkill, skillB = partnerSkill) => {
    if (!skillA.trim() || !skillB.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/ai/generate-roadmap', {
        mySkill: skillA.trim(),
        partnerSkill: skillB.trim(),
        weeks: Number(weeks) || 4,
      });
      setRoadmap(data.roadmap);
    } catch (err) {
      console.error('AI Roadmap error:', err);
      setError(err.message || 'Failed to generate swap roadmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialSkillA) setMySkill(initialSkillA);
    if (initialSkillB) setPartnerSkill(initialSkillB);
    if (initialSkillA && initialSkillB && isOpen) {
      handleGenerate(initialSkillA, initialSkillB);
    }
  }, [initialSkillA, initialSkillB, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="glass-dropdown w-full max-w-2xl max-h-[90vh] rounded-3xl p-6 sm:p-8 flex flex-col border border-brand-500/30 overflow-hidden shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20">
              <Map className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                AI Swap Syllabus & Roadmap
                <span className="text-[10px] uppercase tracking-wider font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30">
                  Gemini
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                4-Week balanced exchange curriculum between two skills.
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

        {/* Inputs */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Your Skill to Share
            </label>
            <input
              type="text"
              value={mySkill}
              onChange={(e) => setMySkill(e.target.value)}
              placeholder="e.g. Python Programming"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Partner Skill to Learn
            </label>
            <input
              type="text"
              value={partnerSkill}
              onChange={(e) => setPartnerSkill(e.target.value)}
              placeholder="e.g. Spanish Conversation"
              className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-emerald-400"
            />
          </div>
        </div>

        <button
          onClick={() => handleGenerate()}
          disabled={loading || !mySkill.trim() || !partnerSkill.trim()}
          className="mt-3 w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 transition-all"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generating Custom Syllabus...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Generate Roadmap</span>
            </>
          )}
        </button>

        {/* Roadmap Display */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {roadmap && (
          <div className="mt-5 space-y-4 overflow-y-auto flex-1 pr-1 animate-fade-in">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-emerald-500/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider block">
                  Exchange Objective
                </span>
                <p className="text-xs text-slate-200 mt-0.5">{roadmap.summary}</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg shrink-0">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>{roadmap.recommendedSessionMinutes || 60}m / session</span>
              </div>
            </div>

            <div className="space-y-3">
              {roadmap.schedule?.map((item) => (
                <div
                  key={item.week}
                  className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 hover:border-emerald-500/30 transition-colors"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
                      Week {item.week}
                    </span>
                    <span className="text-xs font-semibold text-slate-300">{item.focus}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-brand-300 block mb-1">
                        Session A ({mySkill})
                      </span>
                      <p className="text-xs text-slate-200">{item.sessionA}</p>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-800/40 border border-white/5">
                      <span className="text-[10px] uppercase tracking-wider font-bold text-emerald-300 block mb-1">
                        Session B ({partnerSkill})
                      </span>
                      <p className="text-xs text-slate-200">{item.sessionB}</p>
                    </div>
                  </div>

                  {item.milestone && (
                    <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-300 bg-amber-500/5 px-2.5 py-1 rounded-lg border border-amber-500/15">
                      <CheckCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Milestone: {item.milestone}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {roadmap.successTips && (
              <div className="p-3.5 rounded-xl bg-slate-900/40 border border-white/5 space-y-1">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  AI Success Tips:
                </span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                  {roadmap.successTips.map((tip, idx) => (
                    <li key={idx}>{tip}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
