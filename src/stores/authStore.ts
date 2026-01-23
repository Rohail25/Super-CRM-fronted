import { create } from 'zustand';
import { authService, type User } from '../services/authService';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem('auth_token'),
  isAuthenticated: false,

  login: async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    set({
      user: response.user,
      token: response.token,
      isAuthenticated: true,
    });
  },

  logout: async () => {
    await authService.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
    });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('auth_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    try {
      const user = await authService.getCurrentUser();
      set({
        user,
        token,
        isAuthenticated: true,
      });
    } catch (error) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
      localStorage.removeItem('auth_token');
    }
  },

  setUser: (user: User | null) => {
    set({ user, isAuthenticated: !!user });
  },
}));
