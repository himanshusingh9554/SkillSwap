import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import SkillCard from '../components/SkillCard';
import { 
  User, 
  Camera, 
  Coins, 
  Edit2, 
  Loader2, 
  Sparkles, 
  Tag, 
  Save, 
  X,
  MessageCircle
} from 'lucide-react';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: currentUser, refreshUser } = useAuth();
  
  const isOwnProfile = !userId || (currentUser && currentUser._id === userId);

  const [profileUser, setProfileUser] = useState(null);
  const [userSkills, setUserSkills] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit details state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [skillsInput, setSkillsInput] = useState('');
  const [updating, setUpdating] = useState(false);

  // Avatar upload
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      if (isOwnProfile) {
        setProfileUser(currentUser);
        setEditName(currentUser.fullName);
        setSkillsInput(currentUser.skills?.join(', ') || '');

        // Fetch own skills
        const data = await api.get('/skills/');
        const mySkills = (data.skills || []).filter((s) => s.owner?._id === currentUser._id);
        setUserSkills(mySkills);
      } else {
        const data = await api.get(`/users/profile/${userId}`);
        setProfileUser(data.data.user);
        setUserSkills(data.data.skills || []);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) {
      fetchProfile();
    }
  }, [userId, currentUser]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('avatar', file);

    setUploadingAvatar(true);
    try {
      await api.upload('/users/update-avatar', formData);
      alert('Avatar updated successfully!');
      refreshUser();
    } catch (err) {
      alert(`Avatar upload failed: ${err.message}`);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setUpdating(true);

    const skillsArray = skillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    try {
      await api.patch('/users/update-details', {
        fullName: editName.trim(),
        skills: skillsArray,
      });
      alert('Profile details updated!');
      setIsEditing(false);
      refreshUser();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setUpdating(false);
    }
  };

  if (loading || !profileUser) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-slate-400 text-xs gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        <span>Loading profile...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Header Card */}
      <div className="glass-card rounded-3xl p-6 sm:p-8 border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          
          {/* Avatar Container with Upload overlay */}
          <div className="relative group shrink-0">
            <img
              src={
                profileUser.profilePicture ||
                `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                  profileUser.fullName
                )}`
              }
              alt={profileUser.fullName}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover ring-4 ring-brand-500/30 shadow-xl"
            />

            {isOwnProfile && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-3xl bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer text-[10px] font-bold gap-1"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Camera className="w-5 h-5" />
                      <span>Change</span>
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </>
            )}
          </div>

          {/* User Details */}
          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black text-white">{profileUser.fullName}</h1>
                <p className="text-xs text-slate-400 mt-0.5">{profileUser.email}</p>
              </div>

              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 transition-colors"
                >
                  {isEditing ? <X className="w-3.5 h-3.5" /> : <Edit2 className="w-3.5 h-3.5" />}
                  <span>{isEditing ? 'Cancel' : 'Edit Profile'}</span>
                </button>
              ) : (
                <Link
                  to={`/chat`}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md transition-all"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message User</span>
                </Link>
              )}
            </div>

            {/* Credits Counter */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-300 font-bold text-xs">
              <Coins className="w-3.5 h-3.5 text-amber-400" />
              <span>{profileUser.credits ?? 50} Credits Balance</span>
            </div>

            {/* Skill Tags */}
            <div className="pt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
              {profileUser.skills && profileUser.skills.length > 0 ? (
                profileUser.skills.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[11px] font-semibold px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-brand-300 border border-brand-500/20"
                  >
                    #{tag}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No skill tags listed yet.</span>
              )}
            </div>
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveDetails} className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-slide-up">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Edit Account Information
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-400"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Skill Tags (Comma separated)
                </label>
                <input
                  type="text"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  placeholder="e.g. Python, Figma, Spanish, Guitar"
                  className="w-full bg-slate-900/80 border border-white/10 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-brand-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={updating}
              className="py-2 px-4 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Save Changes</span>
            </button>
          </form>
        )}
      </div>

      {/* Skills Offered by this User */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <span>Skills Offered by {isOwnProfile ? 'You' : profileUser.fullName}</span>
          <span className="text-xs text-slate-400 font-normal">
            ({userSkills.length})
          </span>
        </h2>

        {userSkills.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-400 text-xs">
            No active skills listed yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {userSkills.map((skill) => (
              <SkillCard
                key={skill._id}
                skill={skill}
                onRequest={() => {}}
                onChat={() => {}}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
