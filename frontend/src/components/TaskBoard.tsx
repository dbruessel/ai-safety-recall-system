import React, { useState, useMemo } from 'react';

interface TaskBoardProps {
  userTier?: string;
}

interface RecallItem {
  id: string;
  unit: string;
  vin: string;
  makeModel: string;
  recallDetails: string;
  nhtsaCampaign: string;
  description: string;
  remedyStatus: 'Unassigned' | 'Scheduled' | 'Parts Ordered' | 'Completed';
  complianceStatus: 'OPEN' | 'SCHEDULED' | 'CLEARED';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  dealerName?: string;
  scheduledDate?: string;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ userTier = 'standard' }) => {
  const isPro = userTier.toLowerCase() === 'professional' || userTier.toLowerCase() === 'enterprise';

  // --- WORKSPACE STATE ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'scheduled' | 'cleared'>('all');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');
  
  // Modal States
  const [isSingleScanOpen, setIsSingleScanOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [selectedUnitForManage, setSelectedUnitForManage] = useState<RecallItem | null>(null);

  // Form Inputs
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [bulkCsvText, setBulkCsvText] = useState<string>('');

  // --- SAMPLE FLEET DATASET ---
  const [recallUnits, setRecallUnits] = useState<RecallItem[]>([
    {
      id: 'REC-101',
      unit: 'TRK-101',
      vin: '1FUJGLDR5MLKE1234',
      makeModel: 'FREIGHTLINER Cascadia 2022',
      nhtsaCampaign: '23V-890',
      recallDetails: 'STEERING SHAFT ASSEMBLY',
      description: 'Steering shaft pinch bolt may loosen, leading to complete loss of steering control.',
      remedyStatus: 'Unassigned',
      complianceStatus: 'OPEN',
      severity: 'CRITICAL',
    },
    {
      id: 'REC-102',
      unit: 'TRK-102',
      vin: '1FTBW1Y85PKA54321',
      makeModel: 'FORD Transit 350 2023',
      nhtsaCampaign: '24V-112',
      recallDetails: 'FUEL SYSTEM: GASOLINE',
      description: 'Fuel pump impellers may deform, causing loss of motive power while driving.',
      remedyStatus: 'Scheduled',
      complianceStatus: 'SCHEDULED',
      severity: 'HIGH',
      dealerName: 'Ford Commercial Solutions',
      scheduledDate: '2026-09-12',
    },
    {
      id: 'REC-103',
      unit: 'TRK-103',
      vin: '1XKDDP9X8MJ987654',
      makeModel: 'KENWORTH T680 2021',
      nhtsaCampaign: '22V-405',
      recallDetails: 'WIPER MOTOR ASSEMBLY',
      description: 'Wiper motor gear stripping under heavy snowfall conditions causing loss of visibility.',
      remedyStatus: 'Completed',
      complianceStatus: 'CLEARED',
      severity: 'MEDIUM',
      dealerName: 'Kenworth Premier Dealer',
      scheduledDate: '2026-08-15',
    },
    {
      id: 'REC-104',
      unit: 'TRK-104',
      vin: '3AKJHHDR2MSKE9876',
      makeModel: 'PETERBILT 579 2024',
      nhtsaCampaign: '24V-301',
      recallDetails: 'AIR BRAKE ACTUATOR',
      description: 'Air brake pressure valve diaphragm leak causing delayed brake response times.',
      remedyStatus: 'Parts Ordered',
      complianceStatus: 'OPEN',
      severity: 'CRITICAL',
    },
    {
      id: 'REC-105',
      unit: 'VAN-201',
      vin: '1GC4YPE73RF112233',
      makeModel: 'CHEVROLET Express 3500 2024',
      nhtsaCampaign: '23V-550',
      recallDetails: 'TRANSMISSION CONTROL MODULE',
      description: 'TCM software anomaly leading to unintended shifting into neutral state.',
      remedyStatus: 'Unassigned',
      complianceStatus: 'OPEN',
      severity: 'HIGH',
    },
  ]);

  // --- FILTERED DATA COMPUTATION ---
  const filteredUnits = useMemo(() => {
    return recallUnits.filter((item) => {
      const matchesSearch = 
        item.unit.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vin.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.nhtsaCampaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.makeModel.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        activeTab === 'all' ? true : item.complianceStatus.toLowerCase() === activeTab;

      const matchesMake = 
        selectedMake === 'ALL' ? true : item.makeModel.toUpperCase().includes(selectedMake);

      return matchesSearch && matchesStatus && matchesMake;
    });
  }, [recallUnits, searchQuery, activeTab, selectedMake]);

  // --- HANDLERS & PERMISSION GUARDS ---
  const requireProAccess = (featureName: string, action: () => void) => {
    if (!isPro) {
      alert(`🔒 ${featureName} is restricted to Professional Tier subscribers ($249/mo).`);
      return;
    }
    action();
  };

  const handleSingleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleVinInput.trim()) return;

    const newUnit: RecallItem = {
      id: `REC-${Date.now().toString().slice(-3)}`,
      unit: `UNIT-${Math.floor(100 + Math.random() * 900)}`,
      vin: singleVinInput.toUpperCase(),
      makeModel: 'VOLVO VNL 860 2023',
      nhtsaCampaign: '24V-999',
      recallDetails: 'STEERING GEARBOX FASTENER',
      description: 'NHTSA Live Sync scan flagged loose steering column attachment bolts.',
      remedyStatus: 'Unassigned',
      complianceStatus: 'OPEN',
      severity: 'HIGH',
    };

    setRecallUnits([newUnit, ...recallUnits]);
    setSingleVinInput('');
    setIsSingleScanOpen(false);
    alert(`✅ VIN ${newUnit.vin} scanned successfully! High-risk safety campaign identified.`);
  };

  const handleBulkImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkCsvText.trim()) return;

    const lines = bulkCsvText.trim().split('\n');
    const parsedUnits: RecallItem[] = lines.map((line, idx) => {
      const [unit, vin] = line.split(',');
      return {
        id: `REC-BULK-${idx}-${Date.now().toString().slice(-3)}`,
        unit: unit?.trim().toUpperCase() || `TRK-BULK-${idx + 1}`,
        vin: vin?.trim().toUpperCase() || '1FUJGLDR5MLKE9999',
        makeModel: 'FREIGHTLINER Cascadia 2023',
        nhtsaCampaign: '24V-410',
        recallDetails: 'ECM WIRING HARNESS SHORT',
        description: 'Chafing along frame rail harness can result in engine shutdown.',
        remedyStatus: 'Unassigned',
        complianceStatus: 'OPEN',
        severity: 'CRITICAL',
      };
    });

    setRecallUnits([...parsedUnits, ...recallUnits]);
    setBulkCsvText('');
    setIsBulkImportOpen(false);
    alert(`🚀 Processed ${parsedUnits.length} fleet units via Bulk CSV Import.`);
  };

  const handleExportRiskCertificate = () => {
    requireProAccess('Underwriter Risk Certificate Export', () => {
      alert('📄 Generating Official Underwriter Risk Certificate (PDF)...\n\nDocument details verified: Compliance cleared, active campaign liability status logged.');
    });
  };

  const handleShareAuditLink = () => {
    requireProAccess('Underwriter Live Audit Link Sharing', () => {
      const shareUrl = `${window.location.origin}/audit/demo`;
      navigator.clipboard.writeText(shareUrl);
      alert(`🔗 Live Broker Audit URL copied to clipboard:\n${shareUrl}`);
    });
  };

  const handleUpdateStatus = (id: string, newStatus: 'OPEN' | 'SCHEDULED' | 'CLEARED') => {
    setRecallUnits((prev) =>
      prev.map((unit) =>
        unit.id === id
          ? {
              ...unit,
              complianceStatus: newStatus,
              remedyStatus: newStatus === 'CLEARED' ? 'Completed' : newStatus === 'SCHEDULED' ? 'Scheduled' : 'Unassigned',
            }
          : unit
      )
    );
    setSelectedUnitForManage(null);
  };

  return (
    <div className="px-6 space-y-6">
      {/* SECTION HEADER & PRO ACTIONS BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0D1322] p-5 rounded-2xl border border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-extrabold text-white font-mono tracking-tight">
              Recall Operations Workspace
            </h1>
            <span
              className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border font-mono ${
                isPro
                  ? 'bg-cyan-950/80 border-cyan-500/40 text-[#06B6D4]'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {userTier.toUpperCase()} TIER ({recallUnits.length} / {isPro ? 'UNLIMITED' : '50'} VINS)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active fleet safety tracking, underwriter verification packet generation, and dealer remedy scheduling.
          </p>
        </div>

        {/* TOP TOOLBAR BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => requireProAccess('Single-VIN Scan', () => setIsSingleScanOpen(true))}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPro
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            ⚡ Single-VIN Scan
          </button>

          <button
            onClick={() => requireProAccess('Bulk CSV Import', () => setIsBulkImportOpen(true))}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPro
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            ⚡ Bulk CSV Import
          </button>

          <button
            onClick={handleShareAuditLink}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPro
                ? 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            ⚡ Share Audit Link
          </button>

          <button
            onClick={handleExportRiskCertificate}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPro
                ? 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            📄 Export Risk Certificate
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0D1322] p-4 rounded-xl border border-slate-800">
        <div className="w-full sm:w-80">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Unit #, VIN, or Campaign..."
            className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={selectedMake}
            onChange={(e) => setSelectedMake(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Makes</option>
            <option value="FREIGHTLINER">Freightliner</option>
            <option value="FORD">Ford</option>
            <option value="KENWORTH">Kenworth</option>
            <option value="PETERBILT">Peterbilt</option>
            <option value="CHEVROLET">Chevrolet</option>
          </select>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'all'
                  ? 'bg-cyan-950 border border-cyan-500/50 text-[#06B6D4] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'open'
                  ? 'bg-red-950 border border-red-500/50 text-red-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'scheduled'
                  ? 'bg-amber-950 border border-amber-500/50 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setActiveTab('cleared')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all ${
                activeTab === 'cleared'
                  ? 'bg-emerald-950 border border-emerald-500/50 text-emerald-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Cleared
            </button>
          </div>
        </div>
      </div>

      {/* RECALL MONITORING TABLE */}
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 bg-slate-950/50 uppercase tracking-wider">
                <th className="py-3 px-4">Power Unit / VIN</th>
                <th className="py-3 px-4">Make &amp; Model</th>
                <th className="py-3 px-4">Safety Recall Details</th>
                <th className="py-3 px-4">Remedy Logistics</th>
                <th className="py-3 px-4">Compliance Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
              {filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-mono">
                    No matching recall campaigns found.
                  </td>
                </tr>
              ) : (
                filteredUnits.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 font-bold text-white">
                      <div>{item.unit}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{item.vin}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">{item.makeModel}</td>
                    <td className="py-4 px-4 max-w-xs">
                      <div className="text-white font-bold text-[11px]">
                        {item.nhtsaCampaign} — {item.recallDetails}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{item.description}</div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      <div>{item.remedyStatus}</div>
                      {item.dealerName && (
                        <div className="text-[10px] text-slate-500 truncate">{item.dealerName}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`px-2.5 py-1 rounded text-[10px] font-bold border ${
                          item.complianceStatus === 'OPEN'
                            ? 'bg-red-500/10 border-red-500/30 text-red-400'
                            : item.complianceStatus === 'SCHEDULED'
                            ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        }`}
                      >
                        {item.complianceStatus}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedUnitForManage(item)}
                        className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-xs transition-all cursor-pointer"
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
      </div>

      {/* SINGLE VIN SCAN MODAL */}
      {isSingleScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">⚡ Single-VIN Scan</h3>
              <button onClick={() => setIsSingleScanOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleSingleScanSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Enter 17-Digit Vehicle Identification Number (VIN)</label>
                <input
                  type="text"
                  maxLength={17}
                  value={singleVinInput}
                  onChange={(e) => setSingleVinInput(e.target.value)}
                  placeholder="e.g. 1FUJGLDR5MLKE1234"
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 uppercase font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setIsSingleScanOpen(false)} className="px-4 py-2 bg-slate-800 text-xs rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg">Run NHTSA Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">⚡ Bulk CSV Fleet Import</h3>
              <button onClick={() => setIsBulkImportOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleBulkImportSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">Paste CSV Lines (Format: UnitName,VIN)</label>
                <textarea
                  rows={5}
                  value={bulkCsvText}
                  onChange={(e) => setBulkCsvText(e.target.value)}
                  placeholder={"TRK-201,1FUJGLDR5MLKE1111\nTRK-202,1FTBW1Y85PKA2222"}
                  className="w-full bg-slate-950 border border-slate-800 text-xs text-white rounded-lg p-2.5 font-mono focus:outline-none focus:border-cyan-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button type="button" onClick={() => setIsBulkImportOpen(false)} className="px-4 py-2 bg-slate-800 text-xs rounded-lg">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg">Import &amp; Audit Fleet</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MANAGE UNIT MODAL */}
      {selectedUnitForManage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Manage Remedy — {selectedUnitForManage.unit}
              </h3>
              <button onClick={() => setSelectedUnitForManage(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-2 text-xs text-slate-300">
              <p><span className="text-slate-500">VIN:</span> {selectedUnitForManage.vin}</p>
              <p><span className="text-slate-500">Campaign:</span> {selectedUnitForManage.nhtsaCampaign}</p>
              <p><span className="text-slate-500">Details:</span> {selectedUnitForManage.recallDetails}</p>
            </div>
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <p className="text-xs text-slate-400">Update Compliance Status:</p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus(selectedUnitForManage.id, 'OPEN')}
                  className="py-2 bg-red-950 border border-red-800 text-red-400 text-xs font-bold rounded"
                >
                  Mark OPEN
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedUnitForManage.id, 'SCHEDULED')}
                  className="py-2 bg-amber-950 border border-amber-800 text-amber-400 text-xs font-bold rounded"
                >
                  SCHEDULED
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedUnitForManage.id, 'CLEARED')}
                  className="py-2 bg-emerald-950 border border-emerald-800 text-emerald-400 text-xs font-bold rounded"
                >
                  CLEARED
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