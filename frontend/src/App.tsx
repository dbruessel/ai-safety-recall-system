import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import TaskBoard from './components/TaskBoard';
import BrokerPortal from './components/BrokerPortal';
import BrokerSignup from './components/BrokerSignup';
import AcceptInvite from './components/AcceptInvite';
import Footer from './components/Footer';
import AccountMenu from './components/AccountMenu';
import BrokerShareModal from './components/BrokerShareModal';
import TeamManagementModal from './components/TeamManagementModal';
import BillingManagementModal from './components/BillingManagementModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { createClient } from '@supabase/supabase-js';

// Safe inline Supabase client initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const MainApp: React.FC = () => {
  const { user, userTier, userRole, companyName, userProfile, signOut, signInDemo, demoAuthenticated } = useAuth();

  // Standalone Subpath Route Checks
  const isSignupPath = window.location.pathname.toLowerCase().startsWith('/signup');
  const isAcceptInvitePath = window.location.pathname.toLowerCase().startsWith('/accept-invite');

  // Track direct URL subpaths for explicit broker or audit share views
  const [isDemoPath, setIsDemoPath] = useState<boolean>(false);

  // STRICT BROKER CHECK: Require explicit boolean or role, avoiding email string matches
  const isBrokerUser = Boolean(userProfile?.is_broker === true || userProfile?.role === 'broker');

  // Navigation state for active workspace view
  const [activeView, setActiveView] = useState<'workspace' | 'broker_portal'>(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.includes('/audit/demo') || path.includes('/broker')) {
      return 'broker_portal';
    }
    return isBrokerUser ? 'broker_portal' : 'workspace';
  });

  // Track client fleet auditing drill-down
  const [auditingFleetId, setAuditingFleetId] = useState<string | null>(null);

  // Modal display states for header controls
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [activeAdminModal, setActiveAdminModal] = useState<'team' | 'billing' | null>(null);

  // Handle URL parameter inspection and strict view routing
  useEffect(() => {
    const path = window.location.pathname.toLowerCase();
    const params = new URLSearchParams(window.location.search);
    const auditedOrg = params.get('org');

    if (auditedOrg) {
      setAuditingFleetId(auditedOrg);
      setActiveView('workspace');
    } else if (path.includes('/audit/demo') || path.includes('/audit/share') || path.includes('/broker')) {
      setIsDemoPath(true);
      setActiveView('broker_portal');
    } else if (isBrokerUser) {
      setActiveView('broker_portal');
    } else {
      setActiveView('workspace');
    }
  }, [isBrokerUser]);

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
          window.history.replaceState({}, document.title, window.location.pathname);
        }
      }
    };

    handlePostCheckoutSync();
  }, [user, companyName]);

  // Handle direct standalone subpath routes prior to auth evaluation
  if (isSignupPath) {
    return <BrokerSignup />;
  }

  if (isAcceptInvitePath) {
    return <AcceptInvite />;
  }

  // -------------------------------------------------------------
  // STRICT AUTH & TIER RESOLUTION (NO SYNTHETIC FALLBACKS)
  // -------------------------------------------------------------
  const isAuthenticated = Boolean(user?.email) || demoAuthenticated || isDemoPath;
  const currentEmail = user?.email || userProfile?.email || '';

  const effectiveTier = isDemoPath 
    ? 'professional' 
    : (userTier || userProfile?.subscription_tier || 'free');

  const getUserOrgName = (): string => {
    if (companyName && companyName.trim() !== '') {
      return companyName;
    }
    if (currentEmail) {
      const prefix = currentEmail.split('@')[0];
      return `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;
    }
    return 'Fleet Command';
  };

  /**
   * FLEXIBLE CHECKOUT HANDLER
   * Accepts optional custom email/company name from registration modals
   * or falls back to active session values for in-app upgrades.
   */
  const handleCheckout = async (tierId: string, customEmail?: string, customCompany?: string) => {
    const targetEmail = (customEmail || currentEmail || '').trim();
    const targetCompany = (customCompany || companyName || 'My Fleet Co.').strip ? (customCompany || companyName || 'My Fleet Co.').trim() : (customCompany || companyName || 'My Fleet Co.');

    if (!targetEmail) {
      console.error('Checkout blocked: User email missing.');
      return;
    }

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: targetEmail,
          customer_email: targetEmail,
          tier: tierId,
          company_name: targetCompany,
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
      }
    } catch (err: any) {
      console.error('Checkout execution error:', err);
    }
  };

  // Handlers for Fleet AccountMenu quick tools
  const handleCopyUnderwriterLink = () => {
    setIsShareModalOpen(true);
  };

  const handleDownloadRiskCard = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';
      const fleetId = auditingFleetId || userProfile?.organization_id || 'demo-fleet-001';

      const response = await fetch(
        `${apiBaseUrl}/api/broker/compliance-report/${fleetId}/pdf?broker_name=${encodeURIComponent(companyName || 'RecallLogic Partner')}`,
        { method: 'GET' }
      );

      if (!response.ok) throw new Error(`Server returned ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RecallLogic_Loss_Control_Certificate_${fleetId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export compliance PDF from account menu:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between font-sans">
      <main className="flex-1">
        {!isAuthenticated ? (
          <LandingPage
            onSignIn={signInDemo}
            onSelectTier={(tierId, email, company) => handleCheckout(tierId, email, company)}
          />
        ) : (
          <div>
            {/* TOP GLOBAL HEADER */}
            <header className="px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800/80 gap-4">
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

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* ROLE-BASED HEADER INDICATOR & SESSION CONTROL */}
                {isBrokerUser ? (
                  /* STREAMLINED BROKER PERSONA: Single Portfolio Badge + Direct Sign Out */
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 font-mono text-xs text-cyan-400 font-bold shadow-inner">
                      <span>🏛️</span>
                      <span>Brokerage Portfolio</span>
                    </div>

                    <div className="hidden sm:block bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 font-mono text-xs text-right">
                      <p className="font-bold text-white truncate max-w-[160px]">
                        {companyName || userProfile?.company_name || 'Apex Risk Brokers'}
                      </p>
                      <p className="text-[10px] text-slate-400 truncate max-w-[160px]">
                        {currentEmail}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={signOut}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 rounded-xl text-xs font-mono font-bold transition cursor-pointer flex items-center gap-1"
                      title="Sign Out"
                    >
                      <span>Sign Out</span>
                      <span>🚪</span>
                    </button>
                  </div>
                ) : (
                  /* STANDARD FLEET PERSONA WITH FULL ACCOUNT DROPDOWN */
                  <>
                    <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-mono text-xs">
                      <button
                        onClick={() => setActiveView('workspace')}
                        className="px-3 py-1 rounded bg-slate-800 text-white font-bold transition-all cursor-pointer"
                      >
                        Fleet Workspace
                      </button>
                    </div>

                    <AccountMenu
                      userEmail={currentEmail}
                      orgName={getUserOrgName()}
                      userRole={(userRole || 'admin') as any}
                      subscriptionTier={effectiveTier as any}
                      isBrokerPortal={false}
                      onOpenTeamModal={() => setActiveAdminModal('team')}
                      onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                      onCopyUnderwriterLink={handleCopyUnderwriterLink}
                      onDownloadRiskCard={handleDownloadRiskCard}
                      onSignOut={signOut}
                    />
                  </>
                )}
              </div>
            </header>

            {/* ACTIVE CLIENT AUDIT BREADCRUMB BANNER */}
            {auditingFleetId && (
              <div className="bg-cyan-950/90 border-b border-cyan-500/40 px-6 py-2.5 flex justify-between items-center text-xs font-mono text-cyan-300 font-bold">
                <div className="flex items-center gap-2">
                  <span>🏛️ Portfolio Command</span>
                  <span className="text-slate-500">&gt;</span>
                  <span>🚚 Auditing: <strong className="text-white uppercase">{auditingFleetId}</strong> [Read-Only Mode]</span>
                </div>
                <button
                  onClick={() => {
                    window.history.pushState({}, '', window.location.pathname);
                    setAuditingFleetId(null);
                    setActiveView('broker_portal');
                  }}
                  className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/30 rounded-lg cursor-pointer transition text-[11px]"
                >
                  ← Back to Portfolio Command
                </button>
              </div>
            )}

            {/* MAIN CONTENT ROUTER */}
            <div className="py-6">
              {activeView === 'broker_portal' && !auditingFleetId ? (
                <BrokerPortal />
              ) : (
                <TaskBoard userTier={effectiveTier} />
              )}
            </div>
          </div>
        )}
      </main>

      <TeamManagementModal
        isOpen={activeAdminModal === 'team'}
        onClose={() => setActiveAdminModal(null)}
      />

      {/* STRICTLY RENDERS BILLING MODAL ONLY FOR LOGGED IN USERS WITH VALID EMAIL */}
      {activeAdminModal === 'billing' && isAuthenticated && currentEmail && (
        <BillingManagementModal
          isOpen={activeAdminModal === 'billing'}
          subscriptionTier={(effectiveTier as any) || 'free'}
          currentFleetCount={18}
          userEmail={currentEmail}
          onClose={() => setActiveAdminModal(null)}
          onSelectTier={(tier) => handleCheckout(tier)}
        />
      )}

      <BrokerShareModal
        isOpen={isShareModalOpen}
        userTier={effectiveTier}
        shareUrl={`${window.location.origin}/audit/${userProfile?.organization_id || 'demo-fleet-001'}`}
        onClose={() => setIsShareModalOpen(false)}
      />

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