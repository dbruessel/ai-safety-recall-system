import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

interface ManagedFleet {
  organization_id: string;
  fleet_name: string;
  subscription_tier: string;
  total_vins: number;
  open_recalls: number;
  scheduled_recalls: number;
  cleared_recalls: number;
  safety_score: number;
}

export const BrokerPortal: React.FC = () => {
  const { userProfile, companyName } = useAuth();
  const [fleets, setFleets] = useState<ManagedFleet[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [copiedInvite, setCopiedInvite] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // FORCE TOUR ACTIVE BY DEFAULT FOR DEMO OUTREACH
  const [isTourActive, setIsTourActive] = useState<boolean>(true);
  const [currentTourStep, setCurrentTourStep] = useState<number>(0);

  const brokerBrandName = userProfile?.company_name || companyName || 'Partner Brokerage';

  const tourSteps = [
    {
      title: "1. Book Safety Score & Risk Metrics",
      badge: "MACRO RISK OVERVIEW",
      description: "Monitor real-time Book Safety Scores, active fleets, managed VINs, and open recalls across your commercial accounts."
    },
    {
      title: "2. Export Underwriter Compliance PDF",
      badge: "RENEWAL LEVERAGE",
      description: "Export unified Loss Control Risk Certificates with one click to prove client risk reduction to carrier underwriters."
    },
    {
      title: "3. Single Client Workspace Drill-Down",
      badge: "READ-ONLY AUDIT ACCESS",
      description: "Click any account (like Apex Logistics or Summit) to inspect individual VIN recall statuses and dealer repair progress."
    },
    {
      title: "4. Agency Co-Branded Portal",
      badge: "AGENCY AUTHORITY",
      description: "Your policyholders see YOUR brokerage branding during safety audits, reinforcing agency value year-round."
    },
    {
      title: "5. Ready to Onboard Your Fleets?",
      badge: "LAUNCH YOUR FLYWHEEL",
      description: "Gift your policyholders complimentary VIN lookups. Click below to copy your agency onboarding link and share it with clients!"
    }
  ];

  useEffect(() => {
    async function fetchBrokerFleets() {
      setLoading(true);
      try {
        const brokerageId = userProfile?.brokerage_id || 'demo-broker';

        const { data, error } = await supabase
          .from('organizations')
          .select('id, name, subscription_tier')
          .eq('parent_brokerage_id', brokerageId);

        if (error || !data || data.length === 0) {
          setFleets([
            { organization_id: 'demo-org-1', fleet_name: 'Apex Logistics & Freight', subscription_tier: 'Enterprise', total_vins: 142, open_recalls: 3, scheduled_recalls: 5, cleared_recalls: 134, safety_score: 82 },
            { organization_id: 'demo-org-2', fleet_name: 'Summit Regional Transport', subscription_tier: 'Professional', total_vins: 68, open_recalls: 0, scheduled_recalls: 2, cleared_recalls: 66, safety_score: 98 },
            { organization_id: 'demo-org-3', fleet_name: 'Titan Heavy Hauling Co.', subscription_tier: 'Professional', total_vins: 210, open_recalls: 14, scheduled_recalls: 8, cleared_recalls: 188, safety_score: 58 },
            { organization_id: 'demo-org-4', fleet_name: 'Metro Last-Mile Delivery', subscription_tier: 'Standard', total_vins: 45, open_recalls: 1, scheduled_recalls: 1, cleared_recalls: 43, safety_score: 90 },
          ]);
        } else {
          const mappedFleets: ManagedFleet[] = data.map((org: any) => ({
            organization_id: org.id,
            fleet_name: org.name || 'Commercial Fleet Account',
            subscription_tier: org.subscription_tier || 'Standard',
            total_vins: 50,
            open_recalls: 2,
            scheduled_recalls: 1,
            cleared_recalls: 47,
            safety_score: 88,
          }));
          setFleets(mappedFleets);
        }
      } catch (err) {
        console.error('Failed to load broker portfolio fleets:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchBrokerFleets();
  }, [userProfile?.brokerage_id]);

  const handleCopyInviteLink = () => {
    const brokerageId = userProfile?.brokerage_id || 'demo-broker';
    const inviteUrl = `${window.location.origin}/signup?broker_id=${brokerageId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl);
    }

    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  const handleNextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      handleCopyInviteLink();
      setIsTourActive(false);
    }
  };

  const handleExportPortfolioPDF = async () => {
    setIsExporting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

      const response = await fetch(`${apiBaseUrl}/api/broker/portfolio-audit/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: brokerBrandName,
          fleets: fleets,
        }),
      });

      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${brokerBrandName.replace(/\s+/g, '_')}_Portfolio_Audit_${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export portfolio audit PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const totalVins = fleets.reduce((acc, f) => acc + f.total_vins, 0);
  const totalOpenRecalls = fleets.reduce((acc, f) => acc + f.open_recalls, 0);
  const avgSafetyScore = fleets.length ? Math.round(fleets.reduce((acc, f) => acc + f.safety_score, 0) / fleets.length) : 100;

  return (
    <div className="px-6 space-y-6 font-mono text-slate-100 max-w-7xl mx-auto relative">
      
      {/* DEMO BANNER & HEADER TOOLBAR (STEP 5 HIGHLIGHT) */}
      <div className={`bg-[#0D1322] p-4 rounded-2xl border transition-all duration-300 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
        isTourActive && currentTourStep === 4 ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-slate-800'
      }`}>
        <div className="text-xs text-slate-300 flex items-center gap-2">
          <span className="text-amber-400">⚡</span>
          <span>Interactive Demo View: Displaying sample commercial fleet accounts &amp; live loss metrics for <strong className="text-white">{brokerBrandName}</strong>.</span>
        </div>

        <button
          type="button"
          onClick={handleCopyInviteLink}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
            copiedInvite
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-[#06B6D4] hover:bg-cyan-400 border-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50'
          }`}
        >
          {copiedInvite ? <span>✓ Link Copied!</span> : <span>🔗 Share Client Onboarding Link</span>}
        </button>
      </div>

      {/* CO-BRANDED PORTFOLIO COMMAND HEADER (STEP 2 & STEP 4 HIGHLIGHT) */}
      <div className={`bg-[#0D1322] p-6 rounded-2xl border transition-all duration-300 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-xl ${
        isTourActive && (currentTourStep === 1 || currentTourStep === 3) ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]' : 'border-slate-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-950/80 border border-cyan-500/30 rounded-xl text-cyan-400 text-xl">
            🏛️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white tracking-wide">
                {brokerBrandName}
              </h1>
              <span className="bg-cyan-950 text-cyan-400 text-[10px] px-2 py-0.5 rounded font-bold uppercase border border-cyan-500/30">
                PORTFOLIO COMMAND
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Co-branded book-of-business loss control tracking, risk scoring, and underwriter compliance audits managed by <strong className="text-slate-300">{brokerBrandName}</strong>.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExportPortfolioPDF}
          disabled={isExporting}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 border ${
            isExporting
              ? 'bg-cyan-950 border-cyan-500/50 text-cyan-400 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
        >
          {isExporting ? <span>⏳ Exporting PDF...</span> : <span>📄 Export Portfolio Audit PDF</span>}
        </button>
      </div>

      {/* METRIC SUMMARY CARDS (STEP 1 HIGHLIGHT) */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-2 rounded-2xl transition-all duration-300 ${
        isTourActive && currentTourStep === 0 ? 'border border-cyan-400 ring-2 ring-cyan-400/80 bg-cyan-950/20' : ''
      }`}>
        <div className="bg-[#0D1322] p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Fleets</p>
          <p className="text-2xl font-black text-white">{fleets.length}</p>
        </div>

        <div className="bg-[#0D1322] p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Managed VINs</p>
          <p className="text-2xl font-black text-cyan-400">{totalVins.toLocaleString()}</p>
        </div>

        <div className="bg-[#0D1322] p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Book Safety Score</p>
          <p className="text-2xl font-black text-emerald-400">{avgSafetyScore} / 100</p>
        </div>

        <div className="bg-[#0D1322] p-4 rounded-xl border border-slate-800 space-y-1">
          <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Unremedied Recalls</p>
          <p className="text-2xl font-black text-rose-400">{totalOpenRecalls}</p>
        </div>
      </div>

      {/* MANAGED FLEET GRID (STEP 3 HIGHLIGHT) */}
      <div className={`space-y-3 p-2 rounded-2xl transition-all duration-300 ${
        isTourActive && currentTourStep === 2 ? 'border border-cyan-400 ring-2 ring-cyan-400/80 bg-cyan-950/20' : ''
      }`}>
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {brokerBrandName} — Client Accounts
          </h2>
          <span className="text-[11px] text-slate-500">
            Click any account to audit client workspace
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse bg-[#0D1322] rounded-2xl border border-slate-800">
            Loading {brokerBrandName} portfolio accounts...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fleets.map((fleet) => (
              <div
                key={fleet.organization_id}
                className="bg-[#0D1322] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-extrabold text-white">{fleet.fleet_name}</h3>
                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">
                      {fleet.subscription_tier} TIER
                    </p>
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                      fleet.safety_score >= 80
                        ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400'
                        : 'bg-amber-950/80 border-amber-500/50 text-amber-400'
                    }`}
                  >
                    Safety Score: {fleet.safety_score}/100
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-[#070B14] p-3 rounded-xl border border-slate-800 text-center text-xs">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Total VINs</p>
                    <p className="font-bold text-white mt-1">{fleet.total_vins}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Open Recalls</p>
                    <p className="font-bold text-rose-400 mt-1">{fleet.open_recalls}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase font-bold">Cleared</p>
                    <p className="font-bold text-emerald-400 mt-1">{fleet.cleared_recalls}</p>
                  </div>
                </div>

                <div className="pt-1 flex justify-between items-center text-xs">
                  <span className="text-[10px] text-slate-500 italic">
                    Partnered via {brokerBrandName}
                  </span>
                  <a
                    href={`/?org=${fleet.organization_id}`}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold transition flex items-center gap-1"
                  >
                    Audit Client Workspace →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* GUARANTEED UN-CLIPPED FLOATING TOUR CARD */}
      {isTourActive && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 sm:w-96 bg-[#0D1322] border-2 border-cyan-400 rounded-2xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.4)] space-y-3 font-mono text-slate-100 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-widest">
              {tourSteps[currentTourStep].badge}
            </span>
            <button 
              type="button" 
              onClick={() => setIsTourActive(false)}
              className="text-slate-400 hover:text-white transition text-xs cursor-pointer px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>💡</span> {tourSteps[currentTourStep].title}
            </h3>
            <p className="text-[11px] text-slate-300 leading-normal">
              {tourSteps[currentTourStep].description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {tourSteps.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-1 rounded-full transition-all ${
                    idx === currentTourStep ? 'w-4 bg-cyan-400' : 'w-1 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentTourStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentTourStep(prev => prev - 1)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  ← Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNextTourStep}
                className="px-3 py-1 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold rounded cursor-pointer"
              >
                {currentTourStep === tourSteps.length - 1 ? "🔗 Copy Link & Finish" : "Next Step →"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* RESTART TOUR BUTTON */}
      {!isTourActive && (
        <button
          type="button"
          onClick={() => {
            setCurrentTourStep(0);
            setIsTourActive(true);
          }}
          className="fixed bottom-6 right-6 z-40 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer"
        >
          <span>💡 Restart Product Tour</span>
        </button>
      )}

    </div>
  );
};

export default BrokerPortal;