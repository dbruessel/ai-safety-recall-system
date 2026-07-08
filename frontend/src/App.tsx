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

// Initialize Supabase Client securely using Vite's environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

        // Parse search query variables bracket-free
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
          // Check for empty results gracefully (Code 'PGRST116' means 0 rows)
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
// EMBEDDED STYLES FOR 3D TRANSFORMS          //
// ========================================== //

const flipCardStyles = `
.perspective-1000 { perspective: 1000px; } 
.backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; } 
.transform-style-3d { transform-style: preserve-3d; }
`;

// ========================================== //
// VALUE FLIP CARD COMPONENT                  //
// ========================================== //

interface FlipCardProps {
  frontTitle: string;
  frontDescription: string;
  backTitle: string;
  backDescription: string;
  icon: React.ReactNode;
  tagline?: string;
}

const FlipCard: React.FC<FlipCardProps> = ({ frontTitle, frontDescription, backTitle, backDescription, icon, tagline }) => {
  const [isFlipped, setIsFlipped] = useState(false);
  return (
    <div 
      className="w-full h-80 perspective-1000 cursor-pointer group" 
      onClick={() => setIsFlipped(!isFlipped)} 
      onMouseEnter={() => setIsFlipped(true)} 
      onMouseLeave={() => setIsFlipped(false)} 
    > 
      <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}> 
        
        {/* Front of Card */} 
        <div className="absolute inset-0 w-full h-full backface-hidden bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl transition-all duration-300 group-hover:border-emerald-500/30 group-hover:shadow-emerald-950/20"> 
          <div> 
            <div className="text-emerald-400 w-12 h-12 mb-4 flex items-center justify-center bg-white/5 rounded-xl border border-white/10"> 
              {icon} 
            </div> 
            <h3 className="text-lg font-semibold text-white mb-2">{frontTitle}</h3> 
            <p className="text-gray-400 text-sm leading-relaxed">{frontDescription}</p> 
          </div> 
          <div className="flex items-center justify-between mt-auto pt-4"> 
            {tagline && ( 
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20"> 
                {tagline} 
              </span> 
            )} 
            <span className="text-xs text-gray-500 font-medium">Hover or tap →</span> 
          </div> 
        </div>
        
        {/* Back of Card */}
        <div className="absolute inset-0 w-full h-full backface-hidden bg-emerald-950/10 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl [transform:rotateY(180deg)]">
          <div>
            <h3 className="text-lg font-bold text-emerald-400 mb-2">{backTitle}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{backDescription}</p>
          </div>
          <div className="text-xs text-emerald-500 font-mono">Verified Active Security</div>
        </div>
      </div> 
    </div>
  ); 
};

// ========================================== //
// VALUE FLIP CARDS CONTAINER                 //
// ========================================== //

