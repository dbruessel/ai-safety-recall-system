import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-800/80 bg-[#070B14] py-8 px-6 text-slate-400 font-mono text-xs">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
        
        {/* BRANDING & COPYRIGHT */}
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-white font-bold text-sm">
            <span className="text-[#06B6D4]">🛡️</span> RecallLogic Safety Systems
          </div>
          <p className="text-[11px] text-slate-500">
            © 2026 RecallLogic Inc. Continuous Safety &amp; Risk Intelligence.
          </p>
        </div>

        {/* DIRECT CONTACT & SUPPORT LINKS */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-xs">
          {/* EMAIL SUPPORT */}
          <div className="flex items-center gap-2">
            <span className="text-[#06B6D4]">✉️</span>
            <span className="text-slate-500">Email:</span>
            <a 
              href="mailto:dennis@recalllogic.ai" 
              className="text-slate-200 hover:text-[#06B6D4] transition font-bold underline underline-offset-4 decoration-cyan-500/30 hover:decoration-cyan-400"
            >
              dennis@recalllogic.ai
            </a>
          </div>

          {/* PHONE SUPPORT */}
          <div className="flex items-center gap-2">
            <span className="text-[#06B6D4]">📞</span>
            <span className="text-slate-500">Phone:</span>
            <a 
              href="tel:6613058785" 
              className="text-slate-200 hover:text-[#06B6D4] transition font-bold underline underline-offset-4 decoration-cyan-500/30 hover:decoration-cyan-400"
            >
              661.305.8785
            </a>
          </div>
        </div>

        {/* SLA & RESPONSE BADGE */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-semibold">Live Fleet Support Active</span>
        </div>

      </div>
    </footer>
  );
};

export default Footer;