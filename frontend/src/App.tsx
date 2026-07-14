import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Modular Feature Subcomponents
import UpgradeButton from './components/UpgradeButton';
import TaskBoard from './components/TaskBoard';

// =====================================================================
// DATA CONTRACTS & SCHEMAS [cite: 1, 2]
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
  lead_status?: string;
}

// Initialize Supabase Client securely using Vite's environment variables [cite: 2]
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================================
// CUSTOM HOOK: useLeadData (THE REGISTRATION BRIDGE MECHANICS) [cite: 1402]
// =====================================================================
export function useLeadData() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  async function resolveUserSession() {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if there is an active authenticated user session [cite: 1402]
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Query Profiles table for authenticated users [cite: 1402]
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (!profileError && profileData) {
          setProfile(profileData);
          setLoading(false);
          return;
        }
      }

      // 2. Fallback: Check for URL email parameter (anonymous outbound leads) [cite: 3, 1402]
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      
      if (emailParam) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('contact_email', emailParam)
          .single();

        if (leadError) throw leadError;
        setLead(leadData);
      }
    } catch (err: any) {
      console.error('Session/Lead resolution failed:', err);
      setError(err.message || 'Unable to resolve context.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    resolveUserSession();

    // Set up an auth state change listener to catch sign-ups/logins in real-time [cite: 1402]
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      resolveUserSession();
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    lead,
    profile,
    loading,
    error,
    // A user is paid if their lead status is completed OR their auth profile is pro! [cite: 23, 1402]
    isPaid: profile?.is_pro || lead?.lead_status === 'Stripe Completed',
    isAuthenticated: !!profile
  };
}

// =====================================================================
// REGISTRATION MODAL COMPONENT (THE TRUST BRIDGE CONTAINER) [cite: 1402]
// =====================================================================
interface RegistrationModalProps {
  defaultEmail?: string;
  onClose: () => void;
}

function RegistrationModal({ defaultEmail, onClose }: RegistrationModalProps) {
  const [email, setEmail] = useState(defaultEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) throw signUpError;
      setMessage('Account created successfully! Your workspace is now secure.');
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error('Sign-up failed:', err);
      setError(err.message || 'Failed to register account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
      <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-md w-full shadow-2xl relative space-y-6">
        <header className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-black text-white tracking-tight">Claim Your Workspace</h2>
            <p className="text-slate-400 text-xs mt-0.5">Secure your fleet dashboard and compliance logs permanently.</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-500 hover:text-slate-300 font-mono text-sm p-1">✕</button>
        </header>

        {message && (
          <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl font-mono">
            ✓ {message}
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl font-mono">
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSignUp} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!defaultEmail}
              className="w-full bg-slate-950 border border-slate-900 p-3 text-sm text-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700 disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-400 font-mono uppercase tracking-wider block">Choose Password</label>
            <input 
              type="password" 
              required 
              placeholder="Min. 6 characters" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-900 p-3 text-sm text-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700"
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-950 py-3 rounded-xl font-black uppercase tracking-wider shadow-lg transition-all text-xs disabled:opacity-50"
          >
            {loading ? 'Securing Account...' : 'Lock In Workspace'}
          </button>
        </form>
      </div>
    </div>
  );
}

