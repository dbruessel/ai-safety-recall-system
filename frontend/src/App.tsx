import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);

  // User & Workspace States
  const [userEmail, setUserEmail] = useState<string>('lasvegas_fleet_test@example.com');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('professional');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentFleetCount, setCurrentFleetCount] = useState<number>(23);

  // Modal Visibility States
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          setCurrentUserId(session.user.id);
          setUserEmail(session.user.email || 'operator@fleetcompany.com');

          const { data: profile } = await supabase
            .from('profiles')
            .select('role, subscription_tier')
            .eq('id', session.user.id)
            .single();

          if (profile?.role) setUserRole(profile.role as UserRole);
          if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier as SubscriptionTier);
        }
      } catch (err) {
        console.warn('Supabase auth session check skipped or failed:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setIsAuthenticated(false);
      } else if (session) {
        setIsAuthenticated(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error during sign out:', error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setIsAuthenticated(false);
    }
  };

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

  // SIGNED OUT VIEW
  if (!isAuthenticated) {
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

          <div className="p-4 bg-slate-950/60 rounded-xl border border-slate-800">
            <p className="text-sm font-medium text-slate-200">You have been signed out.</p>
            <p className="text-xs text-slate-400 mt-1">Your active session and security credentials were cleared.</p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsAuthenticated(true);
              setLoading(false);
            }}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm rounded-xl transition cursor-pointer shadow-md"
          >
            Return to Workspace Console
          </button>
        </div>
      </div>
    );
  }

  // WORKSPACE VIEW
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
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

      <main>
        <TaskBoard />
      </main>

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