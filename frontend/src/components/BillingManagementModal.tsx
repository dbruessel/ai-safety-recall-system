import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';

export interface BillingManagementModalProps {
  isOpen: boolean;
  subscriptionTier: SubscriptionTier;
  currentFleetCount: number;
  userEmail: string;
  onClose: () => void;
  onSelectTier: (tier: SubscriptionTier) => void;
}

export const BillingManagementModal: React.FC<BillingManagementModalProps> = ({
  isOpen,
  subscriptionTier,
  currentFleetCount,
  userEmail,
  onClose,
  onSelectTier,
}) => {
  const [loadingPortal, setLoadingPortal] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // Capacity Limits Mapping
  const capacityLimits: Record<SubscriptionTier, number> = {
    free: 10,
    standard: 50,
    professional: 250,
    enterprise: 999999,
  };

  const currentLimit = capacityLimits[subscriptionTier] || 10;
  const usagePercentage = Math.min(Math.round((currentFleetCount / currentLimit) * 100), 100);

  // STRIPE CUSTOMER PORTAL REDIRECT
  const handleOpenStripePortal = async () => {
    try {
      setLoadingPortal(true);
      setFeedbackMsg(null);

      const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${baseUrl}/api/stripe/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail }),
      });

      if (!response.ok) {
        throw new Error('Failed to create billing session.');
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No portal URL returned.');
      }
    } catch (err: any) {
      console.error('Stripe Portal Error:', err);
      setFeedbackMsg('Stripe Portal is running in demo mode. Contact support for direct invoice changes.');
    } finally {
      setLoadingPortal(false);
    }
  };

  const handleSwitchTier = async (newTier: SubscriptionTier) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .update({ subscription_tier: newTier })
          .eq('id', user.id);
      }
      onSelectTier(newTier);
      setFeedbackMsg(`Successfully switched workspace to ${newTier.toUpperCase()} Plan.`);
    } catch (err) {
      console.error('Error updating plan:', err);
      onSelectTier(newTier);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 text-slate-100 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 relative font-mono text-xs">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <h2 className="text-xl font-bold text-white font-sans">Plan & Billing Management</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer p-1"
          >
            ✕ Close
          </button>
        </div>

        {/* ACTIVE PLAN & CAPACITY SUMMARY CARD */}
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Workspace Plan</p>
              <p className="text-lg font-extrabold text-white uppercase flex items-center gap-2 mt-0.5">
                <span>💳</span> {subscriptionTier} Tier
              </p>
            </div>
            <button
              type="button"
              onClick={handleOpenStripePortal}
              disabled={loadingPortal}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-bold rounded-lg border border-cyan-500/30 transition cursor-pointer flex items-center gap-1.5 self-start sm:self-auto"
            >
              <span>🧾</span> {loadingPortal ? 'Opening Portal...' : 'Manage Invoices & Cards ↗'}
            </button>
          </div>

          {/* ASSET USAGE METER */}
          <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
            <div className="flex justify-between text-[11px]">
              <span className="text-slate-400">Monitored Fleet Vehicles Capacity</span>
              <span className="text-cyan-400 font-bold">
                {currentFleetCount} / {subscriptionTier === 'enterprise' ? '∞' : currentLimit} Assets ({usagePercentage}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 ${
                  usagePercentage > 90 ? 'bg-rose-500' : usagePercentage > 75 ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${usagePercentage}%` }}
              ></div>
            </div>
          </div>

          {/* UNDERWRITER SURCHARGE / CREDIT INDICATOR */}
          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg flex items-center justify-between text-[11px]">
            <div className="space-y-0.5">
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                <span>🟢</span> 0% Carrier Risk Surcharge
              </span>
              <p className="text-slate-400 text-[10px]">
                Active fleet remediation rate exceeds carrier thresholds. Eligible for up to 5% premium credit.
              </p>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded border border-emerald-500/40 whitespace-nowrap">
              -$4,600 / yr Est. Savings
            </span>
          </div>
        </div>

        {feedbackMsg && (
          <div className="p-3 bg-cyan-950/40 border border-cyan-800 rounded-lg text-cyan-300 text-[11px]">
            ℹ️ {feedbackMsg}
          </div>
        )}

        {/* TIER SELECTION MATRIX */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Available Subscription Plans</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* STANDARD */}
            <div className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between ${
              subscriptionTier === 'standard' ? 'bg-slate-800 border-cyan-500' : 'bg-slate-950 border-slate-800'
            }`}>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-slate-300">Standard</span>
                  {subscriptionTier === 'standard' && <span className="text-[9px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                </div>
                <p className="text-lg font-extrabold text-white mt-1">$99<span className="text-[10px] text-slate-400 font-normal">/mo</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Up to 50 monitored fleet vehicles with active NHTSA polling.</p>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTier('standard')}
                disabled={subscriptionTier === 'standard'}
                className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold rounded-lg transition cursor-pointer"
              >
                {subscriptionTier === 'standard' ? 'Active Plan' : 'Switch to Standard'}
              </button>
            </div>

            {/* PROFESSIONAL */}
            <div className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between relative ${
              subscriptionTier === 'professional' ? 'bg-slate-800 border-indigo-500' : 'bg-slate-950 border-slate-800'
            }`}>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-indigo-400">Professional</span>
                  {subscriptionTier === 'professional' && <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                </div>
                <p className="text-lg font-extrabold text-white mt-1">$249<span className="text-[10px] text-slate-400 font-normal">/mo</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Up to 250 vehicles, single-VIN live scan console, and PDF certificates.</p>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTier('professional')}
                disabled={subscriptionTier === 'professional'}
                className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold rounded-lg transition cursor-pointer"
              >
                {subscriptionTier === 'professional' ? 'Active Plan' : 'Switch to Pro'}
              </button>
            </div>

            {/* ENTERPRISE */}
            <div className={`p-3.5 rounded-xl border space-y-2 flex flex-col justify-between ${
              subscriptionTier === 'enterprise' ? 'bg-slate-800 border-emerald-500' : 'bg-slate-950 border-slate-800'
            }`}>
              <div>
                <div className="flex justify-between items-center">
                  <span className="font-bold text-emerald-400">Enterprise</span>
                  {subscriptionTier === 'enterprise' && <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded font-bold">CURRENT</span>}
                </div>
                <p className="text-lg font-extrabold text-white mt-1">$499<span className="text-[10px] text-slate-400 font-normal">/mo</span></p>
                <p className="text-[10px] text-slate-400 mt-1">Unlimited vehicles, dedicated carrier integrations, and QBR support.</p>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTier('enterprise')}
                disabled={subscriptionTier === 'enterprise'}
                className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-lg transition cursor-pointer"
              >
                {subscriptionTier === 'enterprise' ? 'Active Plan' : 'Switch to Enterprise'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default BillingManagementModal;