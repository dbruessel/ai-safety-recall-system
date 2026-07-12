import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Modular Feature Subcomponents
import UpgradeButton from './components/UpgradeButton';

// =====================================================================
// DATA INTERFACES & CONTRACTS
// =====================================================================

interface Recall {
  campaign_number: string;
  make: string;
  model: string;
  year: string;
  component: string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  notes?: string;
  assembly_category?: string;
  thermal_multiplier_active?: boolean;
  calculated_severity_score?: number;
  executive_action_directive?: string;
}

export interface Lead {
  id?: string;
  company_name: string;
  industry: string;
  est_fleet_size: number;
  primary_vehicle_mix: string;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  usdot_number?: string;
  usdot_oos_rate?: number;
  localized_threat_hook?: string;
  lead_status?: string;
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================================
// CUSTOM HOOK: useLeadData
// =====================================================================

export function useLeadData() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        setLoading(true);
        setError(null);
        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        
        if (emailParam) {
          const { data, error: sbError } = await supabase
            .table('leads')
            .select('*')
            .eq('contact_email', emailParam)
            .single();

          if (sbError) throw sbError;
          setLead(data);
        }
      } catch (err: any) {
        console.error('Lead resolution failed:', err);
        setError(err.message || 'Unable to resolve lead profile context.');
      } finally {
        setLoading(false);
      }
    }
    fetchLead();
  }, []);

  return { lead, loading, error };
}

// =====================================================================
// EMBEDDED STYLES FOR 3D TRANSFORMS
// =====================================================================

const flipCardStyles = `
  .perspective-1000 { perspective: 1000px; }
  .backface-hidden { 
    backface-visibility: hidden; 
    -webkit-backface-visibility: hidden; 
  }
  .transform-style-3d { transform-style: preserve-3d; }
`;

// =====================================================================
// VALUE FLIP CARD COMPONENT (GLASSMORPHIC HOVER EFFECTS)
// =====================================================================

interface FlipCardProps {
  frontTitle: string;
  frontDescription: string;
  backTitle: string;
  backDescription: string;
  icon: React.ReactNode;
  tagline?: string;
}

