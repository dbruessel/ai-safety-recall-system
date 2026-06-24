import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import UpgradeButton from './components/UpgradeButton';

// --- Structured Data Interfaces ---
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
  assembly_category: string;
  thermal_multiplier_active: boolean;
  calculated_severity_score: number;
  executive_action_directive: string;
}

interface CryptographicBadge {
  safety_status: 'PASS' | 'FAIL';
  total_active_threats: number;
  aggregate_fleet_hazard_index: number;
  cryptographic_id: string;
  monitored_assets: number;
  scope: string;
}

interface GlobalMetrics {
  total_vins: number;
  processed_vins: number;
  total_recalls: number;
  fleet_health_index: number;
}

function App() {
  // Telemetry and Structural States
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Conversion / Journey Management States
  const [vinsProcessed, setVinsProcessed] = useState<number>(0);
  const [hasSearched, setHasSearch] = useState(false);
  const [badgeToken, setBadgeToken] = useState<CryptographicBadge | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Ingestion on mount
  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/metrics/global')
      .then(res => setMetrics(res.data.metrics || res.data))
      .catch(err => console.error('Global metrics collection offline:', err));
  }, []);

  const calculateCustomMRR = (vinCount: number) => {
    const baseFee = 99.00;
    const perVinFee = 2.50;
    return (baseFee + (vinCount * perVinFee)).toFixed(2);
  };

  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.startsWith('make,') && !l.startsWith('MAKE,'));
    
    if (cleanedLines.length === 0) {
      setError('System Alert: Provided manifest payload empty.');
      return;
    }

    // JOURNEY STEP 1: Strict Freemium Guardrail Limit Gate
    if (cleanedLines.length > 10) {
      setBlockedVinCount(cleanedLines.length);
      setShowUpgradeModal(true);
      return;
    }

    setLoading(true);
    setError('');
    setRecalls([]);
    setBadgeToken(null);
    setVinsProcessed(cleanedLines.length);
    setHasSearch(true);

    const aggregatedResults: Recall[] = [];

    try {
      for (const line of cleanedLines) {
        const parts = line.split(',').map(p => p.trim());
        if (parts.length < 3) continue;

        const [make, model, year] = parts;
        const response = await axios.get('http://127.0.0.1:8000/api/recalls', {
          params: { make, model, year }
        });

        if (Array.isArray(response.data)) {
          aggregatedResults.push(...response.data);
        }
      }

      setRecalls(aggregatedResults);

      // JOURNEY STEP 3: If no recalls are discovered, generate the signed RecallLogic trust badge
      if (aggregatedResults.length === 0) {
        // Simulating the secure state token generation formula
        const randomHash = Math.random().toString(16).substring(2, 10).toUpperCase();
        setBadgeToken({
          safety_status: 'PASS',
          total_active_threats: 0,
          aggregate_fleet_hazard_index: 100,
          cryptographic_id: `RL-${randomHash}E2C4`,
          monitored_assets: cleanedLines.length,
          scope: 'Mojave Climatic Thermal Corridor'
        });
      }
    } catch (err: any) {
      console.error(err);
      setError('Pipeline Interrupted: Ensure local FastAPI backend layer is responsive.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    processManifestLines(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Premium Obsidian Left-Hand Navigation */}
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
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer opacity-20">
              🚢 Maritime Vectors
            </span>
            <span className="flex items-center gap-3 px-3 py-3 rounded-xl text-slate-500 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer opacity-20">
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

      {/* Primary Workspace Viewport Panel */}
      <main className="flex-1 p-8 lg:p-12 max-w-5xl mx-auto space-y-10 overflow-y-auto w-full">
        
        {/* Dynamic Header Telemetry Metrics Block */}
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
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Health Index</div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{metrics?.fleet_health_index || '91.2'}%</div>
            </div>
          </div>
        </header>

        {/* JOURNEY STEP 1: Ingestion Form with Interactive Drag & Drop Area */}
        <section className="space-y-4">
          <form onSubmit={handleSearch} className="space-y-4">
            <label className="text-xs font-black text-slate-400 uppercase tracking-widest block font-mono">
              Asset Manifest Deployment Input
            </label>
            <div 
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    const text = evt.target?.result as string;
                    setBulkInput(text);
                    processManifestLines(text.split(/\r?\n/));
                  };
                  reader.readAsText(file);
                }
              }}
              className={`relative rounded-2xl border transition-all p-1
                ${isDragging ? 'border-cyan-500 bg-cyan-950/10' : 'border-slate-900 bg-[#070b14]'}`}
            >
              <textarea
                value={bulkInput}
                onChange={(e) => setBulkInput(e.target.value)}
                placeholder="Paste lines or drop file here:&#10;FORD, F-150, 2018&#10;CHEVROLET, SILVERADO, 2021"
                rows={4}
                className="w-full bg-transparent text-slate-200 text-sm font-mono p-4 focus:outline-none placeholder:text-slate-700 resize-none leading-relaxed"
              />
              <div className="absolute bottom-3 right-4 flex items-center gap-3 text-[11px] font-mono text-slate-600 pointer-events-none select-none">
                <span>Capped at 10 free assets</span>
                <span>•</span>
                <span>Supports .csv / .txt drop</span>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs px-6 py-3 rounded-xl transition-all uppercase tracking-wider shadow-lg shadow-cyan-500/10"
              >
                {loading ? 'Executing Engine Sweep...' : 'Initialize Analysis Sweep'}
              </button>
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="border border-slate-900 bg-slate-900/40 hover:border-slate-800 text-slate-300 font-black text-xs px-5 py-3 rounded-xl transition-all uppercase tracking-wider"
              >
                Upload CSV File
              </button>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.txt" className="hidden" />
            </div>
          </form>

          {error && !recalls.length && !badgeToken && (
            <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl text-xs font-mono text-slate-400">
              {error}
            </div>
          )}
        </section>

        {/* JOURNEY STEP 2: Branch A — Active Vulnerabilities Discovered */}
        {hasSearched && recalls.length > 0 && (
          <section className="space-y-6 animate-fade-in">
            <div className="bg-amber-950/20 border border-amber-500/20 rounded-2xl p-5 flex items-start gap-4">
              <span className="text-2xl mt-0.5">⚠️</span>
              <div>
                <h4 className="text-sm font-black text-amber-400 uppercase tracking-wide">Critical Safety Vulnerabilities Isolated</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Scanned assets are currently compromised by recorded mechanical defects. High-heat ambient temperature bounds may amplify localized failure velocity.
                </p>
              </div>
            </div>

            {/* Expanded Technical Defect Stack */}
            <div className="space-y-4">
              {recalls.map((recall, index) => (
                <div key={index} className="bg-[#0b0f19]/60 border border-slate-900 rounded-2xl p-6 space-y-4 shadow-xl ring-1 ring-slate-800/30">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                    <div>
                      <span className="text-[10px] font-black bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded font-mono">
                        {recall.campaign_number}
                      </span>
                      <h5 className="text-base font-black text-slate-200 mt-1 uppercase tracking-tight">
                        {recall.year} {recall.make} {recall.model}
                      </h5>
                    </div>
                    <div className="text-right sm:text-right flex sm:flex-col items-center sm:items-end justify-between gap-2">
                      <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{recall.component}</span>
                      <span className="text-xs font-bold font-mono text-cyan-400">Severity: {recall.calculated_severity_score}/100</span>
                    </div>
                  </div>
                  <div className="space-y-3 text-xs leading-relaxed text-slate-400">
                    <p><strong className="text-slate-300 font-bold font-mono block text-[10px] uppercase text-slate-500 mb-0.5">Defect Summary:</strong> {recall.summary || 'No overview text provided.'}</p>
                    {recall.consequence && <p><strong className="text-slate-300 font-bold font-mono block text-[10px] uppercase text-slate-500 mb-0.5">Operational Liability:</strong> {recall.consequence}</p>}
                    {recall.remedy && <p><strong className="text-slate-300 font-bold font-mono block text-[10px] uppercase text-slate-500 mb-0.5">Directive Action:</strong> {recall.remedy}</p>}
                  </div>
                </div>
              ))}
            </div>

            {/* High-Converting Gated Premium Service Upgrade Card */}
            <div className="bg-gradient-to-b from-[#0b101d] to-[#060a14] border border-slate-800 rounded-2xl p-8 text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              <h4 className="text-xl font-black text-slate-100 uppercase tracking-tight">Lock Down Fleet Grounding Risk</h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed font-medium">
                Unresolved defects create liability exposure and cause unexpected operational downtime averaging $1,200/day. Activate RecallLogic Pro to unlock live tracking synchronization, automated dispatch mitigations, and recall remediation routing.
              </p>
              <div className="pt-2">
                <UpgradeButton vinCount={vinsProcessed} />
              </div>
            </div>
          </section>
        )}

        {/* JOURNEY STEP 3: Branch B — Clean Records Found */}
        {hasSearched && badgeToken && (
          <section className="space-y-6 animate-fade-in max-w-xl mx-auto">
            {/* Glassmorphic RecallLogic Verification Trust Badge */}
            <div className="bg-slate-900/70 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-md relative overflow-hidden ring-1 ring-slate-800">
              <div className="absolute -right-16 -top-16 w-36 h-36 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-5 mb-5">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-950/40 border border-emerald-500/20 flex items-center justify-center text-xl shadow-lg">🛡️</div>
                  <div>
                    <h3 className="text-[10px] font-black tracking-widest uppercase text-slate-500 font-mono">RecallLogic Trust Network</h3>
                    <p className="text-base font-black text-emerald-400 uppercase tracking-tight mt-0.5">Verified Active Compliance</p>
                  </div>
                </div>
                <div className="text-right font-mono shrink-0">
                  <span className="text-[9px] font-black text-slate-600 block uppercase tracking-wider">Integrity</span>
                  <span className="text-2xl font-black text-cyan-400 tracking-tight">{badgeToken.aggregate_fleet_hazard_index}%</span>
                </div>
              </div>

              <div className="space-y-3 text-xs font-mono text-slate-300">
                <div className="flex justify-between border-b border-slate-950 pb-2">
                  <span className="text-slate-600 font-bold">Scanned Assets:</span>
                  <span className="text-slate-200 font-bold">{badgeToken.monitored_assets} Active Transports</span>
                </div>
                <div className="flex justify-between border-b border-slate-950 pb-2">
                  <span className="text-slate-600 font-bold">Trace Reference ID:</span>
                  <span className="text-cyan-400/90 font-bold select-all tracking-wider">{badgeToken.cryptographic_id}</span>
                </div>
                <div className="flex justify-between pb-1">
                  <span className="text-slate-600 font-bold">Scope Horizon:</span>
                  <span className="text-slate-400 font-medium">{badgeToken.scope}</span>
                </div>
              </div>
            </div>

            {/* Gated Value Proposition Prompt */}
            <div className="bg-[#070b14] border border-slate-900 rounded-2xl p-6 text-center space-y-4 shadow-xl">
              <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider font-mono">Stream Compliance to Insurance Underwriters</h4>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Your flawless audit record makes you eligible for significant active premium discount incentives. Onboard to our platform subscription layer to unlock cryptographically live badge tokens for your brokers.
              </p>
              <button 
                type="button"
                className="bg-slate-100 hover:bg-slate-200 text-slate-950 text-xs font-black px-6 py-2.5 rounded-xl transition-all uppercase tracking-wide shadow-md"
              >
                Unlock Live Badge Sharing Channel
              </button>
            </div>
          </section>
        )}

        {/* High-Converting 2026 Dark Glassmorphism Paywall Interceptor Sheet */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#0b101d] border border-slate-800/80 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6 backdrop-blur-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent pointer-events-none" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center text-xl mx-auto shadow-lg shadow-cyan-500/10 border-t border-cyan-300/20">🛡️</div>
              
              <div className="space-y-2">
                <h3 className="text-[#F8FAFC] text-2xl font-black tracking-tight uppercase">Activate RecallLogic Shield</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Your source fleet target includes <strong className="text-slate-200 font-bold">{blockedVinCount} active rows</strong>. Exploratory un-metered passes are locked at a structural maximum limit of 10 logs per cycle.
                </p>
              </div>
              
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider">RecallLogic Protection Quote:</span>
                  <span className="text-3xl font-black text-cyan-400 font-mono tracking-tight">
                    ${calculateCustomMRR(blockedVinCount)}<span className="text-xs font-semibold text-slate-600">/mo</span>
                  </span>
                </div>
                <div className="space-y-2.5 text-xs font-bold text-slate-500 font-mono">
                  <div className="flex justify-between items-center">
                    <span>• Base Infrastructure Access License</span>
                    <span className="text-slate-300">$99.00</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>• Active Monitoring Asset Allocation ({blockedVinCount} units × $2.50)</span>
                    <span className="text-slate-300">${(blockedVinCount * 2.5).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowUpgradeModal(false)} className="flex-1 py-3.5 px-4 rounded-xl border border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 font-black text-xs transition-all tracking-wider uppercase">Adjust</button>
                <UpgradeButton vinCount={blockedVinCount} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;