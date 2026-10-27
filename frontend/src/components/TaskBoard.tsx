import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';

export interface MonitoredVehicle {
  id: string;
  vin: string;
  unit_number?: string;
  make: string;
  model: string;
  year: number;
  terminal?: string;
  division?: string;
  safety_recall_details?: string;
  campaign_id?: string;
  compliance_status: 'OPEN' | 'SCHEDULED' | 'CLEARED';
  punitive_exposure: number;
  work_order_id?: string;
  ecosystem_feeds?: string[];
  remedy_logistics?: string;
}

interface TaskBoardProps {
  userCompany?: string;
  userTier?: string;
  userRole?: string;
  onNavigatePortfolio?: () => void;
  onOpenShareModal?: () => void;
}

const DEFAULT_VEHICLES: MonitoredVehicle[] = [
  {
    id: 'veh-1',
    vin: '1FUJGLDR5MLKE1234',
    unit_number: 'UNIT-101',
    make: 'FREIGHTLINER',
    model: 'CASCADIA',
    year: 2023,
    terminal: 'Dallas Hub (TX)',
    division: 'Southwest Division',
    campaign_id: '23V-891',
    safety_recall_details: '23V-891 — STEERING AXLE DRAG LINK',
    compliance_status: 'OPEN',
    punitive_exposure: 250000,
    ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
    remedy_logistics: 'Fleetio Work Order Issued',
    work_order_id: 'WO-FLT-889102',
  },
  {
    id: 'veh-2',
    vin: '1FT8W1Y85PKA54321',
    unit_number: 'UNIT-204',
    make: 'FORD',
    model: 'TRANSIT VAN',
    year: 2022,
    terminal: 'Chicago Terminal (IL)',
    division: 'Midwest Division',
    campaign_id: '24V-012',
    safety_recall_details: '24V-012 — REAR DRIVESHAFT FLEX COUPLING',
    compliance_status: 'SCHEDULED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO'],
    remedy_logistics: 'Metro Ford Commercial (Parts Backorder)',
    work_order_id: 'WO-FLT-772910',
  },
  {
    id: 'veh-3',
    vin: '5YJ3E1EA7MF987654',
    unit_number: 'UNIT-309',
    make: 'VOLVO',
    model: 'VNL 860',
    year: 2023,
    terminal: 'Atlanta Logistics (GA)',
    division: 'Southeast Division',
    campaign_id: '23V-838',
    safety_recall_details: '23V-838 — AIR BRAKE ACTUATOR DIAPHRAGM',
    compliance_status: 'CLEARED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO'],
    remedy_logistics: 'Volvo Truck Center (Recall Completed)',
    work_order_id: 'WO-FLT-665120',
  },
  {
    id: 'veh-4',
    vin: '3AKJHHDR8NS112233',
    unit_number: 'UNIT-412',
    make: 'PETERBILT',
    model: '579 ULTRALOFT',
    year: 2024,
    terminal: 'Dallas Hub (TX)',
    division: 'Southwest Division',
    campaign_id: 'CLEAN',
    safety_recall_details: 'No Open NHTSA Defect Campaigns',
    compliance_status: 'CLEARED',
    punitive_exposure: 0,
    ecosystem_feeds: ['FLEETIO', 'GEOTAB'],
    remedy_logistics: 'Inspected & Underwriter Cleared',
    work_order_id: 'WO-FLT-991044',
  },
];

const CARRIER_PRESETS = [
  { id: 'travelers', name: 'Travelers Commercial Auto', badge: '🛡️ Travelers' },
  { id: 'acrisure', name: 'Acrisure Risk Solutions', badge: '🔷 Acrisure' },
  { id: 'great_american', name: 'Great American Trucking', badge: '🦅 Great American' },
  { id: 'cottingham', name: 'Cottingham & Butler', badge: '🏛️ Cottingham' },
];

