import React, { useState, useEffect } from 'react';
import { createClient, Session } from '@supabase/supabase-js';

import TaskBoard from './components/TaskBoard';
import AccountMenu from './components/AccountMenu';
import BillingManagementModal from './components/BillingManagementModal';
import TeamManagementModal from './components/TeamManagementModal';

export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';
export type UserRole = 'admin' | 'mechanic' | 'viewer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // User & Workspace States (default to empty until loaded)
  const [userEmail, setUserEmail] = useState<string>('');
  const [userRole, setUserRole] = useState<UserRole>('viewer');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentFleetCount, setCurrentFleetCount] = useState<number>(0);

  // Modal Visibility States
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // Auth & Session Listener
  useEffect(() => {
    // 1. Fetch initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        loadUserData(session);
      } else {
        setLoading(false);
      }
    });

    // 2. Listen for auth changes (SIGN_IN, SIGN_OUT, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        loadUserData(session);
      } else {
        // Reset all states on sign out
        setUserEmail('');
        setCurrentUserId('');
        setUserRole('viewer');
        setSubscriptionTier('free');
        setLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Helper to load profile data for authenticated users
  async function loadUserData(currentSession: Session) {
    try {
      const user = currentSession.user;
      setCurrentUserId(user.id);
      setUserEmail(user.email || '');

      const { data: profile } = await supabase
        .from('profiles')
        .select('role, subscription_tier')
        .eq('id', user.id)
        .single();

      if (profile?.role) setUserRole(profile.role as UserRole);
      if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier as SubscriptionTier);

      // Sync active fleet count for billing capacity meters
      const { count } = await supabase
        .from('monitored_vehicles')
        .select('*', { count: 'exact', head: true });

      if (count !== null && count !== undefined) {
        setCurrentFleetCount(count);
      }
    } catch (err) {
      console.error('Error loading user profile:', err);
    } finally {
      setLoading(false);
    }
  }

  // Handle explicit sign-out action
  const handleSignOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      setSession(null);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER: LOADING STATE
  // -------------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400 font-mono text-sm">
        <div className="flex items-center gap-3">
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
          <span>Loading RecallLogic Workspace...</span>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: SIGNED OUT / LANDING / LOGIN VIEW
  // -------------------------------------------------------------
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center font-sans text-slate-100">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl space-y-6">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center font-bold text-white font-mono text-xl shadow-lg">
            RL
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white font-mono">RECALLLOGIC</h1>
            <p className="text-xs text-slate-400 font-mono mt-1">Active Fleet Recall Risk Management</p>
          </div>

          <p className="text-sm text-slate-300">
            You are currently signed out of your workspace.
          </p>

          <button
            onClick={() => window.location.href = '/login'} // Or trigger your Login Modal / Auth component
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-md"
          >
            Sign In to Workspace
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // RENDER: AUTHENTICATED WORKSPACE
  // -------------------------------------------------------------
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* GLOBAL TOP NAVIGATION HEADER */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white font-mono text-sm shadow-md">
            RL
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide font-mono">RECALLLOGIC WORKSPACE</h1>
            <p className="text-[10px] text-slate-400 font-mono">Active Operational Risk Control.</p>
          </div>
        </div>

        {/* ACCOUNT MENU DROPDOWN IN GLOBAL NAV */}
        <AccountMenu
          userEmail={userEmail}
          userRole={userRole}
          subscriptionTier={subscriptionTier}
          onOpenTeamModal={() => setIsTeamModalOpen(true)}
          onOpenUpgradeModal={() => setIsBillingModalOpen(true)}
          onCopyUnderwriterLink={async () => {
            const shareUrl = `${window.location.origin}/audit/share/FLT-${currentUserId || '1001'}`;
            await navigator.clipboard.writeText(shareUrl);
          }}
          onDownloadRiskCard={() => {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            window.open(`${baseUrl}/api/broker/compliance-report/FLT-1001/pdf?broker_name=Aon%20Risk%20Solutions`, '_blank');
          }}
          onSignOut={handleSignOut}
        />
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main>
        <TaskBoard />
      </main>

      {/* GLOBAL OVERLAY MODALS */}
      <BillingManagementModal
        isOpen={isBillingModalOpen}
        subscriptionTier={subscriptionTier}
        currentFleetCount={currentFleetCount}
        userEmail={userEmail}
        onClose={() => setIsBillingModalOpen(false)}
        onSelectTier={setSubscriptionTier}
      />

      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default App;