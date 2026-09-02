import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { Tier } from '../lib/tierPermissions';

export interface UserProfile {
  id: string;
  email: string;
  role: string;
  organization_id?: string;
  company_name?: string;
  vehicle_limit?: number;
  is_broker?: boolean;
  brokerage_id?: string;
  subscription_tier?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userProfile: UserProfile | null;
  userTier: Tier;
  userRole: string;
  companyName: string;
  authLoading: boolean;
  demoAuthenticated: boolean;
  signUp: (email: string, pass: string, company?: string) => Promise<any>;
  signIn: (email: string, pass: string) => Promise<any>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [userTier, setUserTier] = useState<Tier>('standard');
  const [userRole, setUserRole] = useState<string>('admin');
  const [companyName, setCompanyName] = useState<string>('');
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(false);

  // Helper to fetch user profile, broker flags, company_name, and joined organization tier
  const fetchUserProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          id,
          email,
          role,
          organization_id,
          company_name,
          subscription_tier,
          is_broker,
          brokerage_id,
          organizations (
            name,
            subscription_tier
          )
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile details:', error);
        return;
      }

      if (data) {
        // Construct full profile object
        const profileObj: UserProfile = {
          id: data.id,
          email: data.email,
          role: data.role || 'admin',
          organization_id: data.organization_id,
          company_name: data.company_name,
          subscription_tier: data.subscription_tier,
          is_broker: Boolean(data.is_broker),
          brokerage_id: data.brokerage_id,
        };

        setUserProfile(profileObj);

        if (data.role) {
          setUserRole(data.role);
        }

        // Check profiles company_name first, then organization name
        const rawOrgName = Array.isArray(data?.organizations)
          ? data?.organizations[0]?.name
          : (data?.organizations as any)?.name;

        const activeCompanyName = data?.company_name || rawOrgName || '';
        if (activeCompanyName) {
          setCompanyName(activeCompanyName);
        }

        // Check organization tier first, fallback to profile tier
        const rawOrgTier = Array.isArray(data?.organizations)
          ? data?.organizations[0]?.subscription_tier
          : (data?.organizations as any)?.subscription_tier;

        const activeTier = (rawOrgTier || data?.subscription_tier || 'standard').toLowerCase() as Tier;
        setUserTier(activeTier);
      }
    } catch (err) {
      console.error('Failed to resolve user profile:', err);
      setUserTier('standard');
    }
  };

  const refreshProfile = async () => {
    if (session?.user) {
      await fetchUserProfile(session.user.id);
    }
  };

  useEffect(() => {
    // 1. Fetch initial session and profile details
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setAuthLoading(false);
    });

    // 2. Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
        setUserTier('standard');
        setCompanyName('');
      }
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Real Supabase Account Registration with optional company name
  const signUp = async (email: string, pass: string, company?: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password: pass,
    });

    if (error) throw error;

    if (data.user) {
      const prefix = email.split('@')[0];
      const defaultName = `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;
      const finalCompanyName = company?.trim() || defaultName;

      await supabase.from('profiles').upsert({
        id: data.user.id,
        email: data.user.email,
        company_name: finalCompanyName,
        role: 'admin',
        is_broker: false
      });

      setCompanyName(finalCompanyName);
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
    if (data.user) {
      await fetchUserProfile(data.user.id);
    }
    return data;
  };

  // Dev Bypass Handler (Preserves existing DB company_name if present)
  const signInDemo = () => {
    setDemoAuthenticated(true);
    setUserTier('professional');
    setUserRole('admin');
    setUserProfile({
      id: 'demo-broker-user-id',
      email: 'dennis+broker@recalllogic.ai',
      role: 'admin',
      is_broker: true,
      company_name: 'Demo Fleet Operations'
    });
    setCompanyName((prevName) => (prevName && prevName.trim() !== '' ? prevName : 'Demo Fleet Operations'));
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setUserProfile(null);
    setDemoAuthenticated(false);
    setUserTier('standard');
    setCompanyName('');
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        userProfile,
        userTier,
        userRole,
        companyName,
        authLoading,
        demoAuthenticated,
        signUp,
        signIn,
        signInDemo,
        signOut,
        refreshProfile,
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

export default AuthProvider;