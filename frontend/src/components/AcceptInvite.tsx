import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export const AcceptInvite: React.FC = () => {
  const [password, setPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  // Parse token from URL hash/search params automatically handled by Supabase Auth Session
  useEffect(() => {
    const handleAuthChange = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage('Invalid or expired invitation link. Please request a new invite.');
      }
    };
    handleAuthChange();
  }, []);

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // Update user password and activate seat
      const { error } = await supabase.auth.updateUser({ password });

      if (error) throw error;

      setIsSuccess(true);
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to complete invite setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-slate-100 flex items-center justify-center p-4 font-mono">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-8 max-w-md w-full shadow-2xl space-y-6">
        
        {/* BRAND LOGO HEADER */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-500/40 flex items-center justify-center text-[#06B6D4] font-extrabold text-lg mx-auto shadow-lg shadow-cyan-950/50">
            RL
          </div>
          <h1 className="text-lg font-bold text-white tracking-wider uppercase">
            Accept Workspace Invite
          </h1>
          <p className="text-xs text-slate-400">
            Set your account password to claim your team seat on RecallLogic.
          </p>
        </div>

        {/* SUCCESS STATE */}
        {isSuccess ? (
          <div className="p-4 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-center space-y-2">
            <span className="text-2xl">🎉</span>
            <p className="text-xs font-bold text-emerald-400">Account Activated Successfully!</p>
            <p className="text-[11px] text-slate-300">Redirecting to your workspace...</p>
          </div>
        ) : (
          /* PASSWORD SETUP FORM */
          <form onSubmit={handleSetPassword} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300">
                ⚠️ {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                New Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
                Confirm Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              {loading ? 'Activating Account...' : 'Set Password & Access Workspace'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

export default AcceptInvite;