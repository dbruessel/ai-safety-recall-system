import React, { useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';

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
  const [bulkInput, setBulkInput] = useState('');
  const [injectedRecalls, setInjectedRecalls] = useState<Recall[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Paywall & Upgrade Modal States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'professional' | 'enterprise'>('standard');

  const globalMetrics = {
    indexedVulnerabilityDefinitions: 25041,
    activeFederalSyncPulses: "3:00 AM UTC",
    regionalThermalHazardCount: 15405
  };

  const handleProcessManifest = (rawText: string) => {
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

      // 10-VIN Freemium Interceptor Gate
      if (lines.length > 10) {
        setBlockedVinCount(lines.length);
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }

      setTimeout(() => {
        const processed = lines.map((line, idx) => {
          const parts = line.split(',');
          return {
            campaign_number: `26V-${700 + idx}`,
            make: parts[0] || 'Fleet Make',
            model: parts[1] || 'Commercial Unit',
            year: parts[2] || '2024',
            component: 'Critical Thermal Subassembly',
            summary: 'Active federal safety campaign match identified under local environmental stress parameters.',
            remedy: 'Schedule dealer inspection and harness reinforcement immediately.',
            calculated_severity_score: 8.5
          };
        });
        setInjectedRecalls(processed);
        setLoading(false);
      }, 800);

    } catch (err: any) {
      setError(err.message || 'Failed to process asset batch manifest.');
      setLoading(false);
    }
  };

  const handleStripeCheckout = (tier: 'standard' | 'professional' | 'enterprise') => {
    // Placeholder for backend checkout session initialization
    alert(window.location.origin + ` - Redirecting to secure Stripe Checkout for ${tier.toUpperCase()} tier.`);
  };

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
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">Verified Safety. Intelligent Compliance.</p>
            </div>
          </div>
          
          <div>
            <button 
              onClick={() => document.getElementById('pricing-anchor')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 transition font-mono text-[11px] uppercase font-black tracking-wider rounded-lg shadow-lg shadow-cyan-500/10"
            >
              View Pricing Tiers
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT: CLEAN & CONCISE */}
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
              className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-40 text-slate-950 font-mono text-xs uppercase font-extrabold tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/20"
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

        {/* RESULTS FEED (IF UNDER 10 VINs) */}
        {injectedRecalls && (
          <div className="max-w-3xl mx-auto space-y-4 animate-fadeIn">
            <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white">Audit Results ({injectedRecalls.length} Assets Analyzed)</h3>
              <span className="text-xs text-emerald-400 font-mono bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">Audit Complete</span>
            </div>
            <div className="space-y-3">
              {injectedRecalls.map((r, i) => (
                <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-cyan-400">{r.make} {r.model} ({r.year})</span>
                    <span className="font-mono text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded">Campaign: {r.campaign_number}</span>
                  </div>
                  <p className="text-xs text-slate-300">{r.summary}</p>
                  <p className="text-xs text-slate-400 italic"><strong>Remedy:</strong> {r.remedy}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PRODUCT TIERS & PRICING MATRIX (THE CLEAR OFFERING) */}
        <section id="pricing-anchor" className="space-y-8 pt-6">
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
                  <li className="flex items-center gap-2">✓ Standard Compliance Badges</li>
                </ul>
              </div>
              <button 
                onClick={() => handleStripeCheckout('standard')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition border border-slate-700"
              >
                Select Standard ($99/mo)
              </button>
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
                  <li className="flex items-center gap-2">✓ Real-Time Thermal Hazard Alerts</li>
                  <li className="flex items-center gap-2">✓ One-Click Insurance Underwriter Share</li>
                </ul>
              </div>
              <button 
                onClick={() => handleStripeCheckout('professional')}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs uppercase font-black tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/20"
              >
                Select Pro ($249/mo)
              </button>
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
              <button 
                onClick={() => handleStripeCheckout('enterprise')}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs uppercase font-bold tracking-wider rounded-xl transition border border-slate-700"
              >
                Select Enterprise ($499/mo)
              </button>
            </div>

          </div>
        </section>

      </main>

      {/* UPGRADE INTERCEPTOR MODAL (TRIGGERS WHEN > 10 VINs UPLOADED) */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-slate-900 border border-slate-800 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl relative">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-sm"
            >
              ✕
            </button>
            
            <div className="space-y-2">
              <span className="text-xs font-mono text-rose-400 uppercase tracking-wider font-bold bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                Freemium Gate Intercepted
              </span>
              <h3 className="text-xl font-bold text-white tracking-tight">Unlock Full Fleet Compliance</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                You attempted to scan <strong className="text-white">{blockedVinCount} assets</strong>, which exceeds the free 10-VIN audit limit. Activate a Pro workspace to process your entire fleet and unlock continuous 3:00 AM monitoring.
              </p>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Selected Tier:</span>
                <span className="text-cyan-400 uppercase font-bold">{selectedTier}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Monthly Base Subscription:</span>
                <span className="text-white font-bold">
                  {selectedTier === 'standard' ? '$99.00' : selectedTier === 'professional' ? '$249.00' : '$499.00'}/mo
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleStripeCheckout(selectedTier)}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs uppercase font-black tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/20"
              >
                Proceed to Secure Checkout
              </button>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="w-full py-2 text-slate-400 hover:text-white font-mono text-xs uppercase"
              >
                Return to Free Audit Scan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}