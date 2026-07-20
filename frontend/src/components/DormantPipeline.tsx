import React, { useState } from 'react';

interface DormantProspect {
  id: string;
  fleet_name: string;
  contact_email: string;
  asset_count: number;
  last_touch: string;
  status: 'cold' | 'warm' | 'high_priority';
}

export default function DormantPipeline() {
  const [prospects, setProspects] = useState<DormantProspect[]>([
    { id: '1', fleet_name: 'Desert Star HVAC Logistics', contact_email: 'ops@desertstarhvac.com', asset_count: 24, last_touch: '4 days ago', status: 'high_priority' },
    { id: '2', fleet_name: 'Silver State Couriers', contact_email: 'dispatch@silverstatecouriers.internal', asset_count: 12, last_touch: '7 days ago', status: 'warm' },
    { id: '3', fleet_name: 'Clark County Shuttle Services', contact_email: 'safety@clarktransit.org', asset_count: 45, last_touch: '12 days ago', status: 'cold' },
  ]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleTriggerCampaign = (fleetName: string) => {
    setNotification(`Successfully queued targeted thermal-risk sequence for ${fleetName}!`);
    setTimeout(() => setNotification(null), 4000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-white font-mono font-bold text-base uppercase tracking-tight flex items-center gap-2">
            <span>⚡</span> Dormant Fleet Risk Pipeline
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Unengaged prospect records from your active GTM outreach wave ready for re-engagement.
          </p>
        </div>
        <div className="text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-3 py-1.5 rounded-lg">
          {prospects.length} Target Accounts Tracked
        </div>
      </div>

      {notification && (
        <div className="p-3 bg-emerald-950/40 border border-emerald-900/50 rounded-xl text-emerald-300 font-mono text-xs animate-fadeIn">
          ✅ {notification}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-4">Fleet Account</th>
              <th className="py-3 px-4">Contact Handle</th>
              <th className="py-3 px-4">Assets</th>
              <th className="py-3 px-4">Last Touch</th>
              <th className="py-3 px-4 text-right">Conversion Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-sans text-xs text-slate-300">
            {prospects.map((item) => (
              <tr key={item.id} className="hover:bg-slate-800/40 transition">
                <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full ${
                    item.status === 'high_priority' ? 'bg-rose-500 animate-pulse' :
                    item.status === 'warm' ? 'bg-amber-400' : 'bg-slate-500'
                  }`} />
                  {item.fleet_name}
                </td>
                <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">{item.contact_email}</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400 font-semibold">{item.asset_count} VINs</td>
                <td className="py-3.5 px-4 text-slate-400">{item.last_touch}</td>
                <td className="py-3.5 px-4 text-right">
                  <button
                    onClick={() => handleTriggerCampaign(item.fleet_name)}
                    className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-mono text-[10px] uppercase font-bold rounded-lg transition shadow-sm"
                  >
                    🚀 Trigger Heat Pulse
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}