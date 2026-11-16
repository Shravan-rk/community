import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from '../lib/api';
import { translate, type TranslationKey } from '../i18n';
import type { Language, Profile, User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
  profile: Profile | null;
}

interface RegisterInput {
  fullName: string;
  email: string;
  phone?: string;
  password: string;
  preferredLanguage: Language;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
}

interface AppContextValue {
  user: User | null;
  profile: Profile | null;
  language: Language;
  authLoading: boolean;
  unreadCount: number;
  toasts: Toast[];
  t: (key: TranslationKey, values?: Record<string, string | number>) => string;
  setLanguage: (language: Language) => void;
  setProfile: (profile: Profile | null) => void;
  login: (email: string, password: string) => Promise<User>;
  register: (input: RegisterInput) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  refreshUnread: () => Promise<void>;
  addToast: (message: string, type?: Toast['type']) => void;
  dismissToast: (id: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

const LANGUAGE_KEY = 'gs_language';

function storedLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_KEY);
  return value === 'en' || value === 'hi' || value === 'kn' ? value : 'kn';
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [language, setLanguageState] = useState<Language>(storedLanguage);
  const [authLoading, setAuthLoading] = useState(Boolean(getToken()));
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  const dismissToast = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const addToast = useCallback(
    (message: string, type: Toast['type'] = 'info') => {
      const id = (toastId.current += 1);
      setToasts((current) => [...current.slice(-2), { id, message, type }]);
      window.setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast],
  );

  const t = useCallback(
    (key: TranslationKey, values?: Record<string, string | number>) => translate(language, key, values),
    [language],
  );

  const setLanguage = useCallback((next: Language) => {
    localStorage.setItem(LANGUAGE_KEY, next);
    setLanguageState(next);
  }, []);

  const applySession = useCallback((session: LoginResponse) => {
    setToken(session.token);
    setUser(session.user);
    if (session.profile !== undefined) setProfile(session.profile);
    setLanguage((session.user.preferredLanguage as Language) ?? 'kn');
  }, [setLanguage]);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setProfile(null);
      setAuthLoading(false);
      return;
    }
    try {
      const response = await api.get<{ user: User; profile: Profile | null }>('/auth/me');
      setUser(response.user);
      setProfile(response.profile ?? null);
    } catch {
      setToken(null);
      setUser(null);
      setProfile(null);
    } finally {
      setAuthLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
    const onUnauthorized = () => {
      setToken(null);
      setUser(null);
      setProfile(null);
      setUnreadCount(0);
    };
    window.addEventListener('gs:unauthorized', onUnauthorized);
    return () => window.removeEventListener('gs:unauthorized', onUnauthorized);
  }, [refreshUser]);

  const refreshUnread = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const response = await api.get<{ unreadCount: number }>('/citizens/me/notifications?pageSize=1');
      setUnreadCount(response.unreadCount);
    } catch {
      // A failed badge request must not interrupt the page.
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refreshUnread();
    const timer = window.setInterval(() => void refreshUnread(), 60_000);
    return () => window.clearInterval(timer);
  }, [user, refreshUnread]);

  const login = useCallback(
    async (email: string, password: string) => {
      const response = await api.post<LoginResponse>('/auth/login', { email, password });
      applySession(response);
      return response.user;
    },
    [applySession],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      const response = await api.post<LoginResponse>('/auth/register', input);
      applySession(response);
      return response.user;
    },
    [applySession],
  );

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Tokens are stateless; local sign-out must still work offline.
    }
    setToken(null);
    setUser(null);
    setProfile(null);
    setUnreadCount(0);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      user,
      profile,
      language,
      authLoading,
      unreadCount,
      toasts,
      t,
      setLanguage,
      setProfile,
      login,
      register,
      logout,
      refreshUser,
      refreshUnread,
      addToast,
      dismissToast,
    }),
    [
      user,
      profile,
      language,
      authLoading,
      unreadCount,
      toasts,
      t,
      setLanguage,
      login,
      register,
      logout,
      refreshUser,
      refreshUnread,
      addToast,
      dismissToast,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used inside AppProvider');
  return context;
}


