import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { Platform } from 'react-native';
import { User, AuthState, LoginPayload, RegisterPayload, ApiResponse, DashboardData } from '@/types/auth';

const API_BASE = 'http://localhost:8000/api';

interface AuthContextType extends AuthState {
  login: (payload: LoginPayload) => Promise<{ success: boolean; message: string; user?: User }>;
  register: (payload: RegisterPayload) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  fetchDashboard: () => Promise<{ success: boolean; data?: DashboardData; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
    isAuthenticated: false,
  });

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    const restoreSession = async () => {
      try {
        const saved =
          window.localStorage.getItem('projectLms.auth') ||
          window.sessionStorage.getItem('projectLms.auth');

        if (saved) {
          const parsed = JSON.parse(saved) as { user?: User; token?: string };
          if (parsed.user && parsed.token) {
            const token = parsed.token;
            // Restore immediately from cache so the user doesn't get signed out on refresh!
            setState({
              user: parsed.user,
              token,
              isLoading: false,
              isAuthenticated: true,
            });

            // Validate in background to keep profile synced
            try {
              const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
              });

              if (response.status === 401) {
                // Token really expired or invalidated on backend
                window.localStorage.removeItem('projectLms.auth');
                window.sessionStorage.removeItem('projectLms.auth');
                setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
                return;
              }

              const data = await response.json();
              if (response.ok && data.success && data.data) {
                const currentUser = data.data as User;
                setState(prev => ({
                  ...prev,
                  user: currentUser,
                  token,
                  isLoading: false,
                  isAuthenticated: true,
                }));
                const updated = JSON.stringify({ user: currentUser, token });
                window.localStorage.setItem('projectLms.auth', updated);
                window.sessionStorage.setItem('projectLms.auth', updated);
              }
            } catch (networkErr) {
              // Network blip; keep cached user session active so user is never signed out
              console.warn('Background token verification skipped due to network:', networkErr);
            }
            return;
          }
        }
      } catch (err) {
        console.warn('Session restore error:', err);
      }
      setState(prev => ({ ...prev, isLoading: false, user: null, token: null, isAuthenticated: false }));
    };
    void restoreSession();
  }, []);

  const login = useCallback(async (payload: LoginPayload) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await response.json();

      if (data.success && data.token && data.user) {
        setState({
          user: data.user,
          token: data.token,
          isLoading: false,
          isAuthenticated: true,
        });
        if (typeof window !== 'undefined') {
          const authData = JSON.stringify({
            user: data.user,
            token: data.token,
          });
          window.localStorage.setItem('projectLms.auth', authData);
          window.sessionStorage.setItem('projectLms.auth', authData);
        }
        return { success: true, message: 'Login successful', user: data.user };
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
        return { success: false, message: data.message || 'Login failed' };
      }
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  }, []);

  const register = useCallback(async (payload: RegisterPayload) => {
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: ApiResponse = await response.json();
      setState(prev => ({ ...prev, isLoading: false }));

      return {
        success: data.success,
        message: data.message || (data.success ? 'Registration successful!' : 'Registration failed.'),
      };
    } catch (error) {
      setState(prev => ({ ...prev, isLoading: false }));
      return { success: false, message: 'Network error. Please check your connection.' };
    }
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('projectLms.auth');
      window.sessionStorage.removeItem('projectLms.auth');
    }
    setState({ user: null, token: null, isLoading: false, isAuthenticated: false });
  }, []);

  const fetchDashboard = useCallback(async () => {
    if (!state.token) return { success: false, message: 'Not authenticated' };
    try {
      const response = await fetch(`${API_BASE}/student/dashboard`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${state.token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        return { success: true, data: data.data as DashboardData };
      }
      return { success: false, message: data.message };
    } catch (error) {
      return { success: false, message: 'Failed to fetch dashboard data.' };
    }
  }, [state.token]);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, fetchDashboard }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
