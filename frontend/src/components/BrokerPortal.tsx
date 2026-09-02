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

export const BrokerPortal: React.FC = () => {
  const { userProfile } = useAuth();
  const [fleets, setFleets] = useState<ClientFleetSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchBrokerFleets() {
      if (!userProfile?.brokerage_id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from('broker_fleet_overview')
        .select('*')
        .eq('parent_brokerage_id', userProfile.brokerage_id);

      if (error) {
        console.error('Error fetching broker fleets:', error);
      } else {
        setFleets(data || []);
      }
      setLoading(false);
    }

    fetchBrokerFleets();
  }, [userProfile?.brokerage_id]);

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400 font-mono animate-pulse">
        Loading broker portfolio accounts...
      </div>
    );
  }

  return (
    <div className="px-6 space-y-6 font-mono text-slate-100">
      {/* HEADER BAR */}
      <div className="bg-[#0D1322] p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 font-bold">🏢</span>
            <h1 className="text-xl font-extrabold text-white">Broker Portfolio Command</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time loss control tracking, active fleet safety scores, and underwriter compliance audits.
          </p>
        </div>
        <div className="px-3 py-1.5 rounded-lg bg-cyan-950/80 border border-cyan-500/40 text-xs text-cyan-400 font-bold uppercase">
          {fleets.length} Assigned Client Fleets
        </div>
      </div>

      {/* CLIENT FLEET CARDS GRID */}
      {fleets.length === 0 ? (
        <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
          <p className="font-bold text-white mb-1">No assigned client fleets linked to your brokerage yet.</p>
          <p className="text-xs text-slate-500">
            Link an organization's <code className="text-cyan-400">parent_brokerage_id</code> in Supabase to start monitoring their fleet score.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {fleets.map((fleet) => (
            <div key={fleet.organization_id} className="bg-[#0D1322] border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition-all">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-white text-sm">{fleet.fleet_name || 'Client Fleet Unit'}</h3>
                  <span className="text-[10px] text-slate-500 uppercase">{fleet.subscription_tier || 'Standard'} Tier</span>
                </div>
                <div className={`px-2.5 py-1 rounded text-xs font-bold border ${
                  fleet.safety_score >= 80 ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-400' :
                  fleet.safety_score >= 60 ? 'bg-amber-950/80 border-amber-500/50 text-amber-400' :
                  'bg-red-950/80 border-red-500/50 text-red-400'
                }`}>
                  Score: {fleet.safety_score}/100
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-950/50 p-3 rounded-xl border border-slate-800/60">
                <div>
                  <div className="text-slate-400 text-[10px]">TOTAL VINS</div>
                  <div className="text-white font-bold">{fleet.total_vins}</div>
                </div>
                <div>
                  <div className="text-red-400 text-[10px]">OPEN RECALLS</div>
                  <div className="text-red-400 font-bold">{fleet.open_recalls}</div>
                </div>
                <div>
                  <div className="text-emerald-400 text-[10px]">CLEARED</div>
                  <div className="text-emerald-400 font-bold">{fleet.cleared_recalls}</div>
                </div>
              </div>

              <button 
                onClick={() => alert(`Navigating to client audit view for ${fleet.fleet_name}...`)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold rounded-lg transition-all cursor-pointer"
              >
                Audit Client Fleet →
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BrokerPortal;