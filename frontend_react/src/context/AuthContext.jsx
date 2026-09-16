import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const data = await api.get('/users/me');
      setUser(data.user);
    } catch (err) {
      console.warn('Authentication token expired or invalid:', err.message);
      localStorage.removeItem('accessToken');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/users/login', { email, password });
    if (data.accessToken) {
      localStorage.setItem('accessToken', data.accessToken);
    }
    setUser(data.user);
    return data;
  };

  const register = async (fullName, email, password) => {
    return await api.post('/users/register', { fullName, email, password });
  };

  const logout = async () => {
    try {
      await api.post('/users/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('accessToken');
      setUser(null);
    }
  };

  const refreshUser = async () => {
    try {
      const data = await api.get('/users/me');
      setUser(data.user);
    } catch (err) {
      console.error('Refresh user error:', err);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
