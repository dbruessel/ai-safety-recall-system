import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

interface ClientFleetSummary {
  organization_id: string;
  fleet_name: string;
  subscription_tier: string;
  total_vins: number;
  open_recalls: number;
  scheduled_recalls: number;
  cleared_recalls: number;
  safety_score: number;
}

// Realistic demo accounts for sales outreach & unpopulated broker views
const DEMO_PORTFOLIO: ClientFleetSummary[] = [
  {
    organization_id: 'demo-org-1',
    fleet_name: 'Apex Logistics & Freight',
    subscription_tier: 'Enterprise',
    total_vins: 142,
    open_recalls: 3,
    scheduled_recalls: 5,
    cleared_recalls: 134,
    safety_score: 82,
  },
  {
    organization_id: 'demo-org-2',
    fleet_name: 'Summit Regional Transport',
    subscription_tier: 'Professional',
    total_vins: 68,
    open_recalls: 0,
    scheduled_recalls: 2,
    cleared_recalls: 66,
    safety_score: 98,
  },
  {
    organization_id: 'demo-org-3',
    fleet_name: 'Titan Heavy Hauling Co.',
    subscription_tier: 'Professional',
    total_vins: 210,
    open_recalls: 14,
    scheduled_recalls: 8,
    cleared_recalls: 188,
    safety_score: 58,
  },
  {
    organization_id: 'demo-org-4',
    fleet_name: 'Metro Last-Mile Delivery',
    subscription_tier: 'Standard',
    total_vins: 45,
    open_recalls: 1,
    scheduled_recalls: 1,
    cleared_recalls: 43,
    safety_score: 90,
  },
];

