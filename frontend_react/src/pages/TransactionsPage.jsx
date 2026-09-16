import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import AIRoadmapModal from '../components/AIRoadmapModal';
import { 
  ArrowRightLeft, 
  Coins, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Map, 
  Loader2, 
  User,
  ShieldAlert
} from 'lucide-react';

const STATUS_BADGES = {
  pending: { label: 'Pending Approval', color: 'bg-amber-500/10 text-amber-300 border-amber-500/30' },
  accepted: { label: 'In Progress', color: 'bg-sky-500/10 text-sky-300 border-sky-500/30' },
  completed: { label: 'Completed', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' },
  cancelled: { label: 'Cancelled', color: 'bg-slate-500/10 text-slate-400 border-slate-500/30' },
};

export default function TransactionsPage() {
  const { user, refreshUser } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [roadmapSkills, setRoadmapSkills] = useState(null);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const data = await api.get('/transactions/my-transactions');
      setTransactions(data.transactions || []);
    } catch (err) {
      console.error('Failed to fetch transactions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleAction = async (actionType, transactionId) => {
    try {
      let endpoint = '';
      if (actionType === 'accept') endpoint = `/transactions/accept/${transactionId}`;
      if (actionType === 'complete') endpoint = `/transactions/complete/${transactionId}`;
      if (actionType === 'cancel') endpoint = `/transactions/cancel/${transactionId}`;

      const res = await api.patch(endpoint);
      alert(res.message || 'Transaction updated successfully!');
      fetchTransactions();
      refreshUser();
    } catch (err) {
      alert(`Action failed: ${err.message}`);
    }
  };

  const filteredTx = transactions.filter((tx) => {
    if (filter === 'pending') return tx.status === 'pending';
    if (filter === 'accepted') return tx.status === 'accepted';
    if (filter === 'completed') return tx.status === 'completed';
    return true;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2.5">
            <ArrowRightLeft className="w-6 h-6 text-brand-400" />
            <span>Skill Swap Transactions</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Track active exchanges, accept requests, transfer credits, and view AI roadmaps.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-2xl border border-white/5">
          {['all', 'pending', 'accepted', 'completed'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Transaction List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
          <span>Loading transactions...</span>
        </div>
      ) : filteredTx.length === 0 ? (
        <div className="glass-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
          <ArrowRightLeft className="w-10 h-10 text-slate-600 mx-auto" />
          <p className="text-sm font-semibold text-slate-300">No transactions in this category.</p>
          <p className="text-xs max-w-sm mx-auto">
            Propose a skill swap from the Explore marketplace to get started!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTx.map((tx) => {
            const isSeeker = tx.seeker?._id === user?._id;
            const otherParty = isSeeker ? tx.provider : tx.seeker;
            const badge = STATUS_BADGES[tx.status] || STATUS_BADGES.pending;

            return (
              <div
                key={tx._id}
                className="glass-card rounded-2xl p-5 border border-white/10 hover:border-brand-500/30 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                {/* Details */}
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">
                      {isSeeker ? 'You requested this skill' : 'User requested your skill'}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white">
                    {tx.skill?.title || 'Skill Swap Exchange'}
                  </h3>

                  <div className="flex items-center gap-3 text-xs text-slate-300">
                    <span className="flex items-center gap-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <strong>{otherParty?.fullName || 'Partner'}</strong>
                    </span>
                    <span className="text-slate-500">•</span>
                    <span className="flex items-center gap-1 text-amber-400 font-bold">
                      <Coins className="w-3.5 h-3.5" />
                      {tx.credits} Credits
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap">
                  {/* AI Roadmap Button */}
                  <button
                    onClick={() =>
                      setRoadmapSkills({
                        a: tx.skill?.title || 'Skill A',
                        b: 'Complementary Skill',
                      })
                    }
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-brand-300 border border-brand-500/20 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Map className="w-3.5 h-3.5" />
                    <span>AI Roadmap</span>
                  </button>

                  {/* Accept action for Provider */}
                  {tx.status === 'pending' && !isSeeker && (
                    <>
                      <button
                        onClick={() => handleAction('accept', tx._id)}
                        className="px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 transition-all"
                      >
                        Accept Request
                      </button>
                      <button
                        onClick={() => handleAction('cancel', tx._id)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {/* Complete action for Seeker */}
                  {tx.status === 'accepted' && isSeeker && (
                    <>
                      <button
                        onClick={() => handleAction('complete', tx._id)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                      >
                        Mark Complete & Transfer
                      </button>
                      <button
                        onClick={() => handleAction('cancel', tx._id)}
                        className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </>
                  )}

                  {/* Cancel for Provider if accepted */}
                  {tx.status === 'accepted' && !isSeeker && (
                    <button
                      onClick={() => handleAction('cancel', tx._id)}
                      className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-xs font-semibold transition-colors"
                    >
                      Cancel Swap
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* AI Roadmap Modal */}
      {roadmapSkills && (
        <AIRoadmapModal
          isOpen={Boolean(roadmapSkills)}
          onClose={() => setRoadmapSkills(null)}
          initialSkillA={roadmapSkills.a}
          initialSkillB={roadmapSkills.b}
        />
      )}
    </div>
  );
}
