import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import TaskBoard from './components/TaskBoard';
import BrokerPortal from './components/BrokerPortal';
import Footer from './components/Footer';
import AccountMenu from './components/AccountMenu';
import BrokerShareModal from './components/BrokerShareModal';
import TeamManagementModal from './components/TeamManagementModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { createClient } from '@supabase/supabase-js';

// Safe inline Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MainApp: React.FC = () => {
  const { user, userTier, userRole, companyName, userProfile, signOut, signInDemo, demoAuthenticated } = useAuth();

  // Navigation state for active workspace view
  const [activeView, setActiveView] = useState<'workspace' | 'broker_portal'>('workspace');

  // Modal display states for header controls
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [activeAdminModal, setActiveAdminModal] = useState<'team' | 'billing' | null>(null);

  // Track direct URL subpaths for broker/demo views
  const [isDemoPath, setIsDemoPath] = useState<boolean>(false);

  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/audit/demo') || path.includes('/audit/share')) {
      setIsDemoPath(true);
    }
  }, []);

  // AUTOMATIC POST-CHECKOUT SUPABASE SYNC
  useEffect(() => {
    const handlePostCheckoutSync = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('checkout') === 'success') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const activeUser = session?.user || user;

          if (activeUser?.email) {
            const userEmail = activeUser.email;
            const prefix = userEmail.split('@')[0];
            const fallbackName = `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;
            const finalOrgName = companyName || fallbackName;

            // 1. Upsert Organization Tier in Supabase
            await supabase.from('organizations').upsert(
              {
                name: finalOrgName,
                subscription_tier: 'professional',
              },
              { onConflict: 'name' }
            );

            // 2. Update Profile Record
            await supabase
              .from('profiles')
              .update({ company_name: finalOrgName })
              .eq('email', userEmail);

            console.log('✅ Supabase organization and profile provisioned post-checkout.');
          }
        } catch (err) {
          console.error('⚠️ Post-checkout Supabase sync failed:', err);
        } finally {
          // Clean up URL query param without refreshing the page
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handlePostCheckoutSync();
  }, [user, companyName]);

  const isAuthenticated = Boolean(user) || demoAuthenticated || isDemoPath;

  // Resolve active organization name: checks database-backed context state first
  const getUserOrgName = (): string => {
    if (companyName && companyName.trim() !== '') {
      return companyName;
    }
    if (user?.email) {
      const prefix = user.email.split('@')[0];
      return `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;
    }
    return 'My Fleet Co.';
  };

  // Force Professional tier when viewing broker demo routes
  const effectiveTier = isDemoPath ? 'professional' : (userTier || 'standard');

  // Direct Stripe Checkout Backend Handler
  const handleCheckout = async (tierId: string) => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tier: tierId,
          success_url: `${window.location.origin}?checkout=success`,
          cancel_url: `${window.location.origin}?checkout=cancel`
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      const data = await response.json();

      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.sessionId) {
        window.location.href = `https://checkout.stripe.com/c/pay/${data.sessionId}`;
      } else {
        console.error('No checkout URL returned:', data);
        alert('Could not start checkout session. Please try again.');
      }
    } catch (err: any) {
      console.error('Checkout execution error:', err);
      alert(`Checkout failed: ${err.message || 'Unknown error'}`);
    }
  };

  // Handlers for AccountMenu quick tools
  const handleCopyUnderwriterLink = () => {
    setIsShareModalOpen(true);
  };

  const handleDownloadRiskCard = () => {
    alert('Generating & downloading official Underwriter Risk Certificate (PDF)...');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between font-sans">
      {/* MAIN WORKSPACE & PAGE ROUTING CONTENT */}
      <main className="flex-1">
        {!isAuthenticated ? (
          <LandingPage
            onSignIn={signInDemo}
            onSelectTier={(tierId) => handleCheckout(tierId)}
          />
        ) : (
          <div className="py-6">
            {/* WORKSPACE NAVIGATION HEADER */}
            <header className="px-6 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 pb-4 gap-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/recall-logo.png" 
                  alt="RecallLogic Logo" 
                  className="h-6 w-auto object-contain"
                />
                <span className="font-extrabold text-white text-sm tracking-tight font-mono">
                  RECALLLOGIC WORKSPACE
                </span>
                <span className="text-slate-600 text-xs">|</span>
                <span className="text-xs text-[#06B6D4] font-mono font-bold">
                  {isDemoPath ? 'BROKER AUDIT DEMO MODE' : 'Safety Intelligence System'}
                </span>
              </div>

              {/* NAVIGATION VIEWS & ACCOUNT MENU */}
              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* VIEW TOGGLE SWITCH (Visible if user is a Broker) */}
                {userProfile?.is_broker && (
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-mono text-xs">
                    <button
                      onClick={() => setActiveView('workspace')}
                      className={`px-3 py-1 rounded transition-all cursor-pointer ${
                        activeView === 'workspace'
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Fleet Workspace
                    </button>
                    <button
                      onClick={() => setActiveView('broker_portal')}
                      className={`px-3 py-1 rounded transition-all cursor-pointer flex items-center gap-1 ${
                        activeView === 'broker_portal'
                          ? 'bg-cyan-950 border border-cyan-500/50 text-[#06B6D4] font-bold'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      🏢 Broker Command
                    </button>
                  </div>
                )}

                <AccountMenu
                  userEmail={user?.email || 'broker_demo@recalllogic.ai'}
                  orgName={getUserOrgName()}
                  userRole={(userRole || 'admin') as any}
                  subscriptionTier={effectiveTier as any}
                  onOpenTeamModal={() => setActiveAdminModal('team')}
                  onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                  onCopyUnderwriterLink={handleCopyUnderwriterLink}
                  onDownloadRiskCard={handleDownloadRiskCard}
                  onSignOut={signOut}
                />
              </div>
            </header>

            {/* MAIN WORKSPACE ROUTING */}
            {activeView === 'broker_portal' && userProfile?.is_broker ? (
              <BrokerPortal />
            ) : (
              <TaskBoard userTier={effectiveTier} />
            )}
          </div>
        )}
      </main>

      {/* TEAM & PERMISSIONS MANAGEMENT MODAL */}
      <TeamManagementModal
        isOpen={activeAdminModal === 'team'}
        onClose={() => setActiveAdminModal(null)}
      />

      {/* PLAN & BILLING SURCHARGE MODAL */}
      {activeAdminModal === 'billing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                💳 Plan &amp; Billing Portal
              </h3>
              <button 
                onClick={() => setActiveAdminModal(null)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-[#070B14] border border-slate-800 rounded-xl space-y-2">
              <p className="text-xs text-slate-400">ACTIVE SUBSCRIPTION</p>
              <p className="text-lg font-bold text-[#06B6D4] uppercase">{effectiveTier.toUpperCase()} TIER</p>
              <p className="text-[11px] text-emerald-400">Status: Active</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleCheckout('professional')}
                className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
              >
                Manage / Upgrade Subscription
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BROKER SHARE LINK MODAL */}
      <BrokerShareModal
        isOpen={isShareModalOpen}
        userTier={effectiveTier}
        shareUrl={`${window.location.origin}/audit/demo`}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* PERSISTENT GLOBAL FOOTER WITH DIRECT SUPPORT ACCESS */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;