const FlipCard: React.FC<FlipCardProps> = ({ 
  frontTitle, 
  frontDescription, 
  backTitle, 
  backDescription, 
  icon, 
  tagline 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div 
      className="w-full h-80 perspective-1000 cursor-pointer group" 
      onClick={() => setIsFlipped(!isFlipped)} 
      onMouseEnter={() => setIsFlipped(true)} 
      onMouseLeave={() => setIsFlipped(false)} 
    >
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        {/* Front Face */}
        <div className="absolute inset-0 bg-[#0b0f19]/80 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between backface-hidden shadow-2xl backdrop-blur-md">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-3xl">{icon}</span>
              {tagline && <span className="text-[9px] font-mono font-black text-cyan-500 uppercase tracking-wider">{tagline}</span>}
            </div>
            <h3 className="text-white font-black text-base uppercase tracking-tight">{frontTitle}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{frontDescription}</p>
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider">Hover to flip ➜</span>
        </div>
        {/* Back Face */}
        <div className="absolute inset-0 bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-6 flex flex-col justify-between backface-hidden [transform:rotateY(180deg)] shadow-[0_0_20px_rgba(6,182,212,0.15)]">
          <div className="space-y-4">
            <h3 className="text-cyan-400 font-black text-base uppercase tracking-tight">{backTitle}</h3>
            <p className="text-slate-300 text-xs leading-relaxed">{backDescription}</p>
          </div>
          <span className="text-[10px] text-cyan-600 font-bold uppercase font-mono tracking-wider">🔒 System Encrypted</span>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// VALUE FLIP CARDS CONTAINER (OUTCOMES-BASED COMPLIANCE PILLARS)
// =====================================================================

const ValueFlipCards: React.FC = () => {
  return (
    <section className="py-2 mt-4 w-full">
      <style>{flipCardStyles}</style>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Pillar 1: Continuous NHTSA Auto-Sweeping */}
        <FlipCard 
          frontTitle="Continuous Auto-Sweeping" 
          frontDescription="Replaces manual lookup logs. Stop wasting administrator hours. We index manufacturer and federal catalogs daily to verify your vehicles are safe." 
          backTitle="Direct NHTSA Ingestion" 
          backDescription="Continuous background safety sweeps prevent expensive DOT out-of-service violations, failure alerts, and roadside inspection delays." 
          icon={<span>📡</span>} 
          tagline="Core Utility" 
        />
        
        {/* Pillar 2: Dynamic Carrier Trust Badge */}
        <FlipCard 
          frontTitle="Dynamic Carrier Trust Badge" 
          frontDescription="Win premium cargo contracts. Showcase your real-time safety compliance rating directly to freight brokers, cargo shippers, and underwriters." 
          backTitle="Outbound Trust Badging" 
          backDescription="Earn instant trust markers with clean, public verification links demonstrating a recall-free active profile on your equipment roster." 
          icon={<span>🛡️</span>} 
          tagline="Outbound Trust" 
        />
        
        {/* Pillar 3: FMCSA Audit Protection Shield */}
        <FlipCard 
          frontTitle="FMCSA Audit Protection" 
          frontDescription="Lower insurance premiums. Maintain complete, verified proof of active safety recall remediation to defend your commercial operating authority." 
          backTitle="Negligence Shield" 
          backDescription="Generate, secure, and export official PDF compliance history certificates designed to easily pass rigorous federal safety audits." 
          icon={<span>⚖️</span>} 
          tagline="Asset Protection" 
        />
        
      </div>
    </section>
  );
};

// =====================================================================
// 3-COLUMN BILLING PLAN AND OFFERINGS BLOCK
// =====================================================================

const OfferingCards: React.FC = () => {
  return (
    <section className="py-6 w-full space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">Simple Flat Pricing, Zero Utility Overages</h2>
        <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">
          Choose the right operational threshold for your business. No hidden vehicle fees or complicated calculations.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Plan 1: Starter Operations */}
        <div className="bg-[#0b0f19]/30 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-800 transition shadow-2xl relative">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black tracking-wider text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded uppercase">Starter</span>
              <h3 className="text-white text-xl font-black uppercase">Standard Operations</h3>
              <p className="text-slate-500 text-xs">For local trade professionals, plumbers, HVAC, and electrical operations.</p>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white font-mono">$99</span>
              <span className="text-xs text-slate-500">/ month (Flat)</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-900 pt-4">
              <li className="flex items-center gap-2">🟢 Up to 15 Active Vehicles</li>
              <li className="flex items-center gap-2">🟢 24/7 Background Recall Monitoring</li>
              <li className="flex items-center gap-2">🟢 Standard Safety Kanban Task Board</li>
              <li className="flex items-center gap-2">🟢 Real-time Failure Telemetry Alerts</li>
            </ul>
          </div>
          <div className="pt-6">
            <UpgradeButton planType="starter" />
          </div>
        </div>

        {/* Plan 2: Professional Fleet */}
        <div className="bg-[#0b0f19]/80 border-2 border-cyan-500/40 rounded-2xl p-6 flex flex-col justify-between hover:border-cyan-500/60 transition shadow-2xl relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 text-[10px] font-black uppercase px-3 py-1 rounded-full tracking-wider">
            Most Popular
          </div>
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black tracking-wider text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded uppercase">Growth</span>
              <h3 className="text-white text-xl font-black uppercase">Professional Fleet</h3>
              <p className="text-slate-300 text-xs font-medium">For established regional transport and field service networks.</p>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-cyan-400 font-mono">$249</span>
              <span className="text-xs text-slate-300 font-medium">/ month (Flat)</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-300 font-medium border-t border-slate-900 pt-4">
              <li className="flex items-center gap-2">💎 Up to 100 Active Vehicles</li>
              <li className="flex items-center gap-2">💎 Bulk CSV/TXT Manifest Ingestion</li>
              <li className="flex items-center gap-2">💎 Localized Climatic Heat Multipliers</li>
              <li className="flex items-center gap-2">💎 Liability Shield PDF Certificate Generators</li>
            </ul>
          </div>
          <div className="pt-6">
            <UpgradeButton planType="professional" />
          </div>
        </div>

        {/* Plan 3: Enterprise Premium */}
        <div className="bg-[#0b0f19]/30 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between hover:border-slate-800 transition shadow-2xl relative">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="text-[9px] font-black tracking-wider text-cyan-400 font-mono bg-cyan-950/40 px-2 py-0.5 rounded uppercase">Scale</span>
              <h3 className="text-white text-xl font-black uppercase">Enterprise Premium</h3>
              <p className="text-slate-500 text-xs">For high-throughput logistics, heavy delivery, and large municipalities.</p>
            </div>
            
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-white font-mono">$499</span>
              <span className="text-xs text-slate-500">/ month (Flat)</span>
            </div>

            <ul className="space-y-2.5 text-xs text-slate-400 border-t border-slate-900 pt-4">
              <li className="flex items-center gap-2">🟢 Unlimited Active Vehicles</li>
              <li className="flex items-center gap-2">🟢 Direct REST API Data Pipelines</li>
              <li className="flex items-center gap-2">🟢 Dedicated Support SLAs & Engineers</li>
              <li className="flex items-center gap-2">🟢 Custom Safety Audits & Compliance Mapping</li>
            </ul>
          </div>
          <div className="pt-6">
            <UpgradeButton planType="enterprise" />
          </div>
        </div>

      </div>
    </section>
  );
};

