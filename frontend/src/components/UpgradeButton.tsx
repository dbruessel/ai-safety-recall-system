import React, { useState } from 'react';

interface UpgradeButtonProps {
  planType: 'standard' | 'professional' | 'enterprise';
  email?: string;
  className?: string;
}

export const UpgradeButton: React.FC<UpgradeButtonProps> = ({ 
  planType, 
  email = '', 
  className = '' 
}) => {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: email || localStorage.getItem('recalllogic_ref') || '', 
          plan_type: planType 
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout creation failed:', data);
      }
    } catch (err) {
      console.error('Failed to initialize Stripe checkout session:', err);
    } finally {
      setLoading(false);
    }
  };

  // Tier-specific button styling for high contrast & prominence
  const getButtonStyle = () => {
    switch (planType) {
      case 'professional':
        // Primary / Featured Tier (Glowing Cyan Button)
        return "bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black shadow-lg shadow-cyan-500/25 border border-cyan-300";
      case 'enterprise':
        // High-Value Tier (Emerald Green Button)
        return "bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/20 border border-emerald-400";
      case 'standard':
      default:
        // Secondary Tier (Glass/Slate Styled Button with Bright Cyan Text)
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