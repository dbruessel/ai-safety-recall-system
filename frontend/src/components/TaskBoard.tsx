import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import UpgradeButton from './components/UpgradeButton';
import TaskBoard from './components/TaskBoard';

// =====================================================================
// DATA CONTRACTS & SCHEMAS
// =====================================================================
export interface Recall {
  campaign_number: string;
  make: string;
  model: string;
  year: string;
  component: string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  calculated_severity_score?: number;
}

interface PriceTier {
  name: string;
  limit: string;
  price: string;
  features: string[];
  cta: string;
  popular: boolean;
  type: 'standard' | 'professional' | 'enterprise';
}

export default function App() {
  // SaaS Application Architecture Parameters
  const [accountPlan, setAccountPlan] = useState<'standard' | 'professional' | 'enterprise'>('standard');
  const [bulkInput, setBulkInput] = useState('');
  const [injectedRecalls, setInjectedRecalls] = useState<any[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live System Metrics Metrics Shards
  const metrics = {
    indexedVulnerabilityDefinitions: 25041,
    activeFederalSyncPulses: "3:00 AM UTC",
    regionalThermalHazardCount: 15405
  };

  // Static Pricing Strategy Contracts
  const pricingTiers: PriceTier[] = [
    {
      name: 'Standard Essentials',
      limit: '1 - 50 Vehicles',
      price: '$199/mo',
      features: ['Daily Automated Sweeps', 'NHTSA Database Sync', 'Basic Email Hazard Alerts'],
      cta: 'Current Plan',
      popular: false,
      type: 'standard'
    },
    {
      name: 'Pro Operations',
      limit: '51 - 250 Vehicles',
      price: '$499/mo',
      features: ['Real-time Single-VIN Lookup Nodes', 'Verifiable Compliance Certificates', 'Signed Insurance Broker Links', 'PDF Audit Trail Exports'],
      cta: 'Upgrade Workspace',
      popular: true,
      type: 'professional'
    },
    {
      name: 'Enterprise Risk Management',
      limit: '251+ Fleet Units',
      price: 'Custom Flat-Rate',
      features: ['Dedicated Accounts Engineer', 'Custom Webhook Pipeline Event Relays', 'Permanent Audit Persistence Ledger', 'SLA Response Guarantee'],
      cta: 'Contact Risk Desk',
      popular: false,
      type: 'enterprise'
    }
  ];

  // Client-Side Extraction Utility
  const processManifestLines = async (rawLines: string[]) => {
    setLoading(true);
    setError('');
    try {
      const cleanedLines = rawLines
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
      
      if (cleanedLines.length === 0) {
        throw new Error("No valid data rows detected inside manifest streams.");
      }

      // Simulation parsing logic feeding straight into trackable column objects downstream
      setTimeout(() => {
        const processedArray = cleanedLines.map((line, idx) => {
          const split = line.split(',');
          return {
            campaign_number: `26V-${200 + idx}`,
            make: split[0] || 'Generic',
            model: split[1] || 'Fleet Vehicle',
            year: split[2] || '2024',
            component: 'Subassembly System Structure',
            summary: 'Active field hazard matching climate trend threshold parameters.',
            remedy: 'Dealer inspect and patch harness layers instantly.',
            calculated_severity_score: 8.4,
            status: 'pending'
          };
        });
        setInjectedRecalls(processedArray);
        setLoading(false);
      }, 1000);

    } catch (err: any) {
      setError(err.message || 'Failed to complete ledger vector analysis.');
      setLoading(false);
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    processManifestLines(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkInput(text);
        processManifestLines(text.split('\n'));
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setBulkInput(text);
          processManifestLines(text.split('\n'));
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
      
      {/* 🔴 PULSATING LIVE STATE RISK STRIP HEADER */}
      <div className="bg-gradient-to-r from-red-950/80 via-rose-900/60 to-slate-950 border-b border-rose-900/40 px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
            </span>
            <p className="text-xs font-mono text-rose-300 uppercase tracking-wider">
              System Advisory: <strong className="text-white font-extrabold">{metrics.regionalThermalHazardCount.toLocaleString()} Active Critical Recalls</strong> unmonitored across local transit channels.
            </p>
          </div>
          <div className="text-[10px] font-mono bg-slate-900 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-md">
            Federal Sync Pulse: {metrics.activeFederalSyncPulses}
          </div>
        </div>
      </div>

      {/* FIXED PLATFORM UTILITY CONTROLS BAR */}
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-cyan-400 font-black tracking-tighter text-xl font-mono">RECALL<span className="text-white">LOGIC</span></div>
            <span className="text-[10px] font-mono bg-slate-900 text-slate-500 border border-slate-800/80 px-2 py-0.5 rounded uppercase font-bold tracking-widest">v2026.4.2</span>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-semibold text-slate-300 font-mono">lasvegas_fleet_test@example.com</p>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-wide">Subscription: Standard Essentials</p>
            </div>
            <button 
              onClick={() => document.getElementById('pricing-matrix-anchor')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-1.5 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition font-mono text-[10px] uppercase font-black tracking-wider rounded-lg"
            >
              Subscription Matrix
            </button>
          </div>
        </div>
      </header>

      {/* MAIN WORKSPACE WRAPPER */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-10">
        
        {/* =====================================================================
            👑 PLATFORM VALUE CARD ENGINE (PLACED ABOVE THE FOLD)
           ===================================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* ANALYTICS NODE 1: DATA DEPTH METRIC */}
          <div className="bg-[#0b0f19]/60 border border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">Reference Data Cluster</span>
              <h3 className="text-3xl font-black text-white font-mono tracking-tight">
                {metrics.indexedVulnerabilityDefinitions.toLocaleString()}
              </h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Normalized manufacturer hazard definitions ingested programmatically from federal ledger arrays. Fully mapped to active multi-line framework bounds.
            </p>
          </div>

          {/* ANALYTICS NODE 2: MOJAVE HEAT ENVIRONMENTAL SCORER */}
          <div className="bg-[#0b0f19]/60 border border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">Predictive Stress Loops</span>
              <h3 className="text-white text-sm font-bold uppercase font-mono mt-1">High-Ambient Heat Multiplier</h3>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Platform maps incoming components against continuous extreme high temperature trends to isolate subassembly threat vectors before critical failure occurs.
            </p>
            <div className="text-[9px] font-mono text-amber-400/80 bg-amber-950/30 border border-amber-900/30 rounded px-2 py-1 uppercase tracking-wider font-bold text-center">
              🔥 Environment Focus Bounds: Las Vegas Corridor Area
            </div>
          </div>

          {/* ANALYTICS NODE 3: GLASSMORPHIC CERTIFICATE VERIFICATION BADGE */}
          <div className="bg-gradient-to-b from-slate-900 to-slate-950/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative group">
            <div className="absolute top-3 right-3 text-[9px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono font-bold">
              🔒 PRO ACCESS ONLY
            </div>
            <div className="space-y-1">
              <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest block">Broker Security Assets</span>
              <h3 className="text-slate-300 text-xs font-black uppercase tracking-wide font-mono">Underwriting Compliance Certificate</h3>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Generate tokenized cryptographic live strings showing zero open liabilities to lower corporate commercial premium metrics natively.
            </p>
            <button
              onClick={() => document.getElementById('pricing-matrix-anchor')?.scrollIntoView({ behavior: 'smooth' })}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-[10px] uppercase font-bold rounded-xl transition-all"
            >
              Activate Premium Card Ledger
            </button>
          </div>
        </section>

        {/* =====================================================================
            📡 CENTRAL INDUSTRIAL STREAM DROPZONE
           ===================================================================== */}
        <section className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-inner">
          <div className="flex flex-col lg:flex-row items-stretch gap-6">
            
            {/* TEXT DATASTREAM INGESTION FORWARDER */}
            <form onSubmit={handleTextSubmit} className="flex-1 flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black font-mono uppercase tracking-wider text-slate-300">
                  Ingestion Dropzone Stream
                </label>
                <span className="text-[10px] text-slate-600 font-mono font-medium">Format Matrix: Make, Model, Year</span>
              </div>
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Ford, F-150, 2022&#10;Freightliner, Cascadia, 2021&#10;Volvo, VNL, 2023"
                className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder-slate-700 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none transition-all"
              />
              <button
                type="submit"
                disabled={loading || !bulkInput.trim()}
                className="w-full bg-slate-100 hover:bg-white text-slate-950 font-mono font-black uppercase tracking-wider text-xs py-3 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
              >
                {loading ? 'Analyzing Manifest Records...' : 'Analyze Fleet Array Composition'}
              </button>
            </form>

            {/* DROP INTERCEPT LOGIC LAYER */}
            <div 
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`lg:w-80 border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer group transition ${
                isDragging ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
              }`}
            >
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" accept=".csv,.txt" />
              <div className="text-3xl mb-2 text-slate-600 group-hover:scale-105 transition-transform">📡</div>
              <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wide">Frictionless Bulk Drop</h4>
              <p className="text-[11px] text-slate-500 max-w-[200px] mt-1">Drop spreadsheet vectors directly into processing lines (.csv, .txt)</p>
            </div>
          </div>
        </section>

        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 font-mono text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* =====================================================================
            📊 TRACKABLE KANBAN CORE INTERFACE LAYOUT
           ===================================================================== */}
        <section className="space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h2 className="text-md font-black uppercase font-mono tracking-tight text-white">Active Operational Pipelines</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live tracking matrix tied directly into secure PostgreSQL shards.</p>
          </div>

          {/* DYNAMIC PIPELINE CARDS LINKED DOWNSTREAM */}
          <TaskBoard 
            userId="lasvegas_fleet_test@example.com" 
            planType={accountPlan} 
            recalls={injectedRecalls}
          />
        </section>

        {/* =====================================================================
            ⚙️ OPERATIONAL PRICING CONFIGURATIONS SUBSCRIPTION MATRIX
           ===================================================================== */}
        <section id="pricing-matrix-anchor" className="pt-8 space-y-6 border-t border-slate-900">
          <div className="text-center max-w-xl mx-auto space-y-1">
            <h3 className="text-white font-mono font-black uppercase text-sm tracking-widest">SaaS Tier Governance Matrix</h3>
            <p className="text-xs text-slate-400">Select workspaces built to isolate liabilities from regional climate stressors.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
            {pricingTiers.map((tier) => (
              <div 
                key={tier.name}
                className={`flex flex-col justify-between bg-slate-900/20 border rounded-2xl p-6 transition duration-300 relative ${
                  tier.popular 
                    ? 'border-cyan-500 bg-gradient-to-b from-[#0b0f19] via-slate-900/40 to-slate-950 shadow-2xl scale-[1.01]' 
                    : 'border-slate-900 hover:border-slate-800'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-mono text-[9px] tracking-widest font-black px-3 py-0.5 rounded-full uppercase shadow-md">
                    Recommended Setup
                  </span>
                )}

                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="text-xs font-black text-white font-mono tracking-tight uppercase max-w-[150px]">{tier.name}</h4>
                    <span className="text-[10px] bg-slate-900 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-800">
                      {tier.limit}
                    </span>
                  </div>

                  <div className="text-2xl font-black text-white font-mono">{tier.price}</div>

                  <ul className="space-y-2 border-t border-slate-900 pt-4 text-xs text-slate-400 font-sans">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-cyan-400 font-bold text-[10px] mt-0.5">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => setAccountPlan(tier.type)}
                  className={`w-full mt-6 py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition ${
                    accountPlan === tier.type
                      ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-default'
                      : tier.popular
                        ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                  }`}
                >
                  {accountPlan === tier.type ? 'Active Tier Plan' : tier.cta}
                </button>
              </div>
            ))}
          </div>
        </section>

      </main>
    </div>
  );
}