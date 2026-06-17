import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import UpgradeButton from './components/UpgradeButton';

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

  const calculateCustomMRR = (vinCount: number) => {
    const baseFee = 99.00;
    const perVinFee = 2.50;
    return (baseFee + (vinCount * perVinFee)).toFixed(2);
  };

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

        {/* ... (The remainder of your logic blocks remain unchanged here) */}

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