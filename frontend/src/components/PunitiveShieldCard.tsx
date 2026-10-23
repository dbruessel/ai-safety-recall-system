import React from 'react';
import { ShieldCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { usePunitiveExposure, RecallTask } from './usePunitiveExposure';

interface Props {
  tasks: RecallTask[];
  onRemediateClick?: () => void;
}

export const PunitiveShieldCard: React.FC<Props> = ({ tasks, onRemediateClick }) => {
  const { isShieldActive, nuclearCount, formattedExposure, activeDefectCount } =
    usePunitiveExposure(tasks);

  return (
    <div
      className={`rounded-xl border p-5 transition-all ${
        isShieldActive
          ? 'bg-slate-900/60 border-emerald-500/30 text-slate-100 shadow-[0_0_20px_rgba(16,185,129,0.05)]'
          : 'bg-[#0d1322] border-rose-500/40 text-slate-100 shadow-[0_0_25px_rgba(244,63,94,0.1)]'
      }`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          {isShieldActive ? (
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
          ) : (
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse">
              <ShieldAlert className="w-5 h-5" />
            </div>
          )}
          <div>
            <h4 className="text-xs font-semibold tracking-wider uppercase text-slate-400">
              InsurTech Loss Control Shield
            </h4>
            <p className="text-sm font-medium text-slate-200">
              {isShieldActive ? 'Full Mechanical Defense Active' : 'Uninsurable Punitive Exposure Detected'}
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full font-bold uppercase tracking-wider ${
            isShieldActive
              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
              : 'bg-rose-950 text-rose-400 border border-rose-800'
          }`}
        >
          {isShieldActive ? '100% Protected' : `${nuclearCount} Critical Breach`}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        {/* Metric 1: Total Dollar Exposure */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Punitive Liability Exposure</div>
          <div
            className={`text-2xl font-extrabold tracking-tight ${
              isShieldActive ? 'text-emerald-400' : 'text-rose-500'
            }`}
          >
            {formattedExposure}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {isShieldActive ? 'Zero open liability gaps' : 'Policy excludes willful/known defects'}
          </div>
        </div>

        {/* Metric 2: Active Defects */}
        <div>
          <div className="text-xs text-slate-400 mb-1">Open Recall Threats</div>
          <div className="text-2xl font-bold text-slate-200">
            {activeDefectCount}{' '}
            <span className="text-xs font-normal text-slate-400">unit(s)</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {nuclearCount > 0 ? `${nuclearCount} nuclear ($250k tier)` : 'Standard maintenance tracking'}
          </div>
        </div>

        {/* Metric 3: Action / Fleetio CTA */}
        <div className="flex flex-col justify-center items-start md:items-end">
          {!isShieldActive ? (
            <button
              onClick={onRemediateClick}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md hover:shadow-rose-500/20"
            >
              Remediate Exposure
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <div className="text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-3 py-1.5 rounded-lg">
              ✓ Underwriter 15% Credit Eligible
            </div>
          )}
        </div>
      </div>
    </div>
  );
};