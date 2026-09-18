import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import { TaskBoard } from './components/TaskBoard';
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

  // Track DEMO routes for Fleet & Broker outreach
  const isFleetDemoPath = window.location.pathname.toLowerCase().includes('/taskboard/demo') || new URLSearchParams(window.location.search).get('role') === 'fleet';
  const isBrokerDemoPath = window.location.pathname.toLowerCase().includes('/audit/demo') || window.location.pathname.toLowerCase().includes('/broker');
  const isDemoPath = isFleetDemoPath || isBrokerDemoPath;

  // STRICT BROKER CHECK: Require explicit boolean or role
  const isBrokerUser = Boolean(
    userProfile?.is_broker === true || userProfile?.role === 'broker'
  );

  // Navigation state for active workspace view
  const [activeView, setActiveView] = useState<'workspace' | 'broker_portal'>(() => {
    if (isFleetDemoPath) return 'workspace';
    if (isBrokerDemoPath || isBrokerUser) return 'broker_portal';
    return 'workspace';
  });

  // Track client fleet auditing drill-down
  const [auditingFleetId, setAuditingFleetId] = useState<string | null>(null);

  // Modal display states for header controls
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [activeAdminModal, setActiveAdminModal] = useState<'team' | 'billing' | null>(null);

  // Handle URL parameter inspection, broker attribution capture, and strict view routing
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);

    // 1. SAFE BROKER ATTRIBUTION CAPTURE
    const brokerId = params.get('broker_id') || params.get('broker');
    const brokerName = params.get('broker_name');

    if (brokerId) {
      sessionStorage.setItem('broker_id', brokerId);
      sessionStorage.setItem('recalllogic_referred_broker_id', brokerId);
    }
    if (brokerName) {
      sessionStorage.setItem('broker_name', brokerName);
      sessionStorage.setItem('recalllogic_referred_broker_name', brokerName);
    }

    // 2. VIEW ROUTING LOGIC
    const auditedOrg = params.get('org');
    if (auditedOrg) {
      setAuditingFleetId(auditedOrg);
      setActiveView('workspace');
    } else if (isFleetDemoPath) {
      setActiveView('workspace');
    } else if (isBrokerDemoPath || isBrokerUser) {
      setActiveView('broker_portal');
    } else {
      setActiveView('workspace');
    }
  }, [isBrokerUser, isFleetDemoPath, isBrokerDemoPath]);

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

  if (isSignupPath) {
    return <BrokerSignup />;
  }

  if (isAcceptInvitePath) {
    return <AcceptInvite />;
  }

  const isAuthenticated = Boolean(user?.email) || demoAuthenticated || isDemoPath;
  const currentEmail = user?.email || userProfile?.email || (isBrokerDemoPath ? 'demo-broker@recalllogic.ai' : 'demo-fleet@recalllogic.ai');
  const effectiveTier = isDemoPath ? 'professional' : (userTier || userProfile?.subscription_tier || 'free');

  const getUserOrgName = (): string => {
    if (isBrokerUser || isBrokerDemoPath) {
      return companyName || userProfile?.company_name || 'Partner Brokerage';
    }
    if (companyName && companyName.trim() !== '') {
      return companyName;
    }
    if (currentEmail && !currentEmail.includes('demo-')) {
      const prefix = currentEmail.split('@')[0];
      return `${prefix.replace('.', ' ').replace('_', ' ').toUpperCase()} Fleet Co.`;
    }
    return 'Apex Freight Logistics';
  };

  const handleCheckout = async (tierId: string, customEmail?: string, customCompany?: string) => {
    const targetEmail = (customEmail || currentEmail || '').trim();
    const rawCompany = customCompany || companyName || 'My Fleet Co.';
    const targetCompany = typeof rawCompany === 'string' ? rawCompany.trim() : 'My Fleet Co.';

    const brokerId = sessionStorage.getItem('broker_id') || sessionStorage.getItem('recalllogic_referred_broker_id') || 'direct';
    const brokerName = sessionStorage.getItem('broker_name') || sessionStorage.getItem('recalllogic_referred_broker_name') || '';

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
          broker_id: brokerId,
          broker_name: brokerName,
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
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {!isAuthenticated ? (
        <LandingPage
          onSignIn={signInDemo}
          onSelectTier={(tierId, email, company) => handleCheckout(tierId, email, company)}
        />
      ) : (
        <>
          {/* TOP GLOBAL HEADER */}
          <header className="border-b border-slate-800/80 bg-[#070B14]/90 backdrop-blur-md sticky top-0 z-30 px-4 lg:px-8 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[#06B6D4] font-extrabold tracking-wider font-mono text-sm sm:text-base">
                RECALLLOGIC WORKSPACE
              </span>
              <span className="hidden sm:inline-block text-slate-600">|</span>
              <span className="hidden sm:inline-block text-slate-400 font-mono text-xs">
                {isBrokerDemoPath
                  ? 'BROKER AUDIT DEMO MODE'
                  : isFleetDemoPath
                  ? 'FLEET AUDIT DEMO MODE'
                  : 'Safety Intelligence System'}
              </span>
            </div>

            {/* UNIFIED ROLE-BASED HEADER INDICATOR & ACCOUNT MENU */}
            <div className="flex items-center gap-3">
              {isBrokerUser || isBrokerDemoPath ? (
                /* BROKER PERSONA WITH BROKER-SPECIFIC ACCOUNT MENU */
                <AccountMenu
                  userEmail={currentEmail}
                  orgName={getUserOrgName()}
                  userRole="broker"
                  subscriptionTier="Enterprise"
                  isBrokerPortal={true}
                  onOpenTeamModal={() => setActiveAdminModal('team')}
                  onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                  onCopyUnderwriterLink={handleCopyUnderwriterLink}
                  onDownloadRiskCard={handleDownloadRiskCard}
                  onSignOut={signOut}
                />
              ) : (
                /* STANDARD FLEET PERSONA WITH FULL ACCOUNT DROPDOWN */
                <AccountMenu
                  userEmail={currentEmail}
                  orgName={getUserOrgName()}
                  userRole={userRole || 'admin'}
                  subscriptionTier={effectiveTier}
                  isBrokerPortal={false}
                  onOpenTeamModal={() => setActiveAdminModal('team')}
                  onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                  onCopyUnderwriterLink={handleCopyUnderwriterLink}
                  onDownloadRiskCard={handleDownloadRiskCard}
                  onSignOut={signOut}
                />
              )}
            </div>
          </header>

          {/* ACTIVE CLIENT AUDIT BREADCRUMB BANNER */}
          {auditingFleetId && (
            <div className="bg-cyan-950/40 border-b border-cyan-500/30 px-6 py-2 flex items-center justify-between text-xs font-mono text-cyan-300">
              <div className="flex items-center gap-2">
                <span>🏛️ Portfolio Command &gt;</span>
                <span className="font-bold text-white">🚚 Auditing: {auditingFleetId} [Read-Only Mode]</span>
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
          <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {activeView === 'broker_portal' && !auditingFleetId ? (
              <BrokerPortal />
            ) : (
              <TaskBoard userTier={effectiveTier} />
            )}
          </main>

          <Footer />
        </>
      )}

      {/* TEAM MANAGEMENT MODAL */}
      {activeAdminModal === 'team' && (
        <TeamManagementModal
          isOpen={activeAdminModal === 'team'}
          onClose={() => setActiveAdminModal(null)}
        />
      )}

      {/* BILLING MANAGEMENT MODAL */}
      {activeAdminModal === 'billing' && isAuthenticated && currentEmail && (
        <BillingManagementModal
          isOpen={activeAdminModal === 'billing'}
          userEmail={currentEmail}
          subscriptionTier={effectiveTier}
          currentFleetCount={0}
          onClose={() => setActiveAdminModal(null)}
          onSelectTier={(tier) => handleCheckout(tier)}
        />
      )}

      {/* SHARE / BROKER LINK MODAL */}
      {isShareModalOpen && (
        <BrokerShareModal
          isOpen={isShareModalOpen}
          shareUrl={window.location.href}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
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