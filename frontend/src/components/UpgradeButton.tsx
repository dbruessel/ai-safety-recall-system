import React, { useState } from 'react';
import axios from 'axios';

interface UpgradeButtonProps {
  planType: 'standard' | 'professional' | 'enterprise';
  className?: string;
  userEmail?: string;
}

export default function UpgradeButton({ 
  planType, 
  className, 
  userEmail = 'dennisbruessel@hotmail.com' 
}: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Direct call to your FastAPI backend checkout router
      const response = await axios.post('http://127.0.0.1:8000/api/payments/create-checkout-session', {
        plan_type: planType,
        user_id: userEmail
      });

      if (response.data && response.data.url) {
        // Direct window assignment bypasses popup blockers completely
        window.location.assign(response.data.url);
      } else {
        throw new Error('Stripe session URL was not returned from backend.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.detail || 'Failed to connect to billing service.');
      setLoading(false);
    }
  };

  const planDisplayNames = {
    standard: 'Standard ($99/mo)',
    professional: 'Pro ($249/mo)',
    enterprise: 'Enterprise ($499/mo)'
  };

  return (
    <div className="w-full space-y-2">
      <button
        type="button"
        onClick={handleUpgradeClick}
        disabled={loading}
        className={
          className ||
          'w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider transition shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed'
        }
      >
        {loading ? 'Initializing Stripe Secure Checkout...' : `Activate RecallLogic ${planDisplayNames[planType]}`}
      </button>
      {error && (
        <div className="p-2 bg-red-950/60 border border-red-900 rounded-lg text-red-300 text-[10px] font-mono text-center">
          ⚠️ {error}
        </div>
      )}
    </div>
  );
}