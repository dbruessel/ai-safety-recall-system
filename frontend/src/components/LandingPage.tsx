import React, { useState } from 'react';

interface LandingPageProps {
  onSignIn: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onSignIn }) => {
  const [activeTab, setActiveTab] = useState<'features' | 'pricing'>('features');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* PUBLIC NAVBAR */}
      <nav className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3.5 max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* BRAND LOGO FROM PUBLIC DIR */}
          <img 
            src="/recall-logo.png" 
            alt="RecallLogic Logo" 
            className="h-10 w-auto object-contain"
          />
          <div>
            <span className="font-bold text-white text-base tracking-wide font-mono">RECALLLOGIC</span>
            <p className="text-[10px] text-slate-400 font-mono hidden sm:block">Active Fleet Recall Risk Management</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('features')}
            className={`text-xs font-semibold transition ${activeTab === 'features' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            Features
          </button>
          <button 
            onClick={() => setActiveTab('pricing')}
            className={`text-xs font-semibold transition ${activeTab === 'pricing' ? 'text-blue-400' : 'text-slate-400 hover:text-white'}`}
          >
            Pricing
          </button>
          <button
            onClick={onSignIn}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl shadow-md transition cursor-pointer"
          >
            Sign In to Workspace
          </button>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="px-6 pt-16 pb-16 max-w-5xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-mono">
          <span>⚡ Real-Time NHTSA Safety Sync</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-tight">
          Automated Safety Recall Control for Commercial Fleets
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
          Eliminate liability risks, track open NHTSA campaigns, and generate audit-grade compliance reports directly for insurance underwriters.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onSignIn}
            className="w-full sm:w-auto px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm rounded-xl shadow-xl shadow-blue-600/20 transition cursor-pointer"
          >
            Access Workspace Console →
          </button>
        </div>
      </section>

      {/* VALUE PROPOSITION GRID */}
      <section className="px-6 py-12 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <div className="text-2xl mb-2">🔍</div>
          <h3 className="text-base font-bold text-white">Instant VIN Auditing</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Batch import your fleet inventory or run instant single-VIN checks against official NHTSA safety databases.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <div className="text-2xl mb-2">🛡️</div>
          <h3 className="text-base font-bold text-white">Underwriter Certificates</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Generate verifiable compliance reports with encrypted share links to lower policy surcharges with insurance carriers.
          </p>
        </div>

        <div className="p-6 bg-slate-900/60 border border-slate-800 rounded-2xl space-y-2">
          <div className="text-2xl mb-2">🔧</div>
          <h3 className="text-base font-bold text-white">Repair Proof Tracking</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Attach dealer invoices and repair receipts to permanently clear open safety tasks from your liability matrix.
          </p>
        </div>
      </section>

      {/* PRICING SECTION */}
      <section className="px-6 py-16 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center space-y-2 mb-12">
          <h2 className="text-2xl font-bold text-white">Transparent Fleet Pricing</h2>
          <p className="text-xs text-slate-400">Scale risk monitoring based on your active fleet size</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Standard */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Standard</p>
              <p className="text-3xl font-extrabold text-white mt-1">$99 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">Up to 50 Vehicles</p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-4">
              <li>✓ Daily NHTSA Recall Audits</li>
              <li>✓ Bulk CSV Import</li>
              <li>✓ Standard Risk Dashboard</li>
            </ul>
            <button onClick={onSignIn} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer">
              Select Plan
            </button>
          </div>

          {/* Professional */}
          <div className="p-6 bg-gradient-to-b from-blue-900/30 to-slate-900 border border-blue-500/40 rounded-2xl space-y-4 relative">
            <span className="absolute -top-3 right-6 bg-blue-600 text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase">
              Most Popular
            </span>
            <div>
              <p className="text-xs font-bold text-blue-400 uppercase">Professional</p>
              <p className="text-3xl font-extrabold text-white mt-1">$249 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">Up to 250 Vehicles</p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-4">
              <li>✓ Instant Single-VIN Scan Console</li>
              <li>✓ Signed PDF Risk Certificates</li>
              <li>✓ Broker Share Links</li>
            </ul>
            <button onClick={onSignIn} className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-blue-600/20">
              Start Professional Trial
            </button>
          </div>

          {/* Enterprise */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl space-y-4">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase">Enterprise</p>
              <p className="text-3xl font-extrabold text-white mt-1">$499 <span className="text-xs font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-400 mt-1">Unlimited Fleet Capacity</p>
            </div>
            <ul className="text-xs text-slate-300 space-y-2 border-t border-slate-800 pt-4">
              <li>✓ Custom Passcode Share Links</li>
              <li>✓ Link Expiration Controls</li>
              <li>✓ Priority Carrier Underwriter API</li>
            </ul>
            <button onClick={onSignIn} className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs rounded-xl transition cursor-pointer">
              Contact Enterprise Sales
            </button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-slate-800/80 py-8 px-6 text-center text-xs text-slate-500 font-mono">
        © 2026 RecallLogic Inc. Active Fleet Safety & Risk Intelligence.
      </footer>
    </div>
  );
};