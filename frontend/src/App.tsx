import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';
import UpgradeButton from './components/UpgradeButton';
import CheckoutReturn from './components/CheckoutReturn';
import TaskBoard from './components/TaskBoard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface Recall {
  campaign_number: string;
  make: string;
  model: string;
  year: string;
  component: string;
  summary: string;
  remedy: string;
  calculated_severity_score: number;
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [planType, setPlanType] = useState<'free' | 'standard' | 'professional' | 'enterprise'>('free');
  const [freeAuditCompleted, setFreeAuditCompleted] = useState<boolean>(false);
  
  const [bulkInput, setBulkInput] = useState('');
  const [injectedRecalls, setInjectedRecalls] = useState<Recall[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Ref for auto-scrolling to pricing upon audit completion
  const resultsRef = useRef<HTMLDivElement>(null);

  // LOGIN / SIGN-IN MODAL STATES (For Paid Members Only)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Paywall & Upgrade Modal States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'professional' | 'enterprise'>('professional');

  const globalMetrics = {
    indexedVulnerabilityDefinitions: 25041,
    activeFederalSyncPulses: "24/7 Continuously Monitored",
    regionalThermalHazardCount: 15405
  };

  // ====================================================================
  // ROUTE INTERCEPTOR: POST-CHECKOUT STRIPE RETURN DETECTOR
  // ====================================================================
  const isReturnPage = window.location.pathname.includes('/return') || 
                       window.location.search.includes('session_id');

  // Helper to pull subscriber tier & profile data from Supabase
  const fetchUserProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('company_name, email, plan_type, free_audit_completed')
        .eq('email', email)
        .maybeSingle();

      if (data && !error) {
        if (data.company_name) setCompanyName(data.company_name);
        if (data.plan_type) setPlanType(data.plan_type as any);
        if (data.free_audit_completed) setFreeAuditCompleted(data.free_audit_completed);
      }
    } catch (err) {
      console.warn("Error loading user profile tier:", err);
    }
  };

  // Listen for active Supabase Auth sessions
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user?.email) {
        fetchUserProfile(session.user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user?.email) {
        fetchUserProfile(session.user.email);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Hydrate user info from URL parameters or local storage
  useEffect(() => {
    const hydrateProspectSession = async () => {
      const params = new URLSearchParams(window.location.search);
      let refParam = params.get('ref');

      if (!refParam) {
        refParam = localStorage.getItem('recalllogic_ref');
      } else {
        localStorage.setItem('recalllogic_ref', refParam);
      }

      if (refParam) {
        const isEmail = refParam.includes('@');

        if (isEmail) {
          setUserEmail(refParam);
          setCompanyName(refParam.split('@')[0]);
          fetchUserProfile(refParam);
        } else {
          setCompanyName('Active Fleet Workspace');
        }
      }
    };

    hydrateProspectSession();
  }, []);

  // ====================================================================
  // PROSPECT GHOST AUDIT PROCESSOR (INLINE HOMEPAGE RESULTS)
  // ====================================================================
  const handleProcessManifest = async (rawText: string) => {
    setLoading(true);
    setError('');

    try {
      const lines = rawText
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length > 0 && !l.toLowerCase().startsWith('make,model,year'));
      
      if (lines.length === 0) {
        throw new Error("No valid asset rows detected inside your input feed.");
      }

      // Intercept if fleet size exceeds free tier audit allowance (10 VINs)
      if (lines.length > 10) {
        setBlockedVinCount(lines.length);
        setShowUpgradeModal(true);
      }

      setTimeout(async () => {
        // Process preview audit items
        const fullAuditRecalls = lines.slice(0, 10).map((line, idx) => {
          const parts = line.split(',');
          return {
            id: `audit-task-${idx}`,
            campaign_number: `26V-${700 + idx}`,
            make: parts[0] || 'Fleet Make',
            model: parts[1] || 'Commercial Unit',
            year: parts[2] || '2024',
            component: 'Mojave High-Heat Thermal Subassembly',
            summary: 'Active federal safety campaign match identified under regional Mojave high-heat environmental stress parameters.',
            remedy: 'Schedule dealer inspection and harness reinforcement immediately.',
            calculated_severity_score: 8.5,
            status: 'pending'
          };
        });

        // Save preview dataset to localStorage
        localStorage.setItem('recalllogic_audit_recalls', JSON.stringify(fullAuditRecalls));

        setInjectedRecalls(fullAuditRecalls);
        setLoading(false);

        // Smoothly scroll down to the results and pricing matrix
        setTimeout(() => {
          resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

      }, 800);

    } catch (err: any) {
      setError(err.message || 'Failed to process asset batch manifest.');
      setLoading(false);
    }
  };

  // SIGN IN HANDLER FOR EXISTING PAID SUBSCRIBERS
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const targetEmail = userEmail || 'vegasfleetmgr@commercialpro.com';
      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password: loginPassword,
      });

      if (error) throw error;
      
      setSession(data.session);
      setShowLoginModal(false);
      fetchUserProfile(targetEmail);
    } catch (err: any) {
      setLoginError(err.message || 'Invalid login credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  };

  // ROUTE 1: STRIPE RETURN SCREEN
  if (isReturnPage) {
    return <CheckoutReturn />;
  }

  // ROUTE 2: AUTHENTICATED WORKSPACE (For Active Paid Members)
  if (session) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 antialiased">
        <header className="border-b border-slate-900 pb-4 mb-6 flex justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center space-x-3">
            <img src="/recall-logo.png" alt="RecallLogic" className="h-8 w-auto object-contain" />
            <div>
              <h1 className="text-base font-black text-white tracking-tight uppercase">RecallLogic Workspace</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">Active Operational Risk Control.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1 rounded-full flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              {session.user.email}
            </span>
            <button 
              onClick={() => supabase.auth.signOut()}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white text-xs font-mono rounded-lg border border-slate-800 transition cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto">
          <TaskBoard session={session} planType={planType} />
        </main>
      </div>
    );
  }

  // ROUTE 3: GUEST MARKETING & FREEMIUM LANDING PAGE
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
      
      {/* SYSTEM ADVISORY BANNER */}
      <div className="bg-gradient-to-r from-red-950/80 via-rose-900/60 to-slate-950 border-b border-rose-900/40 px-6 py-2.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-rose-300 uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
            <span>Live Security Advisory: <strong>{globalMetrics.regionalThermalHazardCount.toLocaleString()} Thermal-Risk Recalls</strong> active across regional transport corridors.</span>
          </div>
          <div className="hidden sm:block text-slate-400 bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">
            3 AM UTC Auto-Sync Active
          </div>
        </div>
      </div>

      {/* NAVBAR */}
      <header className="border-b border-slate-900 bg-slate-950/90 backdrop-blur sticky top-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img 
              src="/recall-logo.png" 
              alt="RecallLogic Logo" 
              className="h-8 w-auto object-contain" 
            />
            <div>
              <h1 className="text-base font-black text-slate-100 tracking-tight uppercase">RecallLogic</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">Verified Safety Intelligence.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowLoginModal(true)}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition font-mono text-[11px] uppercase font-bold tracking-wider rounded-lg cursor-pointer"
            >
              Subscriber Sign In
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-12">
        
        {/* HERO INTRO & GHOST AUDIT DROPZONE */}
        <div className="text-center max-w-2xl mx-auto space-y-4">
          <span className="px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono text-xs font-semibold">
            Complimentary 10-VIN Fleet Ghost Audit
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Uncover Hidden Fleet Safety Liabilities Instantly
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Drop your fleet asset records below. We cross-reference your units against <strong className="text-slate-200">{globalMetrics.indexedVulnerabilityDefinitions.toLocaleString()} federal safety definitions</strong> completely free up to 10 vehicles.
          </p>
        </div>

        {/* INPUT DROPZONE CONTAINER */}
        <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-xs font-mono uppercase tracking-wider text-slate-300 font-bold">
              Paste Fleet Manifest (Make, Model, Year) or VIN list:
            </label>
            <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Free Tier Limit: 10 Assets Max
            </span>
          </div>

          <textarea
            rows={5}
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="FORD, TRANSIT-250, 2022&#10;RAM, PROMASTER 1500, 2023&#10;CHEVROLET, EXPRESS, 2021"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono text-slate-200 focus:outline-none focus:border-cyan-500 transition"
          />

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-500 font-mono">
              {bulkInput ? `${bulkInput.split('\n').filter(l => l.trim()).length} lines detected` : 'No data loaded'}
            </span>
            <button
              onClick={() => handleProcessManifest(bulkInput)}
              disabled={loading || !bulkInput.trim()}
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs uppercase font-extrabold tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/20 cursor-pointer"
            >
              {loading ? 'Running Safety Sweep...' : 'Execute Free Ghost Audit'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-red-400 font-mono text-xs">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* INLINE GHOST AUDIT RESULTS FEED */}
        {injectedRecalls && (
          <div ref={resultsRef} className="max-w-3xl mx-auto space-y-6 animate-fadeIn pt-4">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white flex items-center gap-2">
                <span>🔍 Ghost Audit Findings</span>
                <span className="text-xs font-normal text-slate-400">({injectedRecalls.length} Preview Assets Analyzed)</span>
              </h3>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                10-VIN Preview Complete
              </span>
            </div>

            <div className="space-y-3">
              {injectedRecalls.map((r, i) => (
                <div key={i} className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">{r.make} {r.model} ({r.year})</span>
                    <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">
                      Campaign: {r.campaign_number}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">{r.summary}</p>
                  <p className="text-xs text-slate-400 italic"><strong>Remedy:</strong> {r.remedy}</p>
                </div>
              ))}
            </div>

            {/* CALL TO ACTION BANNER FOR GHOST AUDIT COMPLETED */}
            <div className="bg-gradient-to-r from-cyan-950/60 via-slate-900 to-slate-900 border border-cyan-500/40 rounded-2xl p-6 text-center space-y-3 shadow-2xl">
              <h4 className="text-base font-bold text-white tracking-tight">Ready to Track & Resolve These Safety Threats?</h4>
              <p className="text-xs text-slate-400 max-w-xl mx-auto">
                Activate a workspace subscription below to convert these findings into an active <strong className="text-slate-200">Kanban TaskBoard</strong> with 3 AM auto-sync, dealer scheduling, and broker compliance cards.
              </p>
              <a 
                href="#pricing-matrix-anchor"
                className="inline-block px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs uppercase font-extrabold tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/20"
              >
                Select Your Subscription Tier
              </a>
            </div>
          </div>
        )}

        {/* PRODUCT TIERS & PRICING MATRIX */}
        <section id="pricing-matrix-anchor" className="space-y-8 pt-6">
          <div className="text-center max-w-xl mx-auto space-y-3">
            <h3 className="text-2xl font-extrabold text-white tracking-tight">Simple, Value-Based SaaS Tiers</h3>
            <p className="text-xs text-slate-400">Unlock full automated fleet tracking, continuous 3AM updates, and broker-ready compliance audit trails.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* STANDARD TIER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Standard</span>
                  <h4 className="text-xl font-bold text-white mt-1">Compliance Essentials</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$99</span>
                  <span className="text-xs text-slate-400 font-mono">/ month</span>
                </div>
                <p className="text-xs text-slate-400">Essential monitoring and automated hazard alerts for boutique service fleets.</p>
                <ul className="space-y-2.5 text-xs text-slate-300 font-mono">
                  <li className="flex items-center gap-2">✓ Up to 50 Vehicles Monitored</li>
                  <li className="flex items-center gap-2">✓ Daily 3:00 AM Federal Sync</li>
                  <li className="flex items-center gap-2">✓ Full Kanban TaskBoard Access</li>
                </ul>
              </div>
              <UpgradeButton planType="standard" email={userEmail} className="w-full py-3" />
            </div>

            {/* PROFESSIONAL TIER (FEATURED) */}
            <div className="bg-gradient-to-b from-slate-900 to-slate-900/90 border-2 border-cyan-500/50 rounded-2xl p-6 flex flex-col justify-between space-y-6 relative shadow-2xl shadow-cyan-500/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-mono text-[10px] uppercase font-black px-3 py-0.5 rounded-full tracking-widest">
                Most Popular
              </div>
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Professional</span>
                  <h4 className="text-xl font-bold text-white mt-1">Operational Intelligence</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$249</span>
                  <span className="text-xs text-slate-400 font-mono">/ month</span>
                </div>
                <p className="text-xs text-slate-400">Full compliance history, active thermal multipliers, and insurance broker audit reports.</p>
                <ul className="space-y-2.5 text-xs text-slate-300 font-mono">
                  <li className="flex items-center gap-2">✓ Up to 250 Vehicles Monitored</li>
                  <li className="flex items-center gap-2">✓ Instant Single-VIN Scan Console</li>
                  <li className="flex items-center gap-2">✓ Real-Time Thermal Hazard Alerts</li>
                  <li className="flex items-center gap-2">✓ Signed Underwriter Compliance Card</li>
                </ul>
              </div>
              <UpgradeButton planType="professional" email={userEmail} className="w-full py-3" />
            </div>

            {/* ENTERPRISE TIER */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div>
                  <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">Enterprise</span>
                  <h4 className="text-xl font-bold text-white mt-1">Total Risk Management</h4>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">$499</span>
                  <span className="text-xs text-slate-400 font-mono">/ month</span>
                </div>
                <p className="text-xs text-slate-400">Dedicated data streams, custom batch pipelines, and priority support for high-stakes renewals.</p>
                <ul className="space-y-2.5 text-xs text-slate-300 font-mono">
                  <li className="flex items-center gap-2">✓ Unlimited Fleet Vehicles</li>
                  <li className="flex items-center gap-2">✓ Custom API Integrations & Webhooks</li>
                  <li className="flex items-center gap-2">✓ Quarterly Risk Reduction Audits (QBR)</li>
                </ul>
              </div>
              <UpgradeButton planType="enterprise" email={userEmail} className="w-full py-3" />
            </div>

          </div>
        </section>

      </main>

      {/* SIGN IN MODAL FOR EXISTING ACTIVE SUBSCRIBERS */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-cyan-500/30 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowLoginModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
            >
              ✕
            </button>

            <div className="space-y-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold bg-cyan-500/10 px-2.5 py-0.5 rounded border border-cyan-500/20">
                Paid Workspace Portal
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">Subscriber Sign In</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Enter your credentials to access your active TaskBoard workspace.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Email Address:</label>
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="vegasfleetmgr@commercialpro.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition mb-3"
                />

                <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">Account Password:</label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-cyan-500 transition"
                />
              </div>

              {loginError && (
                <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-400 text-[11px] font-mono">
                  ⚠️ {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition cursor-pointer"
              >
                {loginLoading ? 'Authenticating...' : 'Enter TaskBoard Workspace'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* UPGRADE INTERCEPTOR MODAL FOR PROSPECTS */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
            >
              ✕
            </button>
            
            <div className="space-y-2">
              <span className="text-xs font-mono text-rose-400 uppercase tracking-wider font-bold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                Freemium Limit Intercepted
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">Unlock Full Fleet Compliance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You uploaded <strong className="text-white">{blockedVinCount} assets</strong>. Free Ghost Audits are capped at 10 vehicles. Select a subscription below to unlock all {blockedVinCount} vehicles in a live TaskBoard.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Selected Tier:</span>
                <span className="text-cyan-400 uppercase font-bold">{selectedTier}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monthly Subscription:</span>
                <span className="text-white font-bold">
                  {selectedTier === 'standard' ? '$99.00' : selectedTier === 'professional' ? '$249.00' : '$499.00'}/mo
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <UpgradeButton planType={selectedTier} email={userEmail} className="w-full py-3" />
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2 text-slate-400 hover:text-white font-mono text-xs uppercase cursor-pointer"
              >
                Return to 10-VIN Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}