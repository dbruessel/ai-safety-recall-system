import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import TaskBoard from './components/TaskBoard';
import Footer from './components/Footer';
import AccountMenu from './components/AccountMenu';
import BrokerShareModal from './components/BrokerShareModal';
import { AuthProvider, useAuth } from './context/AuthContext';

const MainApp: React.FC = () => {
  const { user, userTier, userRole, signOut, signInDemo, demoAuthenticated } = useAuth();

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

  const isAuthenticated = Boolean(user) || demoAuthenticated || isDemoPath;

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
            <header className="px-6 mb-6 flex justify-between items-center border-b border-slate-800/80 pb-4">
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

              {/* INTEGRATED ACCOUNT MENU DROPDOWN WITH GUARANTEED ADMIN FALLBACK */}
              <div className="flex items-center gap-3">
                <AccountMenu
                  userEmail={user?.email || 'broker_demo@recalllogic.ai'}
                  orgName="Las Vegas Fleet Test Co."
                  userRole={(userRole || 'admin') as any}
                  subscriptionTier={(userTier || 'professional') as any}
                  onOpenTeamModal={() => setActiveAdminModal('team')}
                  onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                  onCopyUnderwriterLink={handleCopyUnderwriterLink}
                  onDownloadRiskCard={handleDownloadRiskCard}
                  onSignOut={signOut}
                />
              </div>
            </header>

            {/* MAIN TASKBOARD APP WORKSPACE */}
            <TaskBoard userTier={userTier || 'professional'} />
          </div>
        )}
      </main>

      {/* TEAM & PERMISSIONS MANAGEMENT MODAL */}
      {activeAdminModal === 'team' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                👥 Manage Team &amp; Role Permissions
              </h3>
              <button 
                onClick={() => setActiveAdminModal(null)} 
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-xs text-[#06B6D4] font-bold">userEmail={user?.email || 'broker_demo@recalllogic.ai'}</p>
                  <p className="text-[10px] text-slate-400">Account Owner / System Administrator</p>
                </div>
                <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800 px-2 py-0.5 rounded font-bold uppercase">
                  {userRole || 'ADMIN'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setActiveAdminModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
              <p className="text-lg font-bold text-[#06B6D4] uppercase">{(userTier || 'professional').toUpperCase()} TIER ($249/MO)</p>
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
        userTier={userTier}
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