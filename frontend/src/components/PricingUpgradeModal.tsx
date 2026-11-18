import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { trackEvent } from '../utils/telemetry';

export interface PricingUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  portal?: 'broker' | 'fleet' | 'evidence_locker';
  onSelectTier?: (tierId: 'standard' | 'professional' | 'enterprise') => void;
}

interface TierPlan {
  id: 'standard' | 'professional' | 'enterprise' | 'custom_enterprise';
  name: string;
  subtitle: string;
  price: string;
  billing: string;
  badge?: string;
  badgeClass?: string;
  incentiveCallout?: string;
  popular?: boolean;
  buttonText: string;
  buttonClass: string;
  cardClass: string;
  features: string[];
}

export const PricingUpgradeModal: React.FC<PricingUpgradeModalProps> = ({
  isOpen,
  onClose,
  portal = 'fleet',
  onSelectTier,
}) => {
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  if (!isOpen) return null;

  const plans: TierPlan[] = [
    {
      id: 'standard',
      name: 'Growth Fleet',
      subtitle: 'Compliance Essentials',
      price: '$495',
      billing: '/mo',
      buttonText: 'Select Growth Fleet',
      buttonClass: 'bg-slate-800 hover:bg-slate-700 text-slate-200',
      cardClass: 'border-slate-800 bg-slate-900/90',
      features: [
        'Up to 100 Power Units',
        'Continuous NHTSA Defect Feed',
        'CSV & Bulk VIN Roster Sync',
        'Punitive Risk Threshold Alerts',
        'Underwriter Evidence Locker'
      ]
    },
    {
      id: 'professional',
      name: 'Enterprise Fleet',
      subtitle: 'Multi-Hub Risk Defense',
      price: '$1,450',
      billing: '/mo',
      badge: 'MOST POPULAR',
      badgeClass: 'bg-[#06B6D4] text-slate-950',
      popular: true,
      buttonText: 'Select Enterprise Fleet',
      buttonClass: 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold',
      cardClass: 'border-cyan-500/80 bg-gradient-to-b from-cyan-950/40 to-slate-900/90 shadow-xl shadow-cyan-950/50',
      features: [
        'Up to 250 Power Units',
        'API & Webhook Roster Ingestion',
        'Multi-Terminal Division Rollups',
        'Signed PDF Underwriter Certs',
        '5%–15% Rate Credit Evidence'
      ]
    },
    {
      id: 'broker_practice' as any,
      name: 'Brokerage Practice',
      subtitle: 'White-Label Command',
      price: '$995',
      billing: '/mo',
      badge: 'AGENCY PARTNER',
      badgeClass: 'bg-amber-500 text-slate-950',
      incentiveCallout: '$100/mo credit per active fleet — drops to $0/mo at 10 fleets',
      buttonText: 'Select Brokerage Practice',
      buttonClass: 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold',
      cardClass: 'border-amber-500/40 bg-slate-900/90',
      features: [
        '10 Client Fleet Workspaces',
        'Unlimited Pre-Bind VIN Scrubs',
        'Co-Branded Agency Portal',
        'Carrier Submission Packets',
        'Unlimited Producer Seats'
      ]
    },
    {
      id: 'custom_enterprise',
      name: 'National Enterprise',
      subtitle: '500+ Units, MGAs & Carriers',
      price: 'Custom',
      billing: '',
      badge: 'CUSTOM SLA',
      badgeClass: 'bg-purple-500 text-white',
      buttonText: 'Request Enterprise Scope',
      buttonClass: 'bg-purple-600 hover:bg-purple-500 text-white font-bold',
      cardClass: 'border-purple-500/50 bg-gradient-to-b from-purple-950/30 to-slate-900/90',
      features: [
        '500+ Power Units / Unlimited Books',
        'Custom Telematics & ERP Webhooks',
        'Dedicated Loss Control Engineer',
        'Custom Domain & Carrier Portal',
        'SOC2 & Custom MSA / SLA'
      ]
    }
  ];

  const handlePlanAction = async (plan: TierPlan) => {
    // Handle Custom National Enterprise inquiry without Stripe Checkout
    if (plan.id === 'custom_enterprise') {
      await trackEvent({
        event: 'pricing_plan_selected',
        portal,
        metadata: {
          plan_id: 'custom_enterprise',
          plan_name: plan.name,
          billing_cycle: 'annual_custom',
          price: 'Custom',
        },
      });
      window.location.href =
        'mailto:sales@recalllogic.ai?subject=RecallLogic%20National%20Enterprise%20%2F%20MGA%20Deployment&body=Hi%20RecallLogic%20Team%2C%0A%0AWe%20would%20like%20to%20scope%20an%20Enterprise%20deployment%20for%20our%20fleet%20%2F%20book.%0A%0ACompany%3A%20%0AEstimated%20Power%20Units%3A%20%0ACurrent%20Telematics%20%2F%20Maintenance%20System%3A%20';
      return;
    }

    // Map Brokerage Practice UI card back to the backend's 'enterprise' Stripe key
    const backendTierKey: 'standard' | 'professional' | 'enterprise' =
      (plan.id as string) === 'broker_practice'
        ? 'enterprise'
        : (plan.id as 'standard' | 'professional' | 'enterprise');

    setLoadingTier(plan.id);

    await Promise.race([
      trackEvent({
        event: 'pricing_plan_selected',
        portal,
        metadata: {
          plan_id: backendTierKey,
          plan_name: plan.name,
          billing_cycle: 'monthly',
          price: plan.price,
        },
      }),
      new Promise((resolve) => setTimeout(resolve, 350)),
    ]);

    try {
      if (onSelectTier) {
        onSelectTier(backendTierKey);
      }

      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || 'admin@fleet.com';
      const companyName = user?.user_metadata?.company_name || 'My Fleet Co.';

      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://recalllogic-api.onrender.com';
      
      const response = await fetch(`${apiBaseUrl}/api/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userEmail,
          customer_email: userEmail,
          tier: backendTierKey,
          company_name: companyName,
          successUrl: `${window.location.origin}/taskboard/demo?checkout=success`,
          cancelUrl: `${window.location.origin}/taskboard/demo?checkout=cancel`,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create Stripe checkout session.');
      }

      const session = await response.json();

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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md font-mono overflow-y-auto">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-5xl w-full shadow-2xl space-y-6 relative my-auto">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
              RecallLogic Enterprise Risk & Compliance
            </span>
            <h3 className="text-lg font-bold text-white uppercase tracking-wider mt-0.5">
              Select Deployment Tier
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-xl border p-4 flex flex-col justify-between ${plan.cardClass}`}
            >
              {plan.badge && (
                <div
                  className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full font-extrabold text-[8px] tracking-wider uppercase font-mono shadow-md whitespace-nowrap ${
                    plan.badgeClass || 'bg-[#06B6D4] text-slate-950'
                  }`}
                >
                  {plan.badge}
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-bold text-white font-mono">{plan.name}</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">{plan.subtitle}</p>
                </div>

                <div>
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-black text-white font-mono">{plan.price}</span>
                    {plan.billing && (
                      <span className="text-[10px] text-slate-400 font-mono">{plan.billing}</span>
                    )}
                  </div>
                  {plan.incentiveCallout && (
                    <p className="mt-1.5 text-[9px] leading-snug text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 rounded px-2 py-1">
                      {plan.incentiveCallout}
                    </p>
                  )}
                </div>

                <ul className="space-y-1.5 text-[10px] text-slate-300">
                  {plan.features.map((feat, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-[#06B6D4] font-bold">✓</span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                type="button"
                onClick={() => handlePlanAction(plan)}
                disabled={loadingTier === plan.id}
                className={`w-full mt-4 py-2 rounded-lg text-xs transition-all font-mono cursor-pointer ${plan.buttonClass}`}
              >
                {loadingTier === plan.id ? 'Redirecting...' : plan.buttonText}
              </button>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-slate-500 text-center border-t border-slate-800 pt-3">
          Annual invoicing, ACH wire settlement, and multi-entity MSA terms available on Enterprise &amp; Brokerage tiers.
        </p>
      </div>
    </div>
  );
};

export default PricingUpgradeModal;