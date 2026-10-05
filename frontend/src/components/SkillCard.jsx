import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Coins, User, MessageCircle, ArrowRightLeft, Edit3, Trash2, Sparkles, Map } from 'lucide-react';

const CATEGORY_COLORS = {
  Technology: 'from-cyan-500/20 to-blue-500/20 text-cyan-300 border-cyan-500/30',
  Creative: 'from-fuchsia-500/20 to-purple-500/20 text-purple-300 border-purple-500/30',
  Lifestyle: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30',
  Business: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30',
  Other: 'from-slate-500/20 to-gray-500/20 text-slate-300 border-slate-500/30',
};

export default function SkillCard({ 
  skill, 
  onRequest, 
  onChat, 
  onEdit, 
  onDelete, 
  onViewRoadmap 
}) {
  const { user } = useAuth();
  const isOwner = user && skill.owner?._id === user._id;

  const categoryStyle = CATEGORY_COLORS[skill.category] || CATEGORY_COLORS.Other;

  return (
    <div className="glass-card rounded-2xl p-5 flex flex-col justify-between hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300 group">
      <div>
        {/* Top Badges */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border bg-gradient-to-r ${categoryStyle}`}>
              {skill.category}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/5">
              {skill.skillType === 'Offer' ? 'Offering' : 'Requesting'}
            </span>
          </div>

          <div className="flex items-center gap-1 text-amber-400 font-bold text-xs bg-amber-400/10 border border-amber-400/20 px-2.5 py-1 rounded-full shrink-0">
            <Coins className="w-3.5 h-3.5" />
            <span>{skill.credits} Credits</span>
          </div>
        </div>

        {/* AI Match Badge if present */}
        {skill.matchScore && (
          <div className="mb-3 p-2.5 rounded-xl bg-gradient-to-r from-purple-950/60 to-brand-950/60 border border-purple-500/30 text-purple-200">
            <div className="flex items-center gap-1.5 text-xs font-bold text-purple-300">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>{skill.matchScore}% Match</span>
            </div>
            {skill.matchReason && (
              <p className="text-[11px] text-purple-200/80 mt-1 leading-relaxed">
                {skill.matchReason}
              </p>
            )}
          </div>
        )}

        {/* Skill Title */}
        <h3 className="text-base font-bold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1">
          {skill.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-slate-400 mt-2 line-clamp-3 leading-relaxed">
          {skill.description}
        </p>
      </div>

      {/* Footer Info & Actions */}
      <div className="mt-5 pt-4 border-t border-white/10 flex flex-col gap-3">
        {/* Owner Info */}
        <div className="flex items-center justify-between">
          <Link
            to={`/profile/${skill.owner?._id || ''}`}
            className="flex items-center gap-2 text-xs text-slate-300 hover:text-white transition-colors"
          >
            <img
              src={
                skill.owner?.profilePicture ||
                `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                  skill.owner?.fullName || 'User'
                )}`
              }
              alt={skill.owner?.fullName}
              className="w-6 h-6 rounded-full object-cover ring-1 ring-white/20"
            />
            <span className="font-medium truncate max-w-[130px]">
              {isOwner ? 'You' : skill.owner?.fullName || 'Community Member'}
            </span>
          </Link>

          {/* AI Roadmap Quick Action */}
          {onViewRoadmap && (
            <button
              onClick={() => onViewRoadmap(skill)}
              className="flex items-center gap-1 text-[11px] font-semibold text-brand-400 hover:text-brand-300 hover:underline transition-colors"
              title="Preview AI 4-Week Syllabus"
            >
              <Map className="w-3.5 h-3.5" />
              <span>AI Roadmap</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {isOwner ? (
            <>
              <button
                onClick={() => onEdit(skill)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => onDelete(skill._id)}
                className="py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold border border-rose-500/20 transition-colors"
                title="Delete Skill"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onRequest(skill._id)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all active:scale-95"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Request Swap</span>
              </button>
              <button
                onClick={() => onChat(skill.owner?._id)}
                className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
                title="Chat with Provider"
              >
                <MessageCircle className="w-3.5 h-3.5 text-sky-400" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
