import { create } from 'zustand';
import { setTokenCookie, removeTokenCookie } from '@/api/client';

export interface User {
  id: string;
  email: string;
  username: string;
  firstName?: string | null;
  lastName?: string | null;
  role: string;
  isActive: boolean;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, token: string) => void;
  logout: () => void;
}

function getTokenFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: getTokenFromCookie(),
  isAuthenticated: !!getTokenFromCookie(),

  setAuth: (user, token) => {
    setTokenCookie(token);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    removeTokenCookie();
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
