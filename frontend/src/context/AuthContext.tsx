import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Tier } from '../lib/tierPermissions';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userTier: Tier;
  userRole: string;
  authLoading: boolean;
  demoAuthenticated: boolean;
  signUp: (email: string, pass: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userTier, setUserTier] = useState<Tier>('standard');
  const [userRole, setUserRole] = useState<string>('admin');
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(false);

  // Helper to fetch user profile and joined organization subscription_tier
  const fetchUserTier = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          subscription_tier,
          role,
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

      if (data?.role) {
        setUserRole(data.role);
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

  // Real Supabase Account Registration
  const signUp = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) throw error;

    // Provision matching profile row if auth user was generated
    if (data.user) {
      const prefix = email.split('@')[0];
      const companyName = `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        company_name: companyName,
        role: 'admin',
      });
    }

    return data;
  };

  // Real Supabase Password Sign In
  const signIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: pass,
    });

    if (error) throw error;
    return data;
  };

  // Dev Bypass Handler
  const signInDemo = () => {
    setDemoAuthenticated(true);
    setUserTier('professional');
    setUserRole('admin');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDemoAuthenticated(false);
    setUserTier('standard');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userTier,
        userRole,
        authLoading,
        demoAuthenticated,
        signUp,
        signIn,
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