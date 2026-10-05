import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillCard from '../components/SkillCard';
import AIMatchModal from '../components/AIMatchModal';
import AIEnhanceModal from '../components/AIEnhanceModal';
import AIRoadmapModal from '../components/AIRoadmapModal';
import { 
  Sparkles, 
  Search, 
  PlusCircle, 
  MessageSquare, 
  Compass, 
  Loader2, 
  Coins, 
  CheckCircle2, 
  Layers, 
  Filter,
  X
} from 'lucide-react';

const CATEGORIES = ['All', 'Technology', 'Creative', 'Lifestyle', 'Business', 'Other'];

export default function DashboardPage() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [skills, setSkills] = useState([]);
  const [loadingSkills, setLoadingSkills] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Chats
  const [myChats, setMyChats] = useState([]);

  // Modals state
  const [isMatchOpen, setIsMatchOpen] = useState(false);
  const [isEnhanceOpen, setIsEnhanceOpen] = useState(false);
  const [roadmapSkills, setRoadmapSkills] = useState(null);

  // Publish Form State
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCategory, setFormCategory] = useState('Technology');
  const [formType, setFormType] = useState('Offer');
  const [formCredits, setFormCredits] = useState(15);
  const [publishing, setPublishing] = useState(false);
  const [editingSkillId, setEditingSkillId] = useState(null);

  const fetchSkills = async () => {
    try {
      setLoadingSkills(true);
      const data = await api.get('/skills/');
      setSkills(data.skills || []);
    } catch (err) {
      console.error('Failed to load skills:', err);
    } finally {
      setLoadingSkills(false);
    }
  };

  const fetchChats = async () => {
    try {
      const data = await api.get('/chats');
      setMyChats(data.data || []);
    } catch (err) {
      console.error('Failed to load chats:', err);
    }
  };

  useEffect(() => {
    fetchSkills();
    fetchChats();
  }, []);

  // Filter skills based on Category and Search
  const filteredSkills = skills.filter((s) => {
    const matchesCat = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const mySkills = skills.filter((s) => s.owner?._id === user?._id);

  const handlePublishOrUpdate = async (e) => {
    e.preventDefault();
    setPublishing(true);

    const payload = {
      title: formTitle.trim(),
      description: formDesc.trim(),
      category: formCategory,
      skillType: formType,
      credits: Number(formCredits) || 10,
    };

    try {
      if (editingSkillId) {
        await api.patch(`/skills/${editingSkillId}`, payload);
        alert('Skill updated successfully!');
      } else {
        await api.post('/skills/create', payload);
        alert('Skill published successfully!');
      }
      resetForm();
      fetchSkills();
      refreshUser();
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setPublishing(false);
    }
  };

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormCategory('Technology');
    setFormType('Offer');
    setFormCredits(15);
    setEditingSkillId(null);
  };

  const handleEditSkill = (skill) => {
    setEditingSkillId(skill._id);
    setFormTitle(skill.title);
    setFormDesc(skill.description);
    setFormCategory(skill.category);
    setFormType(skill.skillType || 'Offer');
    setFormCredits(skill.credits);
    window.scrollTo({ top: 400, behavior: 'smooth' });
  };

  const handleDeleteSkill = async (skillId) => {
    if (!confirm('Are you sure you want to delete this skill listing?')) return;
    try {
      await api.delete(`/skills/${skillId}`);
      alert('Skill deleted successfully!');
      fetchSkills();
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  const handleRequestSwap = async (skillId) => {
    if (!confirm('Propose a skill swap for this listing?')) return;
    try {
      const data = await api.post('/transactions/initiate', { skillId });
      alert(data.message || 'Swap request initiated! Awaiting provider response.');
      refreshUser();
      navigate('/transactions');
    } catch (err) {
      alert(`Request failed: ${err.message}`);
    }
  };

  const handleStartChat = async (receiverId) => {
    if (!receiverId) return;
    try {
      const data = await api.post('/chats', { receiverId });
      const chatId = data.data?._id;
      if (chatId) {
        navigate(`/chat/${chatId}`);
      }
    } catch (err) {
      alert(`Chat error: ${err.message}`);
    }
  };

  const applyAIEnhancement = (enhanced) => {
    if (enhanced.title) setFormTitle(enhanced.title);
    if (enhanced.description) setFormDesc(enhanced.description);
    if (enhanced.category) setFormCategory(enhanced.category);
    if (enhanced.credits) setFormCredits(enhanced.credits);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Hero Welcome Banner */}
      <section className="relative glass-card rounded-3xl p-6 sm:p-8 overflow-hidden border border-white/10 shadow-2xl">
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-gradient-to-br from-brand-600/30 to-purple-600/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold text-brand-300 bg-brand-500/20 border border-brand-500/30 px-2.5 py-0.5 rounded-full">
                Peer-to-Peer Learning
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Welcome back, <span className="bg-gradient-to-r from-brand-400 via-indigo-300 to-purple-300 bg-clip-text text-transparent">{user?.fullName}</span> 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xl leading-relaxed">
              Explore skills listed by the community, use Google Gemini AI to find complementary exchange partners, or publish what you know!
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMatchOpen(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-brand-600 via-indigo-600 to-purple-600 hover:from-brand-500 hover:to-purple-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-brand-500/25 active:scale-95 transition-all"
            >
              <Sparkles className="w-4 h-4 text-brand-200 animate-pulse" />
              <span>AI Matchmaker</span>
            </button>
            <a
              href="#publish-form"
              className="px-4 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-white/10 flex items-center gap-2 transition-all"
            >
              <PlusCircle className="w-4 h-4 text-emerald-400" />
              <span>List Skill</span>
            </a>
          </div>
        </div>
      </section>

      {/* Main Grid: Marketplace on Left, Publish & Chats on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left 8 Cols: Explore Skills Marketplace */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Search & AI Match Header */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-brand-400" />
                <span>Explore Community Skills</span>
                <span className="text-xs text-slate-400 font-normal">
                  ({filteredSkills.length})
                </span>
              </h2>

              <button
                onClick={() => setIsMatchOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-bold transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                <span>Try Natural Language AI Match</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search skills by keyword (e.g. Python, Guitar, Figma)..."
                className="w-full bg-slate-900/80 border border-white/10 rounded-2xl py-3 pl-11 pr-4 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white shadow-md shadow-brand-600/20 border border-brand-500'
                      : 'bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 border border-white/5'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Skills Grid */}
          {loadingSkills ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 text-xs gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              <span>Loading skills marketplace...</span>
            </div>
          ) : filteredSkills.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center text-slate-400 space-y-3">
              <Compass className="w-10 h-10 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">No skills found matching this criteria.</p>
              <p className="text-xs max-w-sm mx-auto">
                Try searching for something else, or use the <strong>AI Matchmaker</strong> to find cross-disciplinary swaps!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {filteredSkills.map((skill) => (
                <SkillCard
                  key={skill._id}
                  skill={skill}
                  onRequest={handleRequestSwap}
                  onChat={handleStartChat}
                  onEdit={handleEditSkill}
                  onDelete={handleDeleteSkill}
                  onViewRoadmap={(s) => {
                    const myTopSkill = mySkills[0]?.title || 'Your Skill';
                    setRoadmapSkills({ a: myTopSkill, b: s.title });
                  }}
                />
              ))}
            </div>
          )}

        </div>

        {/* Right 4 Cols: Publish Skill & Active Chats */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Publish Skill Form Card */}
          <div id="publish-form" className="glass-card rounded-3xl p-6 border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>{editingSkillId ? 'Edit Skill Listing' : 'Publish a Skill'}</span>
              </h3>
              
              <button
                type="button"
                onClick={() => setIsEnhanceOpen(true)}
                className="flex items-center gap-1 text-[11px] font-bold text-brand-300 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/30 px-2.5 py-1 rounded-lg transition-colors"
                title="Use Gemini to generate a professional listing"
              >
                <Sparkles className="w-3 h-3 text-brand-300 animate-pulse" />
                <span>AI Auto-Fill</span>
              </button>
            </div>

            <form onSubmit={handlePublishOrUpdate} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Skill Title
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Master React & Tailwind"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Description / Syllabus
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="What topics will you teach or hope to learn?..."
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-400"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-brand-400"
                  >
                    <option value="Technology">Technology</option>
                    <option value="Creative">Creative</option>
                    <option value="Lifestyle">Lifestyle</option>
                    <option value="Business">Business</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Listing Type
                  </label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-2.5 text-xs text-white focus:outline-none focus:border-brand-400"
                  >
                    <option value="Offer">I Can Teach</option>
                    <option value="Request">I Want to Learn</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Credit Value (Cost / Session)
                </label>
                <div className="relative">
                  <Coins className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-2.5" />
                  <input
                    type="number"
                    min="0"
                    value={formCredits}
                    onChange={(e) => setFormCredits(e.target.value)}
                    className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 pl-9 pr-3 text-xs text-white focus:outline-none focus:border-brand-400"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="submit"
                  disabled={publishing}
                  className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/20 disabled:opacity-50 flex items-center justify-center gap-1.5 transition-all"
                >
                  {publishing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>{editingSkillId ? 'Update Listing' : 'Publish Skill'}</span>
                </button>

                {editingSkillId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Active Chats Sidebar */}
          <div className="glass-card rounded-3xl p-6 border border-white/10 space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-400" />
                <span>My Active Chats</span>
              </span>
              <span className="text-xs text-slate-400 font-normal">
                {myChats.length}
              </span>
            </h3>

            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {myChats.length === 0 ? (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No active chats yet. Connect with a skill provider!
                </p>
              ) : (
                myChats.map((c) => {
                  const other = c.participants?.find((p) => p._id !== user?._id);
                  if (!other) return null;
                  return (
                    <Link
                      key={c._id}
                      to={`/chat/${c._id}`}
                      className="p-2.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/80 border border-white/5 flex items-center gap-3 transition-colors group"
                    >
                      <img
                        src={
                          other.profilePicture ||
                          `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                            other.fullName || 'User'
                          )}`
                        }
                        alt={other.fullName}
                        className="w-8 h-8 rounded-full object-cover ring-1 ring-white/10"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-brand-300 truncate block">
                          {other.fullName}
                        </span>
                        <span className="text-[10px] text-slate-400 truncate block">
                          {c.lastMessage?.content || 'Click to open conversation'}
                        </span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modals */}
      <AIMatchModal
        isOpen={isMatchOpen}
        onClose={() => setIsMatchOpen(false)}
        onRequest={handleRequestSwap}
        onChat={handleStartChat}
      />

      <AIEnhanceModal
        isOpen={isEnhanceOpen}
        onClose={() => setIsEnhanceOpen(false)}
        onApply={applyAIEnhancement}
      />

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
