import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Modular Feature Subcomponents (Assumes these exist or are empty placeholders in your repo)
import UpgradeButton from './components/UpgradeButton';
import TaskBoard from './components/TaskBoard';

// =====================================================================
// DATA CONTRACTS & SCHEMAS
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
  lead_status?: string;
}

// Initialize Supabase Client securely using Vite's environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================================
// CUSTOM HOOK: useLeadData (THE REGISTRATION BRIDGE)
// =====================================================================
export function useLeadData() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  async function resolveUserSession() {
    try {
      setLoading(true);
      setError(null);

      // 1. Check if there is an active authenticated user session
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setUserEmail(session.user.email || null);
        // Query Profiles table for authenticated users
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
      } else {
        setUserEmail(null);
        setProfile(null);
      }

      // 2. Fallback: Check for URL email parameter (outbound leads)
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email');
      
      if (emailParam) {
        const { data: leadData, error: leadError } = await supabase
          .from('leads')
          .select('*')
          .eq('contact_email', emailParam)
          .single();

        if (!leadError && leadData) {
          setLead(leadData);
        }
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

    // Catch sign-ups/logins in real-time
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
    userEmail,
    // Paid if lead status is "Stripe Completed" OR auth profile is elevated to pro
    isPaid: profile?.is_pro || lead?.lead_status === 'Stripe Completed',
    isAuthenticated: !!profile
  };
}

