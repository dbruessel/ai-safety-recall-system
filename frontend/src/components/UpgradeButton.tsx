import React, { useState } from 'react';
import axios from 'axios';

interface UpgradeButtonProps {
  // Aligned with your "Standard" tier preference instead of "starter"
  planType: 'standard' | 'professional' | 'enterprise';
  className?: string;
}

export default function UpgradeButton({ planType, className }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Resolve lead email context from current page URL parameters to link the checkout [cite: 3]
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email') || 'anonymous_prospect';

      // 2. Request a Stripe-Hosted Checkout Session from FastAPI backend [cite: 80]
      const response = await axios.post('http://localhost:8000/payments/create-checkout-session', {
        plan_type: planType, // "standard", "professional", or "enterprise"
        user_id: emailParam  // Sets the client reference token [cite: 79]
      });

      if (response.data?.url) {
        // 3. SUCCESS: Redirect directly to the Stripe-Hosted checkout page! [cite: 78]
        window.location.href = response.data.url;
      } else {
        throw new Error('No checkout redirect URL returned from the payment session endpoint.');
      }
    } catch (err: any) {
      console.error('Stripe redirect initiation failed:', err);
      setError(
        err.response?.data?.detail || 
        err.message || 
        'Could not initialize checkout. Verify your local backend is running on port 8000.'
      );
    } finally {
      setLoading(false);
    }
  };

  // Maps clean display text for each operational tier [cite: 14]
  const planDisplayNames = {
    standard: 'Standard',
    professional: 'Pro',
    enterprise: 'Enterprise'
  };

  const buttonLabel = loading 
    ? 'Redirecting to Stripe...' 
    : `Activate RecallLogic ${planDisplayNames[planType]}`;

  return (
    <div className="w-full">
      <button
        onClick={handleUpgradeClick}
        disabled={loading}
        className={
          className ||
          `w-full py-3.5 px-6 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-xs tracking-wider transition shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed`
        }
      >
        {buttonLabel}
      </button>

      {error && (
        <p className="text-red-400 text-[10px] font-mono mt-2 text-center bg-red-950/20 border border-red-900/30 py-1.5 px-2 rounded">
          ⚠️ {error}
        </p>
      )}
    </div>
  );
}