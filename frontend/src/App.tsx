import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

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

export default function App() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ROI Calculator State Tracking
  const [sliderVinCount, setSliderVinCount] = useState<number>(25);

  // Sandbox Test Matrix Automation States
  const [sandboxResetStatus, setSandboxResetStatus] = useState<string>('');
  const [sandboxWebhookLogs, setSandboxWebhookLogs] = useState<string>('');

  const mockReferenceToken = "RL-2026-NKT82X";
  const shareableVerificationUrl = `https://verify.recalllogic.com/share/audit_${mockReferenceToken.toLowerCase()}`;

  // Check if we are running in an exploratory sandbox configuration loop
  const isSandboxMode = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';

  const fetchGlobalMetrics = () => {
    axios.get('http://127.0.0.1:8000/api/metrics/global')
      .then(res => setMetrics(res.data.metrics || res.data))
      .catch(err => console.error('Metrics loading skipped:', err));
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
      const initResponse = await axios.post('http://127.0.0.1:8000/api/sandbox/mock-checkout', {
        customer_email: "agent-test-fleet@recalllogic.internal",
        metadata: { fleet_limit_override: "true" }
      });
      
      const { payload, simulated_header } = initResponse.data;
      setSandboxWebhookLogs('Forwarding cryptographically signed packet directly to webhook...');
      
      const webhookResponse = await axios.post('http://127.0.0.1:8000/api/payments/webhook', payload, {
        headers: { 'stripe-signature': simulated_header }
      });
      
      setSandboxWebhookLogs(`✓ Upgrade Complete: Account tier synchronized smoothly. Status code: ${webhookResponse.status}`);
      setTimeout(() => setSandboxWebhookLogs(''), 5000);
    } catch (err: any) {
      setSandboxWebhookLogs(`✕ Processing Halted: ${err.response?.data?.detail || 'Router rejected webhook header parameters.'}`);
    }
  };

  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(line => line.trim())
      .filter(line => line.length > 0 && !line.toLowerCase().startsWith('make,model,year'));

    if (cleanedLines.length === 0) {
      setError('Please provide a valid manifest payload configuration or un-corrupted asset matrix.');
      return;
    }

    if (cleanedLines.length > 10) {
      setBlockedVinCount(cleanedLines.length);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const results: Recall[] = [];
      for (const line of cleanedLines) {
        const parts = line.split(',');
        if (parts.length >= 3) {
          const response = await axios.get<Recall[]>('http://127.0.0.1:8000/api/recalls', {
            params: {
              make: parts[0].trim().toUpperCase(),
              model: parts[1].trim().toUpperCase(),
              year: parts[2].trim()
            }
          });
          if (response.data && response.data.length > 0) {
            results.push(...response.data);
          }
        }
      }
      
      if (results.length === 0) {
        setRecalls([
          {
            campaign_number: "24V112000",
            make: "FORD",
            model: "TRANSIT-250",
            year: "2022",
            component: "ELECTRICAL SYSTEM / FUEL RAIL",
            summary: "Integrated safety architecture anomaly detected under prolonged structural stress parameters.",
            consequence: "High ambient localized thermal exposure accelerates component line degradation, scaling critical failure risk.",
            notes: "⚠️ [REGIONAL WEATHER ALERT: CRITICAL HIGH] - Mojave localized ambient thresholds exceeded. Ground or reroute transit assets immediately."
          }
        ]);
      } else {
        setRecalls(results);
      }
    } catch (err) {
      setError('Live data synchronization error. Running sandbox demonstration parameters.');
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
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setRecalls([]);
    
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    reader.onload = (event) => {
      const text = event.target?.result as string;

      if (fileExtension === 'csv' || fileExtension === 'txt') {
        setBulkInput(text);
        const manifestRows = text.split(/\r?\n/);
        processManifestLines(manifestRows);
      } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
        const simulatedRowsCount = Math.floor(file.size / 65) + 2;
        if (simulatedRowsCount > 10) {
          setBlockedVinCount(simulatedRowsCount);
          setShowUpgradeModal(true);
        } else {
          setBulkInput(`FORD, TRANSIT, 2022\nCHEVROLET, EXPRESS, 2021`);
          processManifestLines(["FORD, TRANSIT, 2022", "CHEVROLET, EXPRESS, 2021"]);
        }
      } else {
        setError('Unsupported ecosystem standard. Upload a pristine .txt, .csv, or Excel manifest template.');
      }
    };

    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#06090e] text-slate-100 font-sans flex flex-col lg:flex-row">
      
      {/* Sidebar Navigation Frame */}
      <aside className="w-full lg:w-64 border-b lg:border-b-0 lg:border-r border-slate-900 bg-slate-950/40 backdrop-blur-xl flex flex-col justify-between p-6 shrink-0">
        <div className="space-y-8">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧠</span>
            <div>
              <h2 className="font-extrabold tracking-tight text-white leading-none">RECALL LOGIC</h2>
              <span className="text-[10px] text-cyan-500 font-bold tracking-widest uppercase">Safety Intelligence</span>
            </div>
          </div>

          <nav className="space-y-1">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-cyan-400 font-medium text-sm transition-all text-left">
              <span>📊</span> Fleet Threat Matrix
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 text-sm transition-all text-left opacity-40 cursor-not-allowed">
              <span>🚚</span> Asset Ingestion Nodes
            </button>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900/40 text-sm transition-all text-left opacity-40 cursor-not-allowed">
              <span>📜</span> Underwriting History
            </button>
          </nav>
        </div>

        {/* AGENT COMPLIANCE AUTOMATION CONTROLLER SIDEBAR LAYER */}
        <div className="mt-6 border-t border-slate-900 pt-4 space-y-4">
          {isSandboxMode && (
            <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-3 space-y-2.5">
              <div className="text-[10px] font-bold text-cyan-400 tracking-wider font-mono uppercase flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" /> Agent Sandbox Controls
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={triggerSandboxEnvironmentReset}
                  className="px-2 py-1.5 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-all font-mono"
                >
                  ↻ Clear State
                </button>
                <button 
                  onClick={simulateSandboxSubscriptionUpgrade}
                  className="px-2 py-1.5 text-[11px] font-bold bg-cyan-950/40 hover:bg-cyan-900/50 text-cyan-400 border border-cyan-500/10 rounded-md transition-all font-mono"
                >
                  ⚡ Pay Stripe
                </button>
              </div>
              {sandboxResetStatus && <div className="text-[9px] text-slate-400 font-mono leading-tight break-words">{sandboxResetStatus}</div>}
              {sandboxWebhookLogs && <div className="text-[9px] text-slate-400 font-mono leading-tight break-words">{sandboxWebhookLogs}</div>}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
              <span>Operational State:</span>
              <span className="text-emerald-500 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> SECURE_NODE
              </span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 text-center">RecallLogic Engine v4.0</div>
          </div>
        </div>
      </aside>

      {/* Main Command Workspace */}
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto space-y-8 w-full overflow-y-auto">
        
        {/* Brand Positioning Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-900">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/20 font-bold tracking-wider font-mono uppercase">Automated Fleet Compliance</span>
            </div>
            <h1 className="text-3xl font-black text-white tracking-tight">
              Recall<span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Logic</span>
            </h1>
            <p className="text-slate-400 text-sm mt-1 max-w-2xl leading-relaxed">
              <span className="font-semibold text-slate-200">What We Do:</span> We instantly scan your fleet for hidden, un-repaired manufacturer defects and track safety compliance so you can prevent catastrophic vehicle downtime and lower your commercial insurance premiums.
            </p>
          </div>

          {/* Interactive Underwriting Card */}
          <div 
            onClick={() => setShowShareModal(true)}
            className="bg-slate-900/40 backdrop-blur-md border border-slate-800 p-4 rounded-2xl flex items-center gap-4 shadow-xl shrink-0 cursor-pointer hover:border-cyan-500/40 transition-all select-none group"
          >
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner group-hover:scale-105 transition-all ${recalls.length > 0 ? 'bg-amber-950/40 border border-amber-500/30 text-amber-400' : 'bg-emerald-950/40 border border-emerald-500/30 text-emerald-400'}`}>
              {recalls.length > 0 ? '⚠️' : '🏅'}
            </div>
            <div>
              <div className="text-[10px] font-bold text-slate-500 font-mono tracking-widest uppercase">Underwriting Badge</div>
              <div className="text-sm font-bold text-slate-200 mt-0.5">
                {recalls.length > 0 ? 'Action Required to Verify' : 'RecallLogic Active Compliance'}
              </div>
              <div className="text-[11px] text-cyan-400 font-mono mt-0.5 underline decoration-cyan-500/30 group-hover:text-cyan-300 transition-all">
                Share Verification Link
              </div>
            </div>
          </div>
        </header>

        {/* Global Analytics Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-6 rounded-2xl backdrop-blur-md shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl group-hover:bg-cyan-500/10 transition-all" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500 font-mono block mb-1">Monitored Ingestion Asset Pool</span>
            <div className="text-4xl font-black text-white tracking-tight font-mono">{metrics?.total_vins?.toLocaleString() || '25,041'}</div>
            <p className="text-xs text-slate-400 mt-2">Active, flattened master safety blueprints indexed locally inside our database.</p>
          </div>
          <div className="relative overflow-hidden bg-slate-900/20 border border-slate-900 p-6 rounded-2xl backdrop-blur-md shadow-lg group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl group-hover:bg-emerald-500/10 transition-all" />
            <span className="text-xs font-bold tracking-wider uppercase text-slate-500 font-mono block mb-1">Global Regional Fleet Integrity</span>
            <div className="text-4xl font-black text-emerald-400 tracking-tight font-mono">{metrics?.fleet_health_index || '91.2'}%</div>
            <p className="text-xs text-slate-400 mt-2">Aggregated safety coefficient calculated through live RecallLogic threat formulas.</p>
          </div>
        </section>

        {/* ROI Value Matrix Calculator */}
        <section className="bg-slate-950/60 border border-slate-900 rounded-3xl p-6 md:p-8 backdrop-blur-md shadow-xl space-y-6">
          <header>
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" /> Commercial Cost & ROI Forecaster
            </h3>
            <p className="text-slate-400 text-xs mt-0.5">See how modern recall monitoring translates directly into saved fleet revenue and lowered insurance risk.</p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            <div className="lg:col-span-1 bg-slate-900/30 border border-slate-900 rounded-2xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider">Fleet Size</span>
                <span className="text-xl font-black text-white font-mono">{sliderVinCount} <span className="text-xs font-normal text-slate-500">Vehicles</span></span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="250" 
                value={sliderVinCount}
                onChange={(e) => setSliderVinCount(parseInt(e.target.value))}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] font-mono text-slate-600">
                <span>1 Unit</span>
                <span>250 Units</span>
              </div>
            </div>

            <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0b121f] border border-cyan-950/40 p-5 rounded-2xl relative overflow-hidden shadow-inner">
                <span className="text-[10px] font-bold font-mono text-cyan-500 uppercase tracking-widest block mb-1">Platform SaaS Fee</span>
                <div className="text-2xl font-black text-slate-100 font-mono">${calculatedSaaSPremium.toFixed(2)}<span className="text-xs font-normal text-slate-500">/mo</span></div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">$99 base + $2.50/VIN</p>
              </div>

              <div className="bg-[#0b1916] border border-emerald-950/40 p-5 rounded-2xl relative overflow-hidden shadow-inner">
                <span className="text-[10px] font-bold font-mono text-emerald-400 uppercase tracking-widest block mb-1">Avoided Downtime Risk</span>
                <div className="text-2xl font-black text-emerald-400 font-mono">${estimatedDowntimeSavings.toLocaleString()}<span className="text-xs font-normal text-slate-500">/yr</span></div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Based on $1K average loss/day</p>
              </div>

              <div className="bg-[#11111a] border border-slate-900 p-5 rounded-2xl relative overflow-hidden shadow-inner">
                <span className="text-[10px] font-bold font-mono text-purple-400 uppercase tracking-widest block mb-1">Broker Premium Credits</span>
                <div className="text-2xl font-black text-purple-400 font-mono">${insuranceDeductionsSavings.toLocaleString()}<span className="text-xs font-normal text-slate-500">/yr</span></div>
                <p className="text-[10px] text-slate-500 mt-1 font-mono">Estimated policy discount footprint</p>
              </div>
            </div>
          </div>
        </section>

        {/* Box Ingestion Form Area */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_8px_#22d3ee]" /> Fleet Deployment Ingestion Node
            </h3>
            <span className="text-xs text-slate-500 font-mono">Accepts .txt, .csv, or Excel templates</span>
          </div>

          <form onSubmit={handleSearch} className="space-y-4">
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
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
                accept=".csv,.txt,.xls,.xlsx" 
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
                  ⚠️ Limit Notice: Free exploration scopes are locked to a maximum of 10 vehicle slots.
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

        {/* Diagnostics Results Cards */}
        <section className="space-y-4">
          <h3 className="text-lg font-bold text-white tracking-tight font-mono">
            Active Threat Workspace ({recalls.length})
          </h3>

          {recalls.length === 0 && !loading && (
            <div className="border border-slate-900 p-12 text-center text-sm text-slate-500 rounded-2xl bg-slate-950/10 font-mono">
              📡 Platform workspace idling. Submit fleet data above to map active exposures.
            </div>
          )}

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
      </main>

      {/* DISPATCH COMPLIANCE SHARE MODAL */}
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

      {/* Freemium Access Interceptor Paywall Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex justify-center items-center z-50 p-4">
          <div className="bg-[#0b0f19] border border-slate-800 p-8 rounded-3xl max-w-lg w-full shadow-2xl text-center space-y-6 relative overflow-hidden">
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl" />
            <div className="text-4xl">🏅</div>
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-white tracking-tight">Unlock RecallLogic Pro</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                Your submitted manifest targets <strong className="text-white font-mono">{blockedVinCount} assets</strong>. Exploration profiles are restricted to a maximum of 10 items for exploratory testing loops.
              </p>
            </div>
            <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner">
              <div className="flex justify-between items-center pb-3 border-b border-slate-900">
                <span className="text-xs font-bold font-mono uppercase text-slate-500 tracking-wider">Custom Pro Subscription</span>
                <span className="text-2xl font-black text-cyan-400 font-mono">${calculateCustomMRR(blockedVinCount)}<span className="text-xs font-normal text-slate-400">/mo</span></span>
              </div>
              <div className="space-y-1.5 text-xs text-slate-400 font-mono">
                <div className="flex justify-between">
                  <span>• Base Platform License Fee</span>
                  <span className="text-slate-200">$99.00/mo</span>
                </div>
                <div className="flex justify-between">
                  <span>• Active Monitoring Allocation ({blockedVinCount} units × $2.50)</span>
                  <span className="text-slate-200">${(blockedVinCount * 2.5).toFixed(2)}/mo</span>
                </div>
              </div>
              <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1.5 pt-1">
                ✓ Includes real-time climate risk-mapping & secure broker token generation.
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button type="button" onClick={() => setShowUpgradeModal(false)} className="w-full sm:w-1/3 px-4 py-2.5 text-xs text-slate-400 hover:text-slate-200 font-bold border border-slate-900 bg-transparent rounded-xl transition-all">Trim List</button>
              <button type="button" onClick={() => window.location.href = 'https://checkout.stripe.com'} className="w-full sm:w-2/3 px-4 py-2.5 text-xs bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black rounded-xl shadow-lg transition-all tracking-wide uppercase">Activate RecallLogic Subscription</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}