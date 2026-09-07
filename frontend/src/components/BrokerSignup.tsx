import React, { useState, useEffect } from 'react';

export const BrokerSignup: React.FC = () => {
  const [brokerageName, setBrokerageName] = useState('RecallLogic Partner Brokerage');
  const [brokerId, setBrokerId] = useState<string>('demo-broker');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('broker_id') || params.get('broker') || 'demo-broker';
    
    setBrokerId(id);
    sessionStorage.setItem('recalllogic_referred_broker_id', id);

    if (id !== 'demo-broker') {
      const formattedName = id
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const fullBrokerName = `${formattedName} Risk Management`;
      
      setBrokerageName(fullBrokerName);
      sessionStorage.setItem('recalllogic_referred_broker_name', fullBrokerName);
    } else {
      setBrokerageName('RecallLogic Partner Brokerage');
      sessionStorage.setItem('recalllogic_referred_broker_name', 'RecallLogic Partner Brokerage');
    }
  }, []);

  const handleStartFreeTrial = (e: React.FormEvent) => {
    e.preventDefault();
    // Smooth transition to interactive 10-VIN trial on the main landing page
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-center items-center px-4 font-mono">
      <div className="max-w-md w-full bg-[#0D1322] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* CO-BRANDED HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-bold uppercase">
            <span>🛡️</span> Broker Invitation
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Activate Fleet Safety Audit
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            You’ve been invited by <span className="text-cyan-400 font-bold">{brokerageName}</span> to run a complimentary 10-VIN safety &amp; recall audit on your power units.
          </p>
        </div>

        {/* SYNC NOTICE BANNER */}
        <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl text-[11px] text-slate-300 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-emerald-400 font-bold">✓</span>
            <span>
              <strong>10 Free Instant VIN Lookups</strong> provided courtesy of {brokerageName}.
            </span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-cyan-400 font-bold">✓</span>
            <span>
              Zero credit card required to inspect active NHTSA recall campaigns across your fleet.
            </span>
          </div>
        </div>

        {/* ACTION BUTTON */}
        <form onSubmit={handleStartFreeTrial} className="space-y-4">
          <button
            type="submit"
            className="w-full py-3.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
          >
            <span>Start 10 Free VIN Audit</span>
            <span>→</span>
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center leading-normal">
          Upon converting to a Professional workspace, your recall statuses and Loss Control Risk Certificates can be shared directly with {brokerageName} to support policy renewals.
        </p>
      </div>
    </div>
  );
};

export default BrokerSignup;