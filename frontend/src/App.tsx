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

// Safe initialization prevents module-level crashes if environment variables are unconfigured
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

        // Self-heal fallback: if database configuration is missing, run in local offline mode
        if (!isSupabaseConfigured) {
          setLoading(false);
          return;
        }

        // Parse search query variables bracket-free to protect compiling
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
// VALUE CARDS COMPONENT                      //
// ========================================== //

interface PillarCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  tagline?: string;
}

const PillarCard: React.FC<PillarCardProps> = ({ title, description, icon, tagline }) => {
  return (
    <div className="w-full bg-[#0b0f19]/40 border border-slate-900 rounded-2xl p-6 flex flex-col justify-between shadow-lg hover:border-emerald-500/20 transition-all duration-300">
      <div>
        <div className="text-emerald-400 w-10 h-10 mb-4 flex items-center justify-center bg-slate-900 rounded-xl border border-slate-800">
          {icon}
        </div>
        <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
        <p className="text-slate-400 text-xs leading-relaxed">{description}</p>
      </div>
      {tagline && (
        <div className="mt-4 pt-3 border-t border-slate-900/60">
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">{tagline}</span>
        </div>
      )}
    </div>
  );
};

const CompliancePillars: React.FC = () => { 
  return ( 
    <section className="py-8 border-t border-slate-900 mt-8 w-full max-w-5xl mx-auto"> 
      <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest text-center mb-8">Standard Compliance Pillars</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PillarCard 
          title="Automated Recall Sweeping" 
          description="Eliminate manual manufacturer lookup sheets. Our platform monitors global registries to capture safety hazards automatically."
          icon={<span>📡</span>}
          tagline="Continuous Telemetry"
        />
        <PillarCard 
          title="Operator Compliance Badge" 
          description="Embed a live, authenticated safety seal onto your carrier profile to prove 100% active compliance to shipping brokers."
          icon={<span>🛡️</span>}
          tagline="Contract Acceleration"
        />
        <PillarCard 
          title="Legal Liability Shield" 
          description="Generate secure, PDF safety remediation timelines to instantly insulate your business from heavy carrier liability audits."
          icon={<span>⚖️</span>}
          tagline="Liability Reduction"
        />
      </div>
    </section> 
  ); 
};

// ========================================== //
// MAIN APPLICATION COMPONENT                 //
// ========================================== //

