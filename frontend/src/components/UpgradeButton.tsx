import React, { useState } from 'react';
import axios from 'axios';
import CheckoutForm from './checkoutform';

interface UpgradeButtonProps {
  planType: 'starter' | 'professional' | 'enterprise';
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
      // 1. Resolve lead email context from current page URL search parameters [cite: 3]
      const params = new URLSearchParams(window.location.search);
      const emailParam = params.get('email') || 'anonymous_prospect';

      // 2. Provision secure embedded checkout session from your FastAPI backend [cite: 27, 28]
      const response = await axios.post('http://127.0.0.1:8000/payments/create-checkout-session', {
        plan_type: planType,
        user_id: emailParam // Map lead context as user reference key [cite: 27, 28]
      });

      if (response.data?.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setShowModal(true);
      } else {
        throw new Error('No clientSecret returned from payment gateway server.');
      }
    } catch (err: any) {
      console.error('Stripe initiation failed:', err);
      setError(err.response?.data?.detail || err.message || 'Payment engine offline.');
    } finally {
      setLoading(false);
    }
  };

  const buttonLabel = loading ? 'Connecting...' : `Activate RecallLogic ${planType === 'starter' ? 'Standard' : planType === 'professional' ? 'Pro' : 'Enterprise'}`;

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
          <p className="text-red-400 text-[10px] font-mono mt-2 text-center">
            ⚠️ {error}
          </p>
        )}
      </div>

      {/* 🛡️ STRIPE CHECKOUT EMBEDDED IFRAME OVERLAY MODAL */}
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