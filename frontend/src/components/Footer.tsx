import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14]/95 text-slate-400 py-6 px-4 lg:px-8 mt-auto w-full z-20">
      <div className="max-w-[1680px] mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono">
        {/* Left Brand & Tagline */}
        <div className="flex items-center gap-3">
          <img
            src="/recall-logo.png"
            alt="RecallLogic Logo"
            className="h-6 w-auto object-contain hidden sm:inline-block"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <div className="font-bold text-slate-200 tracking-wide flex items-center gap-1.5">
              <span className="text-cyan-400">RECALLLOGIC™</span> CONTINUOUS RISK DEFENSE PLATFORM
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              © 2026 RecallLogic Inc. Continuous Risk Defense & Loss Control Platform.
            </div>
          </div>
        </div>

        {/* Center Direct Contacts */}
        <div className="flex flex-wrap items-center gap-6 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">✉️ Email:</span>
            <a
              href="mailto:dennis@recalllogic.ai"
              className="text-slate-300 hover:text-cyan-400 transition underline underline-offset-2"
            >
              dennis@recalllogic.ai
            </a>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500">📞 Phone:</span>
            <a href="tel:6613058785" className="text-slate-300 hover:text-cyan-400 transition">
              661.305.8785
            </a>
          </div>
        </div>

        {/* Right Status Pill */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] text-slate-300 font-semibold">
            Live Risk Defense Network Active
          </span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;