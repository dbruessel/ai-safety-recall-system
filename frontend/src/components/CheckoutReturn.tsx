import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export default function CheckoutReturn() {
  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // STEP 5: PASSWORD CREATION STATE
  const [showPasswordModal, setShowPasswordModal] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [passwordLoading, setPasswordLoading] = useState<boolean>(false);
  const [passwordSuccess, setPasswordSuccess] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setError('Missing session_id parameter in URL redirect.');
      setLoading(false);
      return;
    }

    // DEV MOCK OVERRIDE: Fast UI testing bypass
    if (sessionId.startsWith('cs_test_mock')) {
      setTimeout(() => {
        setStatus('complete');
        setCustomerEmail(localStorage.getItem('recalllogic_ref') || 'vegasfleetmgr@commercialpro.com');
        setShowPasswordModal(true);
        setLoading(false);
      }, 500);
      return;
    }

    // Query backend to verify payment and retrieve customer email
    // FIXED: Correct endpoint route with /api prefix
    axios.get(`${API_BASE_URL}/api/payments/session-status`, {
      params: { session_id: sessionId }
    })
    .then(res => {
      setStatus(res.data.status);
      const email = res.data.customer_email || localStorage.getItem('recalllogic_ref') || '';
      setCustomerEmail(email);

      if (res.data.status === 'complete') {
        setShowPasswordModal(true);
      }
    })
    .catch(err => {
      console.error('Failed to retrieve checkout session status:', err);
      setError('Unable to verify transaction credentials. If this persists, please contact support.');
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

  // STEP 5: ACCOUNT PASSWORD REGISTRATION HANDLER
  const handleCreatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email: customerEmail,
        password: password,
      });

      if (signUpError) {
        throw signUpError;
      }

      setPasswordSuccess(true);
      setTimeout(() => {
        setShowPasswordModal(false);
      }, 1800);

    } catch (err: any) {
      console.error("Password setup error:", err);
      setPasswordError(err.message || 'Failed to bind security password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    window.location.href = '/';
  };

  // 1. LOADING STATE
  if (loading) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#0b0f19]/80 border border-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md">
          <div className="h-12 w-12 border-4 border-t-cyan-500 border-slate-800 rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <h3 className="text-white font-black text-lg uppercase tracking-tight">Verifying Subscription</h3>
            <p className="text-slate-400 text-xs font-mono uppercase tracking-wider animate-pulse">
              Syncing Ledger Credentials...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // 2. ERROR STATE
  if (error) {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#0b0f19]/80 border border-red-500/20 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-red-500/5 to-transparent pointer-events-none" />
          <span className="text-5xl block">⚠️</span>
          <div className="space-y-2">
            <h3 className="text-red-400 text-xl font-black uppercase tracking-tight">Verification Failed</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              {error}
            </p>
          </div>
          <button
            onClick={handleReturnToDashboard}
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition cursor-pointer"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. SUCCESS STATE WITH PASSWORD MODAL
  if (status === 'complete') {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans relative">
        <div className="w-full max-w-md bg-[#0b0f19]/80 border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden animate-fadeIn">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10 animate-bounce">
            🎉
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest block">Subscription Active</span>
            <h3 className="text-white text-2xl font-black uppercase tracking-tight">Upgrade Successful!</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Thank you for subscribing! Your workspace is activated for <strong className="text-cyan-400">{customerEmail}</strong>.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-900 rounded-xl p-4 text-left space-y-1">
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
              <span>Account Node:</span>
              <span className="text-slate-300">Active Fleet Shield</span>
            </div>
            <div className="flex justify-between items-center text-[10px] text-slate-500 font-mono font-bold uppercase tracking-wider">
              <span>NHTSA Syncing:</span>
              <span className="text-emerald-400">Continuous 24/7</span>
            </div>
          </div>

          <button
            onClick={handleReturnToDashboard}
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/10 cursor-pointer"
          >
            Launch Active Workspace
          </button>
        </div>

        {/* STEP 5: PASSWORD CREATION MODAL */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-6">
            <div className="bg-slate-900 border border-emerald-500/30 max-w-md w-full rounded-2xl p-6 space-y-6 shadow-2xl relative">
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white font-mono text-sm cursor-pointer"
              >
                ✕
              </button>

              <div className="space-y-2">
                <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded border border-emerald-500/20">
                  Step 5: Account Security
                </span>
                <h3 className="text-xl font-bold text-white tracking-tight">Secure Your Workspace</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Set a permanent password for <strong className="text-white">{customerEmail}</strong> so you can access your workspace anytime without tracking links.
                </p>
              </div>

              {passwordSuccess ? (
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-2">
                  <span className="text-emerald-400 text-sm font-bold block">✓ Password Configured Successfully!</span>
                  <p className="text-[11px] text-slate-400 font-mono">Unlocking full TaskBoard workspace...</p>
                </div>
              ) : (
                <form onSubmit={handleCreatePassword} className="space-y-4">
                  <div className="space-y-1 text-left">
                    <label className="text-[10px] font-mono uppercase text-slate-400 font-bold">
                      New Account Password:
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm font-mono text-white focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>

                  {passwordError && (
                    <div className="p-2.5 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-400 text-[11px] font-mono">
                      ⚠️ {passwordError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/20 cursor-pointer"
                  >
                    {passwordLoading ? 'Securing Credentials...' : 'Save Password & Enter Workspace'}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 4. OTHER STATES
  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-[#0b0f19]/80 border border-slate-900 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden">
        <span className="text-5xl block">⏳</span>
        <div className="space-y-2">
          <h3 className="text-white text-xl font-black uppercase tracking-tight">Transaction Processing</h3>
          <p className="text-slate-400 text-xs leading-relaxed">
            Stripe is currently processing your payment. Your dashboard privileges will automatically update once confirmed.
          </p>
        </div>
        <button
          onClick={handleReturnToDashboard}
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition cursor-pointer"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}