import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import BulkCsvImportModal from './BulkCsvImportModal';

// Blueprint interface for LandingPage component props
export interface LandingPageProps {
  onSignIn: () => void;
  onSelectTier?: (tierId: 'standard' | 'professional' | 'enterprise') => void;
  totalGlobalRecalls?: number;
}

export interface PricingTier {
  id: 'standard' | 'professional' | 'enterprise';
  name: string;
  subtitle: string;
  price: string;
  billing: string;
  badge: string;
  popular?: boolean;
  color: string;
  buttonStyle: string;
  features: string[];
}

const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Fallback Stripe Payment Links (overridden if passed via App.tsx onSelectTier)
const STRIPE_CHECKOUT_URLS: Record<string, string> = {
  standard: import.meta.env.VITE_STRIPE_STANDARD_URL || 'https://buy.stripe.com/test_standard',
  professional: import.meta.env.VITE_STRIPE_PROFESSIONAL_URL || 'https://buy.stripe.com/test_professional',
  enterprise: import.meta.env.VITE_STRIPE_ENTERPRISE_URL || 'https://buy.stripe.com/test_enterprise',
};

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSignIn, 
  onSelectTier,
  totalGlobalRecalls 
}) => {
  const [realRecallCount, setRealRecallCount] = useState<number>(totalGlobalRecalls || 30000);
  const [freeLookupsLeft, setFreeLookupsLeft] = useState<number>(10);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [dragActive, setDragActive] = useState<boolean>(false);

  // Fetch count directly from Supabase recall_definitions table
  useEffect(() => {
    async function fetchRecallCount() {
      try {
        const { count, error } = await supabase
          .from('recall_definitions')
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          setRealRecallCount(count);
        }
      } catch (err) {
        console.warn('Could not fetch recall count from Supabase:', err);
      }
    }

    fetchRecallCount();
  }, []);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setIsBulkModalOpen(true);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setIsBulkModalOpen(true);
    }
  };

  // Route customer to Stripe Checkout for the chosen tier
  const handleTierCheckout = (tierId: 'standard' | 'professional' | 'enterprise') => {
    if (onSelectTier) {
      onSelectTier(tierId);
    } else {
      const checkoutUrl = STRIPE_CHECKOUT_URLS[tierId];
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      }
    }
  };

  const pricingTiers: PricingTier[] = [
    {
      id: 'standard',
      name: 'Standard',
      subtitle: 'Compliance Essentials',
      price: '$99',
      billing: 'per month',
      badge: 'ESSENTIAL',
      color: 'border-slate-800 bg-slate-900/50',
      buttonStyle: 'bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold',
      features: [
        'Up to 50 Monitored VINs',
        'NHTSA & CPSC Automated Feeds',
        'Weekly VIN Compliance Reports',
        'Email Risk Alerts'
      ]
    },
    {
      id: 'professional',
      name: 'Professional',
      subtitle: 'Operational Intelligence',
      price: '$249',
      billing: 'per month',
      badge: 'MOST POPULAR',
      popular: true,
      color: 'border-[#06B6D4] bg-gradient-to-b from-[#06B6D4]/10 to-slate-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      buttonStyle: 'bg-[#06B6D4] text-slate-950 hover:bg-cyan-400 font-bold',
      features: [
        'Up to 250 Monitored VINs',
        'Real-Time VIN Safety Sync (< 2s isolation)',
        'Full API & Webhook Access',
        'Underwriter Shareable Audit Links',
        'Priority Phone & Email Support'
      ]
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      subtitle: 'Total Risk Management',
      price: '$499',
      billing: 'per month',
      badge: 'TOTAL CONTROL',
      color: 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/80',
      buttonStyle: 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold',
      features: [
        'Unlimited Monitored VINs',
        'Custom ERP & WMS Integrations',
        'Multi-Site Operational Isolation',
        'Dedicated Compliance Officer',
        'SLA & Custom Contract Terms'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black overflow-x-hidden">
      
      {/* Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-[#06B6D4]/10 via-[#EF4444]/5 to-transparent blur-3xl opacity-60" />
      </div>

      {/* STREAMLINED GLOBAL NAV BAR */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img 
              src="/recall-logo.png" 
              alt="RecallLogic Logo" 
              className="h-7 w-auto object-contain"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight font-mono">
                RecallLogic
              </span>
              <span className="text-slate-600 text-xs hidden sm:inline">|</span>
              <span className="text-xs font-semibold tracking-wide text-slate-400 font-mono hidden sm:inline">
                Safety Intelligence System
              </span>
            </div>
          </div>

          {/* Real Supabase Record Counter Banner */}
          <div className="flex-1 max-w-md mx-2 px-3 py-1 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center justify-center gap-2.5 shadow-[0_0_12px_rgba(239,68,68,0.12)]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444]"></span>
            </span>
            <div className="text-center font-mono flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[#EF4444] font-black text-sm sm:text-base tracking-wider">
                {realRecallCount.toLocaleString()}
              </span>
              <span className="text-[#EF4444] font-bold text-[10px] sm:text-[11px] uppercase tracking-wide">
                Active Recalls Monitored
              </span>
            </div>
          </div>

          {/* Sign In CTA */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={onSignIn}
              className="px-4 py-1.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-500/10 transition-all cursor-pointer font-mono whitespace-nowrap"
            >
              Sign In
            </button>
          </div>

        </div>
      </nav>

      {/* COMPACT HERO SECTION */}
      <section className="relative pt-6 pb-6 px-4 max-w-4xl mx-auto text-center space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-slate-900 border border-[#06B6D4]/40 text-[11px] font-mono text-[#06B6D4]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#06B6D4] animate-pulse" />
          <span>Real-Time VIN Safety Sync Active</span>
        </div>

        <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
          Instant Fleet VIN Safety &amp; Recall Control
        </h1>

        <p className="text-slate-300 text-xs sm:text-sm max-w-xl mx-auto font-normal leading-normal">
          Upload your fleet list of VINs to test our Real-Time Safety Sync engine with 10 free lookups.
        </p>

        {/* BULK FLEET VIN INGESTION DROPZONE */}
        <div className="max-w-xl mx-auto rounded-xl bg-slate-900/90 border border-slate-700 p-4 shadow-xl backdrop-blur-xl text-left space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold font-mono text-slate-300 uppercase tracking-wider">
              Bulk Fleet VIN Ingestion
            </span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-semibold">
              {freeLookupsLeft} FREE VIN LOOKUPS REMAINING
            </span>
          </div>

          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
              dragActive 
                ? 'border-[#06B6D4] bg-[#06B6D4]/10' 
                : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
            }`}
          >
            {/* STRICT ACCEPTANCE FORMATS */}
            <input
              type="file"
              accept=".csv, .txt"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pointer-events-none">
              <div className="w-8 h-8 rounded-full bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center shrink-0 text-[#06B6D4]">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <div className="text-center sm:text-left">
                <p className="text-xs font-semibold text-white">
                  Drop your list of VINs here or <span className="text-[#06B6D4] underline">browse files</span>
                </p>
                <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                  Instant 17-character VIN parsing from <span className="text-slate-200 font-semibold">.csv</span> or <span className="text-slate-200 font-semibold">.txt</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STRIPE PRICING GRID */}
      <section id="pricing" className="relative z-10 py-8 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <h2 className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-widest">Transparent Pricing</h2>
            <p className="text-xl sm:text-2xl font-extrabold text-white">Choose Your Safety Tier</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-xl border p-5 flex flex-col justify-between ${tier.color}`}
              >
                {tier.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#06B6D4] text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md">
                    {tier.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tier.subtitle}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">{tier.price}</span>
                    <span className="text-[11px] text-slate-400">{tier.billing}</span>
                  </div>

                  <ul className="space-y-2 text-[11px] text-slate-300">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#06B6D4] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleTierCheckout(tier.id)}
                  className={`w-full mt-5 py-2.5 rounded-lg transition-all text-xs cursor-pointer ${tier.buttonStyle}`}
                >
                  Subscribe to {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BULK IMPORT MODAL */}
      {isBulkModalOpen && (
        <BulkCsvImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-4 px-6 text-center text-[11px] text-slate-500 font-mono">
        © 2026 RecallLogic Inc. Safety Intelligence System.
      </footer>
    </div>
  );
};

export default LandingPage;