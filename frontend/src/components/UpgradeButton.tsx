import React, { useState } from 'react';
import axios from 'axios';

interface UpgradeButtonProps {
  planType: 'standard' | 'professional' | 'enterprise';
  className?: string;
  userId: string; // Added to link checkout session properly
}

export default function UpgradeButton({ planType, className, userId }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('http://localhost:8000/payments/create-checkout-session', {
        plan_type: planType,
        user_id: userId,
      });

      const { checkout_url } = response.data;
      if (checkout_url) {
        window.location.href = checkout_url; // Redirect to Stripe Hosted Checkout
      } else {
        throw new Error('Invalid checkout URL received from server.');
      }
    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.detail || 'Failed to initiate checkout. Please try again.');
      setLoading(false);
    }
  };

  const planDisplayNames = {
    standard: 'Standard',
    professional: 'Pro',
    enterprise: 'Enterprise',
  };

  const buttonLabel = loading ? 'Redirecting to Stripe...' : `Activate RecallLogic ${planDisplayNames[planType]}`;

  return (
    <div className="w-full">
      <button
        onClick={handleUpgradeClick}
        disabled={loading}
        className={
          className ||
          'w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider transition shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed'
        }
      >
        {buttonLabel}
      </button>
      {error && <p className="mt-2 text-xs text-red-500 text-center">{error}</p>}
    </div>
  );
}