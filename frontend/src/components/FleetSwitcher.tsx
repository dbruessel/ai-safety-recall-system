import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface ManagedFleet {
  id: string;
  fleet_name: string;
  dot_number: string;
  vin_count: number;
  safety_score: number;
  punitive_exposure: number;
}

interface FleetSwitcherProps {
  currentFleetId: string | null;
  onSelectFleet: (fleet: ManagedFleet | null) => void;
}

export const FleetSwitcher: React.FC<FleetSwitcherProps> = ({
  currentFleetId,
  onSelectFleet,
}) => {
  const [fleets, setFleets] = useState<ManagedFleet[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchFleets = async () => {
      const { data, error } = await supabase
        .from('managed_fleets')
        .select('*')
        .order('fleet_name', { ascending: true });

      if (!error && data) {
        setFleets(data);
      }
    };

    fetchFleets();
  }, []);

  const activeFleet = fleets.find((f) => f.id === currentFleetId || f.fleet_name === currentFleetId);

  return (
    <div className="relative font-mono text-xs">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-cyan-500 rounded-lg text-slate-200 transition cursor-pointer"
      >
        <span className="text-cyan-400">🏛️</span>
        <span className="font-bold text-white max-w-[160px] truncate">
          {activeFleet ? activeFleet.fleet_name : 'Portfolio Overview'}
        </span>
        <span className="text-slate-500 text-[10px]">▼</span>
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-800/60">
          <div className="p-2 bg-slate-900/50 text-[10px] uppercase tracking-wider text-slate-400 font-bold flex justify-between items-center">
            <span>Enterprise Portfolios</span>
            <span className="text-cyan-400 font-mono">{fleets.length} Fleets</span>
          </div>

          <div className="max-h-64 overflow-y-auto">
            {/* Master Overview Option */}
            <button
              type="button"
              onClick={() => {
                onSelectFleet(null);
                setIsOpen(false);
              }}
              className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-900 transition cursor-pointer ${
                !currentFleetId ? 'bg-cyan-950/40 text-cyan-300 font-bold' : 'text-slate-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span>📊</span>
                <div>
                  <div className="text-xs font-bold text-white">Full Portfolio Command</div>
                  <div className="text-[10px] text-slate-500">Aggregate loss-control summary</div>
                </div>
              </div>
            </button>

            {/* Individual Managed Fleets */}
            {fleets.map((fleet) => (
              <button
                key={fleet.id}
                type="button"
                onClick={() => {
                  onSelectFleet(fleet);
                  setIsOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 flex items-center justify-between hover:bg-slate-900 transition cursor-pointer ${
                  currentFleetId === fleet.id || currentFleetId === fleet.fleet_name
                    ? 'bg-cyan-950/40 text-cyan-300 font-bold'
                    : 'text-slate-300'
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-white">{fleet.fleet_name}</div>
                  <div className="text-[10px] text-slate-500">
                    {fleet.dot_number} • {fleet.vin_count} Units
                  </div>
                </div>

                <div className="text-right">
                  <div
                    className={`text-[10px] font-bold ${
                      fleet.punitive_exposure > 0 ? 'text-red-400' : 'text-emerald-400'
                    }`}
                  >
                    {fleet.punitive_exposure > 0
                      ? `+$${(fleet.punitive_exposure / 1000).toFixed(0)}k`
                      : '✓ $0'}
                  </div>
                  <div className="text-[9px] text-slate-500">Score: {fleet.safety_score}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};