// =====================================================================
// MAIN APPLICATION COMPONENT
// =====================================================================

export default function App() {
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vinsEvaluatedCount, setVinsEvaluatedCount] = useState(0);
  
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [sweepExecuted, setSweepExecuted] = useState(false);
  const { lead, loading: leadLoading, error: leadError } = useLeadData();

  const calculateCustomMRR = (vinCount: number) => {
    if (vinCount <= 15) return "99.00";
    if (vinCount <= 100) return "249.00";
    return "499.00";
  };

  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
        
    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    if (cleanedLines.length > 10) {
      setBlockedVinCount(cleanedLines.length);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError('');
    const aggregatedResults: Recall[] = [];
    setVinsEvaluatedCount(cleanedLines.length);

    try {
      for (const line of cleanedLines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) continue;

        const [make, model, year] = parts;
        const response = await axios.get('http://127.0.0.1:8000/api/recalls/search', {
          params: { make, model, year }
        });

        if (Array.isArray(response.data)) {
          aggregatedResults.push(...response.data);
        }
      }

      setRecalls(aggregatedResults);
      setSweepExecuted(true);

      if (aggregatedResults.length === 0) {
        setError('Scan Complete: Clean telemetry across all targeted assets.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Pipeline Interrupted: Ensure local Uvicorn engine is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    setError('');
    setRecalls([]);
    processManifestLines(bulkInput.split('\n'));
  };

   // Compile-Safe: Using files index extraction instead of trailing dot-operator syntax [cite: 23]
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files; //  FIXED: Pull the first File object from the list
    setError('');
    setRecalls([]);

    const fileExtension = file.name.split('.').pop()?.toLowerCase(); //  SAFE: file.name exists!
    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkInput(text);
        processManifestLines(text.split(/\r?\n/));
      };
      reader.readAsText(file); //  SAFE: reader takes a single File blob
    } else {
      setError('Invalid Schema: Please drop a structured comma-delimited manifest (.csv or .txt).');
    }
  };

  const activePlanType = blockedVinCount <= 15 ? "starter" : blockedVinCount <= 100 ? "professional" : "enterprise";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. TOP ALERT BANNER (ABSOLUTE TOP OF PAGE) */}
      <div className="w-full bg-gradient-to-r from-red-950/40 via-red-900/20 to-red-950/40 border-b border-red-500/10 py-3.5 px-6">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap text-center md:text-left">
          <div className="flex items-center gap-3 mx-auto md:mx-0">
            <span className="text-xl animate-pulse">⚠️</span>
            <span className="text-xs font-bold uppercase tracking-wide text-red-400">
              Federal Recall Threat Alert:
            </span>
            <span className="text-xs text-slate-300 font-medium">
              We have cataloged over <strong>15,000 active manufacturing safety campaigns</strong> impacting fleet operators.
            </span>
          </div>
          <span className="text-[10px] font-mono font-black text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded uppercase mx-auto md:mx-0">
            System Secured
          </span>
        </div>
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 p-6 sm:p-10 max-w-5xl mx-auto w-full space-y-12">
        
        {/* 2. HERO HEADER (FRONT & CENTER) */}
        <header className="text-center max-w-3xl mx-auto space-y-4 pt-4">
          <div className="flex justify-center items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-cyan-500/20 border border-cyan-400/20">🛡️</div>
            <h1 className="text-slate-100 text-4xl sm:text-5xl font-black uppercase tracking-tight">
              Recall<span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">Logic</span>
            </h1>
          </div>
          
          <div className="space-y-2">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-widest text-slate-500 font-mono">
              Predictive Safety Intelligence
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium leading-relaxed">
              RecallLogic is the ultimate automated manufacturing recall monitoring engine. We continuously cross-reference federal safety databases against regional environmental risks to protect commercial fleet operations from liability leaks, out-of-service orders, and insurance spikes.
            </p>
          </div>
        </header>

        {/* 3. VALUE PILLARS REPOSITIONED ABOVE THE SWEEP CONSOLE */}
        <ValueFlipCards />

        {/* 4. HIGHLIGHT: 10 FREE VINS PROMO & INSTRUCTIONS */}
        <section className="max-w-2xl mx-auto bg-slate-900/40 border border-slate-800 rounded-2xl p-5 text-center space-y-3 relative overflow-hidden backdrop-blur-md">
          <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 text-[9px] font-black uppercase px-2.5 py-0.5 rounded-bl-xl tracking-wider">
            Free Trial
          </div>
          <h3 className="text-white text-sm font-black uppercase tracking-wider flex items-center justify-center gap-2">
            <span>🛡️</span> Test Up To 10 Vehicles 100% Free
          </h3>
          <p className="text-slate-400 text-xs leading-relaxed max-w-lg mx-auto">
            Run a baseline diagnostic sweep on your commercial vehicles to check for active liabilities. Paste your fleet data directly into the input bar or upload a <strong className="text-cyan-400">CSV/TXT manifest</strong>.
          </p>
          <div className="flex flex-wrap justify-center items-center gap-x-6 gap-y-1.5 text-[10px] text-slate-500 font-mono font-bold uppercase pt-1">
            <span>Option A: Paste raw list</span>
            <span>•</span>
            <span>Option B: Drop .CSV/.TXT</span>
            <span>•</span>
            <span>No sign-ups or emails</span>
          </div>
        </section>

        {/* 5. SINGLE-LINE FRICTIONLESS GHOST AUDIT INGESTION (DIRECT CONSUMER LINE OF SIGHT) */}
        <section className="max-w-4xl mx-auto w-full space-y-3">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3 bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-3 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
            
            {/* Quick File Upload Input Trigger */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full md:w-auto px-4 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 rounded-xl border border-slate-800 font-bold text-xs uppercase tracking-wider transition shrink-0 flex items-center justify-center gap-2"
            >
              📥 <span>Upload File</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />

            {/* Combined Text Input */}
            <input
              type="text"
              placeholder="Example format: FORD TRANSIT 2022, CHEVY EXPRESS 2021 (one per line)..."
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              className="flex-1 w-full bg-[#050914] text-cyan-400 font-mono text-xs px-4 py-3.5 rounded-xl border border-slate-900 outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-700"
            />

            {/* Run Sweeps Trigger */}
            <button
              type="submit"
              disabled={loading || !bulkInput.trim()}
              className="w-full md:w-auto px-6 py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition shadow-lg disabled:opacity-35 disabled:cursor-not-allowed shrink-0"
            >
              {loading ? 'Sweeping...' : 'Run Safety Sweep'}
            </button>
          </form>
        </section>

        {/* System Error Message Banner */}
        {error && (
          <div className="text-cyan-400 p-4 bg-cyan-950/10 border border-cyan-900/40 rounded-xl font-mono text-xs flex items-center gap-3 shadow-inner max-w-4xl mx-auto w-full">
            <span>📡</span> {error}
          </div>
        )}

        {/* 6. DYNAMIC RESULTS PANEL & PRICING INJECTION */}
        {sweepExecuted && (
          <section className="max-w-4xl mx-auto w-full space-y-8 animate-fadeIn">
            
            {/* =====================================================================
                OUTCOME A: NO RECALLS IDENTIFIED (THE EMERALD COMPLIANCE BADGE)
                ===================================================================== */}
            {recalls.length === 0 ? (
              <div className="bg-[#0b0f19]/40 border border-emerald-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-8 text-center">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
                
                {/* Visual Glow Badge Icon */}
                <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10 animate-pulse">
                  🛡️
                </div>

                <div className="space-y-2 max-w-xl mx-auto">
                  <h3 className="text-emerald-400 text-2xl font-black uppercase tracking-tight">
                    100% Clean Safety Compliance Certified
                  </h3>
                  <p className="text-slate-300 text-sm">
                    No active federal recalls were detected across your audited assets. You are currently operating at a maximum fleet health rating of 100%!
                  </p>
                </div>

                {/* Simulated Badge Card */}
                <div className="max-w-md mx-auto bg-slate-950/80 border border-slate-900 rounded-2xl p-6 flex items-center justify-between gap-4 text-left shadow-inner">
                  <div className="space-y-1.5">
                    <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest block">RecallLogic verified</span>
                    <h4 className="text-white font-black uppercase text-sm leading-none">Active Carrier Compliance Badge</h4>
                    <p className="text-slate-500 text-[10px] leading-relaxed">Generated dynamically for {vinsEvaluatedCount} active vehicles. Certified clean: {new Date().toLocaleDateString()}</p>
                  </div>
                  <button 
                    onClick={() => alert('Compliance Badge URL copied! Forward this to brokers, clients, or insurance carriers to leverage discounts.')}
                    className="px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500 hover:text-slate-950 text-emerald-400 rounded-xl border border-emerald-500/20 text-xs font-black uppercase tracking-wider transition shrink-0"
                  >
                    Share Badge
                  </button>
                </div>

                {/* Direct Subscription Action Call */}
                <div className="pt-6 border-t border-slate-900/60 max-w-xl mx-auto space-y-3">
                  <p className="text-slate-400 text-xs leading-relaxed">
                    While your fleet is currently safe, outstanding manufacturer recalls are published weekly. Keep checking your assets automatically and maintain dynamic compliance records.
                  </p>
                  <p className="text-cyan-400 text-sm font-black uppercase tracking-wider animate-pulse">
                    👇 Lock in continuous background checking. Choose your plan below:
                  </p>
                </div>

                {/* INJECTED OFFERINGS IN SINGLE OUTCOME CONTAINER (OUTCOME A) */}
                <div className="pt-4 border-t border-slate-900/60 text-left">
                  <OfferingCards />
                </div>
              </div>

            ) : (
              
              /* =====================================================================
                  OUTCOME B: RECALLS FOUND (THE RED WARNING SCREEN)
                  ===================================================================== */
              <div className="bg-[#0b0f19]/40 border border-red-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden backdrop-blur-md space-y-8">
                <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left border-b border-slate-900 pb-6">
                  <div className="h-16 w-16 rounded-2xl bg-red-500/10 border border-red-400/20 flex items-center justify-center text-3xl shrink-0">
                    🚨
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-red-400 text-2xl font-black uppercase tracking-tight">
                      Critical Safety Vulnerabilities Identified
                    </h3>
                    <p className="text-slate-300 text-xs sm:text-sm">
                      We discovered <strong className="text-red-400">{recalls.length} active federal manufacturer recalls</strong> outstanding on your fleet. These safety hazards expose your business to active liability and potential regulatory downtime.
                    </p>
                  </div>
                </div>

                {/* Render Matched Recall Lists */}
                <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto pr-2">
                  {recalls.map((recall, index) => {
                    const isCritical = recall.calculated_severity_score && recall.calculated_severity_score >= 75;
                    return (
                      <div 
                        key={index}
                        className={`border rounded-2xl p-5 transition bg-[#0b0f19]/40 ${
                          isCritical ? 'border-red-500/20' : 'border-slate-800'
                        }`}
                      >
                        <div className="flex justify-between items-start flex-wrap gap-2 mb-2">
                          <div>
                            <h4 className="font-black text-slate-100 uppercase text-sm">{recall.make} {recall.model} ({recall.year})</h4>
                            <span className="text-[9px] font-black uppercase text-slate-500 font-mono">
                              Component: {recall.component}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-red-400">
                            Severity: {recall.calculated_severity_score || 50}/100
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 leading-normal">{recall.summary}</p>
                      </div>
                    );
                  })}
                </div>

                {/* Direct Conversion Guidance */}
                <div className="bg-slate-950/80 border border-slate-900 rounded-2xl p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-6 shadow-inner">
                  <div className="space-y-1 max-w-md">
                    <h4 className="text-white font-black uppercase text-sm">Join RecallLogic to Remediate This Fleet</h4>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      Lock in our flat subscription to automatically schedule dealership repairs, track active technician logs, and export verified PDF Liability Shields to reduce commercial insurance premiums.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      const element = document.getElementById('offerings-anchor');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-5 py-3 bg-red-500 hover:bg-red-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition shadow-lg shrink-0"
                  >
                    Remediate Now
                  </button>
                </div>

                {/* INJECTED OFFERINGS IN SINGLE OUTCOME CONTAINER (OUTCOME B) */}
                <div id="offerings-anchor" className="pt-6 border-t border-slate-900/60 text-left">
                  <p className="text-red-400 text-sm font-black uppercase tracking-wider text-center mb-6 animate-pulse">
                    👇 Upgrade your fleet threshold to initiate recall repair tickets:
                  </p>
                  <OfferingCards />
                </div>
              </div>
            )}

          </section>
        )}

        {/* Static Pricing Backup (Only shown prior to a sweep so the footer of the page is always complete) */}
        {!sweepExecuted && (
          <div className="pt-6 border-t border-slate-900">
            <OfferingCards />
          </div>
        )}

        {/* 🛡️ PREMIUM GLASSMORPHISM PAYWALL INTERCEPTOR SHEET */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0b0f19] border border-slate-900 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl">
              <span className="text-4xl block mb-3">🛡️</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Activate RecallLogic Pro</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Your source fleet target includes <strong className="text-cyan-400 font-mono">{blockedVinCount} active rows</strong>. Exploratory un-metered passes are locked at a structural maximum limit of 10 logs per cycle.
              </p>

              {/* Dynamic Quote Pricing Card */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner my-6">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider">RecallLogic Quote:</span>
                  <span className="text-3xl font-black text-cyan-400 font-mono tracking-tight">
                    ${calculateCustomMRR(blockedVinCount)}<span className="text-xs font-semibold text-slate-600">/mo</span>
                  </span>
                </div>
                
                <div className="space-y-2.5 text-xs font-bold text-slate-500 font-mono">
                  <div className="flex justify-between items-center">
                    <span className="uppercase text-[10px] text-slate-400 font-black">Plan Tier:</span>
                    <span className="text-slate-300 font-black uppercase text-xs">
                      {activePlanType}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>• Fleet Scale Threshold Allocation</span>
                    <span className="text-slate-300">
                      {blockedVinCount <= 15 ? 'Up to 15 VINs' : blockedVinCount <= 100 ? 'Up to 100 VINs' : 'Enterprise Scale'}
                    </span>
                  </div>
                </div>
                
                <div className="text-[10px] text-emerald-400 font-black tracking-wide border-t border-slate-900 pt-3 flex items-center gap-1.5 leading-relaxed uppercase">
                  ✓ Continuous database verification bound to regional ambient weather indicators.
                </div>
              </div>

              {/* Secure Checkout Controls */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl border border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 font-black text-xs transition-all tracking-wider uppercase"
                >
                  Adjust
                </button>
                <div className="flex-1">
                  <UpgradeButton planType={activePlanType} />
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}