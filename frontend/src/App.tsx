import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import TaskBoard from './components/TaskBoard';
import BrokerPortal from './components/BrokerPortal';
import BrokerSignup from './components/BrokerSignup';
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

  // Route check for signup subpath
  const isSignupPath = window.location.pathname.toLowerCase().startsWith('/signup');

  // Navigation state for active workspace view
  const [activeView, setActiveView] = useState<'workspace' | 'broker_portal'>(() => {
    const path = window.location.pathname.toLowerCase();
    return (path.includes('/audit/demo') || path.includes('/broker')) ? 'broker_portal' : 'workspace';
  });

  // Track client fleet auditing drill-down
  const [auditingFleetId, setAuditingFleetId] = useState<string | null>(null);

  // Modal display states for header controls
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [activeAdminModal, setActiveAdminModal] = useState<'team' | 'billing' | null>(null);

  // Track direct URL subpaths for broker/demo views
  const [isDemoPath, setIsDemoPath] = useState<boolean>(false);

  const isBrokerUser = userProfile?.is_broker || userRole === 'broker' || isDemoPath;

  // Handle URL parameter inspection for client audits (?org=demo-org-1) or broker route
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

  // Handle direct signup route prior to auth evaluation
  if (isSignupPath) {
    return <BrokerSignup />;
  }

  const isAuthenticated = Boolean(user) || demoAuthenticated || isDemoPath;

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

  const effectiveTier = isDemoPath ? 'professional' : (userTier || 'standard');

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
      }
    } catch (err: any) {
      console.error('Checkout execution error:', err);
    }
  };

  // Handlers for AccountMenu quick tools (Context Aware)
  const handleCopyUnderwriterLink = () => {
    if (isBrokerUser && !auditingFleetId) {
      const brokerId = userProfile?.brokerage_id || 'demo-broker';
      const inviteUrl = `${window.location.origin}/signup?broker_id=${brokerId}`;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(inviteUrl);
      }
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleDownloadRiskCard = async () => {
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

      if (isBrokerUser && !auditingFleetId) {
        // 🏢 Export Multi-Fleet Portfolio Audit PDF
        const response = await fetch(`${apiBaseUrl}/api/broker/portfolio-audit/pdf`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broker_name: userProfile?.company_name || companyName || 'RecallLogic Partner Brokerage',
            fleets: [
              { organization_id: 'demo-org-1', fleet_name: 'Apex Logistics & Freight', subscription_tier: 'Enterprise', total_vins: 142, open_recalls: 3, scheduled_recalls: 5, cleared_recalls: 134, safety_score: 82 },
              { organization_id: 'demo-org-2', fleet_name: 'Summit Regional Transport', subscription_tier: 'Professional', total_vins: 68, open_recalls: 0, scheduled_recalls: 2, cleared_recalls: 66, safety_score: 98 },
              { organization_id: 'demo-org-3', fleet_name: 'Titan Heavy Hauling Co.', subscription_tier: 'Professional', total_vins: 210, open_recalls: 14, scheduled_recalls: 8, cleared_recalls: 188, safety_score: 58 },
              { organization_id: 'demo-org-4', fleet_name: 'Metro Last-Mile Delivery', subscription_tier: 'Standard', total_vins: 45, open_recalls: 1, scheduled_recalls: 1, cleared_recalls: 43, safety_score: 90 },
            ],
          }),
        });

        if (!response.ok) throw new Error(`Server returned ${response.status}`);

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RecallLogic_Portfolio_Audit_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      } else {
        // 🚚 Export Single-Fleet Compliance Risk Certificate PDF
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
      }
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
            onSelectTier={(tierId) => handleCheckout(tierId)}
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
                {/* ROLE-BASED HEADER INDICATOR */}
                {isBrokerUser ? (
                  /* PURE BROKER PERSONA: Clean single badge without confusing dual toggle */
                  <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-1.5 font-mono text-xs text-cyan-400 font-bold shadow-inner">
                    <span>🏛️</span>
                    <span>Brokerage Portfolio</span>
                  </div>
                ) : (
                  /* FLEET PERSONA: Standard Workspace Toggle */
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5 font-mono text-xs">
                    <button
                      onClick={() => setActiveView('workspace')}
                      className="px-3 py-1 rounded bg-slate-800 text-white font-bold transition-all cursor-pointer"
                    >
                      Fleet Workspace
                    </button>
                  </div>
                )}

                <AccountMenu
                  userEmail={user?.email || 'broker_demo@recalllogic.ai'}
                  orgName={getUserOrgName()}
                  userRole={(userRole || 'admin') as any}
                  subscriptionTier={effectiveTier as any}
                  isBrokerPortal={isBrokerUser && activeView === 'broker_portal' && !auditingFleetId}
                  onOpenTeamModal={() => setActiveAdminModal('team')}
                  onOpenUpgradeModal={() => setActiveAdminModal('billing')}
                  onCopyUnderwriterLink={handleCopyUnderwriterLink}
                  onDownloadRiskCard={handleDownloadRiskCard}
                  onSignOut={signOut}
                />
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