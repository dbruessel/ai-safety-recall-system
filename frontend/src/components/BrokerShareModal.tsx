import React, { useState } from 'react';

export interface BrokerShareModalProps {
  isOpen: boolean;
  userTier: string;
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
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy share link:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0B101D] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-5 text-slate-100 font-sans relative">
        
        {/* MODAL HEADER */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
              🛡️
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono tracking-tight">
                Underwriter Audit Link
              </h3>
              <p className="text-xs text-slate-400">
                Share verifiable recall compliance with insurance carriers.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* LINK COPY CONTAINER */}
        <div className="space-y-2">
          <label className="block text-xs font-mono font-semibold text-slate-400 uppercase tracking-wider">
            Read-Only Audit URL
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-[#070B14] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-300 font-mono focus:outline-none select-all overflow-hidden text-ellipsis whitespace-nowrap"
            />
            <button
              type="button"
              onClick={handleCopy}
              className={`px-4 py-2.5 text-xs font-bold font-mono rounded-xl transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
                copied
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/10'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy'}
            </button>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1">
            Anyone with this secure link can view your real-time compliance status without logging in.
          </p>
        </div>

        {/* FOOTER CLOSE ACTION */}
        <div className="pt-2 border-t border-slate-800/80 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
          >
            Done
          </button>
        </div>

      </div>
    </div>
  );
};

export default BrokerShareModal;