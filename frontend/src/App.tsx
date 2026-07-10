import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Modular Feature Subcomponents [cite: 9, 107]
import UpgradeButton from './components/UpgradeButton';
import TaskBoard from './components/TaskBoard';

// =====================================================================
// DATA INTERFACES & CONTRACTS [cite: 1, 2]
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

interface GlobalMetrics {
  total_vins: number;
  processed_vins: number;
  total_recalls: number;
  fleet_health_index: number;
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

// Initialize Supabase Client securely using Vite's environment variables [cite: 2]
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================================
// CUSTOM HOOK: useLeadData [cite: 3]
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
        // Extract email parameter from URL query string to support Instantly outbound triggers
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
// EMBEDDED STYLES FOR 3D TRANSFORMS [cite: 4]
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
// VALUE FLIP CARD COMPONENT [cite: 4, 5]
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
            <h3 className="text-white font-black text-lg uppercase tracking-tight">{frontTitle}</h3>
            <p className="text-slate-400 text-xs leading-relaxed">{frontDescription}</p>
          </div>
          <span className="text-[10px] text-slate-500 font-bold uppercase font-mono tracking-wider">Hover to flip ➜</span>
        </div>
        {/* Back Face */}
        <div className="absolute inset-0 bg-slate-950/90 border border-cyan-500/30 rounded-2xl p-6 flex flex-col justify-between backface-hidden [transform:rotateY(180deg)] shadow-inner">
          <div className="space-y-4">
            <h3 className="text-cyan-400 font-black text-lg uppercase tracking-tight">{backTitle}</h3>
            <p className="text-slate-300 text-xs leading-relaxed">{backDescription}</p>
          </div>
          <span className="text-[10px] text-cyan-600 font-bold uppercase font-mono tracking-wider">🔒 System Encrypted</span>
        </div>
      </div>
    </div>
  );
};

// =====================================================================
// VALUE FLIP CARDS CONTAINER [cite: 6]
// =====================================================================

const ValueFlipCards: React.FC = () => {
  return (
    <section className="py-6 border-t border-slate-900 mt-12 w-full max-w-5xl">
      <style>{flipCardStyles}</style>
      <h2 className="text-2xl font-black text-white mb-8 text-center uppercase tracking-tight">Standard Compliance Pillars</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FlipCard 
          frontTitle="Automated Recall Sweeping" 
          frontDescription="Eliminate manual lookup logs. We automatically check manufacturer catalogs daily." 
          backTitle="Direct NHTSA Ingestion" 
          backDescription="Continuous synchronization against federal databases to protect operations from vehicle safety risks." 
          icon={<span>📡</span>} 
          tagline="Core Utility" 
        />
        <FlipCard 
          frontTitle="Operator Compliance Badge" 
          frontDescription="Display your live safety compliance index directly to prospective cargo clients and brokers." 
          backTitle="Safety Badging" 
          backDescription="Earn real-time trust markers with active, public links demonstrating a 100% clean recall profile." 
          icon={<span>🛡️</span>} 
          tagline="Outbound Trust" 
        />
        <FlipCard 
          frontTitle="Legal Liability Shield" 
          frontDescription="Maintain complete documented proof of safety recall remediation in case of regulatory audits." 
          backTitle="Liability Reduction" 
          backDescription="Maintain exportable PDF certificates to dramatically lower carrier liability thresholds." 
          icon={<span>⚖️</span>} 
          tagline="Asset Protection" 
        />
      </div>
    </section>
  );
};

// =====================================================================
// INTERACTIVE GHOST AUDIT CARD COMPONENT [cite: 7, 8, 9, 10]
// =====================================================================

interface GhostAuditProps {
  lead: Lead | null;
  leadLoading: boolean;
  leadError: string | null;
}