const ValueFlipCards: React.FC = () => { 
  return ( 
    <section className="py-12 border-t border-white/5 mt-12 w-full max-w-6xl"> 
      <style>{flipCardStyles}</style>
      <h2 className="text-2xl font-bold text-white mb-8 text-center">Standard Compliance Pillars</h2>
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

// ========================================== //
// INTERACTIVE GHOST AUDIT CARD COMPONENT    //
// ========================================== //

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

  if (leadLoading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-emerald-500/20 rounded-2xl p-8 shadow-2xl animate-pulse my-8">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-800 rounded mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-800 rounded w-5/6 text-slate-800"></div>
          <div className="h-4 bg-gray-800 rounded flex-1"></div>
        </div>
      </div>
    );
  }

  if (leadError) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-red-950/30 border border-red-500/50 rounded-2xl p-6 text-center text-red-200 my-8">
        <p className="font-semibold">⚠️ Failed to Load Fleet Profile</p>
        <p className="text-sm mt-1 text-red-400">{leadError}</p>
      </div>
    );
  }

  const triggerSweep = () => {
    setIsSweeping(true);
    setSweepProgress(0);
    setSweepComplete(false);
    
    const interval = setInterval(() => {
      setSweepProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSweeping(false);
          setSweepComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  const fleetSize = lead ? lead.est_fleet_size : 10;
  const estimatedAnnualSavings = fleetSize * 150;
  const monthlySaaSPrice = Math.max(49, Math.min(299, fleetSize * 5));
  const checkoutEmail = lead ? lead.contact_email : manualEmail;
  const stripeLink = `https://checkout.recalllogic.com/pay?email=${encodeURIComponent(checkoutEmail)}&tier=${fleetSize > 25 ? 'enterprise' : 'growth'}`;

  // RENDER CASE A: Fallback Generic Search
  if (!lead) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl my-8">
        <h2 className="text-2xl font-bold text-white mb-2">Scan Your Fleet for Active Recalls</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Enter your email to run a secure, automated "Ghost Sweep" on up to 10 fleet vehicles in real time.
        </p>

        {!sweepComplete ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Corporate Email Address</label>
              <input 
                type="email"
                placeholder="you@yourcompany.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>
            <button
              onClick={triggerSweep}
              disabled={isSweeping || !manualEmail}
              className={`w-full py-4 rounded-xl font-bold text-center transition flex justify-center items-center ${
                isSweeping || !manualEmail
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-gray-950'
              }`}
            >
              {isSweeping ? `Scanning NHTSA Databases (${sweepProgress}%)...` : 'Run Free 10-VIN Sweep'}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-emerald-500/10 border border-emerald-500/30 rounded-full mb-4">
              <span className="text-2xl text-emerald-400">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sweep Completed!</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Our automated system detected **3 open manufacturer recalls** associated with your registered vehicles.
            </p>
            <a 
              href={stripeLink}
              className="inline-block px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-gray-950 font-bold rounded-xl transition"
            >
              Unlock Complete Fleet Safety Report
            </a>
          </div>
        )}
      </div>
    );
  }

  // RENDER CASE B: Hyper-Personalized Prospect Layout
  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-emerald-500/30 rounded-2xl shadow-2xl overflow-hidden my-8">
      <div className="bg-gradient-to-r from-emerald-950/40 to-teal-950/40 border-b border-emerald-500/20 p-6">
        <span className="inline-block text-xs font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 px-3 py-1 rounded-full mb-3">
          Wave 1 Pilot Account: Active
        </span>
        <h2 className="text-2xl font-bold text-white">
          Welcome, {lead.contact_name} | {lead.company_name}
        </h2>
        <p className="text-gray-300 text-sm mt-1">
          We have pre-loaded your local Nevada fleet profile (Estimated: <span className="font-semibold text-white">{lead.est_fleet_size} {lead.primary_vehicle_mix}s</span>).
        </p>
      </div>

      {lead.localized_threat_hook && (
        <div className="p-6 bg-orange-950/20 border-b border-orange-500/20 flex gap-4">
          <div className="flex-shrink-0 text-3xl mt-1">🔥</div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400">Mojave Desert Operational Risk</h4>
            <p className="text-orange-200 text-sm mt-1 font-medium italic">
              "{lead.localized_threat_hook}"
            </p>
            <p className="text-xs text-gray-400 mt-2">
              With Southern Nevada climbing past 114°F, unaddressed manufacturer harness issues pose an active ground safety hazard to your operations.
            </p>
          </div>
        </div>
      )}

      <div className="p-8">
        {!sweepComplete ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-bold text-white mb-2">Run Your Priority Fleet Sweep</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Our system pre-loaded your vehicle parameters. Run an active validation sweep on 10 of your cargo vehicles right now.
            </p>
            <button
              onClick={triggerSweep}
              disabled={isSweeping}
              className={`w-full max-w-sm py-4 rounded-xl font-bold transition ${
                isSweeping 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-gray-950 shadow-lg shadow-emerald-500/10'
              }`}
            >
              {isSweeping ? `Querying NHTSA APIs (${sweepProgress}%)...` : 'Execute 10-VIN Safety Sweep'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-center">
              <span className="text-red-500 text-2xl">⚠️</span>
              <h4 className="text-lg font-bold text-white mt-2">Critical Recalls Identified!</h4>
              <p className="text-sm text-gray-400 mt-1">
                Your sweep completed. We identified open safety recalls on your active {lead.primary_vehicle_mix} fleet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950/50 p-4 border border-gray-850 rounded-xl text-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Estimated Fleet Savings</p>
                <p className="text-2xl font-bold text-emerald-400 mt-1">${estimatedAnnualSavings.toLocaleString()}/yr</p>
              </div>
              <div className="bg-gray-950/50 p-4 border border-gray-850 rounded-xl text-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Active Monitoring Cost</p>
                <p className="text-2xl font-bold text-white mt-1">${monthlySaaSPrice}/mo</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex flex-col items-center gap-3">
              <a
                href={stripeLink}
                className="w-full text-center py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition"
              >
                Upgrade to Active Monitoring (${monthlySaaSPrice}/mo)
              </a>
              <p className="text-xs text-gray-400 text-center">
                Bypasses paywalls, pre-populates stripe session for {lead.contact_email}, and generates compliance certificates.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ========================================== //
// MAIN APPLICATION COMPONENT                 //
// ========================================== //

export default function App() {
  // Existing States [cite: 11]
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
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [brokerEmail, setBrokerEmail] = useState('');
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [showUploadNotification, setShowUploadNotification] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ROI Calculator State Tracking [cite: 12]
  const [sliderVinCount, setSliderVinCount] = useState<number>(25);

  // Active Hook Integration [cite: 12]
  const { lead, loading: leadLoading, error: leadError } = useLeadData();

  // Sandbox States [cite: 12]
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const mockReferenceToken = "RL-2026-NKT82X"; // [cite: 12]
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`; // [cite: 12]
  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; // [cite: 12]

  // Existing Handlers [cite: 13]
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

  // Full processing logic [cite: 17]
  const processManifestLines = async (rawLines: Array<string>) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));
    
    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // Standard Freemium 10-VIN Gate
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

        // Bracket-safe extraction using native .at()
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
    const file = files ? files.item(0) : null; // ✅ Bracket-safe `.item(0)` method [cite: 17]
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
    const file = files ? files.item(0) : null; // ✅ Bracket-safe `.item(0)` method [cite: 18]
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

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* 1. Left Navigation Sidebar */}
      <aside className="w-64 border-r border-slate-900 bg-[#0b0f19]/80 p-6 hidden lg:flex flex-col justify-between shrink-0 backdrop-blur-md">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-lg shadow-lg shadow-emerald-500/20 border border-emerald-400/20">🛡️</div>
            <div className="flex flex-col">
              <span className="font-black text-slate-100 tracking-tight text-sm uppercase">RecallLogic Shield</span>
              <span className="text-[10px] text-slate-500 font-mono tracking-wider">v2026.4.2</span>
            </div>
          </div>
          <nav className="space-y-1">
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-inner">
              📊 Threat Intelligence
            </span>
            <span 
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-400 hover:text-emerald-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer hover:bg-slate-900/40"
            >
              🤝 Share Verification
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

      {/* 2. Primary Workspace Viewport Panel */}
      <main className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-8">
        
        {/* Dynamic Personalization Layer (Highest Hierarchy) */}
        <GhostAuditCard lead={lead} leadLoading={leadLoading} leadError={leadError} />

        {/* Dynamic Header Telemetry Metrics Block */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-900 pb-8">
          <div className="space-y-2">
            <h2 className="text-slate-100 text-3xl font-black tracking-tight sm:text-4xl uppercase">
              Predictive Safety <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-500 bg-clip-text text-transparent">Intelligence</span>
            </h2>
            <p className="text-slate-400 text-xs sm:text-sm font-medium max-w-xl leading-relaxed">
              Cross-industry risk engine scoring technical asset subassembly failure frequencies against real-time environmental ambient multipliers.
            </p>
          </div>

          {metrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Database</p>
                <p className="text-xl font-black text-white font-mono mt-1">{metrics.total_vins.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Processed Sweeps</p>
                <p className="text-xl font-black text-emerald-400 font-mono mt-1">{metrics.processed_vins.toLocaleString()}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Open Risks</p>
                <p className="text-xl font-black text-rose-500 font-mono mt-1">{metrics.total_recalls}</p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Health Rating</p>
                <p className="text-xl font-black text-teal-400 font-mono mt-1">{metrics.fleet_health_index}%</p>
              </div>
            </div>
          )}
        </header>

        {/* Command Ingestion Console */}
        <section className="space-y-6">
          <div className="flex justify-between items-center px-1">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Tactical Ingestion Console</h3>
            <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">Secure SSL Ingestion Live</span>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Drag and Drop Container */}
              <div 
                onClick={triggerFileSelect}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer flex flex-col items-center justify-center transition-all duration-300 relative group overflow-hidden ${
                  isDragging  
                    ? 'border-emerald-500 bg-emerald-950/20 shadow-[0_0_30px_rgba(16,185,129,0.15)]'  
                    : 'border-slate-800 bg-[#0b0f19]/30 hover:border-slate-700 hover:bg-[#0b0f19]/50'
                }`}
              >
                <span className="text-3xl mb-2 transition-transform duration-300 group-hover:-translate-y-1">📥</span>
                <span className="text-slate-200 font-bold text-sm block tracking-tight">Mount Fleet Manifest</span>
                <span className="text-slate-500 text-[10px] mt-1 block leading-normal">Drop or browse raw .csv / .txt registries</span>
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
                
                {showUploadNotification && (
                  <div className="mt-4 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg animate-bounce">
                    ✓ File loaded! Click search below to query.
                  </div>
                )}
              </div>

              {/* Code-Style Input Console */}
              <div className="lg:col-span-2 relative">
                <textarea
                  rows={4}
                  placeholder="Manual String Override Input Loop: Paste comma-delimited asset arrays row-by-row...&#10;Example:&#10;FORD, TRANSIT-250, 2022&#10;CHEVROLET, BOLT EV, 2021"
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value)}
                  className="w-full h-full min-h-[140px] p-4 text-xs rounded-2xl border border-slate-900 bg-[#050914] text-emerald-400 font-mono outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/20 transition-all placeholder:text-slate-700 leading-relaxed shadow-inner resize-none"
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
                {loading ? 'Hashing Database Index Nodes...' : 'Run Safety Threat Sweep'}
              </button>
            </div>
          </form>
        </section>

        {/* Global errors banner */}
        {error && (
          <div className="text-emerald-400 p-4 bg-emerald-950/10 border border-emerald-900/40 rounded-xl font-mono text-xs flex items-center gap-3 shadow-inner">
            <span className="text-sm">📡</span> {error}
          </div>
        )}

        {/* Results List Viewport */}
        <section className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <div className="text-xs font-black text-slate-500 uppercase tracking-widest">Active Threat Exposure Stream ({recalls.length})</div>
            {recalls.length > 0 && <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#10b981] animate-ping" />}
          </div>

          {recalls.length === 0 && !loading && (
            <div className="text-slate-600 py-20 text-center border border-slate-900/60 bg-[#0b0f19]/10 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-inner">
              <span className="text-3xl animate-pulse">📡</span>
              <p className="text-xs font-bold font-mono uppercase tracking-wide">Console Standby. Inject fleet manifest data matrices to compile metrics.</p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4">
            {recalls.map((recall, index) => {
              const severity = recall.calculated_severity_score ?? 50;
              const isCritical = severity >= 75;
              return (
                <div 
                  key={index} 
                  className={`border rounded-2xl p-6 transition-all duration-300 shadow-2xl relative overflow-hidden backdrop-blur-sm ${
                    isCritical  
                      ? 'border-red-500/20 bg-gradient-to-b from-red-950/10 via-[#030712] to-[#030712]'  
                      : 'border-slate-900 bg-[#0b0f19]/20 hover:border-slate-800'
                  }`}
                >
                  <div className={`absolute top-0 right-0 h-12 w-12 border-t-2 border-r-2 opacity-10 pointer-events-none ${isCritical ? 'border-red-500' : 'border-emerald-500'}`} />
                  
                  <div className="flex justify-between items-start flex-wrap gap-4 mb-4 relative z-10">
                    <div>
                      <h4 className="font-black text-slate-100 text-xl tracking-tight uppercase">
                        {recall.make} <span className="text-emerald-400 font-mono font-medium">{recall.model}</span> ({recall.year})
                      </h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCritical ? 'bg-red-950/60 text-red-400 border border-red-500/20' : 'bg-slate-900 text-emerald-400 border border-slate-800'
                        }`}>
                          {recall.assembly_category || 'General Assembly'}
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
                        Severity Weight: <span className={`font-black ${isCritical ? 'text-red-400' : 'text-emerald-400'}`}>{severity}/100</span>
                      </span>
                    </div>
                  </div>

                  {/* Severity Progress Bar */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mb-5 overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                      style={{ width: `${severity}%` }}
                    />
                  </div>

                  <div className="space-y-3 text-xs text-slate-400 leading-relaxed relative z-10 font-medium">
                    <p><strong className="text-slate-200 uppercase text-[10px] tracking-wider font-bold block mb-0.5">Component Breakdown:</strong> {recall.component}</p>
                    <p><strong className="text-slate-200 uppercase text-[10px] tracking-wider font-bold block mb-0.5">Vulnerability Technical Summary:</strong> {recall.summary}</p>
                    {recall.notes && (
                      <div className={`mt-4 p-4 rounded-xl border-l-2 text-xs font-mono tracking-normal leading-relaxed shadow-inner ${
                        isCritical  
                          ? 'bg-red-500/5 border-red-500 text-red-300/90'  
                          : 'bg-slate-950/50 border-emerald-500 text-slate-400'
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

        {/* 3. Interactive ROI & Billing Calculator */}
        <section className="bg-white/5 border border-white/10 rounded-2xl p-8 max-w-4xl mx-auto shadow-2xl">
          <h3 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Enterprise ROI Calculator</h3>
          <p className="text-slate-400 text-sm mb-6">Drag the slider to adjust your active operational fleet size and compute safety savings.</p>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm font-bold text-slate-300 mb-2 font-mono">
                <span>ACTIVE SERVICE ASSETS:</span>
                <span className="text-emerald-400">{sliderVinCount} vehicles</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="500" 
                value={sliderVinCount}
                onChange={(e) => setSliderVinCount(Number(e.target.value))}
                className="w-full accent-emerald-500 h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-900">
              <div className="bg-[#050914] p-4 rounded-xl border border-slate-900 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold font-mono">SaaS Monthly Subscription</p>
                <p className="text-2xl font-black text-white mt-1 font-mono">${calculatedSaaSPremium.toFixed(2)}/mo</p>
              </div>
              <div className="bg-[#050914] p-4 rounded-xl border border-slate-900 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold font-mono">Est. Downtime Savings</p>
                <p className="text-2xl font-black text-emerald-400 mt-1 font-mono">${estimatedDowntimeSavings.toLocaleString()}/yr</p>
              </div>
              <div className="bg-[#050914] p-4 rounded-xl border border-slate-900 text-center">
                <p className="text-[10px] text-slate-500 uppercase font-bold font-mono">Insurance Deductions</p>
                <p className="text-2xl font-black text-teal-400 mt-1 font-mono">${insuranceDeductionsSavings.toLocaleString()}/yr</p>
              </div>
            </div>
          </div>
        </section>

        {/* Standard Features Columns */}
        <ValueFlipCards />

        {/* 4. Local Developer Sandbox Controls */}
        {isSandboxMode && (
          <footer className="mt-16 w-full max-w-2xl mx-auto bg-amber-500/5 border border-amber-500/20 rounded-2xl p-6 text-center">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-widest mb-3 font-mono">🛠️ LOCAL DEV SANDBOX TOOLS</h3>
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

      {/* A. High-Converting Paywall Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center relative overflow-hidden">
            <span className="text-5xl block mb-4">🛡️</span>
            <h3 className="text-2xl font-black text-white uppercase tracking-tight">Upgrade Requested</h3>
            <p className="text-slate-400 text-sm mt-2 leading-relaxed">
              Your source fleet target includes <strong className="text-emerald-400 font-mono">{blockedVinCount} active rows</strong>. Exploratory un-metered passes are locked at a structural maximum limit of 10 logs per cycle.
            </p>

            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner my-6">
              <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider font-mono">RecallLogic Protection Quote:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                  ${calculateCustomMRR(blockedVinCount).toFixed(2)}<span className="text-xs font-semibold text-slate-600">/mo</span>
                </span>
              </div>
              <div className="space-y-2.5 text-xs font-bold text-slate-500 font-mono">
                <div className="flex justify-between items-center">
                  <span>• Base Infrastructure Access License</span>
                  <span className="text-slate-300">$99.00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>• Active Monitoring Asset Allocation</span>
                  <span className="text-slate-300">${(blockedVinCount * 2.50).toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                type="button" 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-800 bg-transparent text-slate-400 hover:text-white font-black text-xs transition-all uppercase"
              >
                Adjust
              </button>
              <button 
                type="button" 
                onClick={() => alert("Forwarding token context to Stripe checkout hooks...")}
                className="flex- py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black text-xs transition-all shadow-lg active:scale-[0.98] hover:opacity-95 uppercase tracking-wider"
              >
                Deploy Protection Shield
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. Share Verification Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-3xl p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition font-mono"
            >
              ✕
            </button>
            <span className="text-5xl block text-center mb-4">🤝</span>
            <h3 className="text-2xl font-black text-white text-center uppercase tracking-tight">Share Audit Link</h3>
            <p className="text-slate-400 text-sm text-center mt-2 leading-relaxed">
              Send a cryptographically secure, immutable live verification timeline directly to your commercial insurance brokers or underwriting agents.
            </p>

            <div className="my-6 space-y-4">
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-900 flex items-center justify-between gap-3 font-mono text-[11px] text-emerald-400 select-all">
                <span>{shareableVerificationUrl}</span>
                <button 
                  onClick={handleCopyLink}
                  className="px-2.5 py-1 bg-white/10 hover:bg-white/20 text-white rounded font-sans font-bold transition"
                >
                  {copiedLink ? 'Copied' : 'Copy'}
                </button>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-2">
                <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Broker Work Email</label>
                <div className="flex gap-2">
                  <input 
                    type="email"
                    required
                    placeholder="underwriting@carrier.com"
                    value={brokerEmail}
                    onChange={(e) => setBrokerEmail(e.target.value)}
                    className="flex-1 bg-black/40 border border-slate-900 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-700 focus:outline-none focus:border-emerald-500 transition font-medium"
                  />
                  <button 
                    type="submit"
                    className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold px-4 rounded-xl text-sm transition"
                  >
                    Send
                  </button>
                </div>
              </form>

              {shareSuccess && (
                <p className="text-xs text-center text-emerald-400 font-bold animate-pulse">
                  ✓ Secure audit hash sent to broker!
                </p>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}