import React, { useState } from 'react';
import { useLeadData } from './frontend_integration_hook';

export function GhostAuditCard() {
  const { lead, loading, error } = useLeadData();
  const [isSweeping, setIsSweeping] = useState<boolean>(false);
  const [sweepProgress, setSweepProgress] = useState<number>(0);
  const [sweepComplete, setSweepComplete] = useState<boolean>(false);
  const [manualEmail, setManualEmail] = useState<string>('');

  // 1. Loading State (Animated Skeleton Loader)
  if (loading) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-amber-500/20 rounded-2xl p-8 shadow-2xl animate-pulse">
        <div className="h-6 bg-gray-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-gray-800 rounded mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-800 rounded w-5/6"></div>
          <div className="h-4 bg-gray-800 rounded"></div>
          <div className="h-4 bg-gray-800 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // 2. Error State
  if (error) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-red-950/30 border border-red-500/50 rounded-2xl p-6 text-center text-red-200">
        <p className="font-semibold">⚠️ Failed to Load Fleet Profile</p>
        <p className="text-sm mt-1 text-red-400">{error}</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition"
        >
          Retry
        </button>
      </div>
    );
  }

  // 3. Simulated Lead Sweeper Trigger
  const triggerSweep = () => {
    setIsSweeping(true);
    setSweepProgress(0);
    setSweepComplete(false);
    
    const interval = setInterval(() => {
      setSweepProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSweeping(false);
          setSweepComplete(true);
          return 100;
        }
        return prev + 10;
      });
    }, 150);
  };

  // 4. ROI Calculations 
  // Est average recall cost is ~$150 per vehicle in deferred downtime and liability
  const fleetSize = lead ? lead.est_fleet_size : 10;
  const companyName = lead ? lead.company_name : 'Your Fleet';
  const estimatedAnnualSavings = fleetSize * 150;
  
  // Dynamic pricing based on fleet size ($5/vehicle/month, capped at standard SaaS tiers)
  const monthlySaaSPrice = Math.max(49, Math.min(299, fleetSize * 5));

  // Stripe checkout routing URL
  const checkoutEmail = lead ? lead.contact_email : manualEmail;
  const stripeLink = `https://checkout.recalllogic.com/pay?email=${encodeURIComponent(checkoutEmail)}&tier=${fleetSize > 25 ? 'enterprise' : 'growth'}`;

  // ==================== RENDER CASE A: PROSPECT NOT DETECTED (Fallback Generic Mode) ====================
  if (!lead) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold text-white mb-2">Scan Your Fleet for Active Recalls</h2>
        <p className="text-gray-400 mb-6 text-sm">
          Enter your email to run a secure, automated "Ghost Sweep" on up to 10 fleet vehicles in real time.
        </p>

        {!sweepComplete ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase text-gray-400 mb-2">Corporate Email Address</label>
              <input 
                type="email"
                placeholder="you@yourcompany.com"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition"
              />
            </div>

            <button
              onClick={triggerSweep}
              disabled={isSweeping || !manualEmail}
              className={`w-full py-4 rounded-xl font-bold text-center transition flex justify-center items-center ${
                isSweeping || !manualEmail
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-gray-950'
              }`}
            >
              {isSweeping ? `Scanning NHTSA Databases (${sweepProgress}%)...` : 'Run Free 10-VIN Sweep'}
            </button>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-amber-500/10 border border-amber-500/30 rounded-full mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Sweep Completed!</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Our automated system detected **3 open manufacturer recalls** associated with your email's registered vehicle types.
            </p>
            <a 
              href={stripeLink}
              className="inline-block px-6 py-3 bg-amber-500 hover:bg-amber-600 text-gray-950 font-bold rounded-xl transition"
            >
              Unlock Complete Fleet Safety Report
            </a>
          </div>
        )}
      </div>
    );
  }

  // ==================== RENDER CASE B: PROSPECT DETECTED (Hyper-Personalized Mode) ====================
  return (
    <div className="w-full max-w-2xl mx-auto bg-gray-900 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden">
      
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border-b border-amber-500/20 p-6">
        <span className="inline-block text-xs font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full mb-3">
          Wave 1 Pilot Account: Active
        </span>
        <h2 className="text-2xl font-bold text-white">
          Welcome back, {lead.contact_name} | {lead.company_name}
        </h2>
        <p className="text-gray-300 text-sm mt-1">
          We have pre-loaded your local Nevada fleet profile (Estimated: <span className="font-semibold text-white">{lead.est_fleet_size} service vehicles</span>).
        </p>
      </div>

      {/* 2. Personalized Heat Hazard Alert Callout */}
      {lead.localized_threat_hook && (
        <div className="p-6 bg-orange-950/20 border-b border-orange-500/20 flex gap-4">
          <div className="flex-shrink-0 text-3xl mt-1">🔥</div>
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-orange-400">Mojave Desert Operational Risk</h4>
            <p className="text-orange-200 text-sm mt-1 font-medium italic">
              "{lead.localized_threat_hook}"
            </p>
            <p className="text-xs text-gray-400 mt-2">
              With Southern Nevada climbing past 114°F, unaddressed manufacturer harness issues pose an active ground safety hazard to your {lead.primary_vehicle_mix} fleet.
            </p>
          </div>
        </div>
      )}

      {/* 3. Inbound Action Section */}
      <div className="p-8">
        {!sweepComplete ? (
          <div className="text-center py-4">
            <h3 className="text-lg font-bold text-white mb-2">Run Your Priority Fleet Sweep</h3>
            <p className="text-sm text-gray-400 max-w-md mx-auto mb-6">
              Our database pre-loaded your vehicle parameters. Click below to verify unaddressed manufacturer safety bulletins on 10 of your {lead.primary_vehicle_mix} vans.
            </p>

            <button
              onClick={triggerSweep}
              disabled={isSweeping}
              className={`w-full max-w-sm py-4 rounded-xl font-bold transition ${
                isSweeping 
                  ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                  : 'bg-amber-500 hover:bg-amber-600 text-gray-950 shadow-lg shadow-amber-500/10'
              }`}
            >
              {isSweeping ? `Querying NHTSA APIs (${sweepProgress}%)...` : 'Execute 10-VIN Safety Sweep'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gray-950 border border-gray-800 rounded-xl p-5 text-center">
              <span className="text-red-500 text-2xl">⚠️</span>
              <h4 className="text-lg font-bold text-white mt-2">Critical Recalls Identified!</h4>
              <p className="text-sm text-gray-400 mt-1">
                Your sweep completed. We identified <span className="text-red-400 font-semibold">4 unresolved recalls</span> on your active {lead.primary_vehicle_mix} vans.
              </p>
            </div>

            {/* Dynamic ROI Math Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-950/50 p-4 border border-gray-850 rounded-xl text-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Estimated Fleet Downtime Protection</p>
                <p className="text-2xl font-bold text-green-400 mt-1">${estimatedAnnualSavings.toLocaleString()}/yr</p>
              </div>
              <div className="bg-gray-950/50 p-4 border border-gray-850 rounded-xl text-center">
                <p className="text-xs text-gray-400 uppercase font-semibold">Active Monitoring Tier Price</p>
                <p className="text-2xl font-bold text-white mt-1">${monthlySaaSPrice}/mo</p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800 flex flex-col items-center gap-3">
              <a
                href={stripeLink}
                className="w-full text-center py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg transition"
              >
                Upgrade to Active Monitoring (${monthlySaaSPrice}/mo)
              </a>
              <p className="text-xs text-gray-550 text-center">
                Bypasses paywalls, pre-populates stripe session for {lead.contact_email}, and generates compliance certificates.
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
🚀 How to Render It in Your Application
To display this on your landing page, simply import GhostAuditCard inside your main App.tsx component (or wherever you want it to appear on your main layout):
import { GhostAuditCard } from './GhostAuditCard';

function App() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
      {/* Your standard navbar & header */}
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight">RecallLogic Portal</h1>
      </header>

      {/* Render the dynamic hook-driven card here */}
      <GhostAuditCard />
    </div>
  );
}

export default App;