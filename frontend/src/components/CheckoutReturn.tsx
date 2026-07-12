import React, { useEffect, useState } from 'react';
import axios from 'axios';

interface SessionStatus {
  status: string;
  customer_email: string;
}

export default function CheckoutReturn() {
  const [status, setStatus] = useState<string | null>(null);
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('session_id');

    if (!sessionId) {
      setError('Missing session_id parameter in URL redirect.');
      setLoading(false);
      return;
    }

    // Query backend to verify payment and secure tier upgrade status
    axios.get(`http://127.0.0.1:8000/payments/session-status`, {
      params: { session_id: sessionId }
    })
    .then(res => {
      setStatus(res.data.status);
      setCustomerEmail(res.data.customer_email || '');
    })
    .catch(err => {
      console.error('Failed to retrieve checkout session status:', err);
      setError('Unable to verify transaction credentials. If this persists, please contact support.');
    })
    .finally(() => {
      setLoading(false);
    });
  }, []);

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
            className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // 3. SUCCESS STATE
  if (status === 'complete') {
    return (
      <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-[#0b0f19]/80 border border-emerald-500/20 rounded-3xl p-8 text-center space-y-6 shadow-2xl backdrop-blur-md relative overflow-hidden animate-fadeIn">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent pointer-events-none" />
          
          <div className="mx-auto h-20 w-20 rounded-full bg-emerald-500/10 border border-emerald-400/30 flex items-center justify-center text-4xl shadow-lg shadow-emerald-500/10 animate-bounce">
            🎉
          </div>

          <div className="space-y-2">
            <span className="text-[9px] font-mono font-black text-emerald-400 uppercase tracking-widest block">Subscription Active</span>
            <h3 className="text-white text-2xl font-black uppercase tracking-tight">Upgrade Successful!</h3>
            <p className="text-slate-300 text-xs leading-relaxed">
              Thank you for subscribing! Your account is now upgraded to the paid tier. A receipt and confirmation has been sent to <strong className="text-cyan-400">{customerEmail}</strong>.
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
            className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:opacity-90 text-slate-950 font-black uppercase text-xs tracking-wider rounded-xl transition shadow-lg shadow-emerald-500/10"
          >
            Launch Active Workspace
          </button>
        </div>
      </div>
    );
  }

  // 4. OTHER STATES (E.G. EXPIRED/OPEN/PROCESSING)
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
          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-bold uppercase text-xs tracking-wider rounded-xl transition"
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}