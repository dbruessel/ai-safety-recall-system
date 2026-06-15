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
  assembly_category: string;
  thermal_multiplier_active: boolean;
  calculated_severity_score: number;
  executive_action_directive: string;
}

interface GlobalMetrics {
  total_vins: number;
  processed_vins: number;
  total_recalls: number;
  fleet_health_index: number;
}

function App() {
  const [metrics, setMetrics] = useState<GlobalMetrics | null>(null);
  const [bulkInput, setBulkInput] = useState('');
  const [recalls, setRecalls] = useState<Recall[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [blockedVinCount, setBlockedVinCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/api/metrics/global')
      .then(res => setMetrics(res.data.metrics || res.data))
      .catch(err => console.error('Global metrics collection offline:', err));
  }, []);

  const processManifestLines = async (rawLines: string[]) => {
    const cleanedLines = rawLines.map(l => l.trim()).filter(l => l.length > 0);
    
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
    const file = e.target.files?.[0];
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

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex font-sans antialiased selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Premium Obsidian Left-Hand Navigation */}
      <aside className="w-64 border-r border-slate-900 bg-[#0b0f19]/80 p-6 hidden lg:flex flex-col justify-between shrink-0 backdrop-blur-md">
        <div className="space-y-8">
          <div className="flex items-center gap-3 px-2">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center text-lg shadow-lg shadow-cyan-500/20 border border-cyan-400/20">🛡️</div>
            <div className="flex flex-col">
              <span className="font-black text-slate-100 tracking-tight text-sm uppercase">Aegis Shield</span>
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
              <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Global Health Threshold</div>
              <div className="text-3xl font-black text-emerald-400 font-mono tracking-tight">{metrics?.fleet_health_index || '91.2'}%</div>
            </div>
          </div>
        </header>

        {/* Tactical Command Ingestion Console */}
        <section className="space-y-4">
          <div className="text-xs font-black text-slate-500 uppercase tracking-widest px-1">Asset Ingestion Console</div>
          
          <form onSubmit={handleSearch} className="space-y-5">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Modern Drag and Drop Workspace Block */}
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

              {/* Advanced Code-Style Textarea Console */}
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

        {error && (
          <div className="text-cyan-400 p-4 bg-cyan-950/10 border border-cyan-900/40 rounded-xl font-mono text-xs flex items-center gap-3 shadow-inner">
            <span className="text-sm">📡</span> {error}
          </div>
        )}

        {/* Real-time Streaming Threat Intelligence workspace */}
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
              const isCritical = recall.calculated_severity_score >= 75;
              return (
                <div 
                  key={index} 
                  className={`border rounded-2xl p-6 transition-all duration-300 shadow-2xl relative overflow-hidden backdrop-blur-sm ${
                    isCritical 
                      ? 'border-red-500/20 bg-gradient-to-b from-red-950/10 via-[#030712] to-[#030712]' 
                      : 'border-slate-900 bg-[#0b0f19]/20 hover:border-slate-800'
                  }`}
                >
                  {/* Subtle technical corner grid background marker line */}
                  <div className={`absolute top-0 right-0 h-12 w-12 border-t-2 border-r-2 opacity-10 pointer-events-none ${isCritical ? 'border-red-500' : 'border-cyan-500'}`} />
                  
                  <div className="flex justify-between items-start flex-wrap gap-4 mb-4 relative z-10">
                    <div>
                      <h4 className="font-black text-slate-100 text-xl tracking-tight uppercase">{recall.make} <span className="text-cyan-400 font-mono font-medium">{recall.model}</span> ({recall.year})</h4>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCritical ? 'bg-red-950/60 text-red-400 border border-red-500/20' : 'bg-slate-900 text-cyan-400 border border-slate-800'
                        }`}>
                          {recall.assembly_category}
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
                        Severity Weight: <span className={`font-black ${isCritical ? 'text-red-400' : 'text-cyan-400'}`}>{recall.calculated_severity_score}/100</span>
                      </span>
                    </div>
                  </div>
                  
                  {/* Modern Score Metric Progress Bar */}
                  <div className="w-full bg-slate-900 h-1.5 rounded-full mb-5 overflow-hidden border border-slate-800/40">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${isCritical ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-cyan-500 to-indigo-500'}`}
                      style={{ width: `${recall.calculated_severity_score}%` }}
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

        {/* High-Converting 2026 Dark Glassmorphism Paywall Interceptor Sheet */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/80 flex justify-center items-center z-50 backdrop-blur-md p-4 animate-fade-in">
            <div className="bg-[#0b101d] border border-slate-800/80 p-8 sm:p-10 rounded-3xl max-w-md w-full shadow-2xl text-center space-y-6 backdrop-blur-2xl relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/[0.02] to-transparent pointer-events-none" />
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 flex items-center justify-center text-xl mx-auto shadow-lg shadow-cyan-500/10 border-t border-cyan-300/20">🛡️</div>
              
              <div className="space-y-2">
                <h3 className="text-[#F8FAFC] text-2xl font-black tracking-tight uppercase">Activate Core Protection</h3>
                <p className="text-slate-400 text-xs leading-relaxed font-medium">
                  Your source fleet target includes <strong className="text-slate-200 font-bold">{blockedVinCount} active rows</strong>. Exploratory un-metered passes are locked at a structural maximum limit of 10 logs per cycle.
                </p>
              </div>
              
              {/* Premium Calculated Ledger Breakdown Card */}
              <div className="bg-slate-950/60 border border-slate-900 rounded-2xl p-5 text-left space-y-4 shadow-inner">
                <div className="flex justify-between items-center border-b border-slate-900 pb-3">
                  <span className="font-black text-slate-400 text-[10px] uppercase tracking-wider">Aegis Protection Quote:</span>
                  <span className="text-3xl navigate-metrics font-black text-cyan-400 font-mono tracking-tight">
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
                <div className="text-[10px] text-emerald-400 font-black tracking-wide border-t border-slate-900 pt-3 flex items-center gap-1.5 leading-relaxed uppercase">
                  ✓ Continuous database verification bound to regional ambient weather indicators.
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowUpgradeModal(false)} 
                  className="flex-1 py-3.5 px-4 rounded-xl border border-slate-900 bg-transparent text-slate-500 hover:text-slate-300 font-black text-xs transition-all tracking-wider uppercase"
                >
                  Adjust
                </button>
                <button 
                  type="button" 
                  onClick={() => alert("Forwarding token context to Stripe checkout hooks...")} 
                  className="flex-[2] py-3.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 text-white font-black text-xs transition-all shadow-lg shadow-cyan-500/20 active:scale-[0.98] hover:opacity-95 uppercase tracking-wider"
                >
                  Deploy Aegis Shield
                </button>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default App;