import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { Bell, Check, MessageSquare, ArrowRightLeft, Sparkles } from 'lucide-react';

export default function NotificationDropdown({ isOpen, onClose }) {
  const { notifications, markAsRead } = useSocket();
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleClick = async (notif) => {
    if (!notif.isRead) {
      await markAsRead(notif._id);
    }
    onClose();

    if (notif.type === 'TRANSACTION') {
      navigate('/transactions');
    } else if (notif.type === 'MESSAGE' && notif.relatedId) {
      navigate(`/chat/${notif.relatedId}`);
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'MESSAGE':
        return <MessageSquare className="w-4 h-4 text-sky-400" />;
      case 'TRANSACTION':
        return <ArrowRightLeft className="w-4 h-4 text-emerald-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="absolute right-0 mt-3 w-80 sm:w-96 glass-dropdown rounded-2xl p-4 z-50 animate-slide-up">
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-brand-400" />
          <h3 className="font-semibold text-sm text-slate-200">Notifications</h3>
        </div>
        <span className="text-xs text-slate-400">
          {notifications.filter((n) => !n.isRead).length} unread
        </span>
      </div>

      <div className="max-h-80 overflow-y-auto mt-2 space-y-2">
        {notifications.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs">
            No notifications yet.
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n._id}
              onClick={() => handleClick(n)}
              className={`p-3 rounded-xl transition-all cursor-pointer flex gap-3 items-start border ${
                n.isRead
                  ? 'bg-slate-800/40 border-transparent hover:bg-slate-800/80 text-slate-300'
                  : 'bg-brand-950/40 border-brand-500/30 hover:bg-brand-900/40 text-slate-100 shadow-sm'
              }`}
            >
              <div className="p-2 rounded-lg bg-slate-800/80 mt-0.5 shrink-0">
                {getIcon(n.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium leading-relaxed truncate-2-lines">
                  {n.content}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-brand-400 shrink-0 mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
