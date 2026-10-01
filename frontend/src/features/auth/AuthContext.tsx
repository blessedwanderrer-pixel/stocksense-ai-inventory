import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabase } from '../../lib/supabase/client';
import { api, setUnauthorizedHandler } from '../../lib/api/client';
import { ApiError } from '../../lib/api/errors';
import { queryClient } from '../../lib/query/queryClient';
import type { AuthenticatedProfile, UserRole } from '../../types/auth';

export interface AuthContextValue {
  user: AuthenticatedProfile | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  isLoading: boolean;
  isServiceUnavailable: boolean;
  isUnauthorizedProfile: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<AuthenticatedProfile>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<AuthenticatedProfile | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AuthenticatedProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isServiceUnavailable, setIsServiceUnavailable] = useState<boolean>(false);
  const [isUnauthorizedProfile, setIsUnauthorizedProfile] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Authoritative role fetch from GET /api/me
  const fetchBackendProfile = useCallback(async (token: string): Promise<AuthenticatedProfile> => {
    setIsServiceUnavailable(false);
    setIsUnauthorizedProfile(false);
    setError(null);

    try {
      const profile = await api.getProfile(undefined, token);

      // Verify that role is strictly 'manager' or 'staff'
      const role = profile.role as string;
      if (role !== 'manager' && role !== 'staff') {
        const roleErr = new Error(`Rejected unknown role: "${role}"`);
        setIsUnauthorizedProfile(true);
        setError(roleErr);
        setUser(null);
        throw roleErr;
      }

      setUser(profile);
      return profile;
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isUnauthorized) {
          // Token expired or invalid
          setUser(null);
          // Let logout clean up session
          const supabase = getSupabase();
          await supabase.auth.signOut().catch(() => {});
          queryClient.clear();
        } else if (err.isForbidden) {
          setIsUnauthorizedProfile(true);
          setUser(null);
        } else if (err.isServiceUnavailable) {
          setIsServiceUnavailable(true);
        }
      }
      setError(err instanceof Error ? err : new Error(String(err)));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      const supabase = getSupabase();
      await supabase.auth.signOut();
    } catch {
      // ignore network errors on signout
    } finally {
      setUser(null);
      setSession(null);
      setSupabaseUser(null);
      setIsUnauthorizedProfile(false);
      setIsServiceUnavailable(false);
      setError(null);
      queryClient.clear();
    }
  }, []);

  const refreshProfile = useCallback(async (): Promise<AuthenticatedProfile | null> => {
    const supabase = getSupabase();
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (!currentSession?.access_token) {
      setUser(null);
      return null;
    }
    try {
      return await fetchBackendProfile(currentSession.access_token);
    } catch {
      return null;
    }
  }, [fetchBackendProfile]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthenticatedProfile> => {
      setIsLoading(true);
      setError(null);
      setIsServiceUnavailable(false);
      setIsUnauthorizedProfile(false);

      const supabase = getSupabase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setIsLoading(false);
        setError(authError);
        throw authError;
      }

      const token = data.session?.access_token;
      if (!token) {
        setIsLoading(false);
        const noTokenErr = new Error('No access token received from authentication provider');
        setError(noTokenErr);
        throw noTokenErr;
      }

      setSession(data.session);
      setSupabaseUser(data.user);

      try {
        const profile = await fetchBackendProfile(token);
        setIsLoading(false);
        return profile;
      } catch (profileErr) {
        setIsLoading(false);
        throw profileErr;
      }
    },
    [fetchBackendProfile]
  );

  // Initialize auth state and subscribe to Supabase events
  useEffect(() => {
    let isMounted = true;
    const supabase = getSupabase();

    // Register 401 callback in API client
    setUnauthorizedHandler(() => {
      setUser(null);
      queryClient.clear();
    });

    const initAuth = async () => {
      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (currentSession?.access_token) {
          setSession(currentSession);
          setSupabaseUser(currentSession.user);
          try {
            await fetchBackendProfile(currentSession.access_token);
          } catch {
            // Error flags handled inside fetchBackendProfile
          }
        } else {
          setSession(null);
          setSupabaseUser(null);
          setUser(null);
        }
      } catch (err: unknown) {
        if (isMounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !newSession) {
        setSession(null);
        setSupabaseUser(null);
        setUser(null);
        setIsLoading(false);
        queryClient.clear();
      } else if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setSession(newSession);
        setSupabaseUser(newSession.user);
        if (newSession.access_token) {
          try {
            await fetchBackendProfile(newSession.access_token);
          } catch {
            // Handled in fetchBackendProfile
          }
        }
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      setUnauthorizedHandler(null);
    };
  }, [fetchBackendProfile]);

  const value: AuthContextValue = {
    user,
    supabaseUser,
    session,
    isLoading,
    isServiceUnavailable,
    isUnauthorizedProfile,
    error,
    login,
    logout,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