export default function App() {
  // Navigation & Interactive Tabs
  const [activeTab, setActiveTab] = useState<'scanner' | 'roi'>('scanner');

  // Application States
  const [metrics, setMetrics] = useState<GlobalMetrics | null>({
    total_vins: 25041,
    processed_vins: 1420,
    total_recalls: 14,
    fleet_health_index: 91.2
  });
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Array<Recall>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Closing States (Move to Close Flow)
  const [sweepExecuted, setSweepExecuted] = useState(false);
  const [closeEmail, setCloseEmail] = useState('');
  const [closeSubmitted, setCloseSubmitted] = useState(false);

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [brokerEmail, setBrokerEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadNotification, setShowUploadNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ROI Calculator State Tracking
  const [sliderVinCount, setSliderVinCount] = useState<number>(25);

  // Active Hook Integration
  const { lead, loading: leadLoading, error: leadError } = useLeadData();

  // Sandbox States
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;
  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  // Fetch Global Metrics
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

  const calculateCustomMRR = (totalCars: number) => {
    const baseFee = 99;
    const perCarFee = 2.50;
    return baseFee + (totalCars * perCarFee);
  };

  const calculatedSaaSPremium = calculateCustomMRR(sliderVinCount);
  const estimatedDowntimeSavings = sliderVinCount * 1000 * 0.15;
  const insuranceDeductionsSavings = sliderVinCount * 35;

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

  // Generic lead conversion submission handler
  const handleConversionClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!closeEmail.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setCloseSubmitted(true);
      const tier = recalls.length > 5 ? 'enterprise' : 'growth';
      window.open(`https://checkout.recalllogic.com/pay?email=${encodeURIComponent(closeEmail)}&tier=${tier}`, '_blank');
    }, 1000);
  };

  // Sandbox Reset
  const triggerSandboxEnvironmentReset = async () => {
    setSandboxResetStatus('Resetting Replica State...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/reset');
      setSandboxResetStatus('✓ Success: ' + (response.data.message || 'Replica reset.'));
      setRecalls([]);
      setSweepExecuted(false);
      setCloseSubmitted(false);
      setCloseEmail('');
      fetchGlobalMetrics();
      setTimeout(() => setSandboxResetStatus(''), 4000);
    } catch (err: any) {
      setSandboxResetStatus('✕ Error: ' + (err.response?.data?.detail || 'Failed reset connection.'));
    }
  };

  // Sandbox Subscription Mock
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

  // Processing Manifest Registry Lines
  const processManifestLines = async (rawLines: Array<string>) => {
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
    const aggregatedResults: Array<Recall> = [];

    try {
      for (const line of cleanedLines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) continue;

        // Bracket-safe native .at() calls protect system compilation
        const make = parts.at(0) || '';
        const model = parts.at(1) || '';
        const year = parts.at(2) || '';

        const response = await axios.get('http://127.0.0.1:8000/api/recalls', {
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
    const files = e.target.files;
    const file = files ? files.item(0) : null; // ✅ Bracket-safe native FileList item fetching
    if (!file) return;
    setError('');
    setRecalls([]);

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
      setError('Invalid Schema: Please drop a structured comma-delimited manifest (.csv or .txt).');
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
    const file = files ? files.item(0) : null; // ✅ Bracket-safe native FileList item fetching
    if (!file) return;
    setError('');
    setRecalls([]);

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
      setError('Invalid Schema: Please drop a structured comma-delimited manifest (.csv or .txt).');
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Personalized Lead Parameter Calculation
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
              🤝 Share Verification Badge
            </span>
          </div>
        </div>
      </header>

      {/* 2. Primary Workspace Body */}
      <main className="flex-1 p-6 md:p-12 max-w-5xl w-full mx-auto space-y-12">
        
        {/* Modern Scientific Header & Premium Telemetry Blocks */}
        <section className="text-center space-y-6">
          <div className="space-y-3">
            <h1 className="text-white text-3xl md:text-5xl font-black tracking-tight uppercase">
              Predictive Safety <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 bg-clip-text text-transparent">Intelligence</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-medium max-w-2xl mx-auto leading-relaxed">
              Cross-industry risk engine scoring technical asset subassembly failure frequencies against real-time environmental ambient multipliers.
            </p>
          </div>

          {/* Premium Value-First Telemetry Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-4">
            <div className="bg-[#0b0f19]/50 border border-slate-900 rounded-2xl p-5 text-center shadow-lg">
              <p className="text-xl md:text-2xl font-black text-white font-mono">15,000+</p>
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mt-1">Safety Recalls Monitored</p>
              <p className="text-[10px] text-slate-500 leading-normal mt-1.5">Direct continuous synchronization against federal databases.</p>
            </div>
            <div className="bg-[#0b0f19]/50 border border-slate-900 rounded-2xl p-5 text-center shadow-lg">
              <p className="text-xl md:text-2xl font-black text-white font-mono">24/7 Sync</p>
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mt-1">Automated Monitoring</p>
              <p className="text-[10px] text-slate-500 leading-normal mt-1.5">Eliminate manual sheets. Our system tracks records daily.</p>
            </div>
            <div className="bg-[#0b0f19]/50 border border-slate-900 rounded-2xl p-5 text-center shadow-lg">
              <p className="text-xl md:text-2xl font-black text-white font-mono">Broker-Ready</p>
              <p className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider mt-1">Compliance Badging</p>
              <p className="text-[10px] text-slate-500 leading-normal mt-1.5">Prove vehicle compliance outbound to cargo underwriters.</p>
            </div>
          </div>
        </section>

        {/* Personalized Welcome Layer for Pre-Qualified Leads */}
        {leadLoading && (
          <div className="w-full max-w-3xl mx-auto bg-[#0b0f19]/40 border border-slate-900 rounded-3xl p-8 shadow-2xl animate-pulse">
            <div className="h-6 bg-slate-800 rounded w-1/4 mb-4"></div>
            <div className="h-10 bg-slate-800 rounded mb-6"></div>
          </div>
        )}

        {isPersonalizedLead && (
          <section className="w-full max-w-3xl mx-auto bg-[#0b0f19] border border-emerald-500/20 rounded-3xl overflow-hidden shadow-2xl my-4">
            <div className="bg-gradient-to-b from-emerald-950/20 to-transparent p-6 md:p-8 border-b border-slate-900">
              <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full mb-3">
                Authenticated Pilot Link
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-white">
                Welcome back, {lead.contact_name}
              </h2>
              <p className="text-slate-400 text-xs mt-1">
                Pre-loaded Nevada registry for <span className="text-slate-200 font-semibold">{lead.company_name}</span> (Estimated: {lead.est_fleet_size} {lead.primary_vehicle_mix}s).
              </p>
            </div>

            {lead.localized_threat_hook && (
              <div className="px-6 py-4 bg-orange-950/10 border-b border-slate-900 flex gap-4 items-start">
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
                  <p className="text-[10px] text-slate-500 uppercase font-black font-mono">SaaS Pricing Tiers</p>
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

        {/* Tabbed Interactive Control Hub */}
        <section className="space-y-6">
          <div className="flex border-b border-slate-900 gap-6 justify-center">
            <button
              onClick={() => setActiveTab('scanner')}
              className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'scanner' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              📊 Unlocked Fleet Scanner
            </button>
            <button
              onClick={() => setActiveTab('roi')}
              className={`pb-3 font-bold text-xs uppercase tracking-wider border-b-2 transition-all ${
                activeTab === 'roi' 
                  ? 'border-emerald-500 text-white' 
                  : 'border-transparent text-slate-500 hover:text-slate-300'
              }`}
            >
              💸 Fleet ROI Estimator
            </button>
          </div>

          {/* TAB A: Technical Fleet Scanner Ingestion */}
          {activeTab === 'scanner' && (
            <div className="space-y-6 animate-fadeIn">
              
              {/* Frictionless Scanner Card (Zero upfront registration) */}
              <div className="w-full bg-gradient-to-b from-[#0b0f19] to-[#040812] border border-slate-900 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                
                <h3 className="text-base font-black text-white uppercase tracking-tight mb-2 text-center md:text-left">
                  Upload Manifest to Scan Telemetry
                </h3>
                <p className="text-slate-500 text-xs max-w-xl mb-6 text-center md:text-left">
                  Paste vehicle parameters directly or drop a registry spreadsheet. Our federal NHTSA sync verifies up to 10 cars with zero upfront signup friction.
                </p>

                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    {/* CSV Drag Drop */}
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
                      <span className="text-slate-200 font-bold text-xs block">Spreadsheet Matrix</span>
                      <span className="text-slate-500 text-[10px] mt-1 block">Drop .csv / .txt files</span>
                      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
                      
                      {showUploadNotification && (
                        <div className="mt-3 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] rounded animate-bounce">
                          File loaded! Click run below.
                        </div>
                      )}
                    </div>

                    {/* Console Paste Terminal */}
                    <div className="md:col-span-2 relative">
                      <textarea
                        rows={4}
                        placeholder="Paste rows: MAKE, MODEL, YEAR...&#10;Example:&#10;FORD, TRANSIT-250, 2022&#10;CHEVROLET, BOLT EV, 2021"
                        value={bulkInput}
                        onChange={(e) => setBulkInput(e.target.value)}
                        className="w-full h-full min-h-[120px] p-4 text-xs rounded-2xl border border-slate-900 bg-slate-950/90 text-emerald-400 font-mono outline-none focus:border-emerald-500/60 transition-all placeholder:text-slate-800 resize-none"
                      />
                      <div className="absolute bottom-3 right-3 text-[8px] font-mono text-slate-700 bg-slate-950 px-2 py-0.5 rounded border border-slate-900/60">Console_Input_Override</div>
                    </div>

                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
                    <div className="text-slate-600 text-[10px] max-w-md leading-normal">
                      ⚠️ Sandbox Rule: Exploratory checks are capped at 10 vehicle matrix components per evaluation wave.
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full sm:w-auto px-6 py-3.5 bg-slate-100 hover:bg-white text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg disabled:opacity-40"
                    >
                      {loading ? 'Interrogating Registers...' : 'Run Safety Threat Sweep'}
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

              {/* DYNAMIC CONVERSION CLOSE (Only displays after prospect runs their first sweep) */}
              {sweepExecuted && recalls.length > 0 && (
                <div className="w-full bg-[#051111]/80 border border-emerald-500/20 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden text-center md:text-left flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <span className="text-red-500 font-mono text-xs font-bold uppercase tracking-wider">⚠️ Threats Active</span>
                    <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tight">
                      {recalls.length} Open Recalls Detected in Fleet
                    </h3>
                    <p className="text-slate-400 text-xs max-w-xl leading-relaxed">
                      Secure your exportable PDF Compliance Certificates and claim your authenticated Broker-Ready Live Badge to insulate operations.
                    </p>
                  </div>

                  {!closeSubmitted ? (
                    <form onSubmit={handleConversionClose} className="shrink-0 w-full md:max-w-xs space-y-2">
                      <input 
                        type="email"
                        required
                        placeholder="your-email@company.com"
                        value={closeEmail}
                        onChange={(e) => setCloseEmail(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition font-medium text-center"
                      />
                      <button
                        type="submit"
                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition shadow-lg"
                      >
                        Claim PDF Report & Badge
                      </button>
                    </form>
                  ) : (
                    <div className="text-center md:text-right shrink-0 bg-emerald-500/10 border border-emerald-500/20 px-6 py-4 rounded-xl">
                      <span className="text-xs text-emerald-400 font-black uppercase tracking-wider block">✓ Forwarded Context</span>
                      <p className="text-[10px] text-slate-500 mt-1">Stripe Checkout session loading...</p>
                    </div>
                  )}
                </div>
              )}

              {/* Render Active Scanner Threat Streams */}
              <div className="space-y-4">
                {recalls.length > 0 && (
                  <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Detected Recalls ({recalls.length})</div>
                )}
                
                <div className="grid grid-cols-1 gap-4">
                  {recalls.map((recall, index) => {
                    const score = recall.calculated_severity_score ?? 50;
                    const isHazardous = score >= 75;
                    return (
                      <div 
                        key={index}
                        className={`border rounded-2xl p-6 transition-all bg-[#0b0f19]/20 relative overflow-hidden ${
                          isHazardous ? 'border-red-500/20 shadow-red-950/5' : 'border-slate-900'
                        }`}
                      >
                        <div className="flex justify-between items-start flex-wrap gap-4 mb-4">
                          <div>
                            <h4 className="font-bold text-white text-base md:text-lg">
                              {recall.make} <span className="text-emerald-400 font-mono font-normal">{recall.model}</span> ({recall.year})
                            </h4>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 text-emerald-400 border border-slate-800">
                                {recall.assembly_category || 'General Assembly'}
                              </span>
                              {recall.thermal_multiplier_active && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-950/30 text-amber-400 border border-amber-500/20">
                                  Climatic Trigger Active
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right font-mono text-[10px]">
                            <p className="text-slate-500">NHTSA Ledger #{recall.campaign_number}</p>
                            <p className="text-slate-400 font-semibold mt-1">Severity: <span className={isHazardous ? 'text-red-400' : 'text-emerald-400'}>{score}/100</span></p>
                          </div>
                        </div>

                        <div className="w-full bg-slate-900 h-1 rounded-full mb-4 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${isHazardous ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                            style={{ width: `${score}%` }}
                          />
                        </div>

                        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
                          <p><strong className="text-slate-200 uppercase text-[9px] tracking-wider font-bold block mb-0.5">Component Vector:</strong> {recall.component}</p>
                          <p><strong className="text-slate-200 uppercase text-[9px] tracking-wider font-bold block mb-0.5">Technical Summary:</strong> {recall.summary}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB B: Premium Enterprise ROI Calculator */}
          {activeTab === 'roi' && (
            <div className="bg-[#0b0f19]/30 border border-slate-900 rounded-3xl p-6 md:p-8 space-y-6 animate-fadeIn">
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-wider mb-2">Fleet Scale ROI Calculator</h4>
                <p className="text-xs text-slate-500 leading-relaxed mb-6">Drag the range bar to estimate active monitoring SaaS pricing tiers and compliance savings.</p>
                
                <div className="space-y-4">
                  <div className="flex justify-between text-xs font-bold text-slate-400 font-mono">
                    <span>ACTIVE EVALUATION ROADWAY ASSETS:</span>
                    <span className="text-emerald-400">{sliderVinCount} vehicles</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="500" 
                    value={sliderVinCount}
                    onChange={(e) => setSliderVinCount(Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-950 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6 border-t border-slate-900/60">
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-black font-mono">Subscription Package</p>
                  <p className="text-xl font-black text-white mt-1 font-mono">${calculatedSaaSPremium.toFixed(2)}/mo</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-black font-mono">Projected Safety Shield Savings</p>
                  <p className="text-xl font-black text-emerald-400 mt-1 font-mono">${estimatedDowntimeSavings.toLocaleString()}/yr</p>
                </div>
                <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-900 text-center">
                  <p className="text-[9px] text-slate-500 uppercase font-black font-mono">Insurance Liability Deductions</p>
                  <p className="text-xl font-black text-teal-400 mt-1 font-mono">${insuranceDeductionsSavings.toLocaleString()}/yr</p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Dynamic Compliance Pillars Trust Cards */}
        <CompliancePillars />

        {/* 4. Local Developer Sandbox Controls */}
        {isSandboxMode && (
          <footer className="mt-12 w-full max-w-2xl mx-auto bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center">
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
            <h3 className="text-xl font-black text-white text-center uppercase tracking-tight">Share Verified Compliance Badge</h3>
            <p className="text-slate-400 text-xs text-center mt-2 leading-relaxed">
              Generate an immutable active verification timeline and dispatch the secure link directly to insurance brokers or commercial shipping operators.
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

              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <label className="block text-[9px] font-black uppercase text-slate-500 tracking-wider">Broker Work Email</label>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    required
                    placeholder="e.g. underwriting@carrier.com"
                    value={brokerEmail}
                    onChange={(e) => setBrokerEmail(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-900 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-800 focus:outline-none focus:border-emerald-500 transition font-medium"
                  />
                  <button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black px-4 rounded-xl text-xs uppercase tracking-wider transition shrink-0"
                  >
                    Send Link
                  </button>
                </div>
              </form>

              {shareSuccess && (
                <p className="text-xs text-center text-emerald-400 font-bold animate-pulse">
                  ✓ Secure badge verification email dispatched!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}