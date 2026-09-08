import React, { useState, useEffect } from 'react';

export const BrokerSignup: React.FC = () => {
  const [brokerageName, setBrokerageName] = useState('RecallLogic Partner Brokerage');
  const [brokerId, setBrokerId] = useState<string>('demo-broker');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('broker_id') || params.get('broker') || 'demo-broker';

    setBrokerId(id);

    // Save under BOTH key formats so AuthModal and App.tsx read them seamlessly
    sessionStorage.setItem('broker_id', id);
    sessionStorage.setItem('recalllogic_referred_broker_id', id);

    if (id !== 'demo-broker') {
      const formattedName = id
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      const fullBrokerName = `${formattedName} Risk Management`;

      setBrokerageName(fullBrokerName);
      sessionStorage.setItem('broker_name', fullBrokerName);
      sessionStorage.setItem('recalllogic_referred_broker_name', fullBrokerName);
    } else {
      setBrokerageName('RecallLogic Partner Brokerage');
      sessionStorage.setItem('broker_name', 'RecallLogic Partner Brokerage');
      sessionStorage.setItem('recalllogic_referred_broker_name', 'RecallLogic Partner Brokerage');
    }
  }, []);

  const handleStartFreeTrial = (e: React.FormEvent) => {
    e.preventDefault();
    // Redirect to main application page with stored broker referral params intact
    window.location.href = `/?broker_id=${encodeURIComponent(brokerId)}`;
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-mono flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-[#0D1322] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* BADGE / HEADER */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30">
            🛡️ BROKER INVITATION
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Activate Fleet Safety Audit
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            You’ve been invited by <strong className="text-cyan-400 font-bold">{brokerageName}</strong> to run a complimentary 10-VIN safety & recall audit on your power units.
          </p>
        </div>

        {/* INCENTIVES BOX */}
        <div className="bg-[#070A12] border border-slate-800/80 rounded-xl p-4 space-y-3 text-xs">
          <div className="flex items-start gap-2.5 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>10 Free Instant VIN Lookups</strong> provided courtesy of {brokerageName}.</span>
          </div>
          <div className="flex items-start gap-2.5 text-slate-300">
            <span className="text-emerald-400 font-bold">✓</span>
            <span><strong>Zero credit card required</strong> to inspect active NHTSA recall campaigns across your fleet.</span>
          </div>
        </div>

        {/* CTA BUTTON */}
        <form onSubmit={handleStartFreeTrial}>
          <button
            type="submit"
            className="w-full py-3.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
          >
            <span>Start 10 Free VIN Audit</span>
            <span>→</span>
          </button>
        </form>

        {/* FOOTNOTE */}
        <p className="text-[10px] text-slate-500 text-center leading-normal">
          Upon converting to a Professional workspace, your recall statuses and Loss Control Risk Certificates can be shared directly with {brokerageName} to support policy renewals.
        </p>

      </div>
    </div>
  );
};

export default BrokerSignup;