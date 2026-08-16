import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Modular App Components
import TaskBoard from './components/TaskBoard';
import AccountMenu from './components/AccountMenu';
import BillingManagementModal from './components/BillingManagementModal';
import TeamManagementModal from './components/TeamManagementModal';
import ModalsContainer from './components/ModalsContainer';

// Modular Landing Page Component
import { LandingPage } from './components/LandingPage';

export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';
export type UserRole = 'admin' | 'mechanic' | 'viewer';

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function App(): React.ReactElement {
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
        console.warn('Supabase auth check:', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();

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

  const handleSignOut = async (): Promise<void> => {
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
          <div className="animate-spin rounded-full h-5 w-5 border-2 border-cyan-500 border-t-transparent"></div>
          <span>Loading RecallLogic Safety Intelligence System...</span>
        </div>
      </div>
    );
  }

// PUBLIC MARKETING HOMEPAGE
if (!isAuthenticated) {
  return (
    <LandingPage
      onSignIn={() => {
        setIsAuthenticated(true);
      }}
      onSelectTier={async (tierId) => {
        try {
          const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
          
          const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: 'guest@recalllogic.com', // Passes Pydantic validation; Stripe updates this upon buyer checkout
              tier: tierId,
              success_url: `${window.location.origin}/?session_id={CHECKOUT_SESSION_ID}`,
              cancel_url: window.location.origin,
            }),
          });

          if (!response.ok) {
            const errData = await response.json();
            console.error('Backend Checkout Error:', errData);
            return;
          }

          const data = await response.json();

          if (data.url) {
            window.location.href = data.url; // Redirects straight to live Stripe Checkout page!
          }
        } catch (err) {
          console.error('Failed to trigger Stripe checkout:', err);
        }
      }}
    />
  );
}

  // ACTIVE WORKSPACE CONSOLE (Shown when authenticated)
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[#06B6D4] rounded-lg flex items-center justify-center font-bold text-slate-950 font-mono text-sm shadow-md">
            RL
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide font-mono">RECALLLOGIC WORKSPACE</h1>
            <p className="text-[10px] text-[#06B6D4] font-mono">Safety Intelligence System Active.</p>
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

      {/* Workspace Management Modals */}
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

      {/* Global Modals Orchestrator */}
      <ModalsContainer />
    </div>
  );
}

export default App;