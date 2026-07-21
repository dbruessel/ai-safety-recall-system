import React, { useState } from 'react';
import axios from 'axios';

interface UpgradeButtonProps {
  planType: 'standard' | 'professional' | 'enterprise';
  className?: string;
  userEmail?: string;
}

export default function UpgradeButton({ planType, className, userEmail = 'lasvegas_fleet_test@example.com' }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);

    try {
      // Connects to your FastAPI backend payment router
      const response = await axios.post('http://localhost:8000/api/payments/create-checkout-session', {
        plan_type: planType,
        user_id: userEmail
      });

      if (response.data && response.data.url) {
        // Immediately redirect user to the secure Stripe-hosted checkout page
        window.location.href = response.data.url;
      } else {
        throw new Error('Invalid checkout session response received.');
      }
    } catch (err: any) {
      console.error('Stripe checkout error:', err);
      setError(err.response?.data?.detail || 'Failed to initialize checkout session.');
      setLoading(false);
    }
  };

  const planDisplayNames = {
    standard: 'Standard ($99/mo)',
    professional: 'Pro ($249/mo)',
    enterprise: 'Enterprise ($499/mo)'
  };

  const buttonLabel = loading ? 'Redirecting to Stripe...' : `Activate RecallLogic ${planDisplayNames[planType]}`;

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
        {buttonLabel}
      </button>
      {error && <p className="text-red-400 text-[10px] font-mono text-center">{error}</p>}
    </div>
  );
}