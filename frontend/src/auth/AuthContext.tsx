import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, refreshSession, setAccessToken, setSessionLostHandler } from '@/api/client';
import type { Role, Session, User } from '@/api/types';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface RegisterInput {
  email: string;
  password: string;
  fullName: string;
}

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  hasRole: (...roles: Role[]) => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    setStatus('anonymous');
    queryClient.clear();
  }, [queryClient]);

  const applySession = useCallback((session: Session) => {
    setAccessToken(session.accessToken);
    setUser(session.user);
    setStatus('authenticated');
  }, []);

  useEffect(() => {
    setSessionLostHandler(clearSession);
    refreshSession().then(applySession, clearSession);
  }, [applySession, clearSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      hasRole: (...roles) => roles.some((role) => user?.roles.includes(role)),
      login: async (email, password) => {
        applySession(await api.post<Session>('/auth/login', { email, password }));
      },
      register: async (input) => {
        applySession(await api.post<Session>('/auth/register', input));
      },
      logout: async () => {
        await api.post('/auth/logout').catch(() => undefined);
        clearSession();
      },
      updateUser: setUser,
    }),
    [status, user, applySession, clearSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth используется вне AuthProvider');
  return context;
}
