import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export interface PricingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTier?: (tierId: 'standard' | 'professional' | 'enterprise') => void;
}

interface TierPlan {
  id: 'standard' | 'professional' | 'enterprise';
  name: string;
  subtitle: string;
  price: string;
  billing: string;
  badge?: string;
  popular?: boolean;
  buttonClass: string;
  cardClass: string;
  features: string[];
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  isOpen,
  onClose,
  onSelectTier,
}) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  if (!isOpen) return null;

  const plans: TierPlan[] = [
    {
      id: 'standard',
      name: 'Standard',
      subtitle: 'Compliance Baseline',
      price: '\$99',
      billing: '/mo',
      buttonClass: 'bg-slate-800 hover:bg-slate-700 text-slate-200',
      cardClass: 'border-slate-800 bg-slate-900/90',
      features: [
        'Up to 50 Vehicles Monitored',
        'Continuous NHTSA Ingestion',
        'Punitive Risk Threshold Alerts'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'Underwriter Engine',
      price: '\$249',
      billing: '/mo',
      badge: 'RECOMMENDED',
      popular: true,
      buttonClass: 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold',
      cardClass: 'border-cyan-500/80 bg-gradient-to-b from-cyan-950/40 to-slate-900/90 shadow-xl shadow-cyan-950/50',
      features: [
        'Up to 250 Power Units',
        '2-Way Fleetio Work Order Loop',
        'Signed PDF Underwriter Certs',
        '12-15% Rate Credit Locker'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Agency License',
      price: '\$499',
      billing: '/mo',
      badge: 'AGENCY PARTNER',
      buttonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
      cardClass: 'border-amber-500/40 bg-slate-900/90',
      features: [
        'Unlimited Monitored VINs',
        'Co-Branded Agency Portal',
        'Multi-Telematics Feeds',
        'Book Safety Analytics'
      ]
    }
  ];

  const handleStripeCheckout = async (plan: TierPlan) => {
    setLoadingTier(plan.id);

    try {
      if (onSelectTier) {
        onSelectTier(plan.id);
      }

      // 1. Fetch current user & company details from Supabase session
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'admin@fleet.com';
      const companyName = user?.user_metadata?.company_name || 'My Fleet Co.';

      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://recalllogic-api.onrender.com';
      
      // 2. Call FastAPI backend endpoint with matched JSON schema payload
      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          customer_email: userEmail,
          tier: plan.id, // "standard" | "professional" | "enterprise"
          company_name: companyName,
          successUrl: `${window.location.origin}/taskboard/demo?checkout=success`,
          cancelUrl: `${window.location.origin}/taskboard/demo?checkout=cancel`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe checkout session.');
      }

      const session = await response.json();

      // 3. Redirect directly to Stripe hosted checkout page
      if (session.url) {
        window.location.href = session.url;
      } else {
        throw new Error('Stripe Checkout URL not returned from backend.');
      }
    } catch (err: any) {
      console.error('Stripe Checkout Error:', err);
      alert(`Checkout Error: ${err.message || 'Could not redirect to Stripe.'}`);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-6 relative">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              CAPACITY THRESHOLD REACHED
            </span>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mt-0.5">
              Upgrade Subscription Plan
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-xl border p-4 flex flex-col justify-between ${plan.cardClass}`}
            >
              {plan.badge && (
                <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-[#06B6D4] text-slate-950 font-extrabold text-[8px] tracking-wider uppercase font-mono shadow-md">
                  {plan.badge}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{plan.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{plan.subtitle}</p>
                </div>

                <div className="flex items-baseline gap-0.5">
                  <span className="text-2xl font-black text-white font-mono">{plan.price}</span>
                  <span className="text-[10px] text-slate-400 font-mono">{plan.billing}</span>
                </div>

                <ul className="space-y-1.5 text-[10px] text-slate-300">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-1">
                      <span className="text-[#06B6D4] font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handleStripeCheckout(plan)}
                disabled={loadingTier === plan.id}
                className={`w-full mt-4 py-2 rounded-lg text-xs transition-all font-mono cursor-pointer ${plan.buttonClass}`}
              >
                {loadingTier === plan.id ? 'Redirecting...' : `Select ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-500 text-center border-t border-slate-800 pt-3">
          Need a custom agency SLA or multi-book billing? Contact our Loss Control team.
        </p>
      </div>
    </div>
  );
};

export default PricingUpgradeModal;