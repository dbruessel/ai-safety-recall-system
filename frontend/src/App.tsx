import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// ========================================== //
// TYPES, INTERFACES, & CONFIG                //
// ========================================== //

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

interface CheckedVinResult {
  vin: string;
  clean_vin_display: string;
  has_recalls: boolean;
  recall_count: number;
  resolved_make?: string;
  resolved_model?: string;
  resolved_year?: string;
  recalls_list: Array<Recall>;
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

// 🛡️ Self-healing initialization ensures the build loads even without .env variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

const isSupabaseConfigured = 
  import.meta.env.VITE_SUPABASE_URL && 
  import.meta.env.VITE_SUPABASE_ANON_KEY && 
  import.meta.env.VITE_SUPABASE_URL !== '';

// ========================================== //
// CUSTOM HOOK: useLeadData                   //
// ========================================== //

export function useLeadData() {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchLead() {
      try {
        setLoading(true);
        setError(null);

        // 🛡️ Bypasses database queries gracefully if variables are unconfigured
        if (!isSupabaseConfigured) {
          setLoading(false);
          return;
        }

        const params = new URLSearchParams(window.location.search);
        const emailParam = params.get('email');
        const idParam = params.get('lead_id') || params.get('id');

        if (!emailParam && !idParam) {
          setLoading(false);
          return;
        }

        let query = supabase.from('leads').select('*');

        if (idParam) {
          query = query.eq('id', idParam);
        } else if (emailParam) {
          query = query.eq('contact_email', emailParam.trim());
        }

        const { data, error: apiError } = await query.single();

        if (apiError) {
          if (apiError.code === 'PGRST116') {
            setLoading(false);
            return;
          }
          throw apiError;
        }

        if (data) {
          setLead({
            id: data.id,
            company_name: data.company_name,
            industry: data.industry,
            est_fleet_size: Number(data.est_fleet_size) || 0,
            primary_vehicle_mix: data.primary_vehicle_mix || 'Service Vehicles',
            contact_name: data.contact_name,
            contact_email: data.contact_email,
            contact_phone: data.contact_phone,
            usdot_number: data.usdot_number,
            usdot_oos_rate: data.usdot_oos_rate ? Number(data.usdot_oos_rate) : undefined,
            localized_threat_hook: data.localized_threat_hook,
            lead_status: data.lead_status,
          });
        }
      } catch (err: any) {
        console.error('Error fetching lead data:', err);
        setError(err.message || 'An error occurred loading your fleet profile.');
      } finally {
        setLoading(false);
      }
    }

    fetchLead();
  }, []);

  return { lead, loading, error };
}

// ========================================== //
// MAIN APPLICATION COMPONENT                 //
// ========================================== //

