import React, { useState, useEffect } from 'react';
import { Building2, CheckCircle2, ArrowRight, ShieldCheck } from 'lucide-react';

export const BrokerSignup: React.FC = () => {
  const [brokerageName, setBrokerageName] = useState('RecallLogic Partner Brokerage');
  const [brokerId, setBrokerId] = useState<string>('demo-broker');
  const [targetFleet, setTargetFleet] = useState<string>('');

  useEffect(() => {
    // Standardize browser tab title
    document.title = "RECALLLOGIC — Underwriter Risk Audit";

    const params = new URLSearchParams(window.location.search);
    const id = params.get('broker_id') || params.get('broker') || 'demo-broker';
    const nameParam = params.get('broker_name') || '';
    const fleetParam = params.get('fleet') || '';

    setBrokerId(id);
    if (fleetParam) {
      setTargetFleet(fleetParam);
    }

    // Save under BOTH key formats so AuthModal and App.tsx read them seamlessly
    sessionStorage.setItem('broker_id', id);
    sessionStorage.setItem('recalllogic_referred_broker_id', id);

    let calculatedName = 'RecallLogic Partner Brokerage';

    if (nameParam) {
      calculatedName = nameParam;
    } else if (id !== 'demo-broker') {
      const formattedName = id
        .replace(/[-_]/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
      calculatedName = `${formattedName} Risk Management`;
    }

    setBrokerageName(calculatedName);
    sessionStorage.setItem('broker_name', calculatedName);
    sessionStorage.setItem('recalllogic_referred_broker_name', calculatedName);
  }, []);

  const handleStartAudit = (e: React.FormEvent) => {
    e.preventDefault();

    // Retrieve active broker parameters to pass forward
    const currentBrokerId = sessionStorage.getItem('broker_id') || brokerId || 'demo-broker';
    const currentBrokerName = sessionStorage.getItem('broker_name') || brokerageName || '';

    // Construct URL preserving BOTH broker parameters across full-page redirect
    const redirectUrl = new URL('/', window.location.origin);
    redirectUrl.searchParams.set('broker_id', currentBrokerId);
    if (currentBrokerName) {
      redirectUrl.searchParams.set('broker_name', currentBrokerName);
    }
    if (targetFleet) {
      redirectUrl.searchParams.set('fleet', targetFleet);
    }

    window.location.href = redirectUrl.toString();
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 font-mono flex flex-col items-center justify-center p-4">
      
      {/* BRAND HEADER */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 mb-1.5 text-xs">
          <span className="font-extrabold tracking-widest text-cyan-400 text-sm">RECALLLOGIC</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400 uppercase tracking-wider text-[11px]">Continuous Risk Defense Platform</span>
        </div>
        <p className="text-slate-500 text-[10px] uppercase tracking-wider">Enterprise Loss Control System</p>
      </div>

      {/* AUDIT INVITATION CARD */}
      <div className="relative w-full max-w-lg bg-[#0D1322] border border-cyan-500/30 rounded-2xl p-8 shadow-2xl shadow-cyan-950/40 space-y-6">
        
        {/* BADGE / HEADER */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/40 uppercase tracking-wider">
            <Building2 className="w-3 h-3 text-cyan-400" />
            Commercial Underwriter Audit
          </span>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Claim Fleet Safety Audit
          </h1>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Provisioned exclusively by <strong className="text-cyan-400 font-bold">{brokerageName}</strong> to audit active power units against open NHTSA safety recalls and secure underwriter rate credits.
          </p>
        </div>

        {/* ENTERPRISE RISK VALUE MATRIX */}
        <div className="bg-[#070A12] border border-slate-800 rounded-xl p-4 space-y-3.5 text-xs">
          <div className="flex items-start gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Automated 2-Way Fleetio Sync</strong>
              <span className="text-slate-400 text-[11px] leading-tight">
                Instantly imports active VINs and automatically pushes defect repair Work Orders into your shop.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Underwriter Evidence Locker</strong>
              <span className="text-slate-400 text-[11px] leading-tight">
                Generates a cryptographically verified compliance certificate defending up to a 15% renewal rate credit.
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Zero Punitive Liability Exposure</strong>
              <span className="text-slate-400 text-[11px] leading-tight">
                Establishes certified due-diligence records to eliminate uninsurable $250k+ court exposure in accident litigation.
              </span>
            </div>
          </div>
        </div>

        {/* CTA BUTTON */}
        <form onSubmit={handleStartAudit}>
          <button
            type="submit"
            className="w-full py-3.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/50 flex items-center justify-center gap-2"
          >
            <span>Activate Pre-Renewal Risk Audit</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* FOOTNOTE */}
        <p className="text-[10px] text-slate-500 text-center leading-normal">
          Zero credit card required. Read-only authorization is limited to active power units and maintenance records to certify loss-control compliance for {brokerageName}.
        </p>

      </div>
    </div>
  );
};

export default BrokerSignup;