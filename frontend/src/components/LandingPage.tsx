import React, { useState } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
  totalGlobalRecalls?: number;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSignIn, 
  totalGlobalRecalls = 124892 // Fallback or direct count from nightly cron job
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-slate-950">
      
      {/* GLOBAL TOP NAVIGATION HEADER WITH CRON METRIC COUNTER */}
      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* BRAND LOGO & CORE POSITIONING */}
          <div className="flex items-center gap-3">
            <img 
              src="/recall-logo.png" 
              alt="RecallLogic Logo" 
              className="h-9 w-auto object-contain"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-white text-base tracking-tight font-mono">RECALLLOGIC</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold uppercase tracking-wider">
                  Verified Intelligence
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Active Operational Risk & Compliance Control</p>
            </div>
          </div>

          {/* RIGHT SIDE: LIVE NIGHTLY CRON METRIC + SIGN IN */}
          <div className="flex items-center gap-4 sm:gap-6">
            
            {/* NIGHTLY CRON RECALL COUNTER */}
            <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800/80">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <div className="text-[11px] font-mono">
                <span className="text-slate-400">Nightly NHTSA Sync: </span>
                <span className="text-emerald-400 font-bold tracking-wide">
                  {totalGlobalRecalls.toLocaleString()}
                </span>
                <span className="text-slate-400"> Active Recalls Monitored</span>
              </div>
            </div>

            <button
              onClick={onSignIn}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/10 transition-all cursor-pointer font-mono"
            >
              Sign In to Console →
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION — HIGH CONTRAST & TECH-FOCUSED */}
      <section className="relative pt-20 pb-20 px-6 max-w-6xl mx-auto text-center space-y-6 overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Verified Safety Intelligence Platform</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
          Continuous Recall Intelligence <br />
          <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
            For Modern Commercial Fleets
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto font-normal leading-relaxed">
          RecallLogic runs automated nightly cron audits against official NHTSA databases to eliminate safety risks, document proof of remedy, and output underwriter-ready compliance certificates.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onSignIn}
            className="w-full sm:w-auto px-8 py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-sm rounded-xl shadow-xl shadow-emerald-500/20 transition-all cursor-pointer font-mono"
          >
            Launch Workspace Console
          </button>
        </div>
      </section>

      {/* TECH ARCHITECTURE CARDS — WHITE / EMERALD ACCENTS */}
      <section className="px-6 py-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-3 text-slate-900">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-lg">
            ⚡
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-mono">Nightly Cron Execution</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Automatic background indexing matches your vehicle inventory against official NHTSA safety campaigns every 24 hours.
          </p>
          <div className="pt-2 text-[11px] font-mono font-bold text-emerald-600">
            ✓ Zero Manual VIN Searching
          </div>
        </div>

        {/* Card 2 */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-3 text-slate-900">
          <div className="w-10 h-10 rounded-xl bg-cyan-100 border border-cyan-200 flex items-center justify-center text-cyan-700 font-bold text-lg">
            🛡️
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-mono">Underwriter Risk Audits</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Generates verifiable, encrypted proof-of-compliance reports for insurance carriers to eliminate high policy surcharges.
          </p>
          <div className="pt-2 text-[11px] font-mono font-bold text-cyan-600">
            ✓ Carrier-Grade Audit Certificates
          </div>
        </div>

        {/* Card 3 */}
        <div className="p-6 bg-white rounded-2xl border border-gray-200 shadow-xl space-y-3 text-slate-900">
          <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-800 font-bold text-lg">
            📋
          </div>
          <h3 className="text-base font-extrabold text-slate-900 font-mono">Verified Proof of Remedy</h3>
          <p className="text-xs text-slate-600 leading-relaxed font-sans">
            Upload dealer work orders and receipt invoices directly to permanently close safety tasks in your fleet liability matrix.
          </p>
          <div className="pt-2 text-[11px] font-mono font-bold text-slate-700">
            ✓ Permanent Audit Audit-Trail
          </div>
        </div>

      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 font-mono">
        © 2026 RecallLogic Inc. Verified Safety Intelligence Platform.
      </footer>
    </div>
  );
};