export default function App() {
  // Application Ingestion States
  const [bulkInput, setBulkInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Results Tracking States
  const [sweepExecuted, setSweepExecuted] = useState(false);
  const [scanResults, setScanResults] = useState<Array<CheckedVinResult>>([]);
  const [totalRecallsFound, setTotalRecallsFound] = useState(0);

  // Conversion Input State
  const [closeEmail, setCloseEmail] = useState('');
  const [closeSubmitted, setCloseSubmitted] = useState(false);

  // Overlay, File, & Drag-Drop States
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadNotification, setShowUploadNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Hook Lead Context
  const { lead, loading: leadLoading, error: leadError } = useLeadData();

  // Sandbox Orchestrators
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;
  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableVerificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Direct Lead Upgrade Handler
  const handleLeadUpgradeRedirect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeEmail.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCloseSubmitted(true);
      const tier = totalRecallsFound > 0 ? 'remediation' : 'badge';
      window.open(`https://checkout.recalllogic.com/pay?email=${encodeURIComponent(closeEmail)}&tier=${tier}`, '_blank');
    }, 1000);
  };

  // Sandbox DB Reset Action
  const triggerSandboxEnvironmentReset = async () => {
    setSandboxResetStatus('Resetting Replica State...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/reset');
      setSandboxResetStatus('✓ Success: ' + (response.data.message || 'Replica reset.'));
      setScanResults([]);
      setSweepExecuted(false);
      setTotalRecallsFound(0);
      setCloseSubmitted(false);
      setCloseEmail('');
      setBulkInput('');
      setTimeout(() => setSandboxResetStatus(''), 4000);
    } catch (err: any) {
      setSandboxResetStatus('✕ Error: ' + (err.response?.data?.detail || 'Failed reset connection.'));
    }
  };

  // Sandbox Mock Subscription Webhook Handler
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

  // Advanced Hybrid "VIN-First" Parser Engine
  const processManifestLines = async (rawLines: Array<string>) => {
    // Standardize input rows and discard headers
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
    
    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // Limit free test scans to 10 vehicles
    if (cleanedLines.length > 10) {
      setBlockedVinCount(cleanedLines.length);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError('');
    
    const resultsArray: Array<CheckedVinResult> = [];
    let aggregatedRecallCount = 0;

    try {
      for (const rawLine of cleanedLines) {
        const isVinPattern = /^[A-HJ-NPR-Z0-9]{17}$/i.test(rawLine);
        const uppercaseVin = rawLine.toUpperCase();
        
        // Redact VIN for presentation (e.g. 1FTFW1RG4KXXXXXXX)
        const redactedVin = uppercaseVin.length === 17 
          ? `${uppercaseVin.slice(0, 10)}XXXXXXX` 
          : uppercaseVin;

        if (isVinPattern) {
          // Direct API VIN Lookup (Resolves Make/Model/Year and queries Supabase database recalls)
          const response = await axios.get(`http://127.0.0.1:8000/api/recalls/vin/${uppercaseVin}`);
          const recallsList = Array.isArray(response.data) ? response.data : [];
          
          resultsArray.push({
            vin: uppercaseVin,
            clean_vin_display: redactedVin,
            has_recalls: recallsList.length > 0,
            recall_count: recallsList.length,
            resolved_make: recallsList.at(0)?.make || "Resolved Asset",
            resolved_model: recallsList.at(0)?.model || "",
            resolved_year: recallsList.at(0)?.year || "",
            recalls_list: recallsList
          });
          aggregatedRecallCount += recallsList.length;
        } else {
          // Legacy Comma-delimited (Make, Model, Year) fallback if they didn't input a pure VIN
          const parts = rawLine.split(',').map(p => p.trim());
          if (parts.length >= 3) {
            const make = parts.at(0) || '';
            const model = parts.at(1) || '';
            const year = parts.at(2) || '';

            const response = await axios.get('http://127.0.0.1:8000/api/recalls/search', {
              params: { make, model, year }
            });
            const recallsList = Array.isArray(response.data) ? response.data : [];
            
            resultsArray.push({
              vin: rawLine,
              clean_vin_display: `${make} ${model} (${year})`,
              has_recalls: recallsList.length > 0,
              recall_count: recallsList.length,
              resolved_make: make,
              resolved_model: model,
              resolved_year: year,
              recalls_list: recallsList
            });
            aggregatedRecallCount += recallsList.length;
          }
        }
      }

      setScanResults(resultsArray);
      setTotalRecallsFound(aggregatedRecallCount);
      setSweepExecuted(true);

      if (resultsArray.length === 0) {
        setError('Scan Complete: Unrecognized fleet parameters provided.');
      }
    } catch (err: any) {
      console.error(err);
      setError('Pipeline Interrupted: Make sure your local backend router is active on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setScanResults([]);
    processManifestLines(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    const file = files ? files.item(0) : null;
    if (!file) return;
    setError('');
    setScanResults([]);

    const parts = file.name.split('.');
    const fileExtension = parts.at(parts.length - 1)?.toLowerCase();
    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkInput(text);
        setShowUploadNotification(true);
        setTimeout(() => setShowUploadNotification(false), 4000);
        processManifestLines(text.split(/\r?\n/));
      };
      reader.readAsText(file);
    } else {
      setError('Invalid Schema: Please drop a standard file (.csv or .txt).');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    const file = files ? files.item(0) : null;
    if (!file) return;
    setError('');
    setScanResults([]);

    const parts = file.name.split('.');
    const fileExtension = parts.at(parts.length - 1)?.toLowerCase();
    if (fileExtension === 'csv' || fileExtension === 'txt') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setBulkInput(text);
        setShowUploadNotification(true);
        setTimeout(() => setShowUploadNotification(false), 4000);
        processManifestLines(text.split(/\r?\n/));
      };
      reader.readAsText(file);
    } else {
      setError('Invalid Schema: Please drop a standard file (.csv or .txt).');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Personalized lead evaluations
  const isPersonalizedLead = lead !== null;
  const leadSavings = lead ? lead.est_fleet_size * 150 : 0;
  const leadPrice = lead ? Math.max(49, Math.min(299, lead.est_fleet_size * 5)) : 0;
  const leadStripeLink = lead ? `https://checkout.recalllogic.com/pay?email=${encodeURIComponent(lead.contact_email)}&tier=${lead.est_fleet_size > 25 ? 'enterprise' : 'growth'}` : '';

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col font-sans antialiased selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* 1. Global Navigation Bar */}
      <header className="border-b border-slate-900 bg-[#0b0f19]/40 backdrop-blur-md px-6 py-4 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-base shadow-lg shadow-emerald-500/10 border border-emerald-400/10">🛡️</div>
            <span className="font-black text-slate-100 tracking-tight text-xs md:text-sm uppercase tracking-wider">RecallLogic Shield</span>
          </div>

          <div className="flex items-center gap-4">
            <span 
              onClick={() => setShowShareModal(true)}
              className="text-slate-400 hover:text-emerald-400 font-black text-[10px] md:text-xs uppercase tracking-wider cursor-pointer transition"
            >
              🤝 Verification Badges
            </span>
          </div>
        </div>
      </header>

      {/* 2. Primary Workspace Body */}
      <main className="flex-1 p-6 md:p-12 max-w-4xl w-full mx-auto space-y-12">
        
        {/* Modern Scientific Header */}
        <section className="text-center space-y-4">
          <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight uppercase">
            Predictive Safety <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">Intelligence</span>
          </h1>
          <p className="text-slate-400 text-xs md:text-sm font-medium max-w-2xl mx-auto leading-relaxed">
            Cross-industry risk engine scoring technical asset subassembly failure frequencies against real-time environmental ambient multipliers.
          </p>
        </section>

        {/* Personalized Welcomer (If loaded via direct link parameters) */}
        {leadLoading && (
          <div className="w-full bg-[#0b0f19]/40 border border-slate-900 rounded-3xl p-8 shadow-2xl animate-pulse">
            <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-slate-800 rounded mb-6"></div>
          </div>
        )}

        {isPersonalizedLead && (
          <section className="w-full bg-[#0b0f19] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl my-4">
            <div className="bg-gradient-to-b from-emerald-950/20 to-transparent p-6 md:p-8 border-b border-slate-900">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full mb-3">
                Pre-Approved Pilot Allocation
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Welcome back, {lead.contact_name}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Pre-registered database context resolved for <span className="text-slate-200 font-semibold">{lead.company_name}</span> (Estimated: {lead.est_fleet_size} {lead.primary_vehicle_mix}s).
              </p>
            </div>

            {lead.localized_threat_hook && (
              <div className="px-6 py-4 bg-orange-950/10 border-b border-slate-900 flex gap-4 items-start animate-fadeIn">
                <span className="text-lg mt-0.5">☀️</span>
                <div>
                  <h4 className="text-[10px] font-black uppercase tracking-wider text-orange-400">Mojave Climate Hazard Trigger</h4>
                  <p className="text-slate-300 text-xs mt-1 leading-normal italic">
                    "{lead.localized_threat_hook}"
                  </p>
                </div>
              </div>
            )}

            <div className="p-8 text-center space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/30 p-4 border border-slate-900 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black font-mono">Projected Annual Savings</p>
                  <p className="text-lg font-black text-emerald-400 mt-1">${leadSavings.toLocaleString()}/yr</p>
                </div>
                <div className="bg-slate-950/30 p-4 border border-slate-900 rounded-xl text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-black font-mono">Platform SaaS Pricing</p>
                  <p className="text-lg font-black text-white mt-1">${leadPrice}/mo</p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-900 text-center space-y-4">
                <a
                  href={leadStripeLink}
                  className="inline-block w-full max-w-xs py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-lg shadow-lg hover:opacity-95 transition"
                >
                  Access Mitigation Matrix (${leadPrice}/mo)
                </a>
              </div>
            </div>
          </section>
        )}

        {/* 3. The Unlocked Frictionless Scanner Box */}
        <section className="space-y-6">
          <div className="w-full bg-gradient-to-b from-[#0b0f19] to-[#040812] border border-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            
            <h2 className="text-lg font-black text-white uppercase tracking-tight mb-2 text-center md:text-left">
              Instant Safety Threat Ingestion
            </h2>
            <p className="text-slate-500 text-xs max-w-xl mb-6 text-center md:text-left">
              Input up to 10 vehicle identification keys. Paste a column of 17-digit VINs directly or drop your manifest spreadsheet—no signup required.
            </p>

            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Drag and Drop Zone */}
                <div 
                  onClick={triggerFileSelect}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  className={`p-6 border border-dashed rounded-2xl text-center cursor-pointer flex flex-col items-center justify-center transition-all duration-300 relative group ${
                    isDragging  
                      ? 'border-emerald-500 bg-emerald-950/10'  
                      : 'border-slate-800 bg-slate-950/40 hover:border-slate-700'
                  }`}
                >
                  <span className="text-2xl mb-1">📥</span>
                  <span className="text-slate-200 font-bold text-xs block">Spreadsheet Ingestion</span>
                  <span className="text-slate-500 text-[10px] mt-1 block">Drop .csv or .txt matrices</span>
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
                  
                  {showUploadNotification && (
                    <div className="mt-3 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded animate-bounce">
                      File loaded! Click scan below.
                    </div>
                  )}
                </div>

                {/* Direct Console Paste Box */}
                <div className="md:col-span-2 relative">
                  <textarea
                    rows={4}
                    placeholder="Paste 17-digit VIN keys (one per line)...&#10;Example:&#10;4T1BF1FK2LU123456&#10;1FTFW1RG4K9876543"
                    value={bulkInput}
                    onChange={(e) => setBulkInput(e.target.value)}
                    className="w-full h-full min-h-[120px] p-4 text-xs rounded-2xl border border-slate-900 bg-slate-950/90 text-emerald-400 font-mono outline-none focus:border-emerald-500/60 transition-all placeholder:text-slate-800 resize-none"
                  />
                  <div className="absolute bottom-3 right-3 text-[8px] font-mono text-slate-700 bg-slate-950 px-2 py-0.5 rounded border border-slate-900/60">Console_Input_Override</div>
                </div>

              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                <div className="text-slate-600 text-[10px] max-w-md leading-normal">
                  ⚠️ Sandbox Restraint: Non-subscribed trials are capped at 10 vehicle keys per cycle.
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-white text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg disabled:opacity-40"
                >
                  {loading ? 'Executing Real-Time Sweep...' : 'Run Safety Scanner'}
                </button>
              </div>
            </form>
          </div>

          {/* Ingestion Errors Banner */}
          {error && (
            <div className="text-emerald-400 p-4 bg-emerald-950/10 border border-emerald-900/30 rounded-xl font-mono text-xs flex items-center gap-2">
              <span>📡</span> {error}
            </div>
          )}

          {/* DYNAMIC CONVERSION OUTCOME SECTION (Triggers only after sweep runs) */}
          {sweepExecuted && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* OUTCOME A: THE GOOD FLEET (0 recalls detected across all checked assets) */}
              {totalRecallsFound === 0 ? (
                <div className="w-full bg-emerald-950/20 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative overflow-hidden text-center">
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />
                  
                  <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-3xl">🛡️</span>
                  </div>

                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400 font-mono">Compliance Audit Complete</span>
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight mt-1">
                    Your Fleet is 100% Secure
                  </h3>
                  <p className="text-slate-400 text-xs max-w-xl mx-auto leading-relaxed mt-2">
                    Zero open manufacturer recalls or technical compliance risks were identified on the scanned assets. Lock in your reputation outbound!
                  </p>

                  <div className="mt-6 p-4 bg-[#0b0f19]/80 border border-slate-900 max-w-md mx-auto rounded-2xl flex items-center gap-4 text-left">
                    <span className="text-2xl shrink-0">🎖️</span>
                    <div>
                      <h4 className="text-xs font-bold text-white">Live Compliance Badge Preview</h4>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-normal">Generates a secure, shareable safety marker with direct verification URLs for insurance carriers.</p>
                    </div>
                  </div>

                  {/* Move to Close Form */}
                  <div className="pt-6 border-t border-slate-900/60 mt-8 max-w-sm mx-auto space-y-4">
                    {!closeSubmitted ? (
                      <form onSubmit={handleLeadUpgradeRedirect} className="space-y-2">
                        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider text-left">Your Business Email</label>
                        <input 
                          type="email"
                          required
                          placeholder="e.g. logistics@fleetops.com"
                          value={closeEmail}
                          onChange={(e) => setCloseEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition font-medium"
                        />
                        <button
                          type="submit"
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg"
                        >
                          Generate & Claim Compliance Badge
                        </button>
                      </form>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl">
                        <span className="text-xs text-emerald-400 font-black uppercase tracking-wider block">✓ Badge Registered</span>
                        <p className="text-[10px] text-slate-500 mt-1">Connecting payment window...</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                
                /* OUTCOME B: THE BAD FLEET (Open recalls detected on their fleet) */
                <div className="w-full bg-red-950/10 border border-red-500/20 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />
                  
                  <div className="text-center md:text-left flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-900/60">
                    <div className="space-y-2">
                      <span className="text-red-500 font-mono text-xs font-bold uppercase tracking-wider">⚠️ Threats Active</span>
                      <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                        Critical Safety Threats Flagged ({totalRecallsFound})
                      </h3>
                      <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                        We resolved matching federal safety recall campaigns across your scanned vehicles. These vehicles are operating under active manufacturing risks.
                      </p>
                    </div>

                    <div className="shrink-0 bg-red-500/10 border border-red-500/20 px-5 py-3 rounded-xl font-mono text-center">
                      <p className="text-[9px] text-slate-500 uppercase font-black">Threat Index</p>
                      <p className="text-xl font-black text-red-400 mt-1">CRITICAL</p>
                    </div>
                  </div>

                  {/* List Affected VINs (Redacted for Security - Proof of Threat) */}
                  <div className="py-6 space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-wider text-slate-500 font-mono">Affected Fleet Registry Scan</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {scanResults.map((result, idx) => (
                        <div 
                          key={idx} 
                          className={`p-4 rounded-xl border flex items-center justify-between bg-slate-950/20 ${
                            result.has_recalls ? 'border-red-500/10' : 'border-slate-900'
                          }`}
                        >
                          <div className="truncate">
                            <span className="text-xs font-mono font-bold text-slate-400">{result.clean_vin_display}</span>
                            {result.has_recalls && (
                              <p className="text-[10px] text-slate-500 mt-0.5">{result.resolved_make} {result.resolved_model} ({result.resolved_year})</p>
                            )}
                          </div>
                          <div>
                            {result.has_recalls ? (
                              <span className="text-[9px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 rounded-full">
                                {result.recall_count} Recalls
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-600 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-full">
                                Clean
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lock technical campaign details behind the checkout close */}
                  <div className="bg-slate-950/80 rounded-2xl border border-slate-900 p-6 text-center space-y-6 relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/90 to-slate-950 flex flex-col justify-center items-center p-4">
                      <span className="text-2xl mb-1">🔒</span>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider">Details Suspended (Upgrade to Unlock)</h4>
                      <p className="text-[10px] text-slate-500 max-w-sm mt-1 leading-relaxed">
                        remittance parameters, consequence statements, severity metrics, and exportable remediation PDF logs are locked.
                      </p>
                    </div>
                    {/* Placeholder content blurred by the absolute overlay */}
                    <div className="opacity-10 filter blur-sm space-y-2 text-left text-[10px]">
                      <p><strong>RECALL:</strong> Steering Gear Box failure frequency multipliers.</p>
                      <p><strong>REMEDY:</strong> Dealers will inspect and replace the technical assembly free of charge.</p>
                    </div>
                  </div>

                  {/* Conversion Direct Paywall Close Form */}
                  <div className="pt-6 border-t border-slate-900/60 mt-8 max-w-sm mx-auto space-y-4">
                    {!closeSubmitted ? (
                      <form onSubmit={handleLeadUpgradeRedirect} className="space-y-2">
                        <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider text-left">Your Business Email</label>
                        <input 
                          type="email"
                          required
                          placeholder="e.g. logistics@fleetops.com"
                          value={closeEmail}
                          onChange={(e) => setCloseEmail(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-red-500 transition font-medium"
                        />
                        <button
                          type="submit"
                          className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg"
                        >
                          Unlock All Threat Details & PDF Reports
                        </button>
                      </form>
                    ) : (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl text-center">
                        <span className="text-xs text-emerald-400 font-black uppercase tracking-wider block">✓ Access Authorized</span>
                        <p className="text-[10px] text-slate-500 mt-1">Stripe Checkout session loading...</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* 4. Local Developer Sandbox Controls */}
        {isSandboxMode && (
          <footer className="mt-12 bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center">
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-3 font-mono">🛠️ Developer Sandbox Controls</h3>
            <div className="flex flex-wrap gap-4 justify-center">
              <button 
                onClick={triggerSandboxEnvironmentReset}
                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-xs rounded-lg transition"
              >
                {sandboxResetStatus || "Trigger DB Replica Reset"}
              </button>
              <button 
                onClick={simulateSandboxSubscriptionUpgrade}
                className="px-4 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 font-mono text-xs rounded-lg transition"
              >
                {sandboxWebhookLogs || "Mock Stripe Webhook Event"}
              </button>
            </div>
          </footer>
        )}

      </main>

      {/* ========================================== //
          MODALS & SYSTEM OVERLAYS
          ========================================== */}

      {/* A. Dynamic Paywall Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-900 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden shadow-2xl">
            <span className="text-4xl block mb-3">🛡️</span>
            <h3 className="text-xl font-black text-white uppercase tracking-tight">Access Gate Enforced</h3>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">
              Your uploaded registry includes <strong className="text-emerald-400 font-mono">{blockedVinCount} active assets</strong>. Unverified trial runs are limited to a maximum constraint of 10 vehicle keys per cycle.
            </p>

            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 my-6 shadow-inner">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <span className="font-bold text-slate-500 text-[9px] uppercase tracking-wider font-mono">Active Monitoring Quote:</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  ${calculateCustomMRR(blockedVinCount).toFixed(2)}<span className="text-[10px] font-normal text-slate-600">/mo</span>
                </span>
              </div>
              <div className="space-y-2 text-[10px] font-bold text-slate-500 font-mono">
                <div className="flex justify-between items-center">
                  <span>• Base Licensing Infrastructure</span>
                  <span className="text-slate-300">$99.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>• Active Asset Allocations</span>
                  <span className="text-slate-300">${(blockedVinCount * 2.50).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-transparent text-slate-400 hover:text-white font-black text-xs transition uppercase"
              >
                Back
              </button>
              <button 
                type="button" 
                onClick={() => alert("Forwarding token context to checkout session hooks...")}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs transition shadow-lg hover:bg-emerald-600 uppercase"
              >
                Upgrade Plan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Share Compliance Badge Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-900 rounded-3xl p-8 max-w-md w-full relative shadow-2xl">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition font-mono text-sm"
            >
              ✕
            </button>
            <span className="text-4xl block text-center mb-3">🤝</span>
            <h3 className="text-xl font-black text-white text-center uppercase tracking-tight">Verified Compliance Badges</h3>
            <p className="text-slate-400 text-xs text-center mt-2 leading-relaxed">
              Earn an active cryptographic safety status badge. Share your verification timeline directly with brokers to secure contracts.
            </p>

            <div className="my-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between gap-3 font-mono text-[10px] text-emerald-400">
                <span className="truncate">{shareableVerificationUrl}</span>
                <button 
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-sans font-bold transition text-[9px] shrink-0"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
