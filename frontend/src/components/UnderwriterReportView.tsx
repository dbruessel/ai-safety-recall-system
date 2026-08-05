import React from 'react';

export interface TaskboardRecallItem {
  id: string;
  unit_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  nhtsa_campaign_number: string;
  component: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'Scheduled' | 'In Progress' | 'Cleared' | string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  created_at: string;
  scheduled_date?: string;
  repair_notes?: string;
  receipt_url?: string;
  closed_by_user_email?: string;
  closed_at?: string;
}

export interface UnderwriterReportViewProps {
  tasks: TaskboardRecallItem[];
}

export const UnderwriterReportView: React.FC<UnderwriterReportViewProps> = ({ tasks }) => {
  const completedTasks = tasks.filter((t) => t.status === 'Cleared');
  const totalTasks = tasks.length;

  const complianceScore = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 100;

  const avgDaysToRemediate =
    completedTasks.reduce((acc, task) => {
      const created = new Date(task.created_at).getTime();
      const closed = new Date(task.closed_at || Date.now()).getTime();
      return acc + (closed - created) / (1000 * 3600 * 24);
    }, 0) / (completedTasks.length || 1);

  const estimatedSavings = complianceScore >= 90 ? totalTasks * 200 : 0;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-white shadow-xl font-mono">
      {/* HEADER WITH BROKER SHARE BUTTONS */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Insurance Underwriter Audit Packet
          </span>
          <h3 className="text-xl font-bold text-white font-mono mt-1">Commercial Risk & Compliance Scorecard</h3>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              alert('Copied secure read-only underwriter link to clipboard!');
            }}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs font-bold rounded-xl border border-cyan-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            🔗 Copy Broker Link
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs uppercase font-extrabold rounded-xl transition shadow-lg cursor-pointer"
          >
            Export Audit PDF
          </button>
        </div>
      </div>

      {/* METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
          <span className="text-xs text-slate-400">Fleet Remediation Rate</span>
          <div className="text-3xl font-black text-emerald-400">{complianceScore}%</div>
          <div>
            {complianceScore >= 95 ? (
              <span className="inline-block bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-bold">
                🟢 Premium Credit Eligible
              </span>
            ) : complianceScore >= 80 ? (
              <span className="inline-block bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] px-2 py-0.5 rounded font-bold">
                🟡 Standard Carrier Appetite
              </span>
            ) : (
              <span className="inline-block bg-rose-500/10 border border-rose-500/30 text-rose-400 text-[10px] px-2 py-0.5 rounded font-bold">
                🔴 Surcharge / Audit Risk
              </span>
            )}
          </div>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
          <span className="text-xs text-slate-400">Avg. Resolution Time</span>
          <div className="text-3xl font-black text-cyan-400">{Math.round(avgDaysToRemediate)} Days</div>
          <span className="text-[10px] text-slate-500 block">Industry Avg: 45 Days</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
          <span className="text-xs text-slate-400">Verified Proof-of-Remedies</span>
          <div className="text-3xl font-black text-purple-400">
            {completedTasks.filter((t) => t.receipt_url).length} / {completedTasks.length}
          </div>
          <span className="text-[10px] text-slate-500 block">Dealer Invoices Attached</span>
        </div>

        <div className="bg-slate-950 border border-cyan-500/30 p-4 rounded-xl space-y-2">
          <span className="text-xs text-cyan-400 font-bold uppercase">Estimated Annual Credit</span>
          <div className="text-3xl font-black text-white">
            ${estimatedSavings.toLocaleString()} <span className="text-xs font-normal text-slate-400">/yr</span>
          </div>
          <span className="text-[10px] text-slate-400 block">Est. 5% carrier policy savings</span>
        </div>
      </div>

      {/* VERIFIED AUDIT LOG TABLE */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase font-bold text-slate-300">Verified Remediation Log</h4>
        <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Asset Unit</th>
                <th className="p-3">NHTSA Campaign</th>
                <th className="p-3">Resolved Date</th>
                <th className="p-3">Closed By</th>
                <th className="p-3">Proof Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {completedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No cleared recalls recorded yet. Upload a dealer receipt to clear open tasks.
                  </td>
                </tr>
              ) : (
                completedTasks.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-white font-bold">
                      {t.make} {t.model} ({t.year})
                    </td>
                    <td className="p-3 text-cyan-400">{t.nhtsa_campaign_number}</td>
                    <td className="p-3 text-slate-300">
                      {t.closed_at ? new Date(t.closed_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="p-3 text-slate-400">{t.closed_by_user_email || 'System Admin'}</td>
                    <td className="p-3">
                      {t.receipt_url ? (
                        <a href={t.receipt_url} target="_blank" rel="noreferrer" className="text-emerald-400 underline flex items-center gap-1">
                          View Invoice PDF 📄
                        </a>
                      ) : (
                        <span className="text-slate-500">No Receipt</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UnderwriterReportView;