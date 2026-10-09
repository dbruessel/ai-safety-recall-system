// frontend/src/components/FleetioNuclearAlert.tsx
import React from 'react';
import { ShieldAlert, ExternalLink } from 'lucide-react';

interface RecallTask {
  id: string;
  campaign_number: string;
  component: string;
  severity_score: number;
  nuclear_liability_flag: boolean;
  fleetio_vehicle_id: string;
}

export const FleetioNuclearAlert: React.FC<{ recallTasks: RecallTask[] }> = ({ recallTasks }) => {
  const nuclearTasks = recallTasks.filter(t => t.nuclear_liability_flag);

  if (nuclearTasks.length === 0) return null;

  return (
    <div className="bg-red-950 border-2 border-red-600 rounded-lg p-5 mb-6 text-white shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <ShieldAlert className="w-8 h-8 text-red-500 animate-pulse" />
          <div>
            <h3 className="text-xl font-bold text-red-100">
              {nuclearTasks.length} Nuclear Liability Alert(s) Detected
            </h3>
            <p className="text-sm text-red-300">
              Active vehicles in Fleetio are operating with unaddressed, high-severity safety recalls.
            </p>
          </div>
        </div>
        <span className="bg-red-600 text-white text-xs font-black uppercase px-3 py-1 rounded-full tracking-widest">
          High Legal Risk
        </span>
      </div>

      <div className="space-y-2 mt-4">
        {nuclearTasks.map((task) => (
          <div key={task.id} className="flex justify-between items-center bg-red-900/50 p-3 rounded border border-red-800">
            <div>
              <span className="font-semibold text-red-200">Campaign #{task.campaign_number}</span>
              <span className="text-red-400 text-sm ml-2">({task.component})</span>
            </div>
            <a
              href={`https://secure.fleetio.com/vehicles/${task.fleetio_vehicle_id}/issues`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center text-xs bg-red-600 hover:bg-red-500 text-white font-bold py-1.5 px-3 rounded transition-colors"
            >
              View in Fleetio <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>
        ))}
      </div>
    </div>
  );
};