import { create } from 'zustand';
import type { SiteUser } from '@shared/api.interface';
import { getToken, setToken, clearToken } from '@client/src/utils/api-client';
import { apiPost, apiGet } from '@client/src/utils/api-client';

interface AuthState {
  user: SiteUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  avatarVersion: number;

  login: (username: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  registerWithVerify: (data: any) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setUser: (user: SiteUser) => void;
  refreshAvatar: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getToken(),
  isAuthenticated: false,
  isLoading: false,
  avatarVersion: 0,

  login: async (username: string, password: string) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<any>('/api/auth/login', { username, password });
      const { token, user } = res.data;
      setToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  register: async (data: any) => {
    set({ isLoading: true });
    try {
      await apiPost('/api/auth/register', data);
      set({ isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  registerWithVerify: async (data: any) => {
    set({ isLoading: true });
    try {
      const res = await apiPost<any>('/api/auth/register', data);
      const { token, user } = res.data;
      setToken(token);
      set({ user, token, isAuthenticated: true, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },

  logout: () => {
    clearToken();
    set({ user: null, token: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) {
      set({ isAuthenticated: false });
      return;
    }
    try {
      const res = await apiGet<any>('/api/auth/me');
      set({ user: res.data, isAuthenticated: true, token });
    } catch {
      clearToken();
      set({ user: null, token: null, isAuthenticated: false });
    }
  },

  setUser: (user: SiteUser) => {
    set({ user });
  },

  refreshAvatar: () => {
    set((state) => ({ avatarVersion: state.avatarVersion + 1 }));
  },
}));
