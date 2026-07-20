import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Import our newly modularized components
import ValueMetricsGrid from './components/ValueMetricsGrid';
import IngestionDropzone from './components/IngestionDropzone';
import SubscriptionMatrix from './components/SubscriptionMatrix';
import ModalsContainer from './components/ModalsContainer';
import TaskBoard from './components/TaskBoard';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [accountPlan, setAccountPlan] = useState<'standard' | 'professional' | 'enterprise'>('standard');
  const [injectedRecalls, setInjectedRecalls] = useState<any[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modal states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);

  const metrics = {
    indexedVulnerabilityDefinitions: 25041,
    activeFederalSyncPulses: "3:00 AM UTC",
    regionalThermalHazardCount: 15405
  };

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;

  const handleProcessManifest = (rawLines: string[]) => {
    setLoading(true);
    setError('');
    try {
      const cleanedLines = rawLines
        .map(line => line.trim())
        .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
      
      if (cleanedLines.length === 0) {
        throw new Error("No valid data rows detected inside manifest streams.");
      }

      if (cleanedLines.length > 50 && accountPlan === 'standard') {
        setBlockedVinCount(cleanedLines.length);
        setShowUpgradeModal(true);
        setLoading(false);
        return;
      }

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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500 selection:text-slate-950 antialiased">
      
      {/* SYSTEM ADVISORY BANNER */}
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

      {/* NAVBAR */}
      <header className="border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            {/* RecallLogic Brand Logo Asset */}
            <img 
              src="/RecallLogic Logo (1).png" 
              alt="RecallLogic Logo" 
              className="h-8 w-auto object-contain" 
            />
            <div>
              <h1 className="text-lg font-bold text-slate-100 tracking-tight">RecallLogic</h1>
              <p className="text-[10px] text-slate-400 font-mono tracking-wider">Verified Safety. Intelligent Compliance.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setShowShareModal(true)}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-400 rounded-lg font-mono text-[10px] uppercase font-bold tracking-wide transition flex items-center gap-1.5"
            >
              <span>🛡️</span> Insurance Compliance Badge
            </button>
            <button 
              type="button"
              onClick={() => document.getElementById('pricing-matrix-anchor')?.scrollIntoView({ behavior: 'smooth' })}
              className="px-4 py-1.5 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 transition font-mono text-[10px] uppercase font-black tracking-wider rounded-lg"
            >
              Subscription Matrix
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-10 space-y-10">
        
        {/* VALUE METRICS GRID COMPONENT */}
        <ValueMetricsGrid 
          totalVins={metrics.indexedVulnerabilityDefinitions}
          onOpenComplianceModal={() => setShowShareModal(true)}
          onScrollToPricing={() => document.getElementById('pricing-matrix-anchor')?.scrollIntoView({ behavior: 'smooth' })}
        />

        {/* INGESTION DROPZONE COMPONENT */}
        <IngestionDropzone 
          onProcessManifest={handleProcessManifest} 
          loading={loading} 
        />

        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 font-mono text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* TASKBOARD KANBAN PIPELINES */}
        <section className="space-y-4">
          <div className="border-b border-slate-900 pb-3">
            <h2 className="text-md font-black uppercase font-mono tracking-tight text-white">Active Operational Pipelines</h2>
            <p className="text-xs text-slate-500 mt-0.5">Live tracking matrix tied directly into secure PostgreSQL shards.</p>
          </div>

          <TaskBoard 
            userId="lasvegas_fleet_test@example.com" 
            planType={accountPlan} 
            recalls={injectedRecalls}
          />
        </section>

        {/* SUBSCRIPTION TIER GOVERNANCE MATRIX COMPONENT */}
        <SubscriptionMatrix 
          currentPlan={accountPlan}
          onSelectPlan={(tier) => setAccountPlan(tier)}
        />

      </main>

      {/* MODALS CONTAINER COMPONENT */}
      <ModalsContainer 
        showUpgradeModal={showUpgradeModal}
        onCloseUpgradeModal={() => setShowUpgradeModal(false)}
        blockedVinCount={blockedVinCount}
        showShareModal={showShareModal}
        onCloseShareModal={() => setShowShareModal(false)}
        shareableVerificationUrl={shareableVerificationUrl}
      />

    </div>
  );
}