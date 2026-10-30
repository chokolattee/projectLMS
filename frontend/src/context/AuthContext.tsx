import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
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
    isLoading: false,
    isAuthenticated: false,
  });

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
