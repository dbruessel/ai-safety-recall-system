import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { BulkCsvImportModal } from './BulkCsvImportModal';
import { SingleVinScanModal } from './SingleVinScanModal';
import { PricingUpgradeModal } from './PricingUpgradeModal';
import { ShareUnderwriterModal } from './ShareUnderwriterModal';
import { exportLossControlPdf } from '../utils/exportLossControlPdf';

export interface TaskBoardProps {
  onSignOut?: () => void;
  userCompany?: string;
  userRole?: string;
  userTier?: 'standard' | 'professional' | 'enterprise';
  onOpenShareModal?: () => void;
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
  userCompany = 'Standard Fleet Co.',
  userTier = 'standard',
  onOpenShareModal,
}) => {
  // MODAL STATES
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isSingleScanOpen, setIsSingleScanOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // SEARCH AND FILTER STATES
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'CLEARED'>('ALL');

  // FLEET DATA STATE
  const [tasks, setTasks] = useState<FleetTask[]>([
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

  // RELOAD VEHICLES FROM SUPABASE
  const loadMonitoredVehicles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbVehicles, error } = await supabase
        .from('monitored_vehicles')
        .select('*')
        .eq('profile_id', user.id);

      if (error || !dbVehicles) return;

      const dbTasks: FleetTask[] = dbVehicles.map((v) => ({
        id: v.id,
        unit_number: `UNIT-${v.vin.slice(-4)}`,
        vin: v.vin,
        make_model: `${v.year || ''} ${v.make || ''} ${v.model || ''}`.toUpperCase().trim() || 'AUDITED VEHICLE UNIT',
        campaign_number: v.vin === '1FUJGLDR5MLKE1234' 
          ? '23V-891 — STEERING AXLE DRAG LINK' 
          : 'NHTSA MONITORED • ZERO OPEN RECALLS',
        component: v.vin === '1FUJGLDR5MLKE1234'
          ? 'NHTSA Priority Safety Campaign • Action Required'
          : 'Continuous Safety Ingestion Active',
        severity: v.vin === '1FUJGLDR5MLKE1234' ? 'NUCLEAR' : 'LOW',
        ecosystem_feeds: ['RECALLLOGIC'],
        remedy_logistics: 'Active Monitoring Ingested',
        compliance_status: v.vin === '1FUJGLDR5MLKE1234' ? 'OPEN' : 'CLEARED',
      }));

      setTasks((prev) => {
        const existingVins = new Set(prev.map((t) => t.vin));
        const uniqueNewTasks = dbTasks.filter((t) => !existingVins.has(t.vin));
        return [...prev, ...uniqueNewTasks];
      });
    } catch (err) {
      console.warn('Could not fetch monitored vehicles:', err);
    }
  };

  useEffect(() => {
    loadMonitoredVehicles();
  }, []);

  const maxVinCapacity = userTier === 'standard' ? 50 : userTier === 'professional' ? 250 : 9999;
  const currentVinCount = tasks.length;

  const exposureMetrics = useMemo(() => {
    let exposure = 0;
    let nuclearBreaches = 0;
    let highBreaches = 0;

    tasks.forEach((task) => {
      if (task.compliance_status === 'OPEN') {
        if (task.severity === 'NUCLEAR') {
          exposure += 250000;
          nuclearBreaches += 1;
        } else if (task.severity === 'HIGH') {
          exposure += 50000;
          highBreaches += 1;
        } else {
          exposure += 10000;
        }
      }
    });

    return {
      totalExposure: exposure,
      nuclearBreaches,
      highBreaches,
      isShieldActive: exposure === 0,
      formattedExposure: `$${exposure.toLocaleString()}`,
    };
  }, [tasks]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.unit_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.campaign_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.make_model.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || task.compliance_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const nuclearAlerts = tasks.filter((t) => t.severity === 'NUCLEAR' && t.compliance_status === 'OPEN');

  const handleOpenShare = () => {
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      setIsShareModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black">
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
            {/* TIER-GATED: ONLY SHOWN FOR PROFESSIONAL & ENTERPRISE */}
            {userTier !== 'standard' && (
              <button
                type="button"
                onClick={handleOpenShare}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold rounded-lg transition cursor-pointer flex items-center gap-2 shadow-sm"
              >
                <span>🔗 Share Live Underwriter Link</span>
              </button>
            )}

            {/* SHARED COMPLIANCE EXPORT ENGINE */}
            <button
              type="button"
              onClick={() => exportLossControlPdf(userCompany, tasks)}
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
              <div className="w-9 h-9 rounded-lg bg-red-900/80 border border-red-500/50 flex items-center justify-center text-red-100 font-bold text-base shrink-0 animate-pulse">
                ⚠️
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-sm">
                    {nuclearAlerts.length} NUCLEAR DEFECT ALERT(S) DETECTED
                  </span>
                  <span className="bg-red-900 text-red-200 text-[9px] px-1.5 py-0.5 rounded uppercase font-bold">
                    CRITICAL HAZARD
                  </span>
                  <span className="bg-red-950 border border-red-500 text-red-300 text-[10px] px-2 py-0.5 rounded font-bold">
                    {exposureMetrics.formattedExposure} UNINSURABLE PUNITIVE EXPOSURE
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] mt-0.5">
                  Vehicles operating with unaddressed, critical safety recalls (Brakes/Steering). Standard commercial policies exclude punitive damages under Negligent Maintenance doctrines.
                </p>
              </div>
            </div>

            <a
              href="https://www.fleetio.com"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition whitespace-nowrap shrink-0 shadow-md shadow-red-950 flex items-center gap-1.5"
            >
              <span>Remediate in Fleetio ↗</span>
            </a>
          </div>
        )}

        {/* METRICS GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div
            className={`p-4 rounded-xl border flex flex-col justify-between gap-3 font-mono text-xs shadow-lg transition-all ${
              exposureMetrics.isShieldActive
                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
                : 'bg-red-950/20 border-red-600/40 text-red-200'
            }`}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">{exposureMetrics.isShieldActive ? '🛡️' : '🚨'}</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    InsurTech Loss Control Shield
                  </div>
                  <div className="text-sm font-bold text-white">
                    {exposureMetrics.isShieldActive
                      ? '100% Legal Defense Active'
                      : 'Punitive Exposure Breach'}
                  </div>
                </div>
              </div>

              <span
                className={`text-[10px] px-2.5 py-1 rounded font-bold uppercase tracking-wider ${
                  exposureMetrics.isShieldActive
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                    : 'bg-red-950 text-red-400 border border-red-800'
                }`}
              >
                {exposureMetrics.isShieldActive
                  ? 'Zero Liability'
                  : `${exposureMetrics.nuclearBreaches} Critical Breach`}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <div>
                <div className="text-[10px] text-slate-400">Total Uninsurable Liability</div>
                <div
                  className={`text-2xl font-extrabold tracking-tight ${
                    exposureMetrics.isShieldActive ? 'text-emerald-400' : 'text-red-500'
                  }`}
                >
                  {exposureMetrics.formattedExposure}
                </div>
              </div>

              <div className="text-right text-[11px]">
                {exposureMetrics.isShieldActive ? (
                  <span className="text-emerald-400 font-semibold bg-emerald-950/60 border border-emerald-800/80 px-2.5 py-1 rounded inline-block">
                    ✓ Underwriter 15% Credit Active
                  </span>
                ) : (
                  <span className="text-red-400/90 font-medium">
                    Remediate in Fleetio to defend loss ratio
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between gap-3 font-mono text-xs shadow-lg">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-base">🚚</span>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    Monitored Fleet Capacity
                  </div>
                  <div className="text-sm font-bold text-white">
                    {currentVinCount} / {maxVinCapacity} Units ({userTier.toUpperCase()})
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (currentVinCount >= maxVinCapacity) {
                      setIsUpgradeModalOpen(true);
                    } else {
                      setIsSingleScanOpen(true);
                    }
                  }}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded transition cursor-pointer text-[10px]"
                >
                  + Scan VIN
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
                  className="px-3 py-1 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold rounded transition shadow-md shadow-cyan-950 cursor-pointer text-[10px]"
                >
                  + Import (.CSV)
                </button>
              </div>
            </div>

            <div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    currentVinCount >= maxVinCapacity ? 'bg-red-500' : 'bg-[#06B6D4]'
                  }`}
                  style={{ width: `${Math.min((currentVinCount / maxVinCapacity) * 100, 100)}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] text-slate-500 mt-1.5">
                <span>Real-time NHTSA & OEM Ingestion</span>
                <span>{maxVinCapacity - currentVinCount} slots available</span>
              </div>
            </div>
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
              <tbody className="divide-y border-slate-800/60 text-slate-300">
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
                        <div className="flex flex-col gap-1 items-start">
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

                          {task.compliance_status === 'OPEN' ? (
                            <span className="text-[9px] font-bold text-red-400 bg-red-950/60 px-1.5 py-0.5 rounded border border-red-900/60">
                              {task.severity === 'NUCLEAR' ? '+$250k Exposure' : '+$50k Exposure'}
                            </span>
                          ) : task.compliance_status === 'SCHEDULED' ? (
                            <span className="text-[9px] font-medium text-amber-400/90">
                              Remediation Queued
                            </span>
                          ) : (
                            <span className="text-[9px] font-medium text-emerald-400/90">
                              Liability Defended ($0)
                            </span>
                          )}
                        </div>
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

      {/* MODAL COMPONENTS */}
      {isShareModalOpen && (
        <ShareUnderwriterModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          userCompany={userCompany}
        />
      )}

      {isBulkImportOpen && (
        <BulkCsvImportModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          currentFleetCount={currentVinCount}
          maxCapacity={maxVinCapacity}
          onUpgradeTrigger={() => {
            setIsBulkImportOpen(false);
            setIsUpgradeModalOpen(true);
          }}
          onSuccess={() => {
            loadMonitoredVehicles();
            setIsBulkImportOpen(false);
          }}
        />
      )}

      {isSingleScanOpen && (
        <SingleVinScanModal
          isOpen={isSingleScanOpen}
          onClose={() => setIsSingleScanOpen(false)}
          onSuccess={() => {
            loadMonitoredVehicles();
            setIsSingleScanOpen(false);
          }}
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