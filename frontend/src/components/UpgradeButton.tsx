import React, { useState } from 'react';
import axios from 'axios';
import CheckoutForm from './checkoutform';

interface UpgradeButtonProps {
  // Aligned with your "Standard" tier preference instead of "starter"
  planType: 'standard' | 'professional' | 'enterprise';
  className?: string;
}

export default function UpgradeButton({ planType, className }: UpgradeButtonProps) {
  const [loading, setLoading] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpgradeClick = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Resolve lead email context from current page URL parameters to link the checkout [cite: 3]
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email') || 'anonymous_prospect';

      // 2. Request a secure Stripe Embedded Checkout Session from FastAPI backend [cite: 27, 28]
      // (Note: No /api prefix is used here to avoid routing collisions with your main.py layout)
      const response = await axios.post('http://localhost:8000/payments/create-checkout-session', {
        plan_type: planType, // "standard", "professional", or "enterprise"
        user_id: emailParam  // Sets the client reference token [cite: 74]
      });

      if (response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setShowModal(true);
      } else {
        throw new Error('No clientSecret returned from the payment session endpoint.');
      }
    } catch (err: any) {
      console.error('Stripe initiation failed:', err);
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
    ? 'Connecting to Stripe...' 
    : `Activate RecallLogic ${planDisplayNames[planType]}`;

  return (
    <>
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

      {/* 🛡️ STRIPE EMBEDDED CHECKOUT MODAL OVERLAY */}
      {showModal && clientSecret && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-3xl my-8">
            <CheckoutForm 
              clientSecret={clientSecret} 
              onClose={() => {
                setShowModal(false);
                setClientSecret(null);
              }} 
            />
          </div>
        </div>
      )}
    </>
  );
}