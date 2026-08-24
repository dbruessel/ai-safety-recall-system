import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import LandingPage from './components/LandingPage';
import PublicAuditDemo from './components/PublicAuditDemo';
import TaskBoard from './components/TaskBoard';

// Supabase Initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function App() {
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [searchParams, setSearchParams] = useState<string>(window.location.search);
  const [selectedFleet, setSelectedFleet] = useState<string>('Las Vegas Fleet Test Co.');

  // Handle URL location changes
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setSearchParams(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Persist session across page refreshes via Supabase Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if URL matches the Broker Public Demo route or query flags
  const isDemoMode = 
    currentPath.includes('/audit/demo') || 
    searchParams.includes('demo=') || 
    searchParams.includes('broker=');

  // Trigger FastAPI Backend Stripe Checkout Session
  const handleStripeCheckout = async (tierId: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tier: tierId,
          success_url: `${window.location.origin}/?session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: window.location.origin,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        console.error('Stripe Checkout Error:', errData);
        return;
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Failed to trigger Stripe checkout:', err);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setSession(null);
  };

  // Prevent premature unauthenticated redirects while rehydrating auth state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F17] flex items-center justify-center font-mono text-slate-400">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-[#06B6D4] border-t-transparent rounded-full animate-spin" />
          <span>Restoring Session...</span>
        </div>
      </div>
    );
  }

  // 1. PUBLIC READ-ONLY BROKER AUDIT DEMO ROUTE (/audit/demo)
  if (isDemoMode) {
    return (
      <PublicAuditDemo
        onSubscribe={() => handleStripeCheckout('professional')}
      />
    );
  }

  // 2. PUBLIC MARKETING LANDING PAGE (Unauthenticated)
  if (!session) {
    return (
      <LandingPage
        onSignIn={() => {
          // Triggers login modal or session rehydration
          supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        }}
        onSelectTier={(tierId) => {
          handleStripeCheckout(tierId);
        }}
      />
    );
  }

  // 3. FULL AUTHENTICATED WORKSPACE
  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black">
      
      {/* WORKSPACE GLOBAL NAV HEADER */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img 
              src="/recall-logo.png" 
              alt="RecallLogic Logo" 
              className="h-7 w-auto object-contain" 
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-tight font-mono">
                  RECALLLOGIC WORKSPACE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono tracking-wide">
                Safety Intelligence System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{selectedFleet}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* WORKSPACE BODY CONTENT */}
      <main className="max-w-7xl mx-auto py-6">
        <TaskBoard />
      </main>
    </div>
  );
}

export default App;