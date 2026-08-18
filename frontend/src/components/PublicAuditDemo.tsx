import React, { useState } from 'react';

interface PublicAuditDemoProps {
  onSubscribe: () => void;
}

export const PublicAuditDemo: React.FC<PublicAuditDemoProps> = ({ onSubscribe }) => {
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedNote, setCopiedNote] = useState<boolean>(false);
  const [brokerageName, setBrokerageName] = useState<string>('Apex Commercial Risk');

  const underwriterNoteText = `UNDERWRITER SUBMISSION NOTE:
Attached is the live RecallLogic Risk & Safety Scorecard for Las Vegas Commercial Transit Co. (48 Monitored Power Units). The insured maintains automated VIN recall tracking with a 94% remediation rate and an average 11-day resolution cycle. All open safety recalls are verified via attached dealer receipts. We request application of the 5% Loss Control Safety Credit for the upcoming policy term.`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/audit/demo?broker=${encodeURIComponent(brokerageName)}`);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyNote = () => {
    navigator.clipboard.writeText(underwriterNoteText);
    setCopiedNote(true);
    setTimeout(() => setCopiedNote(false), 2000);
  };

  const handleExportPdf = () => {
    alert('Simulating Carrier-Grade PDF Generation: Downloading Underwriter Risk Packet...');
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black">
      
      {/* BROKER PARTNER CO-BRANDING TOP BANNER */}
      <div className="bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-b border-[#06B6D4]/40 px-4 py-2.5 text-xs font-mono">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06B6D4] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06B6D4]"></span>
            </span>
            <span className="text-cyan-300 font-bold uppercase tracking-wider">
              Broker Placement Portal
            </span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-300">
              Co-Branded Carrier Underwriting Packet
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px] hidden md:inline">Customize Brokerage:</span>
            <input
              type="text"
              value={brokerageName}
              onChange={(e) => setBrokerageName(e.target.value)}
              placeholder="Your Brokerage Name"
              className="bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-xs text-cyan-300 font-mono focus:border-[#06B6D4] outline-none"
            />
            <button
              onClick={onSubscribe}
              className="px-3 py-1 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-extrabold text-[11px] rounded transition-all cursor-pointer font-mono whitespace-nowrap"
            >
              Mandate $249 Pro Tier for Fleets
            </button>
          </div>
        </div>
      </div>

      {/* HEADER NAV */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F17]/90 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/recall-logo.png" alt="RecallLogic" className="h-7 w-auto" />
          <div className="flex items-center gap-2 font-mono">
            <span className="font-extrabold text-white text-base">RecallLogic</span>
            <span className="text-slate-600">|</span>
            <span className="text-xs text-slate-400 font-semibold">Risk &amp; Underwriting Partner Engine</span>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Prepared for: <strong className="text-white">Las Vegas Commercial Transit Co.</strong> (48 VINs)</span>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
        
        {/* BROKER PARTNER HEADER BOX */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-900/90 border border-slate-800 p-6 shadow-xl backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#06B6D4]/10 border border-[#06B6D4]/30 text-[10px] font-mono text-[#06B6D4] font-bold uppercase tracking-wider mb-2">
              🛡️ BROKERAGE PRACTICE: {brokerageName.toUpperCase()}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Underwriter Compliance &amp; Risk Portal
            </h1>
            <p className="text-slate-400 text-xs mt-1 font-sans">
              Audit-grade proof of recall remediation engineered to eliminate carrier surcharges and unlock policy credits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span>{copiedLink ? 'Link Copied!' : 'Copy Co-Branded Client Invite'}</span>
            </button>
          </div>
        </div>

        {/* AUDIT SCORECARD CARD */}
        <div className="rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6">
          
          {/* ACTION BUTTON BAR */}
          <div className="flex items-center justify-between flex-wrap gap-3 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-bold text-[#06B6D4] font-mono uppercase tracking-widest block">
                CARRIER RENEWAL AUDIT PACKET
              </span>
              <h2 className="text-xl font-bold text-white font-mono mt-0.5">
                Commercial Risk &amp; Compliance Scorecard
              </h2>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleExportPdf}
                className="px-4 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 text-xs font-mono font-black flex items-center gap-2 transition-all shadow-md shadow-cyan-500/10 cursor-pointer uppercase tracking-wider"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>EXPORT AUDIT PDF</span>
              </button>
            </div>
          </div>

          {/* KEY UNDERWRITING METRICS GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Metric 1: Surcharge Risk Status */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">Surcharge Risk Status</span>
              <div className="text-3xl font-black text-emerald-400 font-mono">94% Clean</div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono text-emerald-400 font-bold">
                <span>SURCHARGE ELIMINATED</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-tight mt-1">
                Zero open Tier-1 critical safety risks remaining.
              </p>
            </div>

            {/* Metric 2: Underwriter Audit Speed */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">Underwriter Audit Speed</span>
              <div className="text-3xl font-black text-cyan-400 font-mono">11 Days</div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 font-bold">
                <span>4x FASTER THAN INDUSTRY</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-tight mt-1">
                Demonstrates proactive insured risk mitigation.
              </p>
            </div>

            {/* Metric 3: Carrier Audit Proof */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <span className="text-[11px] font-mono text-slate-400 block">Carrier Audit Proof</span>
              <div className="text-3xl font-black text-white font-mono">
                28 <span className="text-slate-600 text-xl font-normal">/ 30</span>
              </div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-300 font-bold">
                <span>AUDIT-GRADE INVOICES</span>
              </div>
              <p className="text-[10px] text-slate-500 font-sans leading-tight mt-1">
                100% backed by attached OEM repair receipts.
              </p>
            </div>

            {/* Metric 4: Negotiated Premium Reduction */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 bg-emerald-950/10 space-y-2">
              <span className="text-[11px] font-mono text-emerald-400 font-bold block uppercase tracking-wider">
                NEGOTIATED PREMIUM SAVINGS
              </span>
              <div className="text-3xl font-black text-emerald-400 font-mono">$12,450 <span className="text-xs font-normal text-slate-400">/yr</span></div>
              <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-[10px] font-mono text-emerald-300 font-black">
                <span>NET CLIENT ROI: +$9,462/yr</span>
              </div>
              <p className="text-[10px] text-slate-400 font-sans leading-tight mt-1">
                Calculated at 5% policy credit vs $2,988/yr Pro cost.
              </p>
            </div>

          </div>

          {/* COPYABLE UNDERWRITER SUBMISSION NOTE BOX */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider flex items-center gap-1.5">
                <span>📋 UNDERWRITER SUBMISSION CHEAT SHEET</span>
              </span>
              <button
                onClick={handleCopyNote}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[11px] font-mono font-bold transition-all cursor-pointer"
              >
                {copiedNote ? 'Copied Note!' : 'Copy Submission Text'}
              </button>
            </div>
            <p className="text-xs text-slate-300 font-mono bg-slate-900 p-3 rounded-lg border border-slate-800 leading-relaxed italic">
              "{underwriterNoteText}"
            </p>
          </div>

          {/* VERIFIED REMEDIATION LOG TABLE */}
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Verified Remediation Log (Carrier Attachment)
            </h3>

            <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-900/80 border-b border-slate-800 text-slate-400 text-[11px] uppercase">
                  <tr>
                    <th className="py-3 px-4">Asset Unit</th>
                    <th className="py-3 px-4">NHTSA Campaign</th>
                    <th className="py-3 px-4">Resolved Date</th>
                    <th className="py-3 px-4">Closed By</th>
                    <th className="py-3 px-4">Proof Document</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-white">Freightliner Cascadia (2022)</td>
                    <td className="py-3 px-4 text-[#06B6D4] underline cursor-pointer">23V889000</td>
                    <td className="py-3 px-4 text-emerald-400">Aug 12, 2026</td>
                    <td className="py-3 px-4">Fleet Manager (D. Vance)</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 font-semibold">
                        📄 Dealer_Receipt_889.pdf
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-white">Tesla Model S (2021)</td>
                    <td className="py-3 px-4 text-[#06B6D4] underline cursor-pointer">23V112000</td>
                    <td className="py-3 px-4 text-emerald-400">Aug 04, 2026</td>
                    <td className="py-3 px-4">Service Admin</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 font-semibold">
                        📄 Tesla_OTA_Confirmation.pdf
                      </span>
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-900/40">
                    <td className="py-3 px-4 font-bold text-white">Ford F-150 Lightning (2023)</td>
                    <td className="py-3 px-4 text-[#06B6D4] underline cursor-pointer">24V091000</td>
                    <td className="py-3 px-4 text-emerald-400">Jul 28, 2026</td>
                    <td className="py-3 px-4">Service Admin</td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-cyan-300 font-semibold">
                        📄 Ford_Dealer_WorkOrder.pdf
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

        </div>

      </main>
    </div>
  );
};

export default PublicAuditDemo;