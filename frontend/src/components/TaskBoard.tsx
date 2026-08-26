import React, { useState, useMemo } from 'react';
import { TIER_PERMISSIONS, Tier } from '../lib/tierPermissions';
import BrokerShareModal from './BrokerShareModal';
import BulkCsvImportModal from './BulkCsvImportModal';

export interface FleetAsset {
  id: string;
  unit_number: string;
  vin: string;
  make: string;
  model: string;
  year?: number;
  status: 'OPEN' | 'SCHEDULED' | 'CLEARED';
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  recall_campaign_number: string;
  recall_component: string;
  recall_summary: string;
  dealer_appointment_date?: string;
  repair_notes?: string;
  proof_of_remedy_url?: string;
  updated_at?: string;
}

export interface TaskBoardProps {
  userTier?: Tier;
  onUpgradeTier?: (tierId: Tier) => void;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({
  userTier = 'standard',
  onUpgradeTier,
}) => {
  const permissions = TIER_PERMISSIONS[userTier];

  // REAL FLEET ASSETS STATE
  const [assets, setAssets] = useState<FleetAsset[]>([
    {
      id: '1',
      unit_number: 'TRK-101',
      make: 'FREIGHTLINER',
      model: 'Cascadia',
      year: 2022,
      vin: '1FUJGLDR5MLKE1234',
      status: 'OPEN',
      severity: 'HIGH',
      recall_campaign_number: '23V-890',
      recall_component: 'STEERING SHAFT ASSEMBLY',
      recall_summary: 'Steering shaft pinch bolt may loosen, leading to complete loss of steering control.',
      repair_notes: 'Awaiting dealer part arrival.',
    },
    {
      id: '2',
      unit_number: 'TRK-102',
      make: 'FORD',
      model: 'Transit 350',
      year: 2023,
      vin: '1FTBW1Y85PKA54321',
      status: 'SCHEDULED',
      severity: 'MEDIUM',
      recall_campaign_number: '24V-112',
      recall_component: 'FUEL SYSTEM: GASOLINE',
      recall_summary: 'Fuel pump impellers may deform, causing loss of motive power.',
      dealer_appointment_date: '2026-03-05',
      repair_notes: 'Scheduled with Friendly Ford Fleet Center.',
    },
    {
      id: '3',
      unit_number: 'TRK-103',
      make: 'KENWORTH',
      model: 'T680',
      year: 2021,
      vin: '1XKDDP9X8MJ987654',
      status: 'CLEARED',
      severity: 'LOW',
      recall_campaign_number: '22V-405',
      recall_component: 'WIPER MOTOR ASSEMBLY',
      recall_summary: 'Wiper motor gear stripping in heavy snowfall conditions.',
      repair_notes: 'Inspected and replaced under warranty.',
      proof_of_remedy_url: 'receipt_trk103.pdf',
    },
  ]);

  // UI & MODAL STATES
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState<boolean>(false);
  const [lockedFeatureName, setLockedFeatureName] = useState<string>('');
  
  // SINGLE VIN SCAN MODAL STATE
  const [isSingleVinModalOpen, setIsSingleVinModalOpen] = useState<boolean>(false);
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [singleUnitInput, setSingleUnitInput] = useState<string>('');
  const [isScanningVin, setIsScanningVin] = useState<boolean>(false);
  const [scanModalError, setScanModalError] = useState<string>('');

  // MANAGED TASK DRAWER STATE
  const [selectedAsset, setSelectedAsset] = useState<FleetAsset | null>(null);
  const [drawerStatus, setDrawerStatus] = useState<'OPEN' | 'SCHEDULED' | 'CLEARED'>('OPEN');
  const [drawerNotes, setDrawerNotes] = useState<string>('');
  const [drawerDate, setDrawerDate] = useState<string>('');

  // FILTER & SEARCH STATES
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // GUARD FUNCTION FOR TIER-LOCKED ACTIONS
  const executeTierGuardedAction = (
    featureKey: keyof typeof permissions,
    featureName: string,
    action: () => void
  ) => {
    if (!permissions[featureKey]) {
      setLockedFeatureName(featureName);
      setShowUpgradeModal(true);
      return;
    }
    action();
  };

  // FILTER LOGIC
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.unit_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.recall_campaign_number.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesMake = selectedMake === 'ALL' || asset.make === selectedMake;
      const matchesStatus = selectedStatus === 'ALL' || asset.status === selectedStatus;

      return matchesSearch && matchesMake && matchesStatus;
    });
  }, [assets, searchTerm, selectedMake, selectedStatus]);

  // SINGLE VIN SCAN HANDLER
  const handleSingleVinAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    setScanModalError('');
    if (!singleVinInput || singleVinInput.length !== 17) {
      setScanModalError('Please enter a valid 17-character VIN.');
      return;
    }

    setIsScanningVin(true);
    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBaseUrl}/api/audit/verify-vin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin: singleVinInput.toUpperCase(),
          broker: 'RecallLogic Workspace Direct',
          fleet: 'Inspected Fleet Unit',
        }),
      });

      if (!response.ok) throw new Error('NHTSA audit server failed to respond.');

      const data = await response.json();
      const hasRecalls = data.has_open_recall;
      const primaryRecall = hasRecalls && data.recalls?.[0] ? data.recalls[0] : null;

      const newAsset: FleetAsset = {
        id: Date.now().toString(),
        unit_number: singleUnitInput.trim().toUpperCase() || `UNASSIGNED-${singleVinInput.slice(-4)}`,
        vin: singleVinInput.toUpperCase(),
        make: primaryRecall?.make || 'UNKNOWN',
        model: primaryRecall?.model || 'UNIT',
        status: hasRecalls ? 'OPEN' : 'CLEARED',
        severity: hasRecalls ? 'HIGH' : 'LOW',
        recall_campaign_number: primaryRecall?.campaign_number || 'NONE',
        recall_component: primaryRecall?.component || 'SYSTEM CLEAN',
        recall_summary: primaryRecall?.summary || 'Zero active safety recalls found on NHTSA database.',
      };

      setAssets((prev) => [newAsset, ...prev]);
      setIsSingleVinModalOpen(false);
      setSingleVinInput('');
      setSingleUnitInput('');
    } catch (err: any) {
      setScanModalError(err.message || 'Error processing VIN scan.');
    } finally {
      setIsScanningVin(false);
    }
  };

  // DRAWER SAVE HANDLER
  const handleSaveTaskDetails = () => {
    if (!selectedAsset) return;

    setAssets((prev) =>
      prev.map((a) =>
        a.id === selectedAsset.id
          ? {
              ...a,
              status: drawerStatus,
              repair_notes: drawerNotes,
              dealer_appointment_date: drawerDate,
              updated_at: new Date().toISOString(),
            }
          : a
      )
    );
    setSelectedAsset(null);
  };

  return (
    <div className="space-y-6 font-sans px-4 sm:px-6">
      {/* GLOBAL WORKSPACE CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#0B101D] p-5 rounded-2xl border border-slate-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl font-bold text-white font-mono tracking-tight">Recall Operations Workspace</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/80 text-[#06B6D4] border border-[#06B6D4]/30">
              {userTier.toUpperCase()} TIER ({assets.length} / {permissions.maxVehicles === Infinity ? '∞' : permissions.maxVehicles} VINs)
            </span>

            {/* DIRECT UPGRADE CTA BUTTON (Shown to Standard Users) */}
            {userTier === 'standard' && (
              <button
                type="button"
                onClick={() => {
                  if (onUpgradeTier) onUpgradeTier('professional');
                }}
                className="px-3 py-0.5 rounded-full text-[10px] font-mono font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 text-slate-950 transition shadow-md shadow-cyan-500/20 cursor-pointer animate-pulse"
              >
                ⚡ Upgrade to Pro ($249/mo)
              </button>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active fleet safety tracking, underwriter verification packet generation, and dealer remedy scheduling.
          </p>
        </div>

        {/* TIER-GUARDED ACTION CONTROLS */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Single-VIN Scan */}
          <button
            type="button"
            onClick={() =>
              executeTierGuardedAction('canSingleVinScan', 'Instant Single-VIN Scan Console', () =>
                setIsSingleVinModalOpen(true)
              )
            }
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              permissions.canSingleVinScan
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                : 'bg-slate-950/80 text-slate-400 border-cyan-500/30 hover:border-cyan-400 hover:text-white bg-gradient-to-r from-slate-900/50 to-cyan-950/20'
            }`}
          >
            {!permissions.canSingleVinScan ? (
              <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-[#06B6D4] font-black rounded border border-cyan-500/40">PRO ⚡</span>
            ) : (
              '🔍'
            )}
            <span>Single-VIN Scan</span>
          </button>

          {/* 2. Bulk CSV Import */}
          <button
            type="button"
            onClick={() =>
              executeTierGuardedAction('canBulkImportCsv', 'Bulk CSV Batch Ingestion Engine', () =>
                setIsBulkModalOpen(true)
              )
            }
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              permissions.canBulkImportCsv
                ? 'bg-slate-900 text-slate-200 border-slate-700 hover:bg-slate-800'
                : 'bg-slate-950/80 text-slate-400 border-cyan-500/30 hover:border-cyan-400 hover:text-white bg-gradient-to-r from-slate-900/50 to-cyan-950/20'
            }`}
          >
            {!permissions.canBulkImportCsv ? (
              <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-[#06B6D4] font-black rounded border border-cyan-500/40">PRO ⚡</span>
            ) : (
              '📁'
            )}
            <span>Bulk CSV Import</span>
          </button>

          {/* 3. Share Broker Link */}
          <button
            type="button"
            onClick={() =>
              executeTierGuardedAction('canShareAuditLink', 'Shareable Read-Only Broker Audit Links', () =>
                setIsShareModalOpen(true)
              )
            }
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              permissions.canShareAuditLink
                ? 'bg-[#06B6D4] text-slate-950 border-cyan-400 hover:bg-cyan-400 font-extrabold shadow-lg shadow-cyan-500/10'
                : 'bg-slate-950/80 text-slate-400 border-cyan-500/30 hover:border-cyan-400 hover:text-white bg-gradient-to-r from-slate-900/50 to-cyan-950/20'
            }`}
          >
            {!permissions.canShareAuditLink ? (
              <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-[#06B6D4] font-black rounded border border-cyan-500/40">PRO ⚡</span>
            ) : (
              '🛡️'
            )}
            <span>Share Audit Link</span>
          </button>

          {/* 4. Signed PDF Certificate */}
          <button
            type="button"
            onClick={() =>
              executeTierGuardedAction(
                'canExportPdfCertificate',
                'Signed Underwriter Compliance Cards (PDF)',
                () => alert('Generating Signed Underwriter PDF Certificate...')
              )
            }
            className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl border transition cursor-pointer flex items-center gap-1.5 ${
              permissions.canExportPdfCertificate
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20'
                : 'bg-slate-950/80 text-slate-400 border-cyan-500/30 hover:border-cyan-400 hover:text-white bg-gradient-to-r from-slate-900/50 to-cyan-950/20'
            }`}
          >
            {!permissions.canExportPdfCertificate ? (
              <span className="text-[10px] px-1 py-0.2 bg-cyan-500/20 text-[#06B6D4] font-black rounded border border-cyan-500/40">PRO ⚡</span>
            ) : (
              '📄'
            )}
            <span>Export Risk Certificate</span>
          </button>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-72">
          <input
            type="text"
            placeholder="Search Unit #, VIN, or Campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#070B14] border border-slate-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-none focus:border-[#06B6D4] transition"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">Make:</label>
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="bg-[#070B14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="ALL">All Makes</option>
              <option value="FREIGHTLINER">Freightliner</option>
              <option value="FORD">Ford</option>
              <option value="KENWORTH">Kenworth</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-mono text-slate-400">Status:</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-[#070B14] border border-slate-800 rounded-xl px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-[#06B6D4]"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Recalls</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="CLEARED">Cleared / Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* FLEET RECALL TABLE */}
      <div className="border border-slate-800 rounded-2xl bg-[#0B101D] overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="p-4">Power Unit / VIN</th>
              <th className="p-4">Make &amp; Model</th>
              <th className="p-4">Safety Recall Details</th>
              <th className="p-4">Compliance Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs font-mono">
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">
                  No fleet records match your search filter.
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset) => (
                <tr key={asset.id} className="hover:bg-slate-900/40 transition">
                  <td className="p-4">
                    <span className="font-bold text-white text-sm block">{asset.unit_number}</span>
                    <span className="text-[11px] text-slate-400">{asset.vin}</span>
                  </td>
                  <td className="p-4 text-slate-300">
                    <div>{asset.make}</div>
                    <div className="text-[11px] text-slate-500">{asset.model} {asset.year || ''}</div>
                  </td>
                  <td className="p-4 max-w-xs">
                    <div className="text-white font-bold">{asset.recall_campaign_number} — {asset.recall_component}</div>
                    <div className="text-slate-400 text-[11px] truncate mt-0.5">{asset.recall_summary}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                      asset.status === 'CLEARED'
                        ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                        : asset.status === 'SCHEDULED'
                        ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                        : 'bg-red-950/80 text-red-400 border-red-800'
                    }`}>
                      {asset.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAsset(asset);
                        setDrawerStatus(asset.status);
                        setDrawerNotes(asset.repair_notes || '');
                        setDrawerDate(asset.dealer_appointment_date || '');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 transition cursor-pointer"
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* SINGLE VIN SCAN MODAL */}
      {isSingleVinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center">
              <h3 className="text-base font-bold text-white">Single-VIN Instant Scan</h3>
              <button onClick={() => setIsSingleVinModalOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleSingleVinAudit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Unit # (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. TRK-909"
                  value={singleUnitInput}
                  onChange={(e) => setSingleUnitInput(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">17-Character VIN</label>
                <input
                  type="text"
                  required
                  maxLength={17}
                  placeholder="1FUJGLDR5MLKE1234"
                  value={singleVinInput}
                  onChange={(e) => setSingleVinInput(e.target.value.toUpperCase())}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              {scanModalError && <p className="text-red-400 text-xs">{scanModalError}</p>}

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSingleVinModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isScanningVin}
                  className="px-5 py-2 bg-[#06B6D4] text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-400"
                >
                  {isScanningVin ? 'Auditing NHTSA...' : 'Audit VIN'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE TASK SIDE DRAWER / OVERLAY */}
      {selectedAsset && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0B101D] border-l border-slate-800 w-full max-w-md h-full p-6 overflow-y-auto space-y-5 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white">{selectedAsset.unit_number}</h3>
                <p className="text-xs text-slate-400">{selectedAsset.vin}</p>
              </div>
              <button onClick={() => setSelectedAsset(null)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Remediation Status</label>
                <select
                  value={drawerStatus}
                  onChange={(e: any) => setDrawerStatus(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                >
                  <option value="OPEN">OPEN (Unresolved Hazard)</option>
                  <option value="SCHEDULED">SCHEDULED (Dealer Date Set)</option>
                  <option value="CLEARED">CLEARED (Remedy Verified)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Dealer Appointment Date</label>
                <input
                  type="date"
                  value={drawerDate}
                  onChange={(e) => setDrawerDate(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Mechanic / Repair Notes</label>
                <textarea
                  rows={4}
                  value={drawerNotes}
                  onChange={(e) => setDrawerNotes(e.target.value)}
                  placeholder="Enter dealer appointment details, work order #, or parts status..."
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                />
              </div>

              {/* INLINE DRAWER PRO TIER GUARD */}
              <div className="pt-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs text-slate-400">Proof-of-Remedy Storage</label>
                  {!permissions.canUploadProofOfRemedy && (
                    <span className="text-[9px] font-black text-[#06B6D4] bg-cyan-950 px-1.5 py-0.5 rounded border border-cyan-800">
                      PRO TIER ONLY
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    executeTierGuardedAction(
                      'canUploadProofOfRemedy',
                      'Proof-of-Remedy Receipt & Invoice Storage',
                      () => alert('Proof-of-Remedy document uploaded successfully!')
                    )
                  }
                  className={`w-full py-2.5 border rounded-lg text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    permissions.canUploadProofOfRemedy
                      ? 'bg-slate-900 border-slate-700 text-slate-200 hover:bg-slate-800'
                      : 'bg-slate-950/80 border-cyan-500/30 text-slate-400 hover:border-cyan-400 hover:text-white'
                  }`}
                >
                  {!permissions.canUploadProofOfRemedy && '🔒 '}📎 Attach Dealer Receipt (PDF/Image)
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedAsset(null)}
                className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTaskDetails}
                className="px-5 py-2 bg-[#06B6D4] text-slate-950 font-bold text-xs rounded-lg hover:bg-cyan-400"
              >
                Save Task Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SHARE AUDIT LINK MODAL */}
      <BrokerShareModal
        isOpen={isShareModalOpen}
        userTier={userTier}
        shareUrl={`${window.location.origin}/audit/share/FLT-${Math.random().toString(36).substring(2, 10)}`}
        onClose={() => setIsShareModalOpen(false)}
      />

      {/* BULK CSV IMPORT MODAL */}
      <BulkCsvImportModal
        isOpen={isBulkModalOpen}
        onClose={() => setIsBulkModalOpen(false)}
      />

      {/* HIGH-CONVERSION UPGRADE PROMPT MODAL */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-cyan-500/40 rounded-2xl p-6 max-w-md w-full shadow-[0_0_40px_rgba(6,182,212,0.15)] space-y-4 font-sans text-left relative overflow-hidden">
            
            <div className="flex justify-between items-center">
              <span className="px-2.5 py-0.5 rounded bg-cyan-950 border border-cyan-800 text-[#06B6D4] text-[10px] font-mono font-bold uppercase tracking-wider">
                INSURANCE &amp; RISK INTELLIGENCE
              </span>
              <button onClick={() => setShowUpgradeModal(false)} className="text-slate-400 hover:text-white text-sm cursor-pointer">✕</button>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-white font-mono">Satisfy Insurance Carriers in 1-Click</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                <strong className="text-[#06B6D4]">{lockedFeatureName}</strong> requires the Professional Tier ($249/mo). Instantly generate verifiable compliance packets for underwriters and brokers.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2 text-xs text-slate-300 font-mono">
              <p className="text-[#06B6D4] font-bold text-[11px] uppercase tracking-wider">Unlocked in Professional ($249/mo):</p>
              <ul className="space-y-1.5 text-[11px] text-slate-300">
                <li className="flex items-center gap-1.5">
                  <span className="text-[#06B6D4]">✓</span> Shareable Read-Only Underwriter Links
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[#06B6D4]">✓</span> Signed PDF Risk &amp; Compliance Certificates
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[#06B6D4]">✓</span> Proof-of-Remedy Receipt &amp; Invoice Storage
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-[#06B6D4]">✓</span> Instant Single-VIN Scan &amp; Bulk CSV Ingestion
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowUpgradeModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono font-semibold rounded-xl transition cursor-pointer"
              >
                Not Now
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowUpgradeModal(false);
                  if (onUpgradeTier) onUpgradeTier('professional');
                }}
                className="px-5 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold font-mono text-xs rounded-xl transition shadow-md shadow-cyan-500/20 cursor-pointer"
              >
                Upgrade to Pro ($249/mo)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskBoard;