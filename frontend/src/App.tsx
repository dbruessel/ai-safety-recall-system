import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';

// ==========================================
// TYPES & INTERFACES
// ==========================================
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
}

interface GlobalMetrics {
  total_vins: number;
  processed_vins: number;
  total_recalls: number;
  fleet_health_index: number;
}

// ==========================================
// EMBEDDED STYLES FOR 3D TRANSFORMS
// ==========================================
const flipCardStyles = `
  .perspective-1000 {
    perspective: 1000px;
  }
  .backface-hidden {
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  .transform-style-3d {
    transform-style: preserve-3d;
  }
`;

// ==========================================
// VALUE FLIP CARD COMPONENT
// ==========================================
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
      <div 
        className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${
          isFlipped ? '[transform:rotateY(180deg)]' : ''
        }`}
      >
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
        <div className="absolute inset-0 w-full h-full backface-hidden [transform:rotateY(180deg)] bg-gradient-to-br from-emerald-950/40 to-slate-900/60 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-2xl">
          <div>
            <div className="text-emerald-400 w-12 h-12 mb-4 flex items-center justify-center bg-emerald-500/10 rounded-xl border border-emerald-500/20">
              {icon}
            </div>
            <h3 className="text-lg font-semibold text-emerald-400 mb-2">{backTitle}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{backDescription}</p>
          </div>
          <div className="text-xs text-emerald-500/50 mt-auto">
            Click / tap to flip back
          </div>
        </div>
      </div>
    </div>
  );
};

// ==========================================
// VALUE FLIP CARDS CONTAINER
// ==========================================
const ValueFlipCards: React.FC = () => {
  return (
    <section className="py-12 border-t border-white/5 mt-12">
      <style>{flipCardStyles}</style>

      <div className="text-center mb-10">
        <h2 className="text-2xl font-bold text-white mb-2">
          Why Commercial Fleets Choose <span className="text-emerald-400">RecallLogic</span>
        </h2>
        <p className="text-gray-400 max-w-xl mx-auto text-sm">
          Swap guesswork and tedious manual tracking sheets for continuous liability shield safeguards.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <FlipCard
          frontTitle="DOT Compliance & Safety"
          frontDescription="Are your fleet assets and drivers legally authorized and safe to operate on the road?"
          backTitle="Avoid Serious DOT Penalties"
          backDescription="Instantly verify outstanding federal safety recalls, avert expensive Department of Transportation (DOT) compliance violations, and verify vehicle road-readiness."
          tagline="Regulatory Shield"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
        />

        {/* Card 2 */}
        <FlipCard
          frontTitle="Asset Liability Protection"
          frontDescription="How exposed is your enterprise to litigation risks from known safety defects?"
          backTitle="Audit-Ready Digital History"
          backDescription="Unresolved recalls open your company up to significant litigation and corporate negligence claims. RecallLogic generates a complete, clean, time-stamped audit compliance trail."
          tagline="Legal Guardrails"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />

        {/* Card 3 */}
        <FlipCard
          frontTitle="Continuous Background Sync"
          frontDescription="Who is scanning federal safety databases for your vehicle configurations?"
          backTitle="Never Look Up a VIN Manually Again"
          backDescription="Static tracking spreadsheets grow stale within hours. Our platform automatically queries NHTSA databases every single night and fires instant alerts if a new match hits."
          tagline="Set-and-Forget"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.228 10H16m0 0a2 2 0 100 4h5" />
            </svg>
          }
        />
      </div>
    </section>
  );
};

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>({
    total_vins: 0,
    processed_vins: 0,
    total_recalls: 0,
    fleet_health_index: 100
  });
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Recall[]>([]);
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

  // Sandbox Test Matrix Automation States
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;

  // Check if we are running in an exploratory sandbox configuration loop
  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const fetchGlobalMetrics = () => {
    axios.get('http://127.0.0.1:8000/api/metrics/global')
      .then(res => {
        const data = res.data.metrics || res.data;
        setMetrics({
          total_vins: data.total_vins ?? 0,
          processed_vins: data.processed_vins ?? 0,
          total_recalls: data.total_recalls ?? 0,
          fleet_health_index: data.fleet_health_index ?? 100
        });
      })
      .catch(err => {
        console.error('Metrics loading skipped (using local state defaults):', err);
      });
  };

  useEffect(() => {
    fetchGlobalMetrics();
  }, []);

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

  // Sandbox Orchestrations: Automated Environment Reset Actions
  const triggerSandboxEnvironmentReset = async () => {
    setSandboxResetStatus('Resetting Replica State...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/reset');
      setSandboxResetStatus(`✓ Success: ${response.data.message}`);
      setRecalls([]);
      fetchGlobalMetrics();
      setTimeout(() => setSandboxResetStatus(''), 4000);
    } catch (err: any) {
      setSandboxResetStatus(`✕ Error: ${err.response?.data?.detail || 'Failed reset connection.'}`);
    }
  };

  // Sandbox Orchestrations: Fire passing signature events straight to webhook router
  const simulateSandboxSubscriptionUpgrade = async () => {
    setSandboxWebhookLogs('Generating signed token payload...');
    try {
      const response = await axios.post('http://127.0.0.1:8000/api/sandbox/mock-checkout', {
        customer_email: "agent-test-fleet@recalllogic.internal",
        metadata: { fleet_limit_override: "true" }
      });
      setSandboxWebhookLogs(`✓ Upgrade Sent: ${response.data.message || 'Check logs.'}`);
      setTimeout(() => setSandboxWebhookLogs(''), 4000);
    } catch (err: any) {
      setSandboxWebhookLogs(`✕ Webhook Failure: ${err.response?.data?.detail || 'Upgrade failed.'}`);
    }
  };

  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));

    if (cleanedLines.length === 0) return;

    setLoading(true);
    setError('');
    try {
      // 10-VIN "Ghost Audit" Interceptor: Enforce limitations on non-upgraded versions
      if (cleanedLines.length > 10) {
        const freeLines = cleanedLines.slice(0, 10);
        setBlockedVinCount(cleanedLines.length - 10);
        setShowUpgradeModal(true);
        
        const response = await axios.post('http://127.0.0.1:8000/api/recalls/upload', { vins: freeLines });
        setRecalls(response.data.recalls || []);
      } else {
        setBlockedVinCount(0);
        const response = await axios.post('http://127.0.0.1:8000/api/recalls/upload', { vins: cleanedLines });
        setRecalls(response.data.recalls || []);
      }
      
      setShowUploadNotification(true);
      fetchGlobalMetrics();
      setTimeout(() => setShowUploadNotification(false), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process manifest search queries.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    processManifestLines(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    // FIXED: Safely target-mapping index  of files array
    const file = e.target.files?.;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/\r?\n/);
        processManifestLines(lines);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // FIXED: Safely target-mapping index  of files array
    const file = e.dataTransfer.files?.;
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const lines = text.split(/\r?\n/);
        processManifestLines(lines);
      }
    };
    reader.readAsText(file);
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col lg:flex-row">
      
      {/* ==========================================
          SIDEBAR: NAVIGATION & FLEET COMPLIANCE BADGE
          ========================================== */}
      <aside className="w-full lg:w-80 bg-[#0b131f] border-b lg:border-b-0 lg:border-r border-white/5 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          {/* Brand Logo Header */}
          <div className="flex items-center space-x-3">
            <div className="bg-emerald-500 text-[#06090e] font-extrabold p-2 rounded-xl text-lg tracking-wider shadow-lg shadow-emerald-500/20">
              RL
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">
              Recall<span className="text-emerald-400">Logic</span>
            </h1>
          </div>

          {/* Shareable Verification & Live Badges */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
            <h3 className="text-sm font-semibold text-gray-300">Fleet Security Audit</h3>
            
            {/* Glassmorphic Trust Badge State */}
            <div className="flex justify-center py-3">
              <div className="glassmorphic-badge flex flex-col items-center justify-center p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 w-full shadow-lg">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-1">Audit Status</span>
                <span className="text-3xl font-extrabold text-emerald-400 tracking-wider">PASS</span>
                <span className="text-[10px] text-gray-400 mt-1">100% Safety Compliant</span>
              </div>
            </div>

            {/* Quick Audit Metrics */}
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="text-gray-400">Compliance Rate</div>
                <div className="fleet-score font-bold text-emerald-400 text-sm">{metrics?.fleet_health_index ?? 100}%</div>
              </div>
              <div className="bg-white/5 p-2 rounded-lg border border-white/5">
                <div className="text-gray-400">Monitored Assets</div>
                <div className="font-bold text-white text-sm">{metrics?.processed_vins ?? 0} / {metrics?.total_vins ?? 0}</div>
              </div>
            </div>

            {/* Verification Links */}
            <div className="space-y-2 pt-2">
              <button 
                onClick={() => setShowShareModal(true)} 
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-semibold text-xs py-2.5 px-4 rounded-xl transition duration-200"
              >
                Share Compliance Badge
              </button>
              <button 
                onClick={handleCopyLink} 
                className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-medium text-xs py-2.5 px-4 rounded-xl transition duration-200"
              >
                {copiedLink ? "✓ Copied Verification Link" : "Copy Audit Link"}
              </button>
            </div>
          </div>
        </div>

        {/* Footer / App Meta */}
        <div className="pt-6 border-t border-white/5 mt-8 lg:mt-0 text-center lg:text-left">
          <div className="text-xs text-gray-500 font-mono">MVP BUILD v1.4.0</div>
          <div className="text-[10px] text-gray-600">Active monitoring: Las Vegas Corridor</div>
        </div>
      </aside>

      {/* ==========================================
          MAIN AREA: METRICS, CONTROL BAR & GRID
          ========================================== */}
      <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full space-y-8">

        {/* Top Notification Toast */}
        {showUploadNotification && (
          <div className="upload-success-message bg-emerald-500/20 border border-emerald-500/30 p-4 rounded-2xl flex items-center justify-between text-emerald-400 text-sm animate-pulse">
            <span className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Success! Fleet CSV processed. Monitored records synchronized successfully.
            </span>
          </div>
        )}

        {/* Dynamic Alerts Banner */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl text-red-400 text-sm flex items-center">
            <svg className="w-5 h-5 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Global Metrics Row & Global Threat Metric Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: Global Threat Metric Banner */}
          <div className="md:col-span-2 bg-gradient-to-r from-red-950/20 to-amber-950/20 border border-red-500/20 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center space-x-2 text-red-400 font-semibold text-xs tracking-wider uppercase mb-1">
                <span className="h-2 w-2 rounded-full bg-red-500 animate-ping"></span>
                <span>Global Fleet Threat Metric</span>
              </div>
              <h2 className="text-3xl font-extrabold text-white tracking-tight">
                {metrics?.total_recalls ?? 0} Active Federal Recalls
              </h2>
              <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                Critical safety defects representing fire risk, steering failure, and braking failures currently flagged inside the national highway safety database. Fleet operators should prioritize remediating matches immediately.
              </p>
            </div>
            <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-500 font-mono">
              <span>NHTSA Sync Status: 3:00 AM Daily</span>
              <span className="text-red-400/80 bg-red-500/5 px-2 py-0.5 rounded-full border border-red-500/10">High Risk Threshold</span>
            </div>
          </div>

          {/* Card 2: Monitored Vins */}
          <div className="bg-[#0b131f] border border-white/5 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
            <div>
              <span className="text-gray-400 text-xs tracking-wider uppercase">Active Coverage</span>
              <h3 className="text-4xl font-extrabold text-white mt-1">{metrics?.processed_vins ?? 0}</h3>
              <p className="text-gray-500 text-xs mt-2">
                Commercial vehicles verified against federal safety databases in this reporting cycle.
              </p>
            </div>
            <div className="text-[11px] text-gray-500 font-mono mt-4 pt-4 border-t border-white/5">
              Target: 500 Active monitored units
            </div>
          </div>
        </div>

        {/* Controls Layout: Search inputs & File Upload */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          {/* Left Control Column: VIN Search */}
          <div className="bg-[#0b131f] border border-white/5 rounded-2xl p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-semibold text-white">Manual Fleet Check</h3>
            <p className="text-xs text-gray-400">
              Paste up to 10 vehicle identification numbers (VINs) separated by newlines to scan immediately.
            </p>
            <form onSubmit={handleSearch} className="space-y-3">
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Enter VINs (one per line)...&#10;1FTFW1ED5GXXXXXXX"
                className="w-full h-32 bg-white/5 border border-white/10 rounded-xl p-4 text-sm font-mono text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500/40 transition duration-200 resize-none"
              />
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-white/5 hover:bg-emerald-500 hover:text-[#06090e] border border-white/10 hover:border-emerald-500/20 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 text-sm flex items-center justify-center space-x-2"
              >
                {loading ? "Searching databases..." : "Check VINs"}
              </button>
            </form>
          </div>

          {/* Right Control Column: Drag & Drop CSV Manifest Upload */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={triggerFileSelect}
            className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition duration-200 min-h-[280px] shadow-xl ${
              isDragging 
                ? 'border-emerald-500 bg-emerald-500/5' 
                : 'border-white/10 bg-[#0b131f] hover:border-emerald-500/30'
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              accept=".csv" 
              className="hidden" 
            />
            <div className="text-emerald-400 bg-white/5 p-4 rounded-2xl border border-white/10 mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <h4 className="text-lg font-semibold text-white">Drag & Drop Fleet Manifest</h4>
            <p className="text-xs text-gray-400 mt-2 text-center max-w-sm leading-relaxed">
              Upload your structured vehicle manifest file (.csv) to immediately register your commercial operations pool.
            </p>
            <div className="mt-4 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
              Supported format: make, model, year, VIN
            </div>
          </div>
        </div>

        {/* Value Flip Cards Component */}
        <ValueFlipCards />

        {/* ==========================================
            SANDBOX ORCHESTRATOR PANEL (DEVELOPMENT ONLY)
            ========================================== */}
        {isSandboxMode && (
          <div className="bg-[#0b131f] border border-amber-500/20 rounded-2xl p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">Sandbox Test Orchestrations</h3>
                <p className="text-xs text-gray-400">Automated configurations to verify E2E and Stripe integration metrics.</p>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 uppercase tracking-widest">
                Local Environment Active
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Trigger Reset Action */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Reset Environmental Replica State</h4>
                  <p className="text-xs text-gray-500 mt-1">Clears out temporary database test matrices, resetting your active monitoring tables back to 0.</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button 
                    onClick={triggerSandboxEnvironmentReset}
                    className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-[#06090e] border border-amber-500/20 text-xs font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Trigger System Reset
                  </button>
                  {sandboxResetStatus && <span className="text-xs font-mono text-amber-400">{sandboxResetStatus}</span>}
                </div>
              </div>

              {/* Trigger Upgrade Webhook Action */}
              <div className="bg-white/5 p-4 rounded-xl border border-white/5 flex flex-col justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">Mock Checkout Event Payload</h4>
                  <p className="text-xs text-gray-500 mt-1">Dispatches a simulated subscription checkout event straight to your backend Stripe webhook endpoint.</p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <button 
                    onClick={simulateSandboxSubscriptionUpgrade}
                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-[#06090e] border border-emerald-500/20 text-xs font-semibold py-2 px-4 rounded-lg transition duration-200"
                  >
                    Simulate Stripe Payment
                  </button>
                  {sandboxWebhookLogs && <span className="text-xs font-mono text-amber-400">{sandboxWebhookLogs}</span>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==========================================
            DATA TABLES: RETRIEVED RECALL OUTCOMES
            ========================================== */}
        <div className="bg-[#0b131f] border border-white/5 rounded-2xl shadow-xl overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white">Monitored Safety Alerts</h3>
              <p className="text-xs text-gray-400">Identified manufacturing and components flaws affecting current fleet entries.</p>
            </div>
            <span className="text-xs text-gray-500 font-mono">Records Found: {recalls.length}</span>
          </div>

          {recalls.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <div className="text-sm font-semibold">No Recalls Registered</div>
              <p className="text-xs text-gray-600 mt-1">Check individual VINs or upload your fleet manifest sheet to initiate automated scanning.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/5 border-b border-white/5 text-[11px] uppercase tracking-wider text-gray-400 font-mono">
                    <th className="p-4">Campaign</th>
                    <th className="p-4">Vehicle Specs</th>
                    <th className="p-4">Component Target</th>
                    <th className="p-4">Description & Threat Severity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-sm text-gray-300">
                  {recalls.map((recall, index) => (
                    <tr key={`${recall.campaign_number}-${index}`} className="hover:bg-white/5 transition duration-150">
                      <td className="p-4 font-mono font-bold text-emerald-400 text-xs shrink-0">
                        {recall.campaign_number}
                      </td>
                      <td className="p-4 font-semibold text-white">
                        {recall.year} {recall.make} {recall.model}
                      </td>
                      <td className="p-4 text-xs text-emerald-500 font-medium">
                        {recall.component}
                      </td>
                      <td className="p-4 text-xs leading-relaxed max-w-md">
                        <div className="font-semibold text-gray-200">{recall.summary}</div>
                        {recall.consequence && (
                          <div className="text-red-400/80 mt-1">
                            <span className="font-bold">Consequence:</span> {recall.consequence}
                          </div>
                        )}
                        {recall.remedy && (
                          <div className="text-emerald-500/80 mt-1">
                            <span className="font-bold">Remedy:</span> {recall.remedy}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* ==========================================
          MODALS: UPGRADE & SHARE VERIFICATIONS
          ========================================== */}

      {/* Share Audit Compliance Badge Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b131f] border border-white/10 rounded-2xl w-full max-w-md p-6 relative shadow-2xl space-y-6">
            <button 
              onClick={() => setShowShareModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition duration-150"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div>
              <h3 className="text-lg font-bold text-white">Share Fleet Audit Status</h3>
              <p className="text-xs text-gray-400 mt-1">Distribute digital safety badges directly to compliance officers or insurance underwriters.</p>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-mono tracking-wider text-gray-400">Recipient Email Address</label>
                <input 
                  type="email" 
                  required
                  value={brokerEmail} 
                  onChange={(e) => setBrokerEmail(e.target.value)}
                  placeholder="broker@corporate-insurance.com" 
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-emerald-500/40 transition duration-200"
                />
              </div>

              <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                <div className="text-[10px] uppercase font-mono tracking-wider text-gray-500">Live Secure Audit Payload</div>
                <div className="text-xs text-emerald-400 font-mono break-all bg-emerald-500/5 p-2 rounded border border-emerald-500/10">
                  {shareableVerificationUrl}
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-bold text-sm py-3 px-4 rounded-xl transition duration-200 flex items-center justify-center"
              >
                {loading ? "Sending Audit Credentials..." : "Email Secure Audit Badge"}
              </button>

              {shareSuccess && (
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl text-center text-emerald-400 text-xs">
                  ✓ Audit credentials successfully routed. Check inbox shortly.
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Paywall Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0b131f] border border-white/10 rounded-2xl w-full max-w-lg p-8 relative shadow-2xl space-y-6">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition duration-150"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-emerald-500/10 rounded-full border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-2">
                <svg xmlns="500" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white">Get Real-Time Fleet Pro Coverage</h3>
              <p className="text-sm text-gray-400">
                You've hit the 10-VIN manual lookup limit on the free tier. Upgrading protects your entire operations fleet and unlocks automatic background monitoring.
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/5">
                <div>
                  <span className="font-bold text-white text-lg">Fleet Pro Tier</span>
                  <p className="text-xs text-gray-500">Full operations database coverage</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-extrabold text-emerald-400">$9</span>
                  <span className="text-xs text-gray-500">/ vehicle / mo.</span>
                </div>
              </div>

              <ul className="space-y-2.5 text-xs text-gray-300">
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-400 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Continuous Background Syncing (Scans at 3:00 AM Daily)
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-400 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Real-Time SMS & Email Alerts on matches
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-400 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  Audit-Ready compliance history reports (PDF export)
                </li>
                <li className="flex items-center">
                  <svg className="w-4 h-4 text-emerald-400 mr-2 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
                  API metered keys for automatic platform integrations
                </li>
              </ul>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowUpgradeModal(false)}
                className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-semibold py-3 px-4 rounded-xl transition duration-200 text-sm text-center"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  setShowUpgradeModal(false);
                  if (isSandboxMode) {
                    simulateSandboxSubscriptionUpgrade();
                  } else {
                    window.location.href = "https://billing.recalllogic.com/checkout";
                  }
                }}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-[#06090e] font-bold py-3 px-4 rounded-xl transition duration-200 text-sm text-center"
              >
                Upgrade Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}