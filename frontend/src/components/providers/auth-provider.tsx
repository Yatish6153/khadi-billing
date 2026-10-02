'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import type { User } from '@/types/auth';

interface AuthContextValue {
  user: User;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

/**
 * Loads the signed-in user for every page inside the (app) route group.
 * If the session is invalid, api() redirects to /login automatically.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null);

  const refresh = React.useCallback(async () => {
    const data = await api<{ user: User }>('/auth/me');
    setUser(data.user);
  }, []);

  React.useEffect(() => {
    refresh().catch(() => {
      /* 401 is handled by api(); other errors leave the spinner up until reload */
    });
  }, [refresh]);

  const logout = React.useCallback(async () => {
    await api('/auth/logout', { method: 'POST', skipAuthRedirect: true }).catch(() => undefined);
    // Full reload clears all client state and cached data.
    window.location.assign('/login');
  }, []);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
      </div>
    );
  }

  return <AuthContext.Provider value={{ user, logout, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
