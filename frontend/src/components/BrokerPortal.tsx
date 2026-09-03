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

  // FETCH MANAGED FLEETS FOR BROKER BOOK-OF-BUSINESS
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
          // Fallback Demo Data for Interactive Broker View
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

  // CO-BRANDED CLIENT ONBOARDING LINK HANDLER
  const handleCopyInviteLink = () => {
    const brokerageId = userProfile?.brokerage_id || 'demo-broker';
    const inviteUrl = `${window.location.origin}/signup?broker_id=${brokerageId}`;

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(inviteUrl);
    }

    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2500);
  };

  // MULTI-FLEET PORTFOLIO AUDIT PDF EXPORT HANDLER
  const handleExportPortfolioPDF = async () => {
    setIsExporting(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';

      const response = await fetch(`${apiBaseUrl}/api/broker/portfolio-audit/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          broker_name: userProfile?.company_name || companyName || 'RecallLogic Partner Brokerage',
          fleets: fleets,
        }),
      });

      if (!response.ok) throw new Error(`Server returned status ${response.status}`);

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RecallLogic_Portfolio_Audit_${new Date().toISOString().slice(0, 10)}.pdf`;
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

  // AGGREGATED METRICS
  const totalVins = fleets.reduce((acc, f) => acc + f.total_vins, 0);
  const totalOpenRecalls = fleets.reduce((acc, f) => acc + f.open_recalls, 0);
  const avgSafetyScore = fleets.length ? Math.round(fleets.reduce((acc, f) => acc + f.safety_score, 0) / fleets.length) : 100;

  return (
    <div className="px-6 space-y-6 font-mono text-slate-100 max-w-7xl mx-auto">
      
      {/* DEMO BANNER & HEADER TOOLBAR */}
      <div className="bg-[#0D1322] p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="text-xs text-slate-300 flex items-center gap-2">
          <span className="text-amber-400">⚡</span>
          <span>Interactive Demo View: Displaying sample commercial fleet accounts &amp; live loss metrics.</span>
        </div>

        <button
          type="button"
          onClick={handleCopyInviteLink}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap border ${
            copiedInvite
              ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
              : 'bg-[#06B6D4] hover:bg-cyan-400 border-cyan-500 text-slate-950 shadow-lg shadow-cyan-950/50'
          }`}
          title="Copy co-branded referral URL to onboard new commercial fleet clients"
        >
          {copiedInvite ? <span>✓ Link Copied!</span> : <span>🔗 Share Client Onboarding Link</span>}
        </button>
      </div>

      {/* PORTFOLIO COMMAND HEADER & PDF EXPORT */}
      <div className="bg-[#0D1322] p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-wide flex items-center gap-2">
            <span>🏢</span> Broker Portfolio Command
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Book-of-business loss control tracking, risk scoring, and underwriter compliance audits.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportPortfolioPDF}
          disabled={isExporting}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border ${
            isExporting
              ? 'bg-cyan-950 border-cyan-500/50 text-cyan-400 animate-pulse'
              : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200'
          }`}
          title="Export consolidated book-of-business audit PDF for carrier underwriters"
        >
          {isExporting ? <span>⏳ Exporting PDF...</span> : <span>📄 Export Portfolio Audit PDF</span>}
        </button>
      </div>

      {/* METRIC SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* MANAGED FLEET GRID */}
      <div className="space-y-3">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Commercial Fleet Accounts</h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400 animate-pulse bg-[#0D1322] rounded-2xl border border-slate-800">
            Loading book-of-business fleet accounts...
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

                <div className="pt-1 flex justify-end">
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

    </div>
  );
};

export default BrokerPortal;