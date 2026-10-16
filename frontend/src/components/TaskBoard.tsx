import React, { useState } from 'react';
import { BulkCsvImportModal } from './BulkCsvImportModal';
import { SingleVinScanModal } from './SingleVinScanModal';
import { PricingUpgradeModal } from './PricingUpgradeModal';

export interface TaskBoardProps {
  onSignOut?: () => void;
  userCompany?: string;
  userRole?: string;
  userTier?: 'standard' | 'professional' | 'enterprise';
}

interface FleetTask {
  id: string;
  unit_number: string;
  vin: string;
  make_model: string;
  campaign_number: string;
  component: string;
  severity: 'NUCLEAR' | 'HIGH' | 'MEDIUM' | 'LOW';
  ecosystem_feeds: string[];
  remedy_logistics: string;
  compliance_status: 'OPEN' | 'SCHEDULED' | 'CLEARED';
  fleetio_work_order?: string;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  onSignOut,
  userCompany = 'Standard Fleet Co.',
  userRole = 'Fleet Manager',
  userTier = 'standard',
}) => {
  // MODAL STATES
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isSingleScanOpen, setIsSingleScanOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);

  // SEARCH AND FILTER STATES
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'CLEARED'>('ALL');

  // MOCK FLEET DATA (Default Baseline)
  const [tasks] = useState<FleetTask[]>([
    {
      id: 'task-1',
      unit_number: 'UNIT-101',
      vin: '1FUJGLDR5MLKE1234',
      make_model: 'FREIGHTLINER CASCADIA 2023',
      campaign_number: '23V-891 — STEERING AXLE DRAG LINK',
      component: 'NHTSA Priority Safety Campaign • Action Required',
      severity: 'NUCLEAR',
      ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
      remedy_logistics: 'Fleetio Work Order Issued',
      compliance_status: 'OPEN',
      fleetio_work_order: 'WO-FLT-889102',
    },
    {
      id: 'task-2',
      unit_number: 'UNIT-204',
      vin: '1FT8W1Y85PKA54321',
      make_model: 'FORD TRANSIT VAN 2022',
      campaign_number: '24V-012 — REAR DRIVESHAFT FLEX COUPLING',
      component: 'NHTSA Priority Safety Campaign • Action Required',
      severity: 'HIGH',
      ecosystem_feeds: ['FLEETIO'],
      remedy_logistics: 'Metro Ford Commercial (Parts Backorder)',
      compliance_status: 'SCHEDULED',
    },
    {
      id: 'task-3',
      unit_number: 'UNIT-309',
      vin: '5YJ3E1EA7MF987654',
      make_model: 'VOLVO VNL 860 2023',
      campaign_number: '23V-838 — AIR BRAKE ACTUATOR DIAPHRAGM',
      component: 'NHTSA Priority Safety Campaign • Action Required',
      severity: 'HIGH',
      ecosystem_feeds: ['FLEETIO', 'GEOTAB'],
      remedy_logistics: 'Volvo Truck Center (Remedy Complete)',
      compliance_status: 'CLEARED',
    },
  ]);

  // CAPACITY LIMITS BASED ON TIER
  const maxVinCapacity = userTier === 'standard' ? 50 : userTier === 'professional' ? 250 : 9999;
  const currentVinCount = tasks.length;

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.campaign_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.make_model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || task.compliance_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const nuclearAlerts = tasks.filter((t) => t.severity === 'NUCLEAR' && t.compliance_status !== 'CLEARED');

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black">
      {/* TOP WORKSPACE NAVIGATION */}
      <nav className="border-b border-slate-800 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-6 py-3 font-mono">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="font-extrabold text-white text-sm tracking-wide">RECALLLOGIC WORKSPACE</span>
            <span className="text-slate-600 text-xs">|</span>
            <span className="text-xs text-slate-400">Safety Intelligence System</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1 rounded-lg text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-white font-bold">{userCompany}</span>
              <span className="text-slate-400 text-[10px] uppercase">({userRole})</span>
              <span className="text-slate-500 text-[10px] uppercase">[{userTier}]</span>
            </div>

            {onSignOut && (
              <button
                type="button"
                onClick={onSignOut}
                className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
              >
                Sign Out
              </button>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* HEADER TITLE BAR */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 mb-1">
              <span>PORTFOLIO COMMAND</span>
              <span>&gt;</span>
              <span className="text-cyan-400 font-bold">{userCompany.toUpperCase()}</span>
              <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[9px] px-2 py-0.5 rounded font-bold uppercase ml-2">
                VERIFIED EVIDENCE LOCKER
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white font-mono tracking-tight">
              Underwriter Audit &amp; Remediation Workspace
            </h1>
          </div>

          <div className="flex items-center gap-3 font-mono text-xs">
            <button
              type="button"
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-lg transition cursor-pointer flex items-center gap-2"
            >
              <span>🔗 Share Live Underwriter Link</span>
            </button>
            <button
              type="button"
              className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-cyan-950 cursor-pointer flex items-center gap-2"
            >
              <span>📄 Export Loss Control PDF</span>
            </button>
          </div>
        </div>

        {/* NUCLEAR LIABILITY ALERT BANNER */}
        {nuclearAlerts.length > 0 && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-600/80 text-red-200 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-red-900/80 border border-red-500/50 flex items-center justify-center text-red-100 font-bold text-base shrink-0">
                ⚠️
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-white text-sm">
                    {nuclearAlerts.length} NUCLEAR LIABILITY ALERT(S) DETECTED
                  </span>
                  <span className="bg-red-900 text-red-200 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                    HIGH LEGAL EXPOSURE
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Vehicles operating with unaddressed, critical safety recalls (Brakes/Steering). Standard insurance policies DO NOT cover punitive penalties[cite: 1, 6].
                </p>
              </div>
            </div>

            <a
              href="https://www.fleetio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition whitespace-nowrap shrink-0 shadow-md shadow-red-950 flex items-center gap-1.5"
            >
              <span>View in Fleetio ↗</span>
            </a>
          </div>
        )}

        {/* MONITORED FLEET CAPACITY & VIN AUDIT ACTION BAR */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 font-mono text-xs shadow-lg">
          {/* USAGE GAUGE */}
          <div className="flex items-center gap-4 w-full md:w-auto flex-1 max-w-md">
            <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400 flex items-center justify-center font-bold text-base shrink-0">
              🚚
            </div>
            <div className="space-y-1 flex-1">
              <div className="flex items-center justify-between gap-3 font-bold">
                <span className="text-white">Monitored Fleet Capacity</span>
                <span className="text-cyan-400">
                  {currentVinCount} / {maxVinCapacity} Units ({userTier.toUpperCase()})
                </span>
              </div>
              {/* PROGRESS BAR */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    currentVinCount >= maxVinCapacity ? 'bg-red-500' : 'bg-[#06B6D4]'
                  }`}
                  style={{ width: `${Math.min((currentVinCount / maxVinCapacity) * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* AUDIT / IMPORT ACTION BUTTONS */}
          <div className="flex items-center gap-2 w-full md:w-auto justify-end shrink-0">
            <button
              type="button"
              onClick={() => setIsSingleScanOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-lg transition font-mono cursor-pointer"
            >
              + Single VIN Scan
            </button>

            <button
              type="button"
              onClick={() => {
                if (currentVinCount >= maxVinCapacity) {
                  setIsUpgradeModalOpen(true);
                } else {
                  setIsBulkImportOpen(true);
                }
              }}
              className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-cyan-950 flex items-center gap-1.5 cursor-pointer font-mono whitespace-nowrap"
            >
              <span>+ Bulk Import Fleet (.CSV)</span>
            </button>
          </div>
        </div>

        {/* SEARCH AND FILTER BAR */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 font-mono text-xs">
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search Unit #, VIN, or Campaign..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-9 pr-3 text-white placeholder-slate-500 focus:outline-none focus:border-[#06B6D4]"
            />
            <span className="absolute left-3 top-2.5 text-slate-500">🔍</span>
          </div>

          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg w-full sm:w-auto justify-center">
            {(['ALL', 'OPEN', 'SCHEDULED', 'CLEARED'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1 rounded-md font-bold transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-[#06B6D4] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* WORKSPACE DATA TABLE */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl font-mono text-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="p-4">VEHICLE / VIN</th>
                  <th className="p-4">MAKE &amp; MODEL</th>
                  <th className="p-4">SAFETY RECALL DETAILS</th>
                  <th className="p-4">ECOSYSTEM FEEDS</th>
                  <th className="p-4">REMEDY LOGISTICS</th>
                  <th className="p-4">COMPLIANCE STATUS</th>
                  <th className="p-4 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">
                      No fleet assets match the selected filter query.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-4">
                        <div className="font-bold text-white">{task.unit_number}</div>
                        <div className="text-[10px] text-slate-500">{task.vin}</div>
                      </td>
                      <td className="p-4 font-semibold text-slate-200">{task.make_model}</td>
                      <td className="p-4 max-w-xs">
                        <div className="font-bold text-red-300">{task.campaign_number}</div>
                        <div className="text-[10px] text-slate-400">{task.component}</div>
                      </td>
                      <td className="p-4">
                        <div className="flex gap-1.5 flex-wrap">
                          {task.ecosystem_feeds.map((feed) => (
                            <span
                              key={feed}
                              className="bg-cyan-950 border border-cyan-800 text-cyan-300 text-[9px] px-2 py-0.5 rounded font-bold"
                            >
                              🔌 {feed}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">{task.remedy_logistics}</td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                            task.compliance_status === 'OPEN'
                              ? 'bg-red-950 text-red-400 border border-red-800'
                              : task.compliance_status === 'SCHEDULED'
                              ? 'bg-amber-950 text-amber-400 border border-amber-800'
                              : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          }`}
                        >
                          {task.compliance_status === 'OPEN'
                            ? '❗ OPEN'
                            : task.compliance_status === 'SCHEDULED'
                            ? '🕒 SCHEDULED'
                            : '✓ CLEARED'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        {task.fleetio_work_order ? (
                          <a
                            href="https://www.fleetio.com"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700 text-cyan-300 rounded text-[11px] font-bold transition inline-flex items-center gap-1"
                          >
                            View Fleetio {task.fleetio_work_order} ↗
                          </a>
                        ) : task.compliance_status === 'CLEARED' ? (
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-emerald-950 border border-emerald-700 text-emerald-300 rounded text-[11px] font-bold hover:bg-emerald-900 transition"
                          >
                            ✓ Download Cert
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="px-3 py-1.5 bg-slate-800 border border-slate-700 text-slate-300 rounded text-[11px] font-bold hover:bg-slate-700 transition"
                          >
                            🔄 Sync Status
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* FOOTER SYNC STATUS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-2 text-[11px] text-slate-500 font-mono pt-2">
          <span>ℹ️ Automated two-way sync via Fleetio, Samsara, and Geotab Webhooks (Last sync: Just now)[cite: 1].</span>
          <span>RecallLogic Underwriter Verification Engine v2.4</span>
        </div>
      </main>

      {/* RESTORED MODAL COMPONENTS */}
      {isBulkImportOpen && (
        <BulkCsvImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          onSuccess={() => setIsBulkImportOpen(false)}
        />
      )}

      {isSingleScanOpen && (
        <SingleVinScanModal
          isOpen={isSingleScanOpen}
          onClose={() => setIsSingleScanOpen(false)}
        />
      )}

      {isUpgradeModalOpen && (
        <PricingUpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          onSelectTier={(tier) => {
            console.log('Selected tier upgrade:', tier);
            setIsUpgradeModalOpen(false);
          }}
        />
      )}
    </div>
  );
};

export default TaskBoard;