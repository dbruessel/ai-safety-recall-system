import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import PublicAuditDemo from './components/PublicAuditDemo';

export function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'taskboard' | 'underwriter'>('taskboard');
  const [currentPath, setCurrentPath] = useState<string>(window.location.pathname);
  const [searchParams, setSearchParams] = useState<string>(window.location.search);
  const [selectedFleet, setSelectedFleet] = useState<string>('Las Vegas Fleet Test Co.');

  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
      setSearchParams(window.location.search);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
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

  // 1. PUBLIC READ-ONLY BROKER AUDIT DEMO ROUTE (/audit/demo)
  if (isDemoMode) {
    return (
      <PublicAuditDemo
        onSubscribe={() => handleStripeCheckout('professional')}
      />
    );
  }

  // 2. PUBLIC MARKETING LANDING PAGE
  if (!isAuthenticated) {
    return (
      <LandingPage
        onSignIn={() => {
          setIsAuthenticated(true);
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
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center font-bold text-[#06B6D4] font-mono text-sm">
              RL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-sm tracking-tight font-mono">
                  RECALLLOGIC WORKSPACE
                </span>
              </div>
              <p className="text-[10px] text-cyan-400 font-mono tracking-wide">
                Safety Intelligence System Active.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>{selectedFleet}</span>
            </div>

            <button
              onClick={() => setIsAuthenticated(false)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs rounded border border-slate-700 transition-all cursor-pointer"
            >
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      {/* WORKSPACE BODY CONTENT */}
      <main className="max-w-7xl mx-auto p-6 space-y-6">
        
        {/* HEADER SECTION & TAB SWITCHER */}
        <div className="rounded-2xl bg-white text-slate-900 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950">
              {activeTab === 'taskboard' ? 'Fleet Recall Operations' : 'Underwriter Compliance & Risk Portal'}
            </h1>
            <p className="text-slate-600 text-xs mt-1 font-medium">
              {activeTab === 'taskboard' 
                ? 'Monitor, filter, and schedule safety recall remedies across active fleet assets.' 
                : 'Executive risk metrics and audit-grade proof of recall remediation for insurance carriers.'}
            </p>
          </div>

          {/* TAB TOGGLE SWITCH */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 font-mono text-xs shrink-0">
            <button
              onClick={() => setActiveTab('taskboard')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'taskboard' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Task Board
            </button>
            <button
              onClick={() => setActiveTab('underwriter')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'underwriter' 
                  ? 'bg-[#06B6D4] text-slate-950 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🛡️ Underwriter Audit
            </button>
          </div>
        </div>

        {/* METRICS DASHBOARD CARDS */}
        {activeTab === 'taskboard' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-md border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">ACTION REQUIRED</span>
              <div className="text-3xl font-black text-rose-600 font-mono">21</div>
              <span className="text-xs text-rose-600 font-semibold block">Unresolved safety risks</span>
            </div>

            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-md border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">IN PROGRESS</span>
              <div className="text-3xl font-black text-amber-500 font-mono">1</div>
              <span className="text-xs text-amber-600 font-semibold block">Scheduled at dealership</span>
            </div>

            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-md border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">CLEARED REPAIRS</span>
              <div className="text-3xl font-black text-emerald-500 font-mono">1</div>
              <span className="text-xs text-emerald-600 font-semibold block">Verified completed repairs</span>
            </div>

            <div className="rounded-xl bg-white p-5 text-slate-900 shadow-md border border-slate-200 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider">FLEET SAFETY SCORE</span>
              <div className="text-3xl font-black text-cyan-600 font-mono">4%</div>
              <span className="text-xs text-cyan-600 font-semibold block">Overall fleet compliance</span>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold text-[#06B6D4] font-mono uppercase tracking-widest block">
                  INSURANCE UNDERWRITER AUDIT PACKET
                </span>
                <h2 className="text-xl font-bold text-white font-mono mt-0.5">
                  Commercial Risk &amp; Compliance Scorecard
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Fleet Remediation Rate</span>
                <div className="text-3xl font-black text-rose-500 font-mono">4%</div>
                <span className="text-[10px] font-mono text-rose-400 block font-semibold">Surcharge / Audit Risk</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Avg. Resolution Time</span>
                <div className="text-3xl font-black text-cyan-400 font-mono">17 Days</div>
                <span className="text-[10px] font-mono text-slate-500 block">Industry Avg: 45 Days</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block">Verified Proof-of-Remedies</span>
                <div className="text-3xl font-black text-white font-mono">0 / 1</div>
                <span className="text-[10px] font-mono text-slate-400 block">Dealer Invoices Attached</span>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="text-[11px] font-mono text-slate-400 block uppercase">ESTIMATED ANNUAL CREDIT</span>
                <div className="text-3xl font-black text-white font-mono">$0 /yr</div>
                <span className="text-[10px] font-mono text-slate-500 block">Est. 5% carrier policy savings</span>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;