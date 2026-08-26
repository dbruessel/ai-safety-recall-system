import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Tier } from '../lib/tierPermissions';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userTier: Tier;
  authLoading: boolean;
  demoAuthenticated: boolean;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userTier, setUserTier] = useState<Tier>('standard');
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(false);

  // Helper to fetch user profile and joined organization subscription_tier
  const fetchUserTier = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          subscription_tier,
          organizations (
            subscription_tier
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching tier details:', error);
        return;
      }

      // Check organization tier first, fallback to profile tier, default to 'standard'
      const rawOrgTier = Array.isArray(data?.organizations)
        ? data?.organizations[0]?.subscription_tier
        : (data?.organizations as any)?.subscription_tier;

      const activeTier = (rawOrgTier || data?.subscription_tier || 'standard').toLowerCase() as Tier;
      setUserTier(activeTier);
    } catch (err) {
      console.error('Failed to resolve subscription tier:', err);
      setUserTier('standard');
    }
  };

  useEffect(() => {
    // 1. Fetch initial session and tier details
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserTier(session.user.id);
      }
      setAuthLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserTier(session.user.id);
      } else {
        setUserTier('standard');
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInDemo = () => setDemoAuthenticated(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserTier('standard');
    setDemoAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userTier,
        authLoading,
        demoAuthenticated,
        signInDemo,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};