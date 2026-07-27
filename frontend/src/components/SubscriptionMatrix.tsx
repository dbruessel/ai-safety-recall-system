import React from 'react';
import UpgradeButton from './UpgradeButton';

interface SubscriptionMatrixProps {
  currentPlan: 'standard' | 'professional' | 'enterprise';
  onSelectPlan: (planType: 'standard' | 'professional' | 'enterprise') => void;
}

interface PriceTier {
  name: string;
  limit: string;
  price: string;
  features: string[];
  cta: string;
  popular: boolean;
  type: 'standard' | 'professional' | 'enterprise';
}

export default function SubscriptionMatrix({ currentPlan, onSelectPlan }: SubscriptionMatrixProps) {
  const pricingTiers: PriceTier[] = [
    {
      name: 'Standard Essentials',
      limit: '1 - 50 Vehicles',
      price: '$99/mo',
      features: [
        'Daily Automated Sweeps',
        'NHTSA Database Sync',
        'Basic Email Hazard Alerts',
        'CSV Audit Trail Exports'
      ],
      cta: 'Current Plan',
      popular: false,
      type: 'standard'
    },
    {
      name: 'Pro Operations',
      limit: '51 - 250 Vehicles',
      price: '$249/mo',
      features: [
        'Real-time Single-VIN Scan Console',
        'Signed Underwriter Compliance Cards',
        'Real-Time Thermal Hazard Alerts',
        'Co-Branded Insurance Audit Reports'
      ],
      cta: 'Upgrade Workspace',
      popular: true,
      type: 'professional'
    },
    {
      name: 'Enterprise Risk',
      limit: '251+ Fleet Units',
      price: '$499/mo',
      features: [
        'Unlimited Monitored Vehicles',
        'Multi-Fleet Portfolio Controls',
        'Telematics & TMS Integrations (Samsara, Geotab)',
        'Dedicated Broker QBR & Renewal Packets'
      ],
      cta: 'Activate Enterprise',
      popular: false,
      type: 'enterprise'
    }
  ];

  return (
    <section id="pricing-matrix-anchor" className="pt-8 space-y-6 border-t border-slate-900">
      <div className="text-center max-w-xl mx-auto space-y-1">
        <h3 className="text-white font-mono font-black uppercase text-sm tracking-widest">
          SaaS Tier Governance Matrix
        </h3>
        <p className="text-xs text-slate-400">
          Select workspaces built to isolate liabilities and satisfy commercial auto underwriter compliance.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-5xl mx-auto">
        {pricingTiers.map((tier) => (
          <div 
            key={tier.name}
            className={`flex flex-col justify-between bg-slate-900/20 border rounded-2xl p-6 transition duration-300 relative ${
              tier.popular 
                ? 'border-cyan-500 bg-gradient-to-b from-[#0b0f19] via-slate-900/40 to-slate-950 shadow-2xl scale-[1.01]' 
                : 'border-slate-900 hover:border-slate-800'
            }`}
          >
            {tier.popular && (
              <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-slate-950 font-mono text-[9px] tracking-widest font-black px-3 py-0.5 rounded-full uppercase shadow-md">
                Most Popular
              </span>
            )}

            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <h4 className="text-xs font-black text-white font-mono tracking-tight uppercase max-w-[150px]">
                  {tier.name}
                </h4>
                <span className="text-[10px] bg-slate-900 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-800">
                  {tier.limit}
                </span>
              </div>

              <div className="text-2xl font-black text-white font-mono">{tier.price}</div>

              <ul className="space-y-2 border-t border-slate-900 pt-4 text-xs text-slate-400 font-sans">
                {tier.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 font-bold text-[10px] mt-0.5">✓</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 space-y-2">
              <button
                type="button"
                onClick={() => onSelectPlan(tier.type)}
                className={`w-full py-2.5 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition ${
                  currentPlan === tier.type
                    ? 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-default'
                    : tier.popular
                      ? 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-lg shadow-cyan-500/10'
                      : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'
                }`}
              >
                {currentPlan === tier.type ? 'Active Tier Plan' : tier.cta}
              </button>
              <UpgradeButton planType={tier.type} className="w-full" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}