export const BrokerPortal: React.FC = () => {
  const { userProfile } = useAuth();
  const [fleets, setFleets] = useState<ClientFleetSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isDemoData, setIsDemoData] = useState<boolean>(false);
  
  // Interactive UI Button States
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'done'>('idle');

  useEffect(() => {
    async function fetchBrokerFleets() {
      // Check if visiting via explicit audit/demo paths
      const isDemoPath = window.location.pathname.toLowerCase().includes('/demo');

      if (!userProfile?.brokerage_id || isDemoPath) {
        setFleets(DEMO_PORTFOLIO);
        setIsDemoData(true);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('broker_fleet_overview')
        .select('*')
        .eq('parent_brokerage_id', userProfile.brokerage_id);

      if (error || !data || data.length === 0) {
        // Fallback to sample portfolio so broker cold leads see an active command dashboard
        setFleets(DEMO_PORTFOLIO);
        setIsDemoData(true);
      } else {
        setFleets(data);
        setIsDemoData(false);
      }
      setLoading(false);
    }

    fetchBrokerFleets();
  }, [userProfile?.brokerage_id]);

  // Handle PDF Generation via FastAPI ReportLab Backend Engine
  const handleExportPDF = async () => {
    setExportState('generating');

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';
      // Use selected fleet ID or fallback to demo fleet ID
      const fleetId = fleets[0]?.organization_id || 'demo-fleet-001';
      
      // Call your backend ReportLab PDF endpoint
      const response = await fetch(
        `${apiBaseUrl}/api/broker/compliance-report/${fleetId}/pdf?broker_name=RecallLogic%20Partner%20Brokerage`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`Server returned status ${response.status}`);
      }

      // Convert response to PDF Blob and trigger immediate browser download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `RecallLogic_Risk_Certificate_${fleetId}.pdf`;
      document.body.appendChild(link);
      link.click();
      
      // Cleanup DOM
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setExportState('done');
      setTimeout(() => setExportState('idle'), 3000);
    } catch (err) {
      console.error('Failed to download compliance PDF:', err);
      setExportState('idle');
    }
  };

  // Aggregate Portfolio Metrics
  const totalVehicles = fleets.reduce((acc, f) => acc + f.total_vins, 0);
  const totalOpen = fleets.reduce((acc, f) => acc + f.open_recalls, 0);
  const avgSafetyScore = fleets.length
    ? Math.round(fleets.reduce((acc, f) => acc + f.safety_score, 0) / fleets.length)
    : 0;

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono animate-pulse">
        Loading Broker Command Center...
      </div>
    );
  }

  return (
    <div className="px-6 space-y-6 font-mono text-slate-100 max-w-7xl mx-auto">
      
      {/* INTERACTIVE DEMO BANNER */}
      {isDemoData && (
        <div className="bg-cyan-950/60 border border-cyan-500/40 p-3 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">⚡</span>
            <span className="text-cyan-200">
              <strong>Interactive Demo View:</strong> Displaying sample commercial fleet accounts &amp; live loss metrics.
            </span>
          </div>
          <button
            onClick={() => {
              const brokerId = userProfile?.brokerage_id || 'demo-broker';
              const inviteUrl = `${window.location.origin}/signup?broker_id=${brokerId}`;
              navigator.clipboard.writeText(inviteUrl);
              
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2500);
            }}
            className={`px-3 py-1.5 font-bold rounded-lg cursor-pointer transition-all whitespace-nowrap text-[11px] flex items-center gap-1.5 ${
              copiedLink
                ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950'
            }`}
          >
            {copiedLink ? (
              <>
                <span>✓</span> Link Copied to Clipboard!
              </>
            ) : (
              <>
                <span>+</span> Copy Fleet Invite Link
              </>
            )}
          </button>
        </div>
      )}

      {/* HEADER BAR */}
      <div className="bg-[#0D1322] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold text-lg">🏢</span>
            <h1 className="text-xl font-extrabold text-white tracking-wide">Broker Portfolio Command</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Book-of-business loss control tracking, risk scoring, and underwriter compliance audits.
          </p>
        </div>
        
        {/* CLEAN PDF EXPORT BUTTON */}
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            disabled={exportState === 'generating'}
            className={`px-4 py-2 border text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-2 ${
              exportState === 'generating'
                ? 'bg-cyan-950 border-cyan-500/50 text-cyan-400 animate-pulse'
                : exportState === 'done'
                ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-white'
            }`}
          >
            {exportState === 'generating' && <span>⏳ Generating Portfolio Audit...</span>}
            {exportState === 'done' && <span>✓ Audit Report Exported!</span>}
            {exportState === 'idle' && <span>📄 Export Underwriter Audit (PDF)</span>}
          </button>
        </div>
      </div>

      {/* TOP-LINE PORTFOLIO METRICS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-[#0D1322] border border-slate-800 p-4 rounded-xl text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Fleets</p>
          <p className="text-2xl font-bold text-white mt-1">{fleets.length}</p>
        </div>
        <div className="bg-[#0D1322] border border-slate-800 p-4 rounded-xl text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Managed VINs</p>
          <p className="text-2xl font-bold text-cyan-400 mt-1">{totalVehicles}</p>
        </div>
        <div className="bg-[#0D1322] border border-slate-800 p-4 rounded-xl text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Book Safety Score</p>
          <p className={`text-2xl font-bold mt-1 ${
            avgSafetyScore >= 80 ? 'text-emerald-400' :
            avgSafetyScore >= 60 ? 'text-amber-400' : 'text-red-400'
          }`}>
            {avgSafetyScore} / 100
          </p>
        </div>
        <div className="bg-[#0D1322] border border-slate-800 p-4 rounded-xl text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider">Unremedied Liabilities</p>
          <p className="text-2xl font-bold text-red-400 mt-1">{totalOpen} Open</p>
        </div>
      </div>

      {/* CLIENT FLEET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fleets.map((fleet) => (
          <div 
            key={fleet.organization_id} 
            className="bg-[#0D1322] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all"
          >
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-white text-base">{fleet.fleet_name || 'Client Fleet Unit'}</h3>
                <span className="text-[10px] text-slate-500 uppercase">{fleet.subscription_tier || 'Standard'} Tier</span>
              </div>
              <div className={`px-3 py-1 rounded-lg text-xs font-bold border ${
                fleet.safety_score >= 80 ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' :
                fleet.safety_score >= 60 ? 'bg-amber-950/80 border-amber-500/50 text-amber-400' :
                'bg-red-950/80 border-red-500/50 text-red-400'
              }`}>
                Safety Score: {fleet.safety_score}/100
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
              <div>
                <div className="text-slate-400 text-[10px]">TOTAL VINS</div>
                <div className="text-white font-bold text-sm">{fleet.total_vins}</div>
              </div>
              <div>
                <div className="text-red-400 text-[10px]">OPEN RECALLS</div>
                <div className="text-red-400 font-bold text-sm">{fleet.open_recalls}</div>
              </div>
              <div>
                <div className="text-emerald-400 text-[10px]">CLEARED</div>
                <div className="text-emerald-400 font-bold text-sm">{fleet.cleared_recalls}</div>
              </div>
            </div>

            <button 
              onClick={() => {
                const path = window.location.pathname.toLowerCase();
                if (path.includes('/demo')) {
                  window.location.href = '/audit/demo';
                } else {
                  window.location.href = `/?org=${fleet.organization_id}`;
                }
              }}
              className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              Audit Client Workspace →
            </button>
          </div>
        ))}
      </div>

    </div>
  );
};

export default BrokerPortal;