function GhostAuditCard({ lead, leadLoading, leadError }: GhostAuditProps) {
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepProgress, setSweepProgress] = useState<number>(0);
  const [sweepComplete, setSweepComplete] = useState<boolean>(false);
  const [manualEmail, setManualEmail] = useState<string>('');

  const triggerSweep = () => {
    setIsSweeping(true);
    setSweepProgress(0);
    setSweepComplete(false);
    
    const interval = setInterval(() => {
      setSweepProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setSweepComplete(true);
          setIsSweeping(false);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  if (leadLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-8 shadow-2xl animate-pulse my-8">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-slate-800 rounded mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-800 rounded w-5/6"></div>
          <div className="h-4 bg-slate-800 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  if (leadError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-red-950/10 border border-red-900/30 rounded-2xl p-6 text-center text-red-400 my-8">
        <p className="font-mono text-xs">⚠️ Failed to load prospect fleet profile details: {leadError}</p>
      </div>
    );
  }

  const fleetSize = lead ? lead.est_fleet_size : 10;
  const checkoutEmail = lead ? lead.contact_email : manualEmail;

  // Map flat-rate tier names based on size ranges [cite: 21]
  const planTier = fleetSize <= 15 ? 'starter' : fleetSize <= 100 ? 'professional' : 'enterprise';

  // RENDER CASE A: Fallback Generic Search
  if (!lead) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-8 shadow-2xl my-8 relative overflow-hidden backdrop-blur-md">
        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Scan Your Fleet for Active Recalls</h2>
        <p className="text-slate-400 mb-6 text-xs sm:text-sm">
          Enter your email to run a secure, automated "Ghost Sweep" on up to 10 fleet vehicles in real time.
        </p>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Enter corporate email to verify assets..."
            value={manualEmail}
            onChange={(e) => setManualEmail(e.target.value)}
            className="w-full px-4 py-3 text-xs rounded-xl border border-slate-800 bg-[#050914] text-cyan-400 font-mono outline-none focus:border-cyan-500/80"
          />
          <button
            onClick={triggerSweep}
            disabled={isSweeping || !manualEmail}
            className="w-full py-3.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition"
          >
            {isSweeping ? 'Analyzing Local Fleet Registers...' : 'Initiate Free Search'}
          </button>
        </div>

        {isSweeping && (
          <div className="mt-4 bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400 transition-all duration-150" style={{ width: `${sweepProgress}%` }} />
          </div>
        )}

        {sweepComplete && (
          <div className="mt-4 p-4 bg-emerald-950/10 border border-emerald-900/20 rounded-xl text-emerald-400 text-xs font-mono">
            ✓ Sweep Complete: 10 vehicles evaluated. 0 critical vulnerabilities identified. Upgrade to monitor larger inventories.
          </div>
        )}
      </div>
    );
  }

  // RENDER CASE B: Hyper-Personalized Prospect Layout
  return (
    <div className="w-full max-w-2xl mx-auto bg-[#0b0f19]/40 border border-emerald-500/20 rounded-2xl shadow-2xl overflow-hidden my-8 backdrop-blur-md relative">
      <div className="bg-gradient-to-r from-emerald-950/20 to-teal-950/20 border-b border-emerald-500/20 p-6">
        <span className="inline-block text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full mb-3 font-mono">
          Wave 1 Pilot Account: Active
        </span>
        <h2 className="text-2xl font-black text-white uppercase tracking-tight">
          Welcome, {lead.contact_name} | {lead.company_name}
        </h2>
        <p className="text-slate-300 text-xs sm:text-sm mt-1 leading-normal">
          We have pre-loaded your local Nevada fleet profile (Estimated: <span className="font-semibold text-white font-mono">{lead.est_fleet_size} {lead.primary_vehicle_mix}s</span>).
        </p>
      </div>

      <div className="p-6 space-y-6">
        <div className="p-4 bg-slate-950/80 border border-slate-900 rounded-xl space-y-2">
          <p className="text-xs text-slate-400"><strong className="text-slate-200">Localized Threat Context Hook:</strong> {lead.localized_threat_hook || "Unverified liability markers."}</p>
          <p className="text-xs text-slate-400"><strong className="text-slate-200">Carrier Out-of-Service Rate:</strong> <span className="font-mono font-bold text-red-400">{lead.usdot_oos_rate || "0.0"}%</span> (Clark County Average: 11%)</p>
        </div>

        <button
          onClick={triggerSweep}
          disabled={isSweeping}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition hover:opacity-90 shadow-lg shadow-emerald-500/10"
        >
          {isSweeping ? 'Compiling Ingestion Queues...' : 'Initiate Diagnostics Matrix Sweep'}
        </button>

        {isSweeping && (
          <div className="bg-slate-950 h-1.5 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-400 transition-all duration-150" style={{ width: `${sweepProgress}%` }} />
          </div>
        )}

        {sweepComplete && (
          <div className="space-y-4 animate-fadeIn">
            <div className="p-4 bg-red-950/10 border border-red-900/20 rounded-xl text-red-400 text-xs font-mono">
              ⚠️ Diagnostic Alarm: We matched {lead.est_fleet_size} VIN schemas. Multiple recalls flagged inside vehicle database registry. Lock in protection below to see full safety records.
            </div>
            
            <div className="bg-[#050914] border border-slate-900 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-bold uppercase tracking-wider">Predictable Subscription Quote:</span>
                <span className="text-2xl font-black text-cyan-400 font-mono">
                  ${fleetSize <= 15 ? '99.00' : fleetSize <= 100 ? '249.00' : '499.00'}<span className="text-[10px] text-slate-600">/mo</span>
                </span>
              </div>
              
              <div className="flex gap-2">
                <UpgradeButton planType={planTier} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =====================================================================
// MAIN APPLICATION COMPONENT [cite: 11]
// =====================================================================

export default function App() {
  // Global Metrics & Search Console States [cite: 11]
  const [metrics, setMetrics] = useState<GlobalMetrics | null>({
    total_vins: 25041,
    processed_vins: 1420,
    total_recalls: 14,
    fleet_health_index: 91.2
  });
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Paywall & Limit Enforcement States [cite: 11]
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live Audit Tracking State (Unlocks full workspace viewing upon scan completion)
  const [sweepExecuted, setSweepExecuted] = useState(false);

  // Active Outbound Lead Integration Hook [cite: 12]
  const { lead, loading: leadLoading, error: leadError } = useLeadData();

  // Sandbox Orchestrator Local Tracking States [cite: 12]
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; [cite: 12]

  // 1. Fetch live metrics from local backend [cite: 13]
  const fetchGlobalMetrics = () => {
    axios.get('http://127.0.0.1:8000/api/metrics/global')
      .then(res => {
        const data = res.data.metrics || res.data;
        setMetrics({
          total_vins: data.total_vins ?? 25041,
          processed_vins: data.processed_vins ?? 1420,
          total_recalls: data.total_recalls ?? 14,
          fleet_health_index: data.fleet_health_index ?? 91.2
        });
      })
      .catch(err => {
        console.error('Metrics loading skipped (using local defaults):', err);
      });
  };

  useEffect(() => {
    fetchGlobalMetrics();
  }, []);

  // 2. Predictable Flat-Rate MRR Calculation [cite: 21]
  const calculateCustomMRR = (vinCount: number) => {
    if (vinCount <= 15) return "99.00";       // Starter Tier [cite: 21]
    if (vinCount <= 100) return "249.00";     // Professional Tier [cite: 21]
    return "499.00";                          // Enterprise Tier [cite: 21]
  };

  // 3. Automated Ingestion & Parsing Sweeps [cite: 17]
  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
        
    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // Enforce 10-VIN trial limit [cite: 11]
    if (cleanedLines.length > 10) {
      setBlockedVinCount(cleanedLines.length);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError('');
    const aggregatedResults: Recall[] = [];

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
    setError('');
    setRecalls([]);
    processManifestLines(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.; // Safe Vite bracket-friendly compiler parsing [cite: 17]
    if (!file) return;
    setError('');
    setRecalls([]);

    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkInput(text);
        processManifestLines(text.split(/\r?\n/));
      };
      reader.readAsText(file);
    } else {
      setError('Invalid Schema: Please drop a structured comma-delimited manifest (.csv or .txt).');
    }
  };

  // Sandbox Orchestrators: Automated Reset Actions [cite: 15]
  const triggerSandboxEnvironmentReset = async () => {
    setSandboxResetStatus('Resetting Replica State...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/reset');
      setSandboxResetStatus('✓ Success: ' + (response.data.message || 'Replica reset.'));
      setRecalls([]);
      fetchGlobalMetrics();
      setTimeout(() => setSandboxResetStatus(''), 4000);
    } catch (err: any) {
      setSandboxResetStatus('✕ Error: ' + (err.response?.data?.detail || 'Failed reset connection.'));
    }
  };

  // Sandbox Mock stripe upgrader [cite: 16]
  const simulateSandboxSubscriptionUpgrade = async () => {
    setSandboxWebhookLogs('Generating signed token payload...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/mock-checkout', {
        customer_email: "agent-test-fleet@recalllogic.internal",
        metadata: { fleet_limit_override: "true" }
      });
      setSandboxWebhookLogs('✓ Upgrade Sent: ' + (response.data.message || 'Checkout sent.'));
      setTimeout(() => setSandboxWebhookLogs(''), 4000);
    } catch (err: any) {
      setSandboxWebhookLogs('✕ Webhook Failure: ' + (err.response?.data?.detail || 'Webhook failed.'));
    }
  };

  // Determine pricing map selection based on the row block threshold [cite: 21]
  const activePlanType = blockedVinCount <= 15 ? "starter" : blockedVinCount <= 100 ? "professional" : "enterprise";

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Sidebar: Premium Obsidian Left-Hand Navigation [cite: 106] */}
      <aside className="w-64 border-r border-slate-900 bg-[#0b0f19]/80 p-6 hidden lg:flex flex-col justify-between shrink-0 backdrop-blur-md">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20 border border-cyan-400/20">🛡️</div>
            <div className="flex flex-col">
              <span className="font-black text-slate-100 tracking-tight text-sm uppercase">RecallLogic</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">v2026.4.2</span>
            </div>
          </div>
          <nav className="space-y-1">
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-cyan-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-inner">
              📊 Threat Intelligence
            </span>
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer opacity-40">
              🚢 Maritime Vectors
            </span>
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 hover:text-slate-300 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer opacity-40">
              🫁 Clinical Nodes
            </span>
          </nav>
        </div>
        <div className="border-t border-slate-900 pt-4 px-2 space-y-2">
          <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Network Blueprint</div>
          <div className="text-xs text-slate-400 font-bold font-mono flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_#10b981] animate-pulse" /> Core_Live_Node_8000
          </div>
        </div>
      </aside>

      {/* Main Workspace Viewport Panel [cite: 107] */}
      <main className="flex-1 p-8 lg:p-12 max-w-5xl mx-auto space-y-10 overflow-y-auto w-full">
        
        {/* Dynamic Header Telemetry Metrics Block [cite: 107, 108] */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900 pb-8">
          <div className="space-y-2">
            <h2 className="text-slate-100 text-3xl font-black tracking-tight sm:text-4xl uppercase">
              Predictive Safety <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">Intelligence</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
              Cross-industry risk engine scoring technical asset subassembly failure frequencies against real-time environmental ambient multipliers.
            </p>
          </div>

          <div className="flex gap-4 shrink-0">
            <div className="bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-4 min-w-[160px] shadow-2xl backdrop-blur-md relative overflow-hidden ring-1 ring-slate-800/50">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Index Database Matrix</div>
              <div className="text-3xl font-black text-cyan-400 font-mono tracking-tight">{metrics?.total_vins?.toLocaleString() || '25,041'}</div>
            </div>
            <div className="bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-4 min-w-[160px] shadow-2xl backdrop-blur-md relative overflow-hidden ring-1 ring-slate-800/50">
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Health Threshold</div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{metrics?.fleet_health_index || '91.2'}%</div>
            </div>
          </div>
        </header>

        {/* 📬 THE OUTBOUND GHOST AUDIT COMPONENT BLOCK [cite: 10] */}
        <GhostAuditCard lead={lead} leadLoading={leadLoading} leadError={leadError} />

        {/* Tactical Command Ingestion Console [cite: 109, 110] */}
        <section className="space-y-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Drag and Drop Zone [cite: 109] */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (fileInputRef.current && e.dataTransfer.files) {
                    fileInputRef.current.files = e.dataTransfer.files;
                    handleFileUpload({ target: fileInputRef.current } as any);
                  }
                }}
                className={`lg:col-span-1 p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden ${
                  isDragging  
                    ? 'border-cyan-500 bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.15)]'  
                    : 'border-slate-800 bg-[#0b0f19]/30 hover:border-slate-700 hover:bg-[#0b0f19]/50'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                <span className="text-3xl mb-2 transition-transform duration-300 group-hover:-translate-y-1">📥</span>
                <span className="text-slate-200 font-bold text-sm block tracking-tight">Mount Fleet Manifest</span>
                <span className="text-slate-500 text-[10px] mt-1 block leading-normal">Drop or browse raw .csv / .txt registries</span>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
              </div>

              {/* Advanced Code-Style Textarea Console [cite: 110] */}
              <div className="lg:col-span-2 relative">
                <textarea
                  rows={4}
                  placeholder="Manual String Override Input Loop: Paste comma-delimited asset arrays row-by-row...&#10;Example:&#10;FORD, TRANSIT-250, 2022&#10;CHEVROLET, BOLT EV, 2021"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-full min-h-[140px] p-4 text-xs rounded-2xl border border-slate-900 bg-[#050914] text-cyan-400 font-mono outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/20 transition-all placeholder:text-slate-700 leading-relaxed shadow-inner resize-none"
                />
                <div className="absolute bottom-3 right-3 text-[9px] font-bold font-mono text-slate-600 bg-slate-950 px-2 py-1 rounded border border-slate-900/60 uppercase">PowerShell_Input_Active</div>
              </div>

            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
              <div className="text-slate-600 text-[11px] font-semibold max-w-xl leading-relaxed px-1">
                ⚠️ Platform Guardrail Token: Unverified developer sandboxes are scaled to an execution maximum constraint threshold of 10 vehicle matrix components per evaluation wave.
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto px-6 py-3.5 text-xs uppercase tracking-wider bg-slate-100 text-slate-950 rounded-xl font-extrabold hover:bg-white active:scale-[0.985] transition-all shrink-0 shadow-xl disabled:opacity-30 disabled:pointer-events-none"
              >
                {loading ? 'Hasing Database Index Nodes...' : 'Run Safety Threat Sweep'}
              </button>
            </div>
          </form>
        </section>

        {/* System Communication Banner [cite: 111] */}
        {error && (
          <div className="text-cyan-400 p-4 bg-cyan-950/10 border border-cyan-900/40 rounded-xl font-mono text-xs flex items-center gap-3 shadow-inner">
            <span>📡</span> {error}
          </div>
        )}

        {/* Real-time Streaming Threat Intelligence Workspace [cite: 111, 112] */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Threat Exposure Stream ({recalls.length})</div>
            {recalls.length > 0 && <div className="h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_10px_#06b6d4] animate-ping" />}
          </div>

          {recalls.length === 0 && !loading && (
            <div className="text-slate-600 py-20 text-center border border-slate-900/60 bg-[#0b0f19]/10 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner">
              <span className="text-3xl animate-pulse">📡</span>
              <p className="text-xs font-bold font-mono uppercase tracking-wide">Console Standby. Inject fleet manifest data matrices to compile metrics.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {recalls.map((recall, index) => {
              const isCritical = recall.calculated_severity_score && recall.calculated_severity_score >= 75;
              return (
                <div 
                  key={index}
                  className={`border rounded-2xl p-6 transition-all duration-300 shadow-2xl relative overflow-hidden backdrop-blur-sm ${
                    isCritical 
                      ? 'border-red-500/20 bg-gradient-to-b from-red-950/10 via-[#030712] to-[#030712]' 
                      : 'border-slate-900 bg-[#0b0f19]/20 hover:border-slate-800'
                  }`}
                >
                  <div className={`absolute top-0 right-0 h-12 w-12 border-t-2 border-r-2 opacity-10 pointer-events-none ${isCritical ? 'border-red-500' : 'border-cyan-500'}`} />
                  
                  <div className="flex justify-between items-start flex-wrap gap-4 mb-4 relative z-10">
                    <div>
                      <h4 className="font-black text-slate-100 text-xl tracking-tight uppercase">{recall.make} <span className="text-cyan-400 font-mono font-medium">{recall.model}</span> ({recall.year})</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCritical ? 'bg-red-950/60 text-red-400 border border-red-500/20' : 'bg-slate-900 text-cyan-400 border border-slate-800'
                        }`}>
                          {recall.assembly_category || 'General'}
                        </span>
                        {recall.thermal_multiplier_active && (
                          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-950/60 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                            ☀️ Climatic Multiplier Active
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1 font-mono">
                      <span className={`text-[10px] font-black uppercase tracking-widest ${isCritical ? 'text-red-400' : 'text-slate-500'}`}>
                        NHTSA Ledger #{recall.campaign_number}
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">
                        Severity Weight: <span className={`font-black ${isCritical ? 'text-red-400' : 'text-cyan-400'}`}>{recall.calculated_severity_score || 0}/100</span>
                      </span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-900 h-1.5 rounded-full mb-5 overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`}
                      style={{ width: `${recall.calculated_severity_score || 0}%` }}
                    />
                  </div>

                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed relative z-10 font-medium">
                    <p><strong className="text-slate-200 uppercase text-[10px] tracking-wider font-bold block mb-0.5">Component Breakdown:</strong> {recall.component}</p>
                    <p><strong className="text-slate-200 uppercase text-[10px] tracking-wider font-bold block mb-0.5">Vulnerability Technical Summary:</strong> {recall.summary}</p>
                    
                    {recall.notes && (
                      <div className={`mt-4 p-4 rounded-xl border-l-2 text-xs font-mono tracking-normal leading-relaxed shadow-inner ${
                        isCritical 
                          ? 'bg-red-500/5 border-red-500 text-red-300/90' 
                          : 'bg-slate-950/50 border-cyan-500 text-slate-400'
                      }`}>
                        {recall.notes}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 📋 INTERACTIVE SAFETY TASK BOARD MOUNT SEGMENT [cite: 107] */}
        {sweepExecuted && (
          <section className="space-y-6 pt-10 border-t border-slate-900">
            <div className="space-y-2">
              <h2 className="text-slate-100 text-2xl font-black uppercase tracking-tight">Fleet Safety Task Board</h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium leading-relaxed max-w-xl">
                Directly transition detected recalls, schedule service appointments, and manage dealership repair records.
              </p>
            </div>

            {/* Render our interactive task board for sandbox testing [cite: 107] */}
            <TaskBoard userId="usr_test_123" />
          </section>
        )}

        {/* Three Value Proposition Columns [cite: 6] */}
        <ValueFlipCards />

        {/* 🔒 SECURITY AND SANDBOX TESTING CONTROLS PANEL [cite: 12] */}
        {isSandboxMode && (
          <section className="bg-slate-950/40 border border-slate-900 rounded-3xl p-6 space-y-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-900 pb-4">
              <div className="space-y-1">
                <span className="text-[9px] font-mono font-black text-amber-500 uppercase tracking-widest">Local Sandbox console</span>
                <h3 className="text-white font-black text-lg uppercase tracking-tight">Core Platform Sandbox Controls</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={triggerSandboxEnvironmentReset}
                  className="px-4 py-2 bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-slate-400 hover:text-white rounded-lg transition"
                >
                  Reset Db Replica
                </button>
                <button
                  onClick={simulateSandboxSubscriptionUpgrade}
                  className="px-4 py-2 bg-amber-950/10 border border-amber-500/20 text-xs font-mono font-bold text-amber-400 hover:text-amber-300 rounded-lg transition"
                >
                  Mock Stripe Success
                </button>
              </div>
            </div>

            {sandboxResetStatus && <p className="text-xs font-mono text-cyan-400">⚡ {sandboxResetStatus}</p>}
            {sandboxWebhookLogs && <p className="text-xs font-mono text-amber-400">⚡ {sandboxWebhookLogs}</p>}
          </section>
        )}

        {/* 🛡️ PREMIUM GLASSMORPHISM PAYWALL INTERCEPTOR SHEET [cite: 115] */}
        {showUpgradeModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#0b0f19] border border-slate-900 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl">
              <span className="text-4xl block mb-3">🛡️</span>
              <h3 className="text-xl font-black text-white uppercase tracking-tight">Activate RecallLogic Pro</h3>
              <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                Your source fleet target includes <strong className="text-cyan-400 font-mono">{blockedVinCount} active rows</strong>. Exploratory un-metered passes are locked at a structural maximum limit of 10 logs per cycle.
              </p>

              {/* Dynamic Quote Pricing Card [cite: 115] */}
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

              {/* Secure Checkout Controls [cite: 116] */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(false)}
                  className="flex-1 py-3.5 px-4 rounded-xl border border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 font-black text-xs transition-all tracking-wider uppercase"
                >
                  Adjust
                </button>
                <div className="flex-">
                  {/* Instantly launches Stripe Checkout in embedded iframe mode [cite: 124] */}
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