export const TaskBoard: React.FC<TaskBoardProps> = ({
  userCompany = 'Dennis Enterprise Fleet',
  userTier = 'enterprise',
  userRole = 'admin',
  onNavigatePortfolio,
  onOpenShareModal,
}) => {
  const [vehicles, setVehicles] = useState<MonitoredVehicle[]>(DEFAULT_VEHICLES);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'SCHEDULED' | 'CLEARED'>('ALL');
  const [selectedTerminal, setSelectedTerminal] = useState<string>('ALL');
  const [syncingVin, setSyncingVin] = useState<string | null>(null);

  // Modals state
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isInternalShareOpen, setIsInternalShareOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [scanVinInput, setScanVinInput] = useState('');
  const [scanTerminalInput, setScanTerminalInput] = useState('');
  const [csvRawText, setCsvRawText] = useState('');

  // White-label configuration state
  const [selectedCarrier, setSelectedCarrier] = useState<string>(CARRIER_PRESETS[0].name);
  const [riskOfficerName, setRiskOfficerName] = useState<string>('Dennis Vance, VP Safety & Risk');
  const [riskOfficerEmail, setRiskOfficerEmail] = useState<string>('safety@dennisfleet.com');
  const [riskOfficerPhone, setRiskOfficerPhone] = useState<string>('(214) 555-0144');

  // Fetch live fleet data from Supabase if connected
  useEffect(() => {
    const fetchMonitoredVehicles = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data, error } = await supabase
          .from('monitored_vehicles')
          .select('*')
          .eq('profile_id', user.id);

        if (!error && data && data.length > 0) {
          const mappedVehicles: MonitoredVehicle[] = data.map((item: any, idx: number) => ({
            id: item.id || `veh-${idx}`,
            vin: item.vin,
            unit_number: item.unit_number || `UNIT-${100 + idx}`,
            make: (item.make || 'COMMERCIAL').toUpperCase(),
            model: (item.model || 'VEHICLE').toUpperCase(),
            year: item.year || 2023,
            terminal: item.terminal || 'Dallas Hub (TX)',
            division: item.division || 'Southwest Division',
            campaign_id: item.campaign_id || (idx === 0 ? '23V-891' : 'CLEAN'),
            safety_recall_details:
              item.safety_recall_details ||
              (idx === 0
                ? '23V-891 — STEERING AXLE DRAG LINK'
                : 'No Open NHTSA Defect Campaigns'),
            compliance_status: (item.status === 'active' && idx === 0 ? 'OPEN' : 'CLEARED') as
              | 'OPEN'
              | 'SCHEDULED'
              | 'CLEARED',
            punitive_exposure: idx === 0 ? 250000 : 0,
            ecosystem_feeds: ['FLEETIO', 'SAMSARA'],
            remedy_logistics:
              idx === 0 ? 'Fleetio Work Order Issued' : 'Inspected & Underwriter Cleared',
            work_order_id: `WO-FLT-${889100 + idx}`,
          }));
          setVehicles(mappedVehicles);
        }
      } catch (err) {
        console.warn('Using default demo vehicles:', err);
      }
    };

    fetchMonitoredVehicles();
  }, []);

  // Compute available unique terminals dynamically
  const availableTerminals = useMemo(() => {
    const rawTerminals = vehicles
      .map((v) => v.terminal)
      .filter((t): t is string => Boolean(t && t.trim() !== ''));
    return ['ALL', ...Array.from(new Set(rawTerminals))];
  }, [vehicles]);

  // Reactive filtered vehicle list
  const filteredVehicles = useMemo(() => {
    return vehicles.filter((v) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        v.vin.toLowerCase().includes(q) ||
        (v.unit_number && v.unit_number.toLowerCase().includes(q)) ||
        (v.campaign_id && v.campaign_id.toLowerCase().includes(q)) ||
        (v.make && v.make.toLowerCase().includes(q)) ||
        (v.model && v.model.toLowerCase().includes(q)) ||
        (v.terminal && v.terminal.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === 'ALL' || v.compliance_status === statusFilter;

      const matchesTerminal =
        selectedTerminal === 'ALL' || v.terminal === selectedTerminal;

      return matchesSearch && matchesStatus && matchesTerminal;
    });
  }, [vehicles, searchQuery, statusFilter, selectedTerminal]);

  // Dynamic calculations scoped to current terminal & search filters
  const filteredCriticalCount = useMemo(() => {
    return filteredVehicles.filter((v) => v.compliance_status === 'OPEN').length;
  }, [filteredVehicles]);

  const filteredExposure = useMemo(() => {
    return filteredVehicles
      .filter((v) => v.compliance_status === 'OPEN')
      .reduce((sum, v) => sum + (v.punitive_exposure || 0), 0);
  }, [filteredVehicles]);

  // Capacity metadata
  const vehicleLimit = userTier.toLowerCase() === 'enterprise' ? 9999 : 250;
  const availableSlots = Math.max(0, vehicleLimit - vehicles.length);
  const capacityPercent = Math.min(100, Math.round((vehicles.length / vehicleLimit) * 100));

  // Simulated 2-Way Fleetio sync action
  const handleSyncStatus = (vin: string) => {
    setSyncingVin(vin);
    setTimeout(() => {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.vin === vin) {
            if (v.compliance_status === 'OPEN') {
              return {
                ...v,
                compliance_status: 'SCHEDULED',
                punitive_exposure: 0,
                remedy_logistics: 'Parts Sourced — Dealership Bay Reserved',
              };
            }
            if (v.compliance_status === 'SCHEDULED') {
              return {
                ...v,
                compliance_status: 'CLEARED',
                punitive_exposure: 0,
                remedy_logistics: 'Remediation Verified by Underwriter Telematics',
              };
            }
          }
          return v;
        })
      );
      setSyncingVin(null);
    }, 900);
  };

  // Add individual VIN
  const handleAddVin = () => {
    if (!scanVinInput.trim()) return;
    const newEntry: MonitoredVehicle = {
      id: `veh-${Date.now()}`,
      vin: scanVinInput.trim().toUpperCase(),
      unit_number: `UNIT-${vehicles.length + 101}`,
      make: 'FREIGHTLINER',
      model: 'CASCADIA',
      year: 2024,
      terminal:
        scanTerminalInput.trim() ||
        (selectedTerminal !== 'ALL' ? selectedTerminal : 'Dallas Hub (TX)'),
      division: 'Southwest Division',
      campaign_id: 'CLEAN',
      safety_recall_details: 'No Open NHTSA Defect Campaigns',
      compliance_status: 'CLEARED',
      punitive_exposure: 0,
      ecosystem_feeds: ['FLEETIO'],
      remedy_logistics: 'NHTSA API Scan: Zero Open Recalls',
      work_order_id: `WO-FLT-${Math.floor(100000 + Math.random() * 900000)}`,
    };

    setVehicles([newEntry, ...vehicles]);
    setScanVinInput('');
    setScanTerminalInput('');
    setIsScanOpen(false);
  };

  // Bulk CSV import parser
  const handleCsvImport = () => {
    if (!csvRawText.trim()) return;
    const lines = csvRawText.trim().split('\n');
    const imported: MonitoredVehicle[] = [];

    lines.forEach((line, idx) => {
      const parts = line.split(',').map((p) => p.trim());
      if (parts[0] && parts[0].length >= 11) {
        const vin = parts[0].toUpperCase();
        const unit = parts[1] || `UNIT-${vehicles.length + idx + 101}`;
        const terminal =
          parts[2] || (selectedTerminal !== 'ALL' ? selectedTerminal : 'Dallas Hub (TX)');
        const division = parts[3] || 'Southwest Division';

        imported.push({
          id: `veh-csv-${Date.now()}-${idx}`,
          vin,
          unit_number: unit,
          make: 'COMMERCIAL',
          model: 'POWER UNIT',
          year: 2023,
          terminal,
          division,
          campaign_id: 'CLEAN',
          safety_recall_details: 'No Open NHTSA Defect Campaigns',
          compliance_status: 'CLEARED',
          punitive_exposure: 0,
          ecosystem_feeds: ['FLEETIO'],
          remedy_logistics: 'Batch Ingestion Verified',
          work_order_id: `WO-FLT-${Math.floor(100000 + Math.random() * 900000)}`,
        });
      }
    });

    if (imported.length > 0) {
      setVehicles([...imported, ...vehicles]);
    }
    setCsvRawText('');
    setIsImportOpen(false);
  };

  const handleCopyUnderwriterLink = () => {
    const bearerUrl = `https://recalllogic.ai/audit/evidence-locker?token=rl_live_${btoa(
      userCompany
    ).slice(0, 16)}`;
    navigator.clipboard.writeText(bearerUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareClick = () => {
    if (onOpenShareModal) {
      onOpenShareModal();
    } else {
      setIsInternalShareOpen(true);
    }
  };

  return (
    <div className="w-full text-slate-100 font-sans space-y-6">
      {/* Top Header & Breadcrumbs (Sign-out cleanly handled in global header) */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono tracking-wider uppercase mb-1">
            {onNavigatePortfolio && (
              <>
                <button
                  type="button"
                  onClick={onNavigatePortfolio}
                  className="text-cyan-400 hover:text-cyan-300 transition cursor-pointer font-bold"
                >
                  PORTFOLIO COMMAND
                </button>
                <span className="text-slate-600">›</span>
              </>
            )}
            <span className="text-cyan-300 font-bold">{userCompany}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase">
              Role: {userRole}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/80 uppercase">
              Continuous Risk Defense Active
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 uppercase">
              Verified Evidence Locker
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Underwriter Audit & Remediation Workspace
          </h1>
        </div>

        {/* Action Buttons: Sign-Out Removed */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleShareClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-lg text-xs font-semibold text-slate-200 transition cursor-pointer shadow-sm"
          >
            <span>🔗</span> Share Live Underwriter Link
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs transition cursor-pointer shadow-md shadow-cyan-950/50"
          >
            <span>📄</span> Export Loss Control PDF
          </button>
        </div>
      </div>

      {/* Critical Defect Exposure Alert Banner */}
      {filteredCriticalCount > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-red-950/60 via-red-900/30 to-slate-900/80 border border-red-800/70 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">⚠️</span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-sm text-red-200 font-mono tracking-wide">
                  {filteredCriticalCount} CRITICAL DEFECT ALERT(S) DETECTED
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950 text-red-400 border border-red-700/80 rounded">
                  Critical Hazard
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950 text-red-300 border border-red-700/80 rounded font-mono">
                  ${filteredExposure.toLocaleString()} Uninsurable Punitive Exposure
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">
                Vehicles operating with unaddressed, critical safety recalls (Brakes/Steering).
                Standard commercial policies exclude punitive damages under Negligent Maintenance doctrines.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter('OPEN')}
            className="whitespace-nowrap px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition shadow cursor-pointer font-mono"
          >
            Remediate in Fleetio ↗
          </button>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Loss Control Shield */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                <span>🛡️</span> CONTINUOUS LOSS CONTROL SHIELD
              </div>
              {filteredCriticalCount > 0 ? (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-red-950/80 text-red-400 border border-red-800 rounded">
                  {filteredCriticalCount} Critical Breach
                </span>
              ) : (
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800 rounded">
                  Shield Active • 15% Credit
                </span>
              )}
            </div>

            <h3 className="text-sm font-semibold text-slate-200">
              {filteredCriticalCount > 0 ? 'Punitive Exposure Breach' : 'Loss Control Rate Defense'}
            </h3>

            <div className="mt-3 flex items-baseline gap-2">
              <span
                className={`text-3xl md:text-4xl font-extrabold font-mono tracking-tight ${
                  filteredExposure > 0 ? 'text-red-500' : 'text-emerald-400'
                }`}
              >
                ${filteredExposure.toLocaleString()}
              </span>
              <span className="text-xs text-slate-500 uppercase font-mono">
                {filteredExposure > 0 ? 'Total Uninsurable Liability' : 'Punitive Liability Defended'}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">
              {selectedTerminal === 'ALL'
                ? 'Portfolio Aggregate Liability'
                : `Filtered Scope: ${selectedTerminal}`}
            </span>
            <span className="text-cyan-400 font-medium">
              {filteredExposure > 0
                ? 'Remediate in Fleetio to defend loss ratio'
                : 'Underwriter audit certified ✓'}
            </span>
          </div>
        </div>

        {/* Card 2: Monitored Fleet Capacity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                <span>🚚</span> MONITORED FLEET CAPACITY
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsScanOpen(true)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded border border-slate-700 transition cursor-pointer"
                >
                  + Scan VIN
                </button>
                <button
                  type="button"
                  onClick={() => setIsImportOpen(true)}
                  className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 text-xs font-semibold rounded border border-cyan-800/80 transition cursor-pointer"
                >
                  + Import (.CSV)
                </button>
              </div>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl md:text-3xl font-extrabold font-mono text-white">
                {vehicles.length} / {vehicleLimit} Units
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold uppercase">
                ({userTier.toUpperCase()})
              </span>
            </div>

            {/* Capacity Progress Bar */}
            <div className="w-full bg-slate-800 rounded-full h-2 mt-3 overflow-hidden">
              <div
                className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(2, capacityPercent)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Continuous NHTSA & Telematics Sync</span>
            <span className="text-slate-300">{availableSlots.toLocaleString()} slots available</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Search + Terminal Selector + Status Tabs */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500 text-xs">
            🔍
          </span>
          <input
            type="text"
            placeholder="Search Unit #, VIN, Make, Model, or Campaign..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-800 focus:border-cyan-500 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono transition focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Terminal / Division Filter Dropdown */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 shadow-sm">
            <span className="text-[11px] text-slate-500 uppercase font-mono tracking-wider font-bold">
              Terminal:
            </span>
            <select
              value={selectedTerminal}
              onChange={(e) => setSelectedTerminal(e.target.value)}
              className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer pr-2"
            >
              {availableTerminals.map((terminal) => (
                <option key={terminal} value={terminal} className="bg-slate-950 text-slate-200">
                  {terminal === 'ALL' ? 'All Operating Hubs' : terminal}
                </option>
              ))}
            </select>
          </div>

          {/* Status Tabs */}
          <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-mono">
            {(['ALL', 'OPEN', 'SCHEDULED', 'CLEARED'] as const).map((tab) => {
              const count = vehicles.filter((v) =>
                tab === 'ALL' ? true : v.compliance_status === tab
              ).length;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-md transition cursor-pointer flex items-center gap-1.5 ${
                    statusFilter === tab
                      ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>{tab}</span>
                  <span className="text-[10px] opacity-70">({count})</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Roster Evidence Locker Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-bold">Vehicle / VIN</th>
                <th className="py-3.5 px-4 font-bold">Make & Model</th>
                <th className="py-3.5 px-4 font-bold">Safety Recall Details</th>
                <th className="py-3.5 px-4 font-bold">Ecosystem Feeds</th>
                <th className="py-3.5 px-4 font-bold">Remedy Logistics</th>
                <th className="py-3.5 px-4 font-bold">Compliance Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 font-mono text-xs">
                    No vehicles found matching current search and terminal filters.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((vehicle) => {
                  const isSyncing = syncingVin === vehicle.vin;

                  return (
                    <tr
                      key={vehicle.id}
                      className="hover:bg-slate-800/40 transition duration-150"
                    >
                      {/* Vehicle / VIN & Terminal Tag */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-white font-mono text-xs">
                          {vehicle.unit_number || 'UNIT-UNASSIGNED'}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono tracking-wider">
                          {vehicle.vin}
                        </div>
                        {vehicle.terminal && (
                          <div className="mt-1 flex items-center gap-1">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono bg-slate-800 text-cyan-300 border border-slate-700">
                              <span>📍</span> {vehicle.terminal}
                            </span>
                            {vehicle.division && (
                              <span className="text-[9px] text-slate-500 font-mono hidden md:inline">
                                ({vehicle.division})
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Make & Model */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-200 uppercase text-xs">
                          {vehicle.make}
                        </div>
                        <div className="text-[11px] text-slate-400 uppercase">
                          {vehicle.model} {vehicle.year}
                        </div>
                      </td>

                      {/* Recall Details */}
                      <td className="py-4 px-4 max-w-xs">
                        <div
                          className={`font-bold font-mono text-xs ${
                            vehicle.compliance_status === 'OPEN'
                              ? 'text-red-400'
                              : vehicle.compliance_status === 'SCHEDULED'
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {vehicle.safety_recall_details}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {vehicle.compliance_status === 'OPEN'
                            ? 'NHTSA Priority Safety • Action Required'
                            : vehicle.compliance_status === 'SCHEDULED'
                            ? 'Parts Backordered / Appointment Booked'
                            : 'NHTSA Safety Certified Defect-Free'}
                        </div>
                      </td>

                      {/* Ecosystem Feeds */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {(vehicle.ecosystem_feeds || ['FLEETIO']).map((feed) => (
                            <span
                              key={feed}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono border ${
                                feed === 'FLEETIO'
                                  ? 'bg-cyan-950/80 text-cyan-300 border-cyan-800'
                                  : 'bg-blue-950/80 text-blue-300 border-blue-800'
                              }`}
                            >
                              {feed}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Remedy Logistics */}
                      <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-300">
                        {vehicle.remedy_logistics}
                      </td>

                      {/* Compliance Status Pill */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {vehicle.compliance_status === 'OPEN' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-red-950/80 text-red-400 border border-red-800">
                              ! OPEN
                            </span>
                            <div className="text-[10px] font-bold font-mono text-red-400 mt-1">
                              +${(vehicle.punitive_exposure / 1000).toFixed(0)}k Exposure
                            </div>
                          </div>
                        )}
                        {vehicle.compliance_status === 'SCHEDULED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                              ⏱ SCHEDULED
                            </span>
                            <div className="text-[10px] font-mono text-slate-400 mt-1">
                              Remediation Queued
                            </div>
                          </div>
                        )}
                        {vehicle.compliance_status === 'CLEARED' && (
                          <div>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold font-mono bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                              ✓ CLEARED
                            </span>
                            <div className="text-[10px] font-mono text-emerald-400/80 mt-1">
                              Certified Clean
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-4 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {vehicle.work_order_id && (
                            <a
                              href={`https://app.fleetio.com/work_orders/${vehicle.work_order_id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[11px] font-mono border border-slate-700 transition"
                            >
                              {vehicle.work_order_id} ↗
                            </a>
                          )}
                          <button
                            type="button"
                            disabled={isSyncing || vehicle.compliance_status === 'CLEARED'}
                            onClick={() => handleSyncStatus(vehicle.vin)}
                            className={`px-2.5 py-1 rounded text-[11px] font-mono transition flex items-center gap-1 cursor-pointer ${
                              vehicle.compliance_status === 'CLEARED'
                                ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                            }`}
                          >
                            <span>{isSyncing ? '⏳' : '🔄'}</span>
                            <span>{isSyncing ? 'Syncing...' : 'Sync Status'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Scan Single VIN */}
      {isScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Scan & Ingest Single VIN</h3>
            <p className="text-xs text-slate-400 mb-4">
              Direct ingestion triggers instant NHTSA defect matching and OEM recall queries.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-400 mb-1">17-Digit Vehicle VIN</label>
                <input
                  type="text"
                  placeholder="e.g. 1FUJGLDR5MLKE1234"
                  value={scanVinInput}
                  onChange={(e) => setScanVinInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 uppercase focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Assigned Terminal / Hub</label>
                <input
                  type="text"
                  placeholder="e.g. Dallas Hub (TX)"
                  value={scanTerminalInput}
                  onChange={(e) => setScanTerminalInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setIsScanOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddVin}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
              >
                Ingest & Verify VIN
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Bulk CSV Import with Terminal Mapping */}
      {isImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-2">Enterprise CSV Bulk Import</h3>
            <p className="text-xs text-slate-400 mb-4">
              Paste rows formatted as: <code className="text-cyan-400">VIN, Unit#, Terminal, Division</code>
            </p>

            <textarea
              rows={6}
              value={csvRawText}
              onChange={(e) => setCsvRawText(e.target.value)}
              placeholder={`1FUJGLDR5MLKE1234, UNIT-501, Dallas Hub (TX), Southwest Division\n1FT8W1Y85PKA54321, UNIT-502, Chicago Terminal (IL), Midwest Division`}
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />

            <div className="flex items-center justify-between mt-4">
              <span className="text-[11px] text-slate-500 font-mono">
                Enterprise capacity: {availableSlots.toLocaleString()} remaining
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsImportOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCsvImport}
                  className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs transition cursor-pointer"
                >
                  Import Power Units
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: White-Label Co-Branded Underwriter Evidence Portal */}
      {isInternalShareOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono uppercase text-cyan-400 font-bold tracking-wider">
                  Continuous Risk Defense Platform
                </span>
                <h3 className="text-lg font-extrabold text-white">
                  Co-Branded Underwriter Evidence Locker
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsInternalShareOpen(false)}
                className="text-slate-400 hover:text-slate-200 text-sm font-mono cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Carrier Preset Selector */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1.5 uppercase font-bold">
                Commercial Underwriting Carrier Co-Branding
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {CARRIER_PRESETS.map((carrier) => (
                  <button
                    key={carrier.id}
                    type="button"
                    onClick={() => setSelectedCarrier(carrier.name)}
                    className={`p-2.5 rounded-lg text-xs font-mono text-center transition cursor-pointer border ${
                      selectedCarrier === carrier.name
                        ? 'bg-cyan-950/80 text-cyan-300 border-cyan-500 font-bold'
                        : 'bg-slate-950 hover:bg-slate-800 border-slate-800 text-slate-300'
                    }`}
                  >
                    {carrier.badge}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] font-mono text-cyan-400/90">
                Active Co-Brand: <span className="font-bold text-slate-200">{selectedCarrier}</span>
              </div>
            </div>

            {/* Risk Officer Contact Card Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div>
                <label className="block text-slate-400 mb-1">Designated Risk Officer</label>
                <input
                  type="text"
                  value={riskOfficerName}
                  onChange={(e) => setRiskOfficerName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Audit Email</label>
                <input
                  type="email"
                  value={riskOfficerEmail}
                  onChange={(e) => setRiskOfficerEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Direct Phone</label>
                <input
                  type="text"
                  value={riskOfficerPhone}
                  onChange={(e) => setRiskOfficerPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded text-slate-200 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            {/* Bearer Token URL Box */}
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1 uppercase font-bold">
                Immutable Read-Only Underwriter Token Link
              </label>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-[11px] text-cyan-300 break-all select-all">
                https://recalllogic.ai/audit/evidence-locker?token=rl_live_{btoa(
                  userCompany
                ).slice(0, 16)}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-emerald-400 text-xs font-mono">
                ✓ Co-branding & 15% rate credit active
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleCopyUnderwriterLink}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-xs font-mono transition cursor-pointer"
                >
                  {copiedLink ? 'Copied! ✓' : 'Copy Link'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    window.open(
                      `https://recalllogic.ai/audit/evidence-locker?token=rl_live_${btoa(
                        userCompany
                      ).slice(0, 16)}`,
                      '_blank'
                    );
                  }}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded text-xs font-mono transition cursor-pointer"
                >
                  Open Live Portal ↗
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;