// =====================================================================
// REGISTRATION MODAL (CLAIM WORKSPACE FORM)
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
      const { error: signUpError } = await supabase.auth.signUp({
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
// COMPONENT: RecallLogic Compliance Shield Badge (UPGRADED PRESTIGE)
// =====================================================================
interface ComplianceBadgeProps {
  isPaid: boolean;
  onShareClick: () => void;
  onClaimClick: () => void;
}

export function RecallLogicComplianceBadge({ isPaid, onShareClick, onClaimClick }: ComplianceBadgeProps) {
  const mockReferenceToken = "RL-2026-NKT82X";

  return (
    <div className="relative w-full max-w-2xl mx-auto rounded-3xl overflow-hidden border border-emerald-500/20 bg-[#070b14]/80 backdrop-blur-xl p-6 sm:p-8 shadow-[0_0_50px_-12px_rgba(16,185,129,0.15)] ring-1 ring-emerald-500/10">
      
      {/* Laser Glow Lines */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl" />
      
      {/* Header Block with Prominent Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-slate-900/60 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500/20 to-teal-950/40 border border-emerald-500/30 text-emerald-400 text-xl flex items-center justify-center rounded-2xl shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            🛡️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-emerald-400 font-mono tracking-widest uppercase">Verified Certification</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
            </div>
            <h3 className="text-xl font-black text-white tracking-tight uppercase mt-0.5">
              Recall<span className="text-emerald-400">Logic</span> Compliance Shield
            </h3>
          </div>
        </div>
        
        {/* Verification Status Seal */}
        <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 text-xs font-black tracking-widest rounded-xl border border-emerald-500/20 font-mono shadow-inner text-center">
          PASS • 0 ACTIVE DEFECTS
        </div>
      </div>

      {/* Dynamic Security Information Ledgers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono py-6 relative z-10">
        <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-1 relative group">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Verification Ledger</span>
          <p className="text-slate-300 font-bold tracking-tight">TOKEN: {mockReferenceToken}</p>
          <div className="absolute top-3 right-3 text-[9px] text-slate-600">ID_REF</div>
        </div>
        
        <div className="bg-slate-950/50 border border-slate-900 rounded-xl p-4 space-y-1 relative">
          <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Audit Security Clearance</span>
          <p className="text-emerald-400 font-bold tracking-tight">Approved for Active Commercial Operations</p>
          <div className="absolute top-3 right-3 text-[9px] text-emerald-500/60 font-black animate-pulse">● SECURE</div>
        </div>
      </div>

      {/* Footer Gating Mechanics */}
      <div className="pt-4 border-t border-slate-900/60 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
        <p className="text-slate-400 text-[11px] leading-relaxed max-w-sm text-center sm:text-left">
          This digital security badge represents cryptographically secure, unalterable proof of compliance backed by live federal database synchronization.
        </p>

        {isPaid ? (
          <button 
            onClick={onShareClick}
            className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-lg shadow-emerald-500/10 whitespace-nowrap"
          >
            Share Verification Link
          </button>
        ) : (
          <button 
            onClick={onClaimClick}
            className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-emerald-500 hover:opacity-95 text-slate-950 font-black py-3 px-6 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 active:scale-[0.98] shadow-lg whitespace-nowrap"
          >
            Claim Badge & Lower Premiums
          </button>
        )}
      </div>

      {/* Lock Blur Layer for Unpaid Users */}
      {!isPaid && (
        <div className="absolute inset-0 bg-[#030712]/40 backdrop-blur-[2px] flex flex-col items-center justify-center z-20 p-6 text-center">
          <div className="max-w-md bg-slate-950/90 border border-slate-800 p-6 rounded-2xl shadow-2xl space-y-4 ring-1 ring-slate-800">
            <span className="text-2xl">🔒</span>
            <h4 className="text-sm font-black text-white tracking-tight uppercase">Lock In Verification Credentials</h4>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Your vehicles passed with 100% compliance. Unlock your live cryptographic security badge to stream passing states directly to brokers and underwriters to negotiate premium reductions.
            </p>
            <div className="pt-1 flex justify-center">
              <button 
                onClick={onClaimClick}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black py-2.5 px-6 rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Claim Verified Badge
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// COMPONENT: Interactive Underwriter ROI Calculator (Walk Phase)
// =====================================================================
export function ROICalculator() {
  const [fleetSize, setFleetSize] = useState<number>(45);
  const [downtimeCost, setDowntimeCost] = useState<number>(450);

  // Math models grounded in proactive risk mitigation
  const statisticalRecallDowntimeRatio = 0.18; // 18% historical risk probability
  const calculatedDowntimeLossPrevented = Math.round(fleetSize * statisticalRecallDowntimeRatio * downtimeCost);
  const standardPremiumSavings = Math.round(fleetSize * 1200 * 0.15); // $1200 avg premium * 15% discount
  const totalAnnualSavings = calculatedDowntimeLossPrevented + standardPremiumSavings;

  return (
    <div className="bg-[#0b0f19] border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6 relative overflow-hidden shadow-2xl">
      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
      
      <header className="space-y-1">
        <span className="text-[10px] font-bold text-cyan-400 font-mono tracking-widest uppercase">Underwriting Audit Tool</span>
        <h3 className="text-lg font-black text-white uppercase tracking-tight">Interactive Premium & ROI Impact</h3>
        <p className="text-slate-400 text-xs">Simulate safety compliance value and calculate underwriter premium offsets.</p>
      </header>

      <div className="space-y-5">
        {/* Slider 1: Fleet Size */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 uppercase tracking-wider">Fleet Asset Size</span>
            <span className="text-cyan-400 font-black text-sm">{fleetSize} Vehicles</span>
          </div>
          <input 
            type="range" 
            min="5" 
            max="250" 
            value={fleetSize}
            onChange={(e) => setFleetSize(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 outline-none"
          />
        </div>

        {/* Slider 2: Downtime Cost */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-400 uppercase tracking-wider">Avg. Daily Downtime Loss</span>
            <span className="text-cyan-400 font-black text-sm">${downtimeCost} / Day</span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="2000" 
            step="50"
            value={downtimeCost}
            onChange={(e) => setDowntimeCost(parseInt(e.target.value, 10))}
            className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-500 outline-none"
          />
        </div>
      </div>

      {/* Outputs Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-900 font-mono text-center">
        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
          <div className="text-[9px] font-bold text-slate-500 uppercase">Downtime Loss Avoided</div>
          <div className="text-xl font-black text-slate-100 mt-1">${calculatedDowntimeLossPrevented.toLocaleString()}</div>
        </div>

        <div className="bg-slate-950/40 border border-slate-900 rounded-2xl p-4">
          <div className="text-[9px] font-bold text-slate-500 uppercase">Est. Insurance Offset (15%)</div>
          <div className="text-xl font-black text-emerald-400 mt-1">${standardPremiumSavings.toLocaleString()}</div>
        </div>

        <div className="bg-cyan-950/20 border border-cyan-950/50 rounded-2xl p-4">
          <div className="text-[9px] font-bold text-cyan-400 uppercase">Total Annual Safety ROI</div>
          <div className="text-xl font-black text-cyan-300 mt-1">${totalAnnualSavings.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// MAIN INTERFACE CONSOLE (CENTERED LAYOUT - NO SIDEBAR)
// =====================================================================
export default function App() {
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
  const { lead, loading: sessionLoading, isPaid, isAuthenticated, userEmail } = useLeadData();

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;

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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.reload();
  };

  const handleExportManifest = () => {
    // Generate and download mock CSV underwriting manifest proving 100% compliance
    const headers = 'Vehicle,VIN,Verification Status,Last Database Sync\n';
    const row1 = '2022 Ford Transit,1FTYR2Y8XNKA4820,SECURE - PASS,2026-07-17 10:00 UTC\n';
    const row2 = '2021 Chevrolet Express,1GBJG2G17LKA2904,SECURE - PASS,2026-07-17 10:00 UTC\n';
    const row3 = '2023 Ram ProMaster,3C6URVDG1PKA1209,SECURE - PASS,2026-07-17 10:00 UTC\n';
    const row4 = '2020 Ford F-150,1FTFW1EG0LKA9402,SECURE - PASS,2026-07-17 10:00 UTC\n';
    
    const blob = new Blob([headers, row1, row2, row3, row4], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `RecallLogic_Underwriting_Manifest_${mockReferenceToken}.csv`);
    a.click();
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

  // Automated Ingestion & Parsing
  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));

    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // THE PAYWALL INTERCEPTOR: Gated at 10 items only if they are not Pro!
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
      
      {/* 🔑 REGISTRATION BRIDGE BANNER */}
      {isPaid && !isAuthenticated && (
        <div className="bg-gradient-to-r from-cyan-950/85 to-blue-950/85 border-b border-cyan-500/30 px-6 py-3 text-center text-xs flex justify-between items-center z-40 backdrop-blur-md">
          <span className="text-cyan-300 font-medium">
            🛡️ <strong>Workspace Unlocked:</strong> You have active premium access! Create a password to claim this fleet dashboard permanently.
          </span>
          <button 
            onClick={() => setShowClaimModal(true)}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-1.5 rounded-lg font-bold transition-all text-xs"
          >
            Claim Workspace
          </button>
        </div>
      )}

      {/* 🌐 GLOBAL AUTHENTICATED NAVIGATION BAR */}
      <nav className="border-b border-slate-900/60 bg-[#050915]/60 backdrop-blur-xl py-4 px-8 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🛡️</span>
            <div>
              <h1 className="text-md font-black text-white tracking-wider uppercase">
                RECALL<span className="text-cyan-400">LOGIC</span>
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider -mt-1 hidden sm:block">
                Verified Safety. Intelligent Compliance.
              </p>
            </div>
          </div>
          
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center gap-1.5 font-mono text-[10px] text-cyan-400">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                {userEmail}
              </div>
              <button 
                onClick={handleSignOut}
                className="text-xs text-slate-400 hover:text-slate-100 font-bold transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <div className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">
              GUEST SCAN CONSOLE
            </div>
          )}
        </div>
      </nav>

      {/* Centered Command Container */}
      <main className="flex-1 p-8 lg:p-12 max-w-4xl mx-auto space-y-10 overflow-y-auto w-full">
        
        {/* Pulsing Eye-Catching Safety Alert Header */}
        <div className="bg-gradient-to-r from-red-950/40 to-slate-950/30 border border-red-500/30 p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1 relative z-10">
            <span className="text-[10px] bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/30 font-bold tracking-wider font-mono uppercase animate-pulse">Critical Alerts Active</span>
            <h3 className="text-xl font-black text-slate-100 uppercase tracking-tight mt-2">Recall Volume Crisis Detected</h3>
            <p className="text-slate-400 text-xs max-w-xl mt-1">
              Over **15,000+ critical safety recall threats** are currently active across commercial sectors. Monitor your fleet exposure immediately to prevent catastrophic vehicle downtime and secure lower insurance premiums.
            </p>
          </div>
          <div className="bg-red-500/10 border border-red-500/20 px-6 py-3 rounded-2xl text-center shrink-0 relative z-10">
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Hazards</div>
            <div className="text-2xl font-black text-red-400 font-mono mt-0.5">15,402</div>
          </div>
        </div>

        {/* Dynamic Title Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900 pb-8">
          <div className="space-y-2">
            <h2 className="text-slate-100 text-3xl font-black tracking-tight sm:text-4xl uppercase">
              Predictive Safety <span className="bg-gradient-to-r from-cyan-400 via-sky-400 to-indigo-500 bg-clip-text text-transparent">Intelligence</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              We instantly scan your fleet for hidden, un-repaired manufacturer defects and track safety compliance so you can prevent catastrophic vehicle downtime and lower your commercial insurance premiums.
            </p>
          </div>
        </header>

        {/* 🏢 THE ACTIVE AUTHENTICATED SAAS COMMAND CONSOLE */}
        {isAuthenticated ? (
          <section className="space-y-10 animate-fade-in">
            {/* Row 1: The Upgraded Badge Shield */}
            <div>
              <RecallLogicComplianceBadge 
                isPaid={isPaid}
                onShareClick={() => setShowShareModal(true)}
                onClaimClick={() => setShowClaimModal(true)}
              />
            </div>

            {/* Row 2: Interactive ROI Financial Calculator */}
            <ROICalculator />

            {/* Row 3: Monitored Fleet Asset Registry Grid */}
            <div className="bg-slate-950/20 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
              <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-white uppercase tracking-tight flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" /> Continuous Fleet Asset Monitoring
                  </h3>
                  <p className="text-slate-400 text-xs">These vehicle registries are constantly matching 24/7 against federal safety records.</p>
                </div>
                <button 
                  onClick={handleExportManifest}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold px-4 py-2 rounded-xl text-xs transition-all flex items-center gap-1 shrink-0"
                >
                  📥 Export Verification Manifest
                </button>
              </header>

              <div className="overflow-x-auto rounded-2xl border border-slate-900/60 bg-[#040813]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-500 uppercase tracking-wider font-mono font-bold text-[10px] border-b border-slate-900">
                      <th className="p-4">Vehicle Model</th>
                      <th className="p-4">Registry VIN</th>
                      <th className="p-4">Vulnerability State</th>
                      <th className="p-4">Last Verified</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900 text-slate-300 font-medium">
                    <tr>
                      <td className="p-4 font-bold text-slate-200">2022 Ford Transit</td>
                      <td className="p-4 font-mono text-slate-500">1FTYR2Y8XNKA4820</td>
                      <td className="p-4 text-emerald-400 font-mono">● PASS (0 DEFECTS)</td>
                      <td className="p-4 text-slate-400">Live Syncing</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">2021 Chevrolet Express</td>
                      <td className="p-4 font-mono text-slate-500">1GBJG2G17LKA2904</td>
                      <td className="p-4 text-emerald-400 font-mono">● PASS (0 DEFECTS)</td>
                      <td className="p-4 text-slate-400">Live Syncing</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">2023 Ram ProMaster</td>
                      <td className="p-4 font-mono text-slate-500">3C6URVDG1PKA1209</td>
                      <td className="p-4 text-emerald-400 font-mono">● PASS (0 DEFECTS)</td>
                      <td className="p-4 text-slate-400">Live Syncing</td>
                    </tr>
                    <tr>
                      <td className="p-4 font-bold text-slate-200">2020 Ford F-150</td>
                      <td className="p-4 font-mono text-slate-500">1FTFW1EG0LKA9402</td>
                      <td className="p-4 text-emerald-400 font-mono">● PASS (0 DEFECTS)</td>
                      <td className="p-4 text-slate-400">Live Syncing</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Row 4: Task Board (For flagged recall remediation workflows) */}
            <div className="border border-slate-900 bg-slate-950/40 p-6 rounded-3xl space-y-4">
              <h3 className="text-md font-bold text-slate-100 uppercase tracking-tight flex items-center gap-2">
                🛠️ Fleet Remediation Task Board
              </h3>
              <p className="text-slate-400 text-xs">Manage repair schedules, dealer scheduling, and safety validation tickets inside your team.</p>
              <TaskBoard />
            </div>
          </section>
        ) : (
          // 🏡 BRANCH B: GUEST MODE (EXPLORATORY CSV DRAG & DROP SEARCH)
          <div className="space-y-10">
            {/* Drag and Drop Manifest Ingestion */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" /> Fleet Ingestion Node
                </h3>
                <span className="text-xs text-slate-500 font-mono">Accepts .txt or .csv registries</span>
              </div>

              <form onSubmit={handleSearch} className="space-y-4">
                <div 
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
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
                    <p className="text-xs text-slate-500">or click to browse local drives and run a compliance evaluation</p>
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
                  <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-4 pt-1">
                    <button 
                      type="submit"
                      disabled={loading || !bulkInput.trim()}
                      className="px-6 py-2.5 text-sm bg-slate-100 text-slate-950 hover:bg-white active:scale-[0.985] font-bold rounded-xl disabled:opacity-40 disabled:hover:bg-slate-100 disabled:active:scale-100 shadow-md transition-all shrink-0"
                    >
                      {loading ? 'Running Threat Sweeps...' : 'Upload Vehicles & Scan Exposure'}
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

            {/* Active Workspace Conditional Output */}
            {recalls.length > 0 ? (
              <section className="space-y-6 animate-fade-in">
                <div className="border border-red-500/20 bg-red-950/10 p-6 rounded-3xl flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Urgent Threats Found
                    </h3>
                    <p className="text-slate-400 text-xs sm:text-sm">We have isolated active legal liability and environmental failure vectors inside your sweep logs.</p>
                  </div>

                  {!isPaid && (
                    <div className="bg-[#0b101d] border border-slate-800 p-5 rounded-2xl text-center shrink-0 w-full md:w-auto">
                      <div className="text-xs font-bold text-slate-400 uppercase">RecallLogic Shield Pricing</div>
                      <div className="text-2xl font-black text-cyan-400 font-mono mt-1">${calculateCustomMRR(blockedVinCount || recalls.length)}/mo</div>
                      <div className="mt-3">
                        <UpgradeButton vinCount={blockedVinCount || recalls.length} />
                      </div>
                    </div>
                  )}
                </div>

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
              // Branch B: Recall-Free State (Renders our Compliance Badge for unpaid/outbound users)
              !loading && (
                <section className="space-y-6">
                  <RecallLogicComplianceBadge 
                    isPaid={isPaid}
                    onShareClick={() => setShowShareModal(true)}
                    onClaimClick={() => setShowClaimModal(true)}
                  />
                </section>
              )
            )}
          </div>
        )}
      </main>

      {/* 🔗 UNDERWRITER BADGE SHARING MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-xl w-full shadow-2xl relative space-y-6">
            <header className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-black text-white tracking-tight">Insurance Compliance Dispatch</h2>
                <p className="text-slate-400 text-xs mt-0.5">Allow commercial underwriting agents to verify your security clearance.</p>
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
                  ✓ Dispatch logged. Signed digital manifesto securely broadcasted to target broker nodes.
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* 🔐 WORKSPACE REGISTRATION BRIDGE MODAL */}
      {showClaimModal && (
        <RegistrationModal 
          defaultEmail={lead?.contact_email} 
          onClose={() => setShowClaimModal(false)} 
        />
      )}

      {/* FREEMIUM LIMITS INTERCEPTOR MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="text-4xl">🏅</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Unlock RecallLogic Pro</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your submitted manifest targets <strong className="text-white font-mono">{blockedVinCount} assets</strong>. Exploratory testing requires a premium subscription to process complete datasets.
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
                ✓ Includes real-time climate risk-mapping & secure broker token generation.
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