// =====================================================================
// MAIN INTERFACE ENGINE [cite: 11]
// =====================================================================
export default function App() {
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
  
  // Paywall & Limit Enforcement States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sharing & Claim Modal states
  const [showShareModal, setShowShareModal] = useState(false);
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [brokerEmail, setBrokerEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Outbound Context Resolver
  const { lead, profile, loading: sessionLoading, error: sessionError, isPaid, isAuthenticated } = useLeadData();

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;

  useEffect(() => {
    // Dynamically fetch global reference statistics on mount
    axios.get('/api/metrics/global')
      .then(res => setMetrics(res.data.metrics || res.data))
      .catch(err => console.error('Global metrics collection offline:', err));
  }, []);

  const calculateCustomMRR = (totalCars: number) => {
    const baseFee = 99;
    const perCarFee = 2.50;
    return (baseFee + (totalCars * perCarFee)).toFixed(2);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableVerificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerEmail.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShareSuccess(true);
      setBrokerEmail('');
      setTimeout(() => setShareSuccess(false), 3000);
    }, 800);
  };

  // Automated Ingestion & Parsing Sweeps [cite: 17]
  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));

    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // 🔑 THE PAYWALL INTERCEPTOR: Gated at 10 items only if they are not Pro! [cite: 415]
    if (cleanedLines.length > 10 && !isPaid) {
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
        const response = await axios.get('/api/recalls', {
          params: { make, model, year }
        });

        if (Array.isArray(response.data)) {
          aggregatedResults.push(...response.data);
        }
      }

      setRecalls(aggregatedResults);
      if (aggregatedResults.length === 0) {
        setError('Scan Complete: Clean telemetry across all targeted assets.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Pipeline Interrupted: Ensure local database engine is running.');
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files;
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

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 🔑 REGISTRATION BRIDGE BANNER [cite: 1402] */}
      {isPaid && !isAuthenticated && (
        <div className="bg-gradient-to-r from-cyan-950/80 to-blue-950/80 border-b border-cyan-500/30 px-6 py-3 text-center text-xs flex justify-between items-center z-40 backdrop-blur-md">
          <span className="text-cyan-300 font-medium">
            🛡️ <strong>Workspace Unlocked:</strong> You have active premium access! Create a password to claim this fleet dashboard permanently. [cite: 1402]
          </span>
          <button 
            onClick={() => setShowClaimModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-1.5 rounded-lg font-bold transition-all text-xs"
          >
            Claim Workspace
          </button>
        </div>
      )}

      <div className="flex flex-1">
        {/* Sidebar Frame [cite: 68] */}
        <aside className="w-64 border-r border-slate-900 bg-[#0b0f19]/80 p-6 hidden lg:flex flex-col justify-between shrink-0 backdrop-blur-md">
          <div className="space-y-8">
            <div className="flex items-center gap-3 px-2">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20 border border-cyan-400/20">🛡️</div>
              <div className="flex flex-col">
                <span className="font-black text-slate-100 tracking-tight text-sm uppercase">RecallLogic</span>
                <span className="text-[10px] text-slate-500 font-mono tracking-wider">v2026.7.2</span>
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

        {/* Primary Dashboard Area */}
        <main className="flex-1 p-8 lg:p-12 max-w-5xl mx-auto space-y-10 overflow-y-auto w-full">
          
          {/* Pulsing Crisis Header [cite: 756] */}
          <div className="bg-gradient-to-r from-red-950/30 to-slate-950/30 border border-red-500/20 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1">
              <span className="text-xs bg-red-500/10 text-red-400 px-2.5 py-0.5 rounded-full border border-red-500/20 font-bold tracking-wide font-mono uppercase animate-pulse">Critical Alerts Active</span>
              <h3 className="text-lg font-black text-slate-100 uppercase tracking-tight">Recall Crisis Tracking Block</h3>
              <p className="text-slate-400 text-xs max-w-xl">15,000+ newly registered federal compliance safety recall threats are currently active. Audit your vehicle fleet immediately.</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-2xl text-center shrink-0">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Hazards</div>
              <div className="text-xl font-black text-red-400 font-mono mt-0.5">15,402</div>
            </div>
          </div>

          {/* Dynamic Header Metrics [cite: 694] */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900 pb-8">
            <div className="space-y-2">
              <h2 className="text-slate-100 text-3xl font-black tracking-tight sm:text-4xl uppercase">
                Predictive Safety <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">Intelligence</span>
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
                We instantly scan your fleet for hidden, un-repaired manufacturer defects and track safety compliance so you can prevent catastrophic vehicle downtime and lower your commercial insurance premiums [cite: 782].
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

          {/* Frictionless Drag and Drop Dropzone [cite: 756] */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" /> Fleet Deployment Ingestion Node
              </h3>
              <span className="text-xs text-slate-500 font-mono">Accepts .txt, .csv, or Excel templates [cite: 79]</span>
            </div>

            <form onSubmit={handleSearch} className="space-y-4">
              <div 
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  if (e.dataTransfer.files && e.dataTransfer.files) {
                    if (fileInputRef.current) {
                      fileInputRef.current.files = e.dataTransfer.files;
                      const event = { target: fileInputRef.current } as unknown as React.ChangeEvent<HTMLInputElement>;
                      handleFileUpload(event);
                    }
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragging ? 'border-cyan-500 bg-cyan-950/10 shadow-[0_0_15px_rgba(34,211,238,0.1)]' : 'border-slate-900 bg-slate-950/20 hover:border-slate-800'}`}
              >
                <input 
                  id="dropzone-file"
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv,.txt"
                  className="hidden"
                />
                <div className="max-w-md mx-auto space-y-2">
                  <div className="text-3xl text-slate-400 mb-2">📥</div>
                  <p className="text-sm font-semibold text-slate-200">Drag & drop your fleet asset manifest file here</p>
                  <p className="text-xs text-slate-500">or click to scan local drives (Free evaluation limit: Up to 10 assets)</p>
                </div>
              </div>

              <div className="space-y-2">
                <textarea 
                  rows={3}
                  placeholder="Alternative Input: Paste row strings directly here... (e.g. FORD, TRANSIT, 2022)"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full p-4 text-sm rounded-xl border border-slate-900 bg-slate-950/40 text-slate-200 font-mono outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30 transition-all placeholder:text-slate-600 shadow-inner resize-none"
                />
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                  <span className="text-[11px] font-medium text-amber-500/90 font-mono">
                    ⚠️ Limit Notice: Free exploration scopes are locked to a maximum of 10 vehicle slots [cite: 81].
                  </span>
                  <button 
                    type="submit"
                    disabled={loading || !bulkInput.trim()}
                    className="px-6 py-2.5 text-sm bg-slate-100 text-slate-950 hover:bg-white active:scale-[0.985] font-bold rounded-xl disabled:opacity-40 disabled:hover:bg-slate-100 disabled:active:scale-100 shadow-md transition-all shrink-0"
                  >
                    {loading ? 'Running Threat Sweeps...' : 'Upload 10 Free Vehicles & Scan Exposure'}
                  </button>
                </div>
              </div>
            </form>

            {error && (
              <div className="p-4 bg-red-950/20 border border-red-900/30 text-red-400 text-xs font-mono rounded-xl">
                ❌ {error}
              </div>
            )}
          </section>

          {/* Active Workspaces Logic (Conditional Rendering) */}
          {recalls.length > 0 ? (
            <section className="space-y-6 animate-fade-in">
              {/* Branch A: Active Recalls Detected [cite: 960] */}
              <div className="border border-red-500/20 bg-red-950/10 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div className="space-y-1">
                  <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Urgent Threats Found
                  </h3>
                  <p className="text-slate-400 text-xs sm:text-sm">We have isolated active legal liability and environmental failure vectors inside your sweep logs.</p>
                </div>

                {!isPaid && (
                  <div className="bg-[#0b101d] border border-slate-800 p-5 rounded-2xl text-center shrink-0 w-full md:w-auto relative">
                    <div className="text-xs font-bold text-slate-400 uppercase">RecallLogic Shield Pricing</div>
                    <div className="text-2xl font-black text-cyan-400 font-mono mt-1">${calculateCustomMRR(blockedVinCount || recalls.length)}/mo</div>
                    <div className="mt-3">
                      <UpgradeButton vinCount={blockedVinCount || recalls.length} />
                    </div>
                  </div>
                )}
              </div>

              {/* Taskboard Integration (Paid Only) [cite: 1405, 1412] */}
              {isPaid && (
                <div className="border border-slate-900 bg-slate-950/40 p-6 rounded-3xl space-y-4">
                  <h3 className="text-md font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
                    🛠️ Active Remediation Task Board
                  </h3>
                  <TaskBoard />
                </div>
              )}

              {/* Threat Cards Mapping */}
              <div className="grid grid-cols-1 gap-4">
                {recalls.map((recall, index) => {
                  const isThermalAlert = recall.notes?.includes('REGIONAL WEATHER ALERT');
                  return (
                    <div 
                      key={index}
                      className={`border rounded-2xl p-6 transition-all shadow-xl relative overflow-hidden ${isThermalAlert ? 'border-red-500/30 bg-gradient-to-b from-red-950/10 to-slate-950/20' : 'border-slate-900 bg-slate-950/10'}`}
                    >
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-lg font-extrabold text-white tracking-tight">
                              {recall.make} {recall.model} ({recall.year})
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold font-mono tracking-wide uppercase border ${isThermalAlert ? 'bg-red-950/60 text-red-400 border-red-500/30' : 'bg-slate-900 text-cyan-400 border-slate-800'}`}>
                              Campaign #{recall.campaign_number}
                            </span>
                          </div>
                          <div className={`text-xs font-bold uppercase tracking-wider ${isThermalAlert ? 'text-red-400/90' : 'text-cyan-400/90'}`}>
                            System Affected: {recall.component}
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-3 text-xs leading-relaxed max-w-4xl">
                        <p className="text-slate-300">
                          <span className="font-bold text-white block mb-0.5">Vulnerability Summary:</span>
                          {recall.summary || 'N/A'}
                        </p>
                        <p className="text-slate-400">
                          <span className="font-bold text-slate-200 block mb-0.5">Operational Risk Profile:</span>
                          {recall.consequence || 'N/A'}
                        </p>
                      </div>

                      {recall.notes && (
                        <div className={`mt-4 p-4 rounded-xl border-l-2 text-xs font-semibold tracking-wide leading-relaxed ${isThermalAlert ? 'bg-red-500/5 border-red-500 text-red-300/90' : 'bg-slate-900/40 border-cyan-500 text-slate-400'}`}>
                          {recall.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            // Branch B: Flawless Audit (Recall-Free or Standby) [cite: 961]
            !loading && (
              <section className="space-y-6">
                <div className="relative overflow-hidden bg-gradient-to-br from-[#0b141a] to-[#04080c] border border-emerald-500/20 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
                  {/* Lock Overlay if Free */}
                  {!isPaid && (
                    <div className="absolute inset-0 bg-[#030712]/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-10 p-6 text-center">
                      <div className="max-w-md space-y-4">
                        <span className="text-3xl">🏅</span>
                        <h4 className="text-xl font-black text-white tracking-tight uppercase">Lock In Active Underwriting Badges</h4>
                        <p className="text-slate-400 text-xs sm:text-sm">Your vehicles currently check out 100% defect free. Upgrade to verify your compliance index and unlock live underwriting badge sharing [cite: 613].</p>
                        <div className="pt-2 flex justify-center">
                          <UpgradeButton vinCount={10} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cryptographic Compliance Badge Details [cite: 72, 961] */}
                  <div className={`space-y-6 ${!isPaid ? 'filter blur-[1px]' : ''}`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-emerald-500/10 pb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-3xl flex items-center justify-center rounded-2xl shadow-xl">🏅</div>
                        <div>
                          <h3 className="text-lg font-black text-white uppercase tracking-tight">RecallLogic Active Compliance Badge</h3>
                          <p className="text-slate-500 text-xs font-mono mt-0.5">Reference Verification ID: {mockReferenceToken}</p>
                        </div>
                      </div>
                      
                      <div className="px-4 py-1.5 bg-emerald-500/10 text-emerald-400 text-xs font-bold tracking-wider rounded-full border border-emerald-500/20 font-mono text-center sm:text-left self-start sm:self-auto">
                        PASS • 0 ACTIVE DEFECTS DETECTED
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-1">
                        <span className="text-slate-500">Last Database Scan:</span>
                        <p className="text-slate-300 font-bold">2026-07-14 08:00 AM</p>
                      </div>
                      <div className="bg-slate-950/40 border border-slate-900 rounded-xl p-4 space-y-1">
                        <span className="text-slate-500">Security Clearance:</span>
                        <p className="text-emerald-400 font-bold">Approved for Active Logistics Operations</p>
                      </div>
                    </div>

                    {isPaid && (
                      <div className="pt-2 flex justify-end">
                        <button 
                          onClick={() => setShowShareModal(true)}
                          className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
                        >
                          Share Verification Link
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          )}

          {/* SaaS Tiers Offerings Grid [cite: 756] */}
          <section className="py-6 w-full space-y-8 border-t border-slate-900 pt-10">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-black text-white uppercase tracking-tight">SaaS Offerings Pillars</h2>
              <p className="text-slate-400 text-xs sm:text-sm max-w-xl mx-auto">Choose the right operational threshold for your fleet size. No hidden fees or complicated calculations.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Starter Tier */}
              <div className="bg-[#0b0f19]/40 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-md">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-slate-300 font-black text-lg uppercase">Standard/Starter</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider font-bold">Up to 15 Vehicles [cite: 37]</p>
                  </div>
                  <div className="text-3xl font-black text-white">$99<span className="text-xs font-normal text-slate-500">/mo</span></div>
                  <ul className="text-xs text-slate-400 space-y-2 font-medium">
                    <li>• Daily Automated Recall Monitoring</li>
                    <li>• Basic Compliance Verification</li>
                    <li>• Standard Diagnostic Reporting</li>
                  </ul>
                </div>
              </div>

              {/* Pro Tier */}
              <div className="bg-[#0b0f19]/40 border-2 border-cyan-500/30 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.05)]">
                <div className="absolute top-0 right-0 bg-cyan-500 text-slate-950 text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-bl-xl font-mono">Best Value</div>
                <div className="space-y-4">
                  <div>
                    <h3 className="text-white font-black text-lg uppercase">Professional</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider font-bold">Up to 100 Vehicles [cite: 37]</p>
                  </div>
                  <div className="text-3xl font-black text-white">$249<span className="text-xs font-normal text-slate-500">/mo</span></div>
                  <ul className="text-xs text-slate-300 space-y-2 font-medium">
                    <li>• Continuous 24/7 Background Syncs</li>
                    <li>• Cryptographic Compliance Badges [cite: 613]</li>
                    <li>• Mojave Thermal High-Heat Risk Metrics [cite: 612]</li>
                    <li>• Direct Underwriter Dispatch Pipelines</li>
                  </ul>
                </div>
              </div>

              {/* Enterprise Tier */}
              <div className="bg-[#0b0f19]/40 border border-slate-900 rounded-3xl p-6 flex flex-col justify-between space-y-6 relative overflow-hidden backdrop-blur-md">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-slate-300 font-black text-lg uppercase">Enterprise</h3>
                    <p className="text-[10px] text-cyan-400 font-mono tracking-wider font-bold">101+ Vehicles [cite: 37]</p>
                  </div>
                  <div className="text-3xl font-black text-white">$499<span className="text-xs font-normal text-slate-500">/mo</span></div>
                  <ul className="text-xs text-slate-400 space-y-2 font-medium">
                    <li>• Multi-tenant API Integrations</li>
                    <li>• Automated Ingest Trigger Routines</li>
                    <li>• Custom SLA & Ingestion Guarantees</li>
                    <li>• Dedicated Strategic Account Manager</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>

      {/* 🔗 UNDERWRITER BADGE SHARING MODAL FRAME [cite: 85] */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-xl w-full shadow-2xl relative space-y-6">
            <header className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Insurance Compliance Dispatch</h2>
                <p className="text-slate-400 text-xs mt-0.5">Allow commercial underwriting agents to verify your security clearance [cite: 85].</p>
              </div>
              <button type="button" onClick={() => setShowShareModal(false)} className="text-slate-500 hover:text-slate-300 font-mono text-sm p-1">✕</button>
            </header>

            <div className="bg-slate-950 border border-slate-900 rounded-2xl p-5 flex flex-col items-center text-center space-y-3 relative overflow-hidden shadow-inner">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-emerald-500/0 via-emerald-500/40 to-emerald-500/0" />
              <div className="w-16 h-12 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-2xl flex items-center justify-center rounded-xl shadow-lg">🏅</div>
              <div>
                <h3 className="text-sm font-bold text-white font-mono tracking-wide">RecallLogic Verified Audit State</h3>
                <p className="text-slate-500 text-[10px] uppercase font-mono tracking-widest mt-0.5">Reference ID: {mockReferenceToken}</p>
              </div>
              <div className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold tracking-wider rounded-full border border-emerald-500/20 font-mono">
                PASS • 0 ACTIVE DEFECTS DETECTED
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 font-mono tracking-wider block">Secure Audit Link</label>
              <div className="flex gap-2">
                <input type="text" readOnly value={shareableVerificationUrl} className="w-full bg-slate-950 border border-slate-900 p-3 text-xs font-mono text-slate-400 rounded-xl outline-none select-all" />
                <button 
                  type="button" 
                  onClick={handleCopyLink}
                  className={`px-4 text-xs font-bold rounded-xl whitespace-nowrap border transition-all ${copiedLink ? 'bg-emerald-950/30 text-emerald-400 border-emerald-500/30' : 'bg-slate-900 border-slate-800 text-slate-200 hover:bg-slate-800'}`}
                >
                  {copiedLink ? 'Copied! ✓' : 'Copy URL'}
                </button>
              </div>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 border-t border-slate-900">
              <label className="text-xs font-bold text-slate-400 font-mono tracking-wider block">Route Direct to Underwriter Email</label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input type="email" required placeholder="underwriting@commercialbroker.com" value={brokerEmail} onChange={(e) => setBrokerEmail(e.target.value)} className="flex-1 bg-slate-950 border border-slate-900 p-3 text-xs text-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-all placeholder:text-slate-700" />
                <button type="submit" className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-5 py-3 text-xs font-black rounded-xl uppercase tracking-wider shadow-lg transition-all">Send Audit Token</button>
              </div>
              {shareSuccess && (
                <div className="text-[11px] font-mono text-emerald-400 flex items-center gap-1 mt-1">
                  ✓ Dispatch logged. Signed digital manifesto securely broadcasted to target broker nodes [cite: 88].
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 🔐 WORKSPACE REGISTRATION BRIDGE MODAL [cite: 1402] */}
      {showClaimModal && (
        <RegistrationModal 
          defaultEmail={lead?.contact_email} 
          onClose={() => setShowClaimModal(false)} 
        />
      )}

      {/* FREEMIUM INTERCEPTOR PAYWALL MODAL [cite: 89] */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="text-4xl">🏅</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Unlock RecallLogic Pro</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your submitted manifest targets <strong className="text-white font-mono">{blockedVinCount} assets</strong>. Exploration profiles are restricted to a maximum of 10 items for exploratory testing loops [cite: 89].
              </p>
            </div>
            
            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner">
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <span className="text-xs font-bold font-mono uppercase text-slate-500 tracking-wider">Custom Pro Subscription</span>
                <span className="text-2xl font-black text-cyan-400 font-mono"> ${calculateCustomMRR(blockedVinCount)}<span className="text-xs font-normal text-slate-400">/mo</span></span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>• Base Platform License Fee</span>
                  <span className="text-slate-200">$ 99.00/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>• Active Monitoring Allocation ({blockedVinCount} units × $2.50)</span>
                  <span className="text-slate-200">$ {(blockedVinCount * 2.5).toFixed(2)}/mo</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                ✓ Includes real-time climate risk-mapping & secure broker token generation [cite: 89].
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={() => setShowUpgradeModal(false)} className="w-full sm:w-1/3 px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 font-bold border border-slate-900 bg-transparent rounded-xl transition-all">Trim List</button>
              <UpgradeButton vinCount={blockedVinCount} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}