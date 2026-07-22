import React, { useState } from 'react';
import UpgradeButton from './UpgradeButton';

interface ModalsContainerProps {
  showUpgradeModal: boolean;
  onCloseUpgradeModal: () => void;
  blockedVinCount: number;
  selectedPlanType?: 'standard' | 'professional' | 'enterprise'; // Added to support dynamic tier selection
  userId?: string;                                               // Added to pass tracking context

  showShareModal: boolean;
  onCloseShareModal: () => void;
  shareableVerificationUrl: string;
}

export default function ModalsContainer({
  showUpgradeModal,
  onCloseUpgradeModal,
  blockedVinCount,
  selectedPlanType = 'professional', // Default fallback
  userId = 'anonymous_prospect',
  showShareModal,
  onCloseShareModal,
  shareableVerificationUrl,
}: ModalsContainerProps) {
  const [brokerEmail, setBrokerEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareableVerificationUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brokerEmail.trim()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setShareSuccess(true);
      setBrokerEmail('');
      setTimeout(() => setShareSuccess(false), 3000);
    }, 800);
  };

  return (
    <>
      {/* FREEMIUM LIMIT EXCEEDED MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0b0f19] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="space-y-2 text-center">
              <span className="text-3xl">🛡️</span>
              <h3 className="text-lg font-black text-white font-mono uppercase">Verified Safety Intelligence Limit Exceeded</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your manifest upload contained <strong className="text-cyan-400">{blockedVinCount} asset units</strong>, exceeding the free tier threshold. Upgrade your <span className="text-cyan-300 font-semibold">RecallLogic</span> subscription to unlock continuous background compliance tracking.
              </p>
            </div>
            
            <div className="bg-slate-950 border border-slate-900 rounded-xl p-4 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Selected Target Tier:</span>
                <span className="text-white font-bold uppercase">{selectedPlanType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Compliance Scope:</span>
                <span className="text-cyan-400 font-bold">Unlimited Fleet Monitoring</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCloseUpgradeModal}
                className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-mono font-bold uppercase rounded-xl transition"
              >
                Dismiss
              </button>
              <div className="flex-1">
                {/* FIXED: Dynamically passes the active planType and userId */}
                <UpgradeButton planType={selectedPlanType} userId={userId} className="w-full py-3" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLIANCE CERTIFICATE MODAL */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#0b0f19] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-6 shadow-2xl">
            <div className="space-y-1">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-black text-white font-mono uppercase flex items-center gap-2">
                  <span>🛡️</span> Verified Safety Intelligence Certificate
                </h3>
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-900 px-2 py-0.5 rounded uppercase font-bold">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-400">Share this cryptographic audit URL with commercial underwriters to validate your safety posture.</p>
            </div>

            <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 flex items-center justify-between gap-2">
              <input
                type="text"
                readOnly
                value={shareableVerificationUrl}
                className="bg-transparent text-cyan-400 font-mono text-xs outline-none flex-1 truncate"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 text-[10px] font-mono font-bold rounded border border-slate-800 transition"
              >
                {copiedLink ? '✓ Copied' : 'Copy URL'}
              </button>
            </div>

            <form onSubmit={handleEmailSubmit} className="space-y-3 pt-2 border-t border-slate-900">
              <label className="block text-[10px] font-mono text-slate-400 uppercase tracking-wide">Direct Broker Notification Dispatch</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  placeholder="broker@nevada-underwriters.com"
                  value={brokerEmail}
                  onChange={(e) => setBrokerEmail(e.target.value)}
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 outline-none font-mono"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] font-mono uppercase rounded-xl transition disabled:opacity-40"
                >
                  {loading ? 'Sending...' : 'Send Audit'}
                </button>
              </div>
              {shareSuccess && (
                <p className="text-emerald-400 text-[10px] font-mono">✓ Verified Safety Intelligence ledger transmitted to insurance provider.</p>
              )}
            </form>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={onCloseShareModal}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 text-[10px] font-mono font-bold uppercase rounded-xl transition"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}