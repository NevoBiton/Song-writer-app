import React, { createContext, useContext, useState, useCallback } from 'react';
import api from '@/lib/api';

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  avatar?: string | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (email: string, password: string, remember: boolean) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: AuthUser) => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getStorage(remember: boolean) {
  return remember ? localStorage : sessionStorage;
}

function readStoredAuth(): { token: string | null; user: AuthUser | null } {
  const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
  const raw = localStorage.getItem('auth_user') || sessionStorage.getItem('auth_user');
  const user = raw ? (JSON.parse(raw) as AuthUser) : null;
  return { token, user };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => readStoredAuth().token);
  const [user, setUser] = useState<AuthUser | null>(() => readStoredAuth().user);

  const login = useCallback(async (email: string, password: string, remember: boolean) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/login', { email, password });
    const storage = getStorage(remember);
    storage.setItem('auth_token', data.token);
    storage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    const { data } = await api.post<{ token: string; user: AuthUser }>('/auth/register', { email, username, password });
    localStorage.setItem('auth_token', data.token);
    localStorage.setItem('auth_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('auth_user');
    setToken(null);
    setUser(null);
  }, []);

  const updateUser = useCallback((updated: AuthUser) => {
    // Update whichever storage has the token
    const storage = localStorage.getItem('auth_token') ? localStorage : sessionStorage;
    storage.setItem('auth_user', JSON.stringify(updated));
    setUser(updated);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, updateUser, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
