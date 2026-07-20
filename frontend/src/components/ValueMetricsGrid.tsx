import React from 'react';

interface ValueMetricsGridProps {
  totalVins?: number;
  onOpenComplianceModal: () => void;
  onScrollToPricing: () => void;
}

export default function ValueMetricsGrid({
  totalVins = 25041,
  onOpenComplianceModal,
  onScrollToPricing
}: ValueMetricsGridProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
      
      {/* ANALYTICS NODE 1: DATA DEPTH METRIC */}
      <div className="bg-[#0b0f19]/60 border border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest block">
            Reference Data Cluster
          </span>
          <h3 className="text-3xl font-black text-white font-mono tracking-tight">
            {totalVins.toLocaleString()}
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Normalized manufacturer hazard definitions ingested programmatically from federal ledger arrays. Fully mapped to active multi-line framework bounds.
        </p>
      </div>

      {/* ANALYTICS NODE 2: MOJAVE HEAT ENVIRONMENTAL SCORER */}
      <div className="bg-[#0b0f19]/60 border border-slate-900 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative overflow-hidden">
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
            Predictive Stress Loops
          </span>
          <h3 className="text-white text-sm font-bold uppercase font-mono mt-1">
            High-Ambient Heat Multiplier
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          Platform maps incoming components against continuous extreme high temperature trends to isolate subassembly threat vectors before critical failure occurs.
        </p>
        <div className="text-[9px] font-mono text-amber-400/80 bg-amber-950/30 border border-amber-900/30 rounded px-2 py-1 uppercase tracking-wider font-bold text-center">
          🔥 Environment Focus Bounds: Las Vegas Corridor Area
        </div>
      </div>

      {/* ANALYTICS NODE 3: GLASSMORPHIC CERTIFICATE VERIFICATION BADGE */}
      <div className="bg-gradient-to-b from-slate-900 to-slate-950/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4 relative group">
        <div className="absolute top-3 right-3 text-[9px] bg-slate-800/80 text-slate-400 px-2 py-0.5 rounded border border-slate-700 font-mono font-bold">
          🔒 PRO ACCESS ONLY
        </div>
        <div className="space-y-1">
          <span className="text-[10px] font-mono font-black text-cyan-400 uppercase tracking-widest block">
            Broker Security Assets
          </span>
          <h3 className="text-slate-300 text-xs font-black uppercase tracking-wide font-mono">
            Underwriting Compliance Certificate
          </h3>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          Generate tokenized cryptographic live strings showing zero open liabilities to lower corporate commercial premium metrics natively.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onOpenComplianceModal}
            className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-[10px] uppercase font-bold rounded-xl transition-all"
          >
            View Certificate
          </button>
          <button
            type="button"
            onClick={onScrollToPricing}
            className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase font-bold rounded-xl transition-all"
          >
            Unlock
          </button>
        </div>
      </div>

    </section>
  );
}