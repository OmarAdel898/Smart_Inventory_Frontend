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

function loadUser(): User | null {
  try {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveUser(user: User | null): void {
  if (user) {
    localStorage.setItem('user', JSON.stringify(user));
  } else {
    localStorage.removeItem('user');
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadUser(),
  token: getTokenFromCookie(),
  isAuthenticated: !!getTokenFromCookie(),

  setAuth: (user, token) => {
    setTokenCookie(token);
    saveUser(user);
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    removeTokenCookie();
    saveUser(null);
    set({ user: null, token: null, isAuthenticated: false });
  },
}));
