import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Copy, 
  Check, 
  Lock, 
  Key, 
  Calendar, 
  Mail, 
  Sparkles, 
  X 
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  userTier: 'standard' | 'professional' | 'enterprise';
  shareUrl: string;
  onUpgrade: () => void;
}

export const BrokerShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  userTier,
  shareUrl,
  onUpgrade
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const isEnterprise = userTier === 'enterprise';

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Underwriter Audit Link</h3>
              <p className="text-xs text-slate-400">Share verifiable recall compliance with carriers</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* Main Share Link Box */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-300">Read-Only Audit URL</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-300 focus:outline-none select-all"
              />
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl transition-all shrink-0"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>

          {/* Enterprise Security Features (Locked for Pro & Standard) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Audit Controls
              </span>
              {!isEnterprise && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                  <Sparkles className="w-3 h-3" /> Enterprise Feature
                </span>
              )}
            </div>

            <div className="space-y-2.5">
              {/* Feature 1: Passcode Protection */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                isEnterprise ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <Key className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Passcode Protection</p>
                    <p className="text-xs text-slate-400">Require PIN to view audit report</p>
                  </div>
                </div>
                {isEnterprise ? (
                  <input type="checkbox" className="rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0" />
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" />
                )}
              </div>

              {/* Feature 2: Custom Expiration */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                isEnterprise ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Custom Link Expiration</p>
                    <p className="text-xs text-slate-400">Auto-revoke access after specified days</p>
                  </div>
                </div>
                {isEnterprise ? (
                  <select className="bg-slate-900 border border-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1">
                    <option>7 Days</option>
                    <option>30 Days</option>
                    <option>Never</option>
                  </select>
                ) : (
                  <Lock className="w-4 h-4 text-slate-500" />
                )}
              </div>

              {/* Feature 3: Direct Email Dispatch */}
              <div className={`flex items-center justify-between p-3 rounded-xl border ${
                isEnterprise ? 'bg-slate-950 border-slate-800' : 'bg-slate-950/40 border-slate-800/50 opacity-60'
              }`}>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <div>
                    <p className="text-sm font-medium text-slate-200">Direct Underwriter Dispatch</p>
                    <p className="text-xs text-slate-400">Email directly to insurance carrier</p>
                  </div>
                </div>
                {!isEnterprise && <Lock className="w-4 h-4 text-slate-500" />}
              </div>
            </div>
          </div>

          {/* Upsell Banner for Non-Enterprise */}
          {!isEnterprise && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/20 flex items-center justify-between">
              <div className="pr-2">
                <p className="text-xs font-semibold text-white">Upgrade to Enterprise</p>
                <p className="text-[11px] text-slate-300">Unlock custom link branding, passcode protection, & instant revocation.</p>
              </div>
              <button
                onClick={onUpgrade}
                className="px-3 py-1.5 bg-white text-slate-950 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors shrink-0"
              >
                Upgrade
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};