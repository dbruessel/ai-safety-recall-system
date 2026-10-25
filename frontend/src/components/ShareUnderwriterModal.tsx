import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';

interface ShareUnderwriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCompany?: string;
}

export const ShareUnderwriterModal: React.FC<ShareUnderwriterModalProps> = ({
  isOpen,
  onClose,
  userCompany = 'Standard Fleet Co.',
}) => {
  const [recipient, setRecipient] = useState('');
  const [expirationDays, setExpirationDays] = useState('60');
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerateLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('You must be logged in to generate access tokens.');

      // Cryptographically random, URL-safe live token
      const randomBytes = crypto.randomUUID().replace(/-/g, '');
      const rawToken = `rl_live_${randomBytes}${Math.random().toString(36).substring(2, 8)}`;

      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + parseInt(expirationDays, 10));

      const { error } = await supabase
        .from('underwriter_access_tokens')
        .insert({
          profile_id: user.id,
          token: rawToken,
          recipient_name: recipient.trim(),
          expires_at: expiryDate.toISOString(),
        });

      if (error) throw error;

      const portalUrl = `${window.location.origin}/portal/audit?token=${rawToken}`;
      setGeneratedUrl(portalUrl);
    } catch (err: any) {
      console.error('Failed to generate underwriter token:', err);
      setErrorMessage(err.message || 'Failed to generate token. Ensure the Supabase migration has been executed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (generatedUrl) {
      navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleReset = () => {
    setGeneratedUrl(null);
    setRecipient('');
    setExpirationDays('60');
    setCopied(false);
    setErrorMessage(null);
  };

  return typeof document !== 'undefined'
    ? createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono text-xs text-slate-100">
          <div className="bg-[#0D1322] border border-cyan-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-bold block">
                  Professional Tier Evidence Locker • {userCompany}
                </span>
                <h3 className="text-base font-bold text-white">
                  Share Live Underwriter Portal
                </h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-white cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-400 text-[11px] leading-relaxed">
              Generate an encrypted, read-only token granting your insurance underwriter or broker direct access to real-time NHTSA defect status and $250k liability defense records for <strong className="text-slate-200">{userCompany}</strong> without requiring an account.
            </p>

            {errorMessage && (
              <div className="p-3 bg-red-950/60 border border-red-500/50 rounded-lg text-red-300 text-[11px]">
                {errorMessage}
              </div>
            )}

            {!generatedUrl ? (
              <form onSubmit={handleGenerateLink} className="space-y-4 pt-1">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Underwriter or Brokerage Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Travelers Risk Control / Acrisure Brokerage"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4]"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Renewal Access Window
                  </label>
                  <select
                    value={expirationDays}
                    onChange={(e) => setExpirationDays(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-[#06B6D4]"
                  >
                    <option value="30">30 Days (Standard Audit Window)</option>
                    <option value="60">60 Days (Full Policy Renewal Cycle)</option>
                    <option value="90">90 Days (Quarterly Captive Review)</option>
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-cyan-950 disabled:opacity-50 cursor-pointer"
                  >
                    {loading ? 'Generating Encrypted Token...' : 'Generate Live Link'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4 pt-1">
                <div className="p-3 bg-slate-950 border border-cyan-500/30 rounded-xl space-y-1.5">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Underwriter Tokenized URL
                  </span>
                  <input
                    readOnly
                    value={generatedUrl}
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2 text-cyan-300 font-mono text-[11px] select-all focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
                  <span>Authorized for: <strong>{recipient}</strong> ({expirationDays}d active)</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold cursor-pointer"
                    >
                      New Link
                    </button>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className={`px-4 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                        copied
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950'
                      }`}
                    >
                      {copied ? '✓ Copied!' : 'Copy Link'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )
    : null;
};

export default ShareUnderwriterModal;