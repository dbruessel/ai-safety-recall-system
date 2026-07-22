import React, { useState } from 'react';

interface UpgradeButtonProps {
  planType: 'standard' | 'professional' | 'enterprise';
  email?: string;
  className?: string;
}

// Ensure the request hits FastAPI on port 8000, not Vite on port 5173
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({ 
  planType, 
  email = '', 
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    const activeEmail = email || localStorage.getItem('recalllogic_ref') || 'vegasfleetmgr@commercialpro.com';

    try {
      const response = await fetch(`${API_BASE_URL}/payments/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: activeEmail,
          user_id: activeEmail,
          plan_type: planType 
        }),
      });

      const data = await response.json();
      const redirectUrl = data.checkout_url || data.url;

      if (redirectUrl) {
        window.location.href = redirectUrl;
      } else {
        console.error('Checkout session creation failed:', data);
      }
    } catch (err) {
      console.error('Failed to initialize Stripe checkout session:', err);
    } finally {
      setLoading(false);
    }
  };

  const getButtonStyle = () => {
    switch (planType) {
      case 'professional':
        return "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-lg shadow-cyan-500/25 border border-cyan-300";
      case 'enterprise':
        return "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 border border-emerald-400";
      case 'standard':
      default:
        return "bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold border border-cyan-500/40 hover:border-cyan-400 shadow-md";
    }
  };

  const getButtonLabel = () => {
    if (loading) return "Connecting to Stripe...";
    switch (planType) {
      case 'standard':
        return "Activate RecallLogic Standard →";
      case 'professional':
        return "Activate RecallLogic Pro →";
      case 'enterprise':
        return "Activate RecallLogic Enterprise →";
    }
  };

  return (
    <button
      onClick={handleCheckout}
      disabled={loading}
      className={`w-full py-3.5 px-4 rounded-xl font-mono text-xs uppercase tracking-wider transition-all duration-200 transform active:scale-[0.98] disabled:opacity-50 cursor-pointer ${getButtonStyle()} ${className}`}
    >
      {getButtonLabel()}
    </button>
  );
};

export default UpgradeButton;