import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { api } from '../api/client';
import AIRoadmapModal from '../components/AIRoadmapModal';
import { 
  ArrowLeft, 
  Send, 
  Map, 
  Loader2, 
  User as UserIcon,
  Sparkles
} from 'lucide-react';

export default function ChatPage() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [isRoadmapOpen, setIsRoadmapOpen] = useState(false);

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const fetchChatAndMessages = async () => {
      try {
        setLoading(true);
        // Fetch chat details
        const chatRes = await api.get(`/chats/${chatId}`);
        setChat(chatRes.data);

        // Fetch messages
        const msgsRes = await api.get(`/messages/${chatId}`);
        setMessages(msgsRes.messages || []);
      } catch (err) {
        console.error('Failed to load chat data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (chatId) {
      fetchChatAndMessages();
    }
  }, [chatId]);

  // Socket room join and message listening
  useEffect(() => {
    if (!socket || !chatId) return;

    socket.emit('join chat', chatId);

    const handleMessageReceived = (newMessage) => {
      if (newMessage.sender?._id !== user?._id) {
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    socket.on('message received', handleMessageReceived);

    return () => {
      socket.off('message received', handleMessageReceived);
    };
  }, [socket, chatId, user?._id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const content = inputText.trim();
    if (!content || !user || !chatId) return;

    setInputText('');

    // Optimistic message
    const tempMsg = {
      _id: Date.now().toString(),
      sender: {
        _id: user._id,
        fullName: user.fullName,
        profilePicture: user.profilePicture,
      },
      content,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    try {
      // Send via REST endpoint (which persists in MongoDB and updates chat)
      await api.post(`/messages/${chatId}`, { content });

      // Also emit via socket for immediate peer broadcasting
      socket?.emit('new message', {
        chatId,
        senderId: user._id,
        content,
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const otherUser = chat?.participants?.find((p) => p._id !== user?._id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 h-[calc(100vh-5rem)] flex flex-col">
      
      {/* Chat Header Card */}
      <div className="glass-card rounded-2xl p-4 flex items-center justify-between border border-white/10 shadow-lg shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {otherUser ? (
            <Link
              to={`/profile/${otherUser._id}`}
              className="flex items-center gap-3 group"
            >
              <img
                src={
                  otherUser.profilePicture ||
                  `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                    otherUser.fullName || 'User'
                  )}`
                }
                alt={otherUser.fullName}
                className="w-10 h-10 rounded-full object-cover ring-2 ring-brand-500/30"
              />
              <div>
                <h3 className="text-sm font-bold text-white group-hover:text-brand-300 transition-colors">
                  {otherUser.fullName}
                </h3>
                <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                  Swap Partner
                </span>
              </div>
            </Link>
          ) : (
            <span className="text-sm font-bold text-white">Conversation</span>
          )}
        </div>

        {/* AI Roadmap Button */}
        <button
          onClick={() => setIsRoadmapOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600/20 to-teal-600/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold transition-all shadow-sm"
        >
          <Map className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">AI Swap Roadmap</span>
        </button>
      </div>

      {/* Messages Container */}
      <div className="flex-1 glass-card rounded-2xl my-4 p-4 overflow-y-auto space-y-3 border border-white/5">
        {loading ? (
          <div className="h-full flex items-center justify-center text-slate-400 text-xs gap-2">
            <Loader2 className="w-5 h-5 animate-spin text-brand-400" />
            <span>Loading message history...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 text-xs text-center space-y-2">
            <Sparkles className="w-8 h-8 text-slate-600" />
            <p className="font-semibold text-slate-300">No messages in this chat yet.</p>
            <p className="text-[11px]">Say hello and propose a time for your skill exchange session!</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isSentByMe = msg.sender?._id === user?._id;
            return (
              <div
                key={msg._id || idx}
                className={`flex gap-2.5 ${isSentByMe ? 'justify-end' : 'justify-start'}`}
              >
                {!isSentByMe && (
                  <img
                    src={
                      msg.sender?.profilePicture ||
                      `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
                        msg.sender?.fullName || 'User'
                      )}`
                    }
                    alt={msg.sender?.fullName}
                    className="w-7 h-7 rounded-full object-cover shrink-0 mt-1"
                  />
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed ${
                    isSentByMe
                      ? 'bg-brand-600 text-white rounded-br-none shadow-md shadow-brand-600/20'
                      : 'bg-slate-800/90 text-slate-200 border border-white/5 rounded-bl-none'
                  }`}
                >
                  <p>{msg.content}</p>
                  <span className="text-[9px] opacity-70 mt-1 block text-right">
                    {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Box */}
      <form onSubmit={handleSendMessage} className="glass-card rounded-2xl p-2 flex gap-2 border border-white/10 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-brand-600/20 disabled:opacity-50 transition-all active:scale-95 shrink-0"
        >
          <span>Send</span>
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>

      {/* AI Roadmap Modal */}
      {otherUser && (
        <AIRoadmapModal
          isOpen={isRoadmapOpen}
          onClose={() => setIsRoadmapOpen(false)}
          initialSkillA="Skill Exchange"
          initialSkillB="Peer Knowledge"
        />
      )}
    </div>
  );
}
