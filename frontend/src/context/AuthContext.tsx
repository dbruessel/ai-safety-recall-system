import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  authLoading: boolean;
  demoAuthenticated: boolean;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [demoAuthenticated, setDemoAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    // 1. Fetch initial session from localStorage
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    // 2. Listen for auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInDemo = () => setDemoAuthenticated(true);

  const signOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setDemoAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
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