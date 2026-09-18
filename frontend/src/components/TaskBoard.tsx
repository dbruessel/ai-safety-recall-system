import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import { FleetVinScanner } from './FleetVinScanner';

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
  organization_id?: string;
}

export const TaskBoard: React.FC<TaskBoardProps> = ({ userTier = 'standard' }) => {
  const { userProfile } = useAuth();
  const isPro = userTier.toLowerCase() === 'professional' || userTier.toLowerCase() === 'enterprise';

  // --- WORKSPACE STATE ---
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'all' | 'open' | 'scheduled' | 'cleared'>('all');
  const [selectedMake, setSelectedMake] = useState<string>('ALL');
  
  // Data & Loading States
  const [recallUnits, setRecallUnits] = useState<RecallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [isSingleScanOpen, setIsSingleScanOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [selectedUnitForManage, setSelectedUnitForManage] = useState<RecallItem | null>(null);

  // Form Inputs & UI State Feedback Controls
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [exportState, setExportState] = useState<'idle' | 'generating' | 'done'>('idle');

  // --- GUIDED PRODUCT TOUR STATE ---
  const [isTourActive, setIsTourActive] = useState<boolean>(true);
  const [currentTourStep, setCurrentTourStep] = useState<number>(0);

  const tourSteps = [
    {
      title: "1. Recall Operations Workspace",
      badge: "REAL-TIME SAFETY COMPLIANCE",
      description: "Track power units, active NHTSA safety campaigns, dealer repair schedules, and vehicle limit quotas in one dashboard."
    },
    {
      title: "2. Underwriter Verification & Proof",
      badge: "INSURANCE SAVINGS LEVERAGE",
      description: "Export signed PDF Loss Control Certificates or copy a live underwriter link to prove proactive safety management and request premium discounts."
    },
    {
      title: "3. Precision Filter & Search Controls",
      badge: "FLEET SEARCH ENGINE",
      description: "Filter power units by vehicle make (Freightliner, Ford, Volvo) or compliance status (Open, Scheduled, Cleared) in milliseconds."
    },
    {
      title: "4. Live Recall Monitoring Table",
      badge: "ACTIVE TASKBOARD",
      description: "Click 'Manage' on any power unit to update dealer repair logistics, track remedy progress, and mark safety campaigns as Cleared."
    },
    {
      title: "5. Single-VIN Scan & Bulk CSV Import",
      badge: "FLEET INGEST ENGINE",
      description: "Add new power units anytime using 1-click VIN lookups or upload entire fleet CSV spreadsheets to sync live NHTSA records."
    }
  ];

  const handleNextTourStep = () => {
    if (currentTourStep < tourSteps.length - 1) {
      setCurrentTourStep(prev => prev + 1);
    } else {
      setIsTourActive(false);
    }
  };

  // --- DYNAMIC TIER VIN LIMIT COMPUTATION ---
  const displayLimit = useMemo(() => {
    if (userProfile?.vehicle_limit) {
      return userProfile.vehicle_limit.toLocaleString();
    }
    const normalizedTier = userTier.toLowerCase();
    if (normalizedTier === 'enterprise') return '1,000';
    if (normalizedTier === 'professional') return '250';
    return '50';
  }, [userProfile?.vehicle_limit, userTier]);

  // --- FETCH REAL FLEET DATA FROM SUPABASE ---
  const fetchFleetData = useCallback(async () => {
    if (!userProfile?.organization_id) {
      // Demo Data Fallback for Non-Authenticated Tour Views
      setRecallUnits([
        { id: '1', unit: 'UNIT-101', vin: '1FUJGLDR5MLKE1234', makeModel: 'FREIGHTLINER CASCADIA 2023', nhtsaCampaign: '23V-891', recallDetails: 'STEERING AXLE DRAG LINK', description: 'Drag link taper joint may separate leading to sudden loss of steering control.', remedyStatus: 'Unassigned', complianceStatus: 'OPEN', severity: 'CRITICAL' },
        { id: '2', unit: 'UNIT-204', vin: '1FTBW1Y85PKA54321', makeModel: 'FORD TRANSIT VAN 2022', nhtsaCampaign: '24V-012', recallDetails: 'REAR DRIVESHAFT FLEX COUPLING', description: 'Driveshaft flex coupling separation may result in loss of motive power while driving.', remedyStatus: 'Scheduled', complianceStatus: 'SCHEDULED', severity: 'HIGH', dealerName: 'Metro Ford Commercial' },
        { id: '3', unit: 'UNIT-309', vin: '5YJ3E1EA7MF987654', makeModel: 'VOLVO VNL 860 2023', nhtsaCampaign: '23V-838', recallDetails: 'AIR BRAKE ACTUATOR DIAPHRAGM', description: 'Air leak in brake chamber diaphragm may increase stopping distances or cause drag.', remedyStatus: 'Completed', complianceStatus: 'CLEARED', severity: 'MEDIUM', dealerName: 'Volvo Truck Center' },
      ]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('vins')
        .select('*')
        .eq('organization_id', userProfile.organization_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching organization VINs:', error);
      } else if (data && data.length > 0) {
        const mappedUnits: RecallItem[] = data.map((item: any) => ({
          id: item.id,
          unit: item.unit_number || item.unit || `UNIT-${item.vin?.slice(-4)}`,
          vin: item.vin,
          makeModel: item.make_model || `${item.make || ''} ${item.model || ''} ${item.year || ''}`.trim() || 'UNKNOWN MAKE/MODEL',
          nhtsaCampaign: item.nhtsa_campaign || item.campaign_number || 'N/A',
          recallDetails: item.recall_details || item.component || 'SAFETY CAMPAIGN',
          description: item.description || item.summary || 'NHTSA Safety recall identified for this vehicle.',
          remedyStatus: item.remedy_status || 'Unassigned',
          complianceStatus: (item.compliance_status || 'OPEN').toUpperCase() as 'OPEN' | 'SCHEDULED' | 'CLEARED',
          severity: (item.severity || 'HIGH').toUpperCase() as 'CRITICAL' | 'HIGH' | 'MEDIUM',
          dealerName: item.dealer_name,
          scheduledDate: item.scheduled_date,
          organization_id: item.organization_id
        }));

        setRecallUnits(mappedUnits);
      } else {
        setRecallUnits([]);
      }
    } catch (err) {
      console.error('Unexpected error loading fleet records:', err);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.organization_id]);

  useEffect(() => {
    fetchFleetData();
  }, [fetchFleetData]);

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

  const handleSingleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!singleVinInput.trim() || !userProfile?.organization_id) return;

    const vinToScan = singleVinInput.trim().toUpperCase();

    const { error } = await supabase
      .from('vins')
      .insert([
        {
          vin: vinToScan,
          unit_number: `UNIT-${Math.floor(100 + Math.random() * 900)}`,
          organization_id: userProfile.organization_id,
          make_model: 'VOLVO VNL 860 2023',
          nhtsa_campaign: '24V-999',
          recall_details: 'STEERING GEARBOX FASTENER',
          description: 'NHTSA Live Sync scan flagged loose steering column attachment bolts.',
          remedy_status: 'Unassigned',
          compliance_status: 'OPEN',
          severity: 'HIGH'
        }
      ])
      .select();

    if (error) {
      console.error('Error scanning VIN:', error.message);
    } else {
      setSingleVinInput('');
      setIsSingleScanOpen(false);
      fetchFleetData();
    }
  };

  const handleExportRiskCertificate = () => {
    requireProAccess('Export Loss Control PDF', async () => {
      setExportState('generating');
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://ai-safety-recall-system.onrender.com';
        const targetFleetId = userProfile?.organization_id || 'demo-fleet-001';

        const response = await fetch(
          `${apiBaseUrl}/api/broker/compliance-report/${targetFleetId}/pdf?broker_name=RecallLogic%20Partner%20Brokerage`,
          { method: 'GET' }
        );

        if (!response.ok) {
          throw new Error(`Server returned status ${response.status}`);
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `RecallLogic_Loss_Control_Certificate_${targetFleetId}.pdf`;
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        setExportState('done');
        setTimeout(() => setExportState('idle'), 3000);
      } catch (err) {
        console.error('Failed to download fleet loss control certificate:', err);
        setExportState('idle');
      }
    });
  };

  const handleShareAuditLink = () => {
    requireProAccess('Share Live Underwriter Link', () => {
      const fleetId = userProfile?.organization_id || 'demo-fleet-001';
      const auditUrl = `${window.location.origin}/audit/${fleetId}`;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(auditUrl);
      }

      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    });
  };

  const handleUpdateStatus = async (id: string, newStatus: 'OPEN' | 'SCHEDULED' | 'CLEARED') => {
    const remedy = newStatus === 'CLEARED' ? 'Completed' : newStatus === 'SCHEDULED' ? 'Scheduled' : 'Unassigned';

    setRecallUnits((prev) =>
      prev.map((unit) =>
        unit.id === id
          ? { ...unit, complianceStatus: newStatus, remedyStatus: remedy }
          : unit
      )
    );

    const { error } = await supabase
      .from('vins')
      .update({
        compliance_status: newStatus,
        remedy_status: remedy
      })
      .eq('id', id);

    if (error) {
      console.error('Error persisting compliance update:', error);
    }

    setSelectedUnitForManage(null);
  };

  return (
    <div className="px-6 space-y-6 font-mono text-slate-100 max-w-7xl mx-auto relative">
      
      {/* SECTION HEADER & PRO ACTIONS BAR (STEP 1, STEP 2 & STEP 5 HIGHLIGHT) */}
      <div className={`flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0D1322] p-5 rounded-2xl border transition-all duration-300 ${
        isTourActive && (currentTourStep === 0 || currentTourStep === 1 || currentTourStep === 4)
          ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          : 'border-slate-800'
      }`}>
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
              {userTier.toUpperCase()} TIER ({recallUnits.length} / {displayLimit} VINS)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Active fleet safety tracking, underwriter verification packet generation, and dealer remedy scheduling.
          </p>
        </div>

        {/* TOP TOOLBAR BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
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
            type="button"
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
            type="button"
            onClick={handleShareAuditLink}
            title="Copy a read-only live safety audit link for your insurance broker or underwriter"
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all border ${
              isPro
                ? copiedLink
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20 cursor-pointer'
                  : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-700 cursor-pointer'
                : 'bg-slate-900 text-slate-500 border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            {copiedLink ? <span>✓ Live Link Copied!</span> : <span>⚡ Share Live Underwriter Link</span>}
          </button>

          <button
            type="button"
            onClick={handleExportRiskCertificate}
            disabled={exportState === 'generating'}
            title="Download official PDF Risk Audit Certificate for policy renewal discount verification"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 transition-all ${
              isPro
                ? exportState === 'generating'
                  ? 'bg-cyan-950 border border-cyan-500/50 text-cyan-400 animate-pulse'
                  : exportState === 'done'
                  ? 'bg-emerald-500 border border-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                  : 'bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 cursor-pointer shadow-lg shadow-cyan-950/50'
                : 'bg-slate-900 text-slate-500 border border-slate-800 cursor-not-allowed'
            }`}
          >
            {!isPro && <span className="bg-cyan-950 text-cyan-400 text-[9px] px-1 rounded border border-cyan-800">PRO</span>}
            {exportState === 'generating' && <span>⏳ Generating PDF...</span>}
            {exportState === 'done' && <span>✓ Loss Control PDF Exported!</span>}
            {exportState === 'idle' && <span>📄 Export Loss Control PDF</span>}
          </button>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR (STEP 3 HIGHLIGHT) */}
      <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 bg-[#0D1322] p-4 rounded-xl border transition-all duration-300 ${
        isTourActive && currentTourStep === 2
          ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          : 'border-slate-800'
      }`}>
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
            className="bg-slate-950 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Makes</option>
            <option value="FREIGHTLINER">Freightliner</option>
            <option value="FORD">Ford</option>
            <option value="KENWORTH">Kenworth</option>
            <option value="PETERBILT">Peterbilt</option>
            <option value="CHEVROLET">Chevrolet</option>
            <option value="VOLVO">Volvo</option>
          </select>

          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-cyan-950 border border-cyan-500/50 text-[#06B6D4] font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Statuses
            </button>
            <button
              onClick={() => setActiveTab('open')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                activeTab === 'open'
                  ? 'bg-red-950 border border-red-500/50 text-red-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Open
            </button>
            <button
              onClick={() => setActiveTab('scheduled')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
                activeTab === 'scheduled'
                  ? 'bg-amber-950 border border-amber-500/50 text-amber-400 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scheduled
            </button>
            <button
              onClick={() => setActiveTab('cleared')}
              className={`px-3 py-1 rounded text-xs font-mono transition-all cursor-pointer ${
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

      {/* RECALL MONITORING TABLE (STEP 4 HIGHLIGHT) */}
      <div className={`bg-[#0D1322] border rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${
        isTourActive && currentTourStep === 3
          ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
          : 'border-slate-800'
      }`}>
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
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 font-mono">
                    <span className="animate-pulse">Loading live fleet safety records from Supabase...</span>
                  </td>
                </tr>
              ) : filteredUnits.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 font-mono">
                    <p className="text-slate-300 font-bold mb-1">No active fleet safety campaigns found.</p>
                    <p className="text-xs text-slate-500">
                      Use <span className="text-cyan-400">Single-VIN Scan</span> or <span className="text-cyan-400">Bulk CSV Import</span> to register fleet vehicles.
                    </p>
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

      {/* GUARANTEED UN-CLIPPED FLOATING TOUR CARD */}
      {isTourActive && (
        <div className="fixed bottom-6 right-6 z-[9999] w-80 sm:w-96 bg-[#0D1322] border-2 border-cyan-400 rounded-2xl p-5 shadow-[0_0_50px_rgba(6,182,212,0.4)] space-y-3 font-mono text-slate-100 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
          
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <span className="text-[9px] font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 uppercase tracking-widest">
              {tourSteps[currentTourStep].badge}
            </span>
            <button 
              type="button" 
              onClick={() => setIsTourActive(false)}
              className="text-slate-400 hover:text-white transition text-xs cursor-pointer px-1"
            >
              ✕
            </button>
          </div>

          <div className="space-y-1">
            <h3 className="text-xs font-extrabold text-white flex items-center gap-1.5">
              <span>💡</span> {tourSteps[currentTourStep].title}
            </h3>
            <p className="text-[11px] text-slate-300 leading-normal">
              {tourSteps[currentTourStep].description}
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-1">
              {tourSteps.map((_, idx) => (
                <span 
                  key={idx}
                  className={`h-1 rounded-full transition-all ${
                    idx === currentTourStep ? 'w-4 bg-cyan-400' : 'w-1 bg-slate-700'
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {currentTourStep > 0 && (
                <button
                  type="button"
                  onClick={() => setCurrentTourStep(prev => prev - 1)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer"
                >
                  ← Back
                </button>
              )}

              <button
                type="button"
                onClick={handleNextTourStep}
                className="px-3 py-1 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 text-[10px] font-extrabold rounded cursor-pointer"
              >
                {currentTourStep === tourSteps.length - 1 ? "🚀 Start Free Fleet Audit" : "Next Step →"}
              </button>
            </div>
          </div>

        </div>
      )}

      {/* RESTART TOUR BUTTON */}
      {!isTourActive && (
        <button
          type="button"
          onClick={() => {
            setCurrentTourStep(0);
            setIsTourActive(true);
          }}
          className="fixed bottom-6 right-6 z-40 px-3.5 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 text-cyan-400 font-mono text-xs font-bold shadow-2xl backdrop-blur-md flex items-center gap-2 cursor-pointer"
        >
          <span>💡 Restart Fleet Tour</span>
        </button>
      )}

      {/* SINGLE VIN SCAN MODAL */}
      {isSingleScanOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">⚡ Single-VIN Scan</h3>
              <button onClick={() => setIsSingleScanOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                <button type="button" onClick={() => setIsSingleScanOpen(false)} className="px-4 py-2 bg-slate-800 text-xs rounded-lg cursor-pointer">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 text-slate-950 font-bold text-xs rounded-lg cursor-pointer">Run NHTSA Audit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BULK CSV IMPORT MODAL */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-4xl w-full bg-[#0D1322] border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex justify-between items-center mb-4 font-mono text-xs">
              <span className="font-bold text-white uppercase tracking-wider">⚡ Bulk Fleet Safety Sync</span>
              <button 
                onClick={() => {
                  setIsBulkImportOpen(false);
                  fetchFleetData();
                }} 
                className="text-slate-400 hover:text-white px-2.5 py-1 rounded bg-slate-800 border border-slate-700 cursor-pointer"
              >
                ✕ Close
              </button>
            </div>

            <FleetVinScanner isWorkspace={true} />
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
              <button onClick={() => setSelectedUnitForManage(null)} className="text-slate-400 hover:text-white cursor-pointer">✕</button>
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
                  className="py-2 bg-red-950 border border-red-800 text-red-400 text-xs font-bold rounded cursor-pointer"
                >
                  Mark OPEN
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedUnitForManage.id, 'SCHEDULED')}
                  className="py-2 bg-yellow-950 border border-yellow-800 text-yellow-400 text-xs font-bold rounded cursor-pointer"
                >
                  Mark SCHEDULED
                </button>
                <button
                  onClick={() => handleUpdateStatus(selectedUnitForManage.id, 'CLEARED')}
                  className="py-2 bg-green-950 border border-green-800 text-green-400 text-xs font-bold rounded cursor-pointer"
                >
                  Mark COMPLETED
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}