import React, { useState } from 'react';

export interface BrokerShareModalProps {
  isOpen: boolean;
  userTier?: string;
  shareUrl: string;
  onClose: () => void;
  onUpgrade?: () => void;
}

export const BrokerShareModal: React.FC<BrokerShareModalProps> = ({
  isOpen,
  shareUrl,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 font-mono text-slate-100 relative">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-base">🔗</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Share Live Underwriter Audit Portal
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="text-slate-400 hover:text-white transition p-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* BENEFIT-DRIVEN SUBTEXT */}
        <p className="text-xs text-slate-300 leading-relaxed font-sans">
          Send this live link to your commercial insurance broker or underwriter to verify active recall resolution and qualify for loss-control premium discounts.
        </p>

        {/* LINK COPY CONTAINER */}
        <div className="p-3 bg-[#070B14] border border-slate-800 rounded-xl space-y-2">
          <label className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Live Read-Only Audit URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-cyan-400 focus:outline-none font-mono truncate select-all"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2 text-xs font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy Link'}
            </button>
          </div>
        </div>

        {/* FOOTER CLOSE ACTION */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer border border-slate-700"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default BrokerShareModal;