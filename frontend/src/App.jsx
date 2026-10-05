import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';
import AICoachWidget from './components/AICoachWidget';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';
import ChatPage from './pages/ChatPage';
import TransactionsPage from './pages/TransactionsPage';
import ProfilePage from './pages/ProfilePage';
import AIResumeChatPage from './pages/AIResumeChatPage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0b0f19] flex items-center justify-center text-slate-400 text-xs gap-2">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        <span>Loading SkillSwap...</span>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <>
      <Navbar />
      <main className="min-h-[calc(100vh-4rem)]">{children}</main>
      <AICoachWidget />
    </>
  );
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/" replace />;

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <Routes>
            <Route
              path="/auth"
              element={
                <PublicRoute>
                  <AuthPage />
                </PublicRoute>
              }
            />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:chatId"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <ProtectedRoute>
                  <TransactionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-assistant"
              element={
                <ProtectedRoute>
                  <AIResumeChatPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai-resume-chat"
              element={
                <ProtectedRoute>
                  <AIResumeChatPage />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
