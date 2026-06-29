"use client";

import { useState } from 'react';

interface UpgradeButtonProps {
  vinCount: number;
}

export default function UpgradeButton({ vinCount }: UpgradeButtonProps) {
  const [showCheckout, setShowCheckout] = useState(false);
  const [loading, setLoading] = useState(false);

  const initiatePayment = async () => {
    setLoading(true);
    try {
      // Requests a secure transaction session from your FastAPI backend proxy layer
      const res = await fetch('http://127.0.0.1:8000/payments/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asset_count: vinCount || 10 }),
      });
      
      const data = await res.json();
      if (data.url) {
        // Redirect directly to the secure Stripe-hosted portal link
        window.location.href = data.url;
      } else if (data.clientSecret) {
        setShowCheckout(true);
      }
    } catch (error) {
      console.error("RecallLogic Engine Payment Interruption:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {!showCheckout ? (
        <button 
          onClick={initiatePayment}
          disabled={loading}
          className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs py-3.5 px-6 rounded-xl transition duration-200 uppercase tracking-wider shadow-lg shadow-cyan-500/10"
        >
          {loading ? 'Securing Portal Link...' : 'Activate RecallLogic Shield'}
        </button>
      ) : (
        <div className="p-6 border border-slate-900 rounded-2xl bg-slate-950 text-slate-200">
          <h3 className="text-sm font-bold uppercase font-mono tracking-wider mb-2">Secure Checkout Enabled</h3>
          <p className="text-xs text-slate-500">Processing infrastructure payload encryption...</p>
        </div>
      )}
    </div>
  );
}