import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { TeamManagementModal } from './TeamManagementModal';

// Initialize Supabase directly using Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Default test profile ID matching database records
const CURRENT_PROFILE_ID = '07136e5d-0b6e-4ccf-b774-c2f3f01154bf';

// ==========================================
// TYPES & INTERFACES
// ==========================================
export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';
export type UserRole = 'admin' | 'mechanic' | 'viewer';

export interface TaskboardRecallItem {
  id: string;
  unit_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  nhtsa_campaign_number: string;
  component: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'Scheduled' | 'In Progress' | 'Cleared' | string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  created_at: string;
  scheduled_date?: string;
  repair_notes?: string;
  receipt_url?: string;
  closed_by_user_email?: string;
  closed_at?: string;
}

interface SingleVinScanResult {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  recallsCount: number;
  recalls: Array<{
    campaignNumber: string;
    component: string;
    summary: string;
    remedy: string;
  }>;
}

// ==========================================
// UNDERWRITER REPORT VIEW COMPONENT
// ==========================================
function UnderwriterReportView({ tasks }: { tasks: TaskboardRecallItem[] }) {
  const completedTasks = tasks.filter((t) => t.status === 'Cleared');
  const totalTasks = tasks.length;

  const complianceScore = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 100;

  const avgDaysToRemediate =
    completedTasks.reduce((acc, task) => {
      const created = new Date(task.created_at).getTime();
      const closed = new Date(task.closed_at || Date.now()).getTime();
      return acc + (closed - created) / (1000 * 3600 * 24);
    }, 0) / (completedTasks.length || 1);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6 text-white shadow-xl">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-slate-800 pb-4 gap-4">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
            Insurance Underwriter Audit Packet
          </span>
          <h3 className="text-xl font-bold text-white font-mono mt-1">Commercial Risk & Compliance Scorecard</h3>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-mono text-xs uppercase font-extrabold rounded-xl transition shadow-lg"
        >
          Export Underwriter Packet (PDF)
        </button>
      </div>

      {/* KPI METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Fleet Remediation Rate</span>
          <div className="text-3xl font-black text-emerald-400 mt-1">{complianceScore}%</div>
          <span className="text-[10px] text-slate-500">Target for Carrier Discount: &gt;95%</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Avg. Resolution Time</span>
          <div className="text-3xl font-black text-cyan-400 mt-1">{Math.round(avgDaysToRemediate)} Days</div>
          <span className="text-[10px] text-slate-500">Industry Standard: 45 Days</span>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl">
          <span className="text-xs text-slate-400">Verified Proof-of-Remedies</span>
          <div className="text-3xl font-black text-purple-400 mt-1">
            {completedTasks.filter((t) => t.receipt_url).length} / {completedTasks.length}
          </div>
          <span className="text-[10px] text-slate-500">Dealer Invoices Attached</span>
        </div>
      </div>

      {/* VERIFIED AUDIT LOG TABLE */}
      <div className="space-y-3">
        <h4 className="text-xs font-mono uppercase font-bold text-slate-300">Verified Remediation Log</h4>
        <div className="border border-slate-800 rounded-xl overflow-hidden text-xs font-mono">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
              <tr>
                <th className="p-3">Asset Unit</th>
                <th className="p-3">NHTSA Campaign</th>
                <th className="p-3">Resolved Date</th>
                <th className="p-3">Closed By</th>
                <th className="p-3">Proof Document</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/50">
              {completedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    No cleared recalls recorded yet.
                  </td>
                </tr>
              ) : (
                completedTasks.map((t, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/40 transition">
                    <td className="p-3 text-white font-bold">
                      {t.make} {t.model} ({t.year})
                    </td>
                    <td className="p-3 text-cyan-400">{t.nhtsa_campaign_number}</td>
                    <td className="p-3 text-slate-300">
                      {t.closed_at ? new Date(t.closed_at).toLocaleDateString() : 'Recent'}
                    </td>
                    <td className="p-3 text-slate-400">{t.closed_by_user_email || 'System Admin'}</td>
                    <td className="p-3">
                      {t.receipt_url ? (
                        <a href={t.receipt_url} target="_blank" rel="noreferrer" className="text-emerald-400 underline flex items-center gap-1">
                          View Invoice PDF 📄
                        </a>
                      ) : (
                        <span className="text-slate-500">No Receipt</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// MAIN TASKBOARD COMPONENT
// ==========================================
export const TaskBoard: React.FC = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [recalls, setRecalls] = useState<TaskboardRecallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecall, setSelectedRecall] = useState<TaskboardRecallItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // 🛡️ RBAC User Role & Team Modal States
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'workspace' | 'underwriter'>('workspace');

  // 💳 Subscription Tier States
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('free');
  const [vinChecksUsed, setVinChecksUsed] = useState<number>(0);
  const [isHardStopDismissed, setIsHardStopDismissed] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [gateReason, setGateReason] = useState<string>('');

  // 🔍 Filter & Sort States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created_at' | 'unit_number' | 'severity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Status Action Modal/State
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [scheduledDateInput, setScheduledDateInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');

  // 📎 Receipt Upload State
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);

  // 📥 Bulk CSV Import Modal States
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  // ⚡ Single-VIN Scan Console States
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<SingleVinScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addingToFleet, setAddingToFleet] = useState<boolean>(false);

  // Define RBAC permissions map based on role
  const permissions = useMemo(() => {
    return {
      canManageBilling: userRole === 'admin',
      canInviteUsers: userRole === 'admin',
      canExportUnderwriterReport: userRole === 'admin',
      canUpdateTaskStatus: userRole === 'admin' || userRole === 'mechanic',
      canUploadReceipts: userRole === 'admin' || userRole === 'mechanic',
      isReadOnly: userRole === 'viewer',
    };
  }, [userRole]);

  // Fetch current user's profile and assigned role
  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (data?.role) {
          setUserRole(data.role as UserRole);
        }
      }
    }
    fetchUserProfile();
  }, []);

  // Derive Tier Limit Caps based on defined tiers
  const vehicleLimit = useMemo(() => {
    switch (subscriptionTier) {
      case 'free': return 10;
      case 'standard': return 50;
      case 'professional': return 250;
      case 'enterprise': return 999999;
      default: return 10;
    }
  }, [subscriptionTier]);

  // Modal triggers ONLY when NOT standard/professional/enterprise AND user has checked > 10 VINs
  const showHardGatedModal = useMemo(() => {
    const isPaidPlan = ['standard', 'professional', 'enterprise'].includes(subscriptionTier);
    if (isPaidPlan || isHardStopDismissed) return false;

    return subscriptionTier === 'free' && (vinChecksUsed > 10 || recalls.length > 10);
  }, [subscriptionTier, vinChecksUsed, recalls.length, isHardStopDismissed]);

  // ==========================================
  // DIRECT SUPABASE FETCHING WITH RELATIONAL JOIN
  // ==========================================
  const fetchTaskboardData = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('recall_tasks')
        .select(`
          id,
          campaign_number,
          component,
          summary,
          remedy,
          severity_score,
          status,
          created_at,
          proof_of_remedy_url,
          closed_by_user_email,
          closed_at,
          monitored_vehicles (
            vin,
            make,
            model,
            year
          )
        `);

      if (error) {
        console.error('Supabase Query Error:', error);
        throw error;
      }

      const formattedData: TaskboardRecallItem[] = (data || []).map((item: any) => {
        const vehicle = Array.isArray(item.monitored_vehicles)
          ? item.monitored_vehicles[0]
          : item.monitored_vehicles;

        let severityLabel = 'Medium';
        if (item.severity_score >= 8.5) severityLabel = 'Critical';
        else if (item.severity_score >= 7.0) severityLabel = 'High';
        else if (item.severity_score < 4.0) severityLabel = 'Low';

        let statusLabel = 'Open';
        const rawStatus = (item.status || '').toLowerCase();
        if (rawStatus === 'scheduled' || rawStatus === 'in progress') statusLabel = 'Scheduled';
        else if (rawStatus === 'repaired' || rawStatus === 'cleared' || rawStatus === 'completed') statusLabel = 'Cleared';
        else if (rawStatus === 'pending') statusLabel = 'Open';

        return {
          id: item.id,
          unit_number: vehicle?.vin ? `LV-${vehicle.vin.slice(-3)}` : 'LV-101',
          vin: vehicle?.vin || 'N/A',
          year: vehicle?.year || 2022,
          make: vehicle?.make || 'Unknown',
          model: vehicle?.model || 'Asset',
          nhtsa_campaign_number: item.campaign_number || 'N/A',
          component: item.component || 'Safety System',
          severity: severityLabel,
          status: statusLabel,
          summary: item.summary,
          remedy: item.remedy,
          created_at: item.created_at || new Date().toISOString(),
          scheduled_date: item.scheduled_repair_date || '',
          repair_notes: item.repair_notes || '',
          receipt_url: item.proof_of_remedy_url || item.receipt_url || '',
          closed_by_user_email: item.closed_by_user_email || '',
          closed_at: item.closed_at || '',
        };
      });

      setRecalls(formattedData);
    } catch (err) {
      console.error('Error fetching taskboard data from Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskboardData();
  }, []);

  // ==========================================
  // DYNAMIC DATA MEMOIZATION
  // ==========================================
  const uniqueMakes = useMemo(() => {
    const makes = new Set(recalls.map((item) => item.make).filter(Boolean));
    return ['All', ...Array.from(makes).sort()];
  }, [recalls]);

  const filteredRecalls = useMemo(() => {
    return recalls
      .filter((item) => {
        const query = searchTerm.toLowerCase();
        const matchesSearch =
          !searchTerm ||
          item.unit_number?.toLowerCase().includes(query) ||
          item.vin?.toLowerCase().includes(query) ||
          `${item.year} ${item.make} ${item.model}`.toLowerCase().includes(query) ||
          item.component?.toLowerCase().includes(query) ||
          item.nhtsa_campaign_number?.toLowerCase().includes(query);

        const matchesMake = selectedMake === 'All' || item.make === selectedMake;
        const matchesStatus = selectedStatus === 'All' || item.status === selectedStatus;
        const matchesSeverity = selectedSeverity === 'All' || item.severity === selectedSeverity;

        return matchesSearch && matchesMake && matchesStatus && matchesSeverity;
      })
      .sort((a, b) => {
        let comparison = 0;
        if (sortBy === 'created_at') {
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        } else if (sortBy === 'unit_number') {
          comparison = (a.unit_number || '').localeCompare(b.unit_number || '');
        } else if (sortBy === 'severity') {
          const severityOrder: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
          comparison = (severityOrder[a.severity] || 0) - (severityOrder[b.severity] || 0);
        }
        return sortOrder === 'desc' ? -comparison : comparison;
      });
  }, [recalls, searchTerm, selectedMake, selectedStatus, selectedSeverity, sortBy, sortOrder]);

  const metrics = useMemo(() => {
    const total = recalls.length;
    const open = recalls.filter((r) => r.status === 'Open').length;
    const scheduled = recalls.filter((r) => r.status === 'Scheduled' || r.status === 'In Progress').length;
    const cleared = recalls.filter((r) => r.status === 'Cleared').length;
    const safeRate = total > 0 ? Math.round((cleared / total) * 100) : 100;

    return { total, open, scheduled, cleared, safeRate };
  }, [recalls]);

  // ==========================================
  // TIER GATE HANDLERS
  // ==========================================
  const triggerUpgradeModal = (reason: string) => {
    setGateReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleOpenSingleVinConsole = () => {
    if (subscriptionTier === 'free' || subscriptionTier === 'standard') {
      triggerUpgradeModal('Instant Single-VIN Scan Console is exclusive to Professional & Enterprise plans.');
      return;
    }
    setSingleVinInput('');
    setScanResult(null);
    setScanError(null);
    setIsScanModalOpen(true);
  };

  const handleDownloadPDF = () => {
    if (subscriptionTier === 'free' || subscriptionTier === 'standard') {
      triggerUpgradeModal('Signed Underwriter Compliance Certificates (PDF) are exclusive to Professional & Enterprise plans.');
      return;
    }
    const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    window.open(`${baseUrl}/api/broker/compliance-report/FLT-1001/pdf?broker_name=Aon%20Risk%20Solutions`, '_blank');
  };

  // ==========================================
  // ⚡ INSTANT SINGLE-VIN SCAN LOGIC
  // ==========================================
  const handleRunSingleVinScan = async () => {
    const cleanVin = singleVinInput.trim().toUpperCase();
    if (!cleanVin || cleanVin.length < 11) {
      setScanError('Please enter a valid 17-digit vehicle VIN.');
      return;
    }

    try {
      setScanning(true);
      setScanError(null);
      setScanResult(null);

      const response = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${cleanVin}&format=json`);
      const data = await response.json();
      const rawResults = data.results || [];

      const mappedRecalls = rawResults.map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber || 'N/A',
        component: r.Component || 'Safety System',
        summary: r.Summary || 'No defect summary available.',
        remedy: r.Remedy || 'Contact dealer for remedy details.',
      }));

      setVinChecksUsed((prev) => prev + 1);

      setScanResult({
        vin: cleanVin,
        make: rawResults[0]?.Make || 'Scanned',
        model: rawResults[0]?.Model || 'Vehicle',
        year: rawResults[0]?.ModelYear ? parseInt(rawResults[0].ModelYear, 10) : 2022,
        recallsCount: mappedRecalls.length,
        recalls: mappedRecalls,
      });
    } catch (err) {
      console.error('NHTSA Scan Error:', err);
      setScanError('Failed to query NHTSA database. Check the VIN and try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddScannedVinToFleet = async () => {
    if (!scanResult) return;

    if (recalls.length >= vehicleLimit) {
      triggerUpgradeModal(`You have reached your tier capacity of ${vehicleLimit} vehicles.`);
      return;
    }

    try {
      setAddingToFleet(true);

      const { data: vehicleData, error: vehicleErr } = await supabase
        .from('monitored_vehicles')
        .upsert(
          {
            profile_id: CURRENT_PROFILE_ID,
            vin: scanResult.vin,
            make: scanResult.make,
            model: scanResult.model,
            year: scanResult.year,
          },
          { onConflict: 'profile_id,vin' }
        )
        .select('id')
        .single();

      if (vehicleErr) throw vehicleErr;

      if (scanResult.recalls.length > 0 && vehicleData?.id) {
        const tasksToInsert = scanResult.recalls.map((r) => ({
          vehicle_id: vehicleData.id,
          campaign_number: r.campaignNumber,
          component: r.component,
          summary: r.summary,
          remedy: r.remedy,
          severity_score: 7.5,
          status: 'pending',
        }));

        await supabase.from('recall_tasks').insert(tasksToInsert);
      }

      setIsScanModalOpen(false);
      setSingleVinInput('');
      setScanResult(null);
      fetchTaskboardData();
    } catch (err: any) {
      console.error('Add to Fleet Error:', err);
      setScanError(`Failed to save asset: ${err.message || 'Database error'}`);
    } finally {
      setAddingToFleet(false);
    }
  };

  // ==========================================
  // BULK CSV PARSING & IMPORT LOGIC
  // ==========================================
  const handleProcessCsvImport = async () => {
    if (!csvFile) return;

    try {
      setImporting(true);
      setImportFeedback('Reading CSV payload...');

      const text = await csvFile.text();
      const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setImportFeedback('Error: CSV file is empty or missing headers.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const vinIndex = headers.findIndex((h) => h.includes('vin'));
      const makeIndex = headers.findIndex((h) => h.includes('make'));
      const modelIndex = headers.findIndex((h) => h.includes('model'));
      const yearIndex = headers.findIndex((h) => h.includes('year'));

      if (vinIndex === -1) {
        setImportFeedback('Error: CSV must contain a "VIN" column.');
        return;
      }

      const vehiclesToInsert: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((cell) => cell.trim().replace(/["']/g, ''));
        const vin = row[vinIndex];

        if (vin && vin.length >= 11) {
          vehiclesToInsert.push({
            profile_id: CURRENT_PROFILE_ID,
            vin: vin.toUpperCase(),
            make: makeIndex !== -1 ? row[makeIndex] || 'Unknown' : 'Unknown',
            model: modelIndex !== -1 ? row[modelIndex] || 'Asset' : 'Asset',
            year: yearIndex !== -1 ? parseInt(row[yearIndex], 10) || 2022 : 2022,
          });
        }
      }

      if (recalls.length + vehiclesToInsert.length > vehicleLimit) {
        setImportFeedback(`Error: Importing ${vehiclesToInsert.length} vehicles exceeds your ${subscriptionTier.toUpperCase()} limit of ${vehicleLimit} vehicles.`);
        return;
      }

      setImportFeedback(`Uploading ${vehiclesToInsert.length} vehicle(s) to Supabase...`);

      const { error } = await supabase
        .from('monitored_vehicles')
        .upsert(vehiclesToInsert, { onConflict: 'profile_id,vin' });

      if (error) throw error;

      setImportFeedback(`Success! ${vehiclesToInsert.length} vehicles added/updated.`);
      setTimeout(() => {
        setIsImportModalOpen(false);
        setCsvFile(null);
        setImportFeedback(null);
        fetchTaskboardData();
      }, 1200);
    } catch (err: any) {
      console.error('CSV Import Error:', err);
      setImportFeedback(`Import Failed: ${err.message || 'Unknown database error'}`);
    } finally {
      setImporting(false);
    }
  };

  // ==========================================
  // HANDLERS & ACTIONS
  // ==========================================
  const handleOpenDrawer = (item: TaskboardRecallItem) => {
    setSelectedRecall(item);
    setScheduledDateInput(item.scheduled_date || '');
    setNotesInput(item.repair_notes || '');
    setReceiptFile(null);
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRecall(null);
    setReceiptFile(null);
  };

  const uploadReceiptToStorage = async (file: File, taskId: string): Promise<string | null> => {
    try {
      setUploadingReceipt(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('repair-receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) return null;

      const { data: publicUrlData } = supabase.storage
        .from('repair-receipts')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl || null;
    } catch (err) {
      console.error('Failed to upload receipt file:', err);
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRecall || !permissions.canUpdateTaskStatus) return;
    try {
      setUpdatingStatus(true);
      let uploadedUrl = selectedRecall.receipt_url || '';

      if (receiptFile) {
        const publicUrl = await uploadReceiptToStorage(receiptFile, selectedRecall.id);
        if (publicUrl) uploadedUrl = publicUrl;
      }

      let dbStatus = 'pending';
      if (newStatus === 'Scheduled' || newStatus === 'In Progress') dbStatus = 'scheduled';
      if (newStatus === 'Cleared') dbStatus = 'completed';

      const { data: { user } } = await supabase.auth.getUser();

      const updatePayload: any = {
        status: dbStatus,
        scheduled_repair_date: scheduledDateInput || null,
        repair_notes: notesInput || null,
        proof_of_remedy_url: uploadedUrl || null,
      };

      if (newStatus === 'Cleared') {
        updatePayload.closed_by_user_email = user?.email || 'System Admin';
        updatePayload.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('recall_tasks')
        .update(updatePayload)
        .eq('id', selectedRecall.id);

      if (error) throw error;

      setRecalls((prev) =>
        prev.map((r) =>
          r.id === selectedRecall.id
            ? {
                ...r,
                status: newStatus,
                scheduled_date: scheduledDateInput,
                repair_notes: notesInput,
                receipt_url: uploadedUrl,
                closed_by_user_email: updatePayload.closed_by_user_email || r.closed_by_user_email,
                closed_at: updatePayload.closed_at || r.closed_at,
              }
            : r
        )
      );

      setSelectedRecall((prev) =>
        prev
          ? {
              ...prev,
              status: newStatus,
              scheduled_date: scheduledDateInput,
              repair_notes: notesInput,
              receipt_url: uploadedUrl,
              closed_by_user_email: updatePayload.closed_by_user_email || prev.closed_by_user_email,
              closed_at: updatePayload.closed_at || prev.closed_at,
            }
          : null
      );

      setReceiptFile(null);
    } catch (err) {
      console.error('Failed to update status in Supabase:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecalls.length === 0) return;
    const headers = ['Unit Number', 'VIN', 'Year', 'Make', 'Model', 'Component', 'NHTSA Campaign', 'Severity', 'Status', 'Receipt URL'];
    const rows = filteredRecalls.map((r) => [
      `"${r.unit_number || ''}"`,
      `"${r.vin || ''}"`,
      r.year,
      `"${r.make || ''}"`,
      `"${r.model || ''}"`,
      `"${r.component || ''}"`,
      `"${r.nhtsa_campaign_number || ''}"`,
      `"${r.severity || ''}"`,
      `"${r.status || ''}"`,
      `"${r.receipt_url || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `fleet_recall_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen relative">
      {/* 🛑 HARD-STOP FREE TEASER OVERLAY MODAL */}
      {showHardGatedModal && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full p-8 text-center space-y-6 border border-blue-100 relative">
            <button
              onClick={() => setIsHardStopDismissed(true)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-lg p-1 rounded-lg hover:bg-gray-100 transition"
              title="Close Preview"
            >
              ✕
            </button>

            <div className="inline-flex p-4 bg-amber-100 text-amber-600 rounded-full text-3xl">
              🔒
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900">10 Free VIN Teaser Limit Reached</h2>
              <p className="text-sm text-gray-600 mt-2">
                You have checked more than 10 VINs on your Free Account. Upgrade to a paid plan to unlock continuous monitoring across your fleet.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-left pt-2">
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 space-y-2">
                <span className="text-xs font-bold text-gray-500 uppercase">Standard</span>
                <p className="text-xl font-extrabold text-gray-900">$99<span className="text-xs font-normal text-gray-500">/mo</span></p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ Up to 50 Vehicles Monitored</li>
                  <li>✓ Continuous Active Scanning</li>
                  <li>✓ CSV Audit Exports</li>
                </ul>
                <button
                  onClick={() => {
                    setSubscriptionTier('standard');
                    setIsHardStopDismissed(true);
                  }}
                  className="w-full mt-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                >
                  Upgrade to Standard
                </button>
              </div>

              <div className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/30 space-y-2 relative">
                <span className="absolute -top-3 right-3 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">Popular</span>
                <span className="text-xs font-bold text-indigo-600 uppercase">Professional</span>
                <p className="text-xl font-extrabold text-gray-900">$249<span className="text-xs font-normal text-gray-500">/mo</span></p>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>✓ Up to 250 Vehicles Monitored</li>
                  <li>✓ Instant Single-VIN Scan Console</li>
                  <li>✓ Underwriter PDF Risk Certificate</li>
                </ul>
                <button
                  onClick={() => {
                    setSubscriptionTier('professional');
                    setIsHardStopDismissed(true);
                  }}
                  className="w-full mt-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition shadow-sm"
                >
                  Upgrade to Professional
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsHardStopDismissed(true)}
                className="text-xs font-semibold text-gray-400 hover:text-gray-600 underline"
              >
                Dismiss and continue viewing current workspace
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">Fleet Recall Operations</h1>
            <span className="bg-slate-200 text-slate-700 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase">
              Role: {userRole}
            </span>
          </div>
          <p className="text-sm text-gray-500">Monitor, filter, and schedule safety recall remedies across active fleet assets.</p>
        </div>

        {/* NAVIGATION TAB & TEAM CONTROLS */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-200 p-1 rounded-xl flex gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 rounded-lg font-bold transition ${
                activeTab === 'workspace' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Task Board
            </button>
            {permissions.canExportUnderwriterReport && (
              <button
                onClick={() => setActiveTab('underwriter')}
                className={`px-3 py-1.5 rounded-lg font-bold transition ${
                  activeTab === 'underwriter' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🛡️ Underwriter Audit
              </button>
            )}
          </div>

          {permissions.canInviteUsers && (
            <button
              onClick={() => setIsTeamModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-mono font-bold transition flex items-center gap-2 shadow-sm"
            >
              👥 Team & Permissions
            </button>
          )}

          {/* 💳 TIER USAGE BADGE & ACTIONS */}
          <div className="flex items-center gap-3 bg-white px-3.5 py-1.5 rounded-xl border border-gray-200 shadow-sm">
            <div>
              <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">
                {subscriptionTier.toUpperCase()} PLAN
              </p>
              <p className="text-xs font-bold text-gray-900">
                {recalls.length} <span className="text-gray-400">/ {vehicleLimit === 999999 ? '∞' : vehicleLimit} Vehicles</span>
              </p>
            </div>
            <div className="w-16 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full ${recalls.length >= vehicleLimit ? 'bg-red-500' : 'bg-emerald-500'}`}
                style={{ width: `${Math.min((recalls.length / vehicleLimit) * 100, 100)}%` }}
              ></div>
            </div>
            {permissions.canManageBilling && subscriptionTier !== 'enterprise' && (
              <button
                onClick={() => triggerUpgradeModal('Manage your subscription tier')}
                className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[11px] font-bold rounded-lg shadow transition"
              >
                Upgrade
              </button>
            )}
          </div>

          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>📄</span> Risk Certificate
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>📊</span> Export CSV
          </button>
        </div>
      </div>

      {/* RENDER VIEW SWITCH: TASKBOARD WORKSPACE VS UNDERWRITER AUDIT VIEW */}
      {activeTab === 'underwriter' ? (
        <UnderwriterReportView tasks={recalls} />
      ) : (
        <>
          {/* 1. TOP KPI STATS BAR */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/80">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Action Required</p>
              <p className="text-3xl font-extrabold text-red-600 mt-1">{metrics.open}</p>
              <span className="text-xs text-red-500 font-medium">Unresolved safety risks</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/80">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">In Progress</p>
              <p className="text-3xl font-extrabold text-amber-500 mt-1">{metrics.scheduled}</p>
              <span className="text-xs text-amber-600 font-medium">Scheduled at dealership</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/80">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">CLEARED REPAIRS</p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.cleared}</p>
              <span className="text-xs text-emerald-600 font-medium">Verified completed repairs</span>
            </div>

            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/80">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fleet Safety Score</p>
              <p className="text-3xl font-extrabold text-blue-600 mt-1">{metrics.safeRate}%</p>
              <span className="text-xs text-blue-500 font-medium">Overall fleet compliance</span>
            </div>
          </div>

          {/* 2. TWO-ROW ASSET INGESTION & FILTER CONTROL BAR */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1 max-w-xl">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
                  🔍
                </span>
                <input
                  type="text"
                  placeholder="Search by Unit #, VIN, Make, Model, or NHTSA ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white shadow-sm transition"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-gray-400 hover:text-gray-600 font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                <button
                  onClick={handleOpenSingleVinConsole}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap flex items-center gap-1.5"
                  title="Instant single vehicle lookup"
                >
                  <span>⚡</span> Single-VIN Scan
                </button>

                <button
                  onClick={() => setIsImportModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap flex items-center gap-1.5"
                  title="Import VIN list via CSV"
                >
                  <span>📥</span> Bulk CSV Import
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 my-1"></div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filter By:</span>

                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="All">All Makes</option>
                  {uniqueMakes.filter((m) => m !== 'All').map((make) => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="All">All Severities</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Low">Low</option>
                </select>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Cleared">Cleared</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-bold focus:ring-2 focus:ring-blue-500 shadow-sm"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="severity">Sort by Severity</option>
                  <option value="unit_number">Sort by Unit #</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-gray-300 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 transition text-gray-600 font-bold shadow-sm"
                  title="Toggle Sort Order"
                >
                  {sortOrder === 'desc' ? '⬇️' : '⬆️'}
                </button>
              </div>
            </div>
          </div>

          {/* 3. ACTIONABLE FLEET RECALL TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden">
            {loading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
                <p className="mt-2 text-sm text-gray-500 font-medium">Scanning fleet recall records...</p>
              </div>
            ) : filteredRecalls.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <p className="text-lg font-semibold text-gray-700">No recall tasks found</p>
                <p className="text-sm mt-1">Try adjusting your filters or search terms above.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-semibold uppercase text-xs tracking-wider">
                    <tr>
                      <th className="p-4">Fleet Asset</th>
                      <th className="p-4">Vehicle Details</th>
                      <th className="p-4">Component & NHTSA ID</th>
                      <th className="p-4">Severity</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Proof of Remedy</th>
                      <th className="p-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredRecalls.map((item) => (
                      <tr key={item.id} className="hover:bg-blue-50/40 transition">
                        <td className="p-4 font-bold text-gray-900">
                          Unit #{item.unit_number || 'Unassigned'}
                        </td>
                        <td className="p-4">
                          <div className="font-semibold text-gray-800">{item.year} {item.make} {item.model}</div>
                          <div className="text-xs text-gray-400 font-mono mt-0.5">VIN: {item.vin}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900">{item.component}</div>
                          <div className="text-xs text-blue-600 font-mono mt-0.5">NHTSA #{item.nhtsa_campaign_number}</div>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.severity === 'Critical' ? 'bg-red-100 text-red-700' :
                            item.severity === 'High' ? 'bg-orange-100 text-orange-700' :
                            item.severity === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {item.severity || 'Medium'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'Scheduled' || item.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                            'bg-red-50 text-red-600'
                          }`}>
                            {item.status || 'Open'}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.receipt_url ? (
                            <a
                              href={item.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold hover:underline"
                            >
                              <span>🧾</span> Verified Invoice
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No document</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            onClick={() => handleOpenDrawer(item)}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-lg transition"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* 4. RECALL MANAGEMENT DRAWER MODAL */}
      {isDrawerOpen && selectedRecall && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Manage Unit #{selectedRecall.unit_number}</h2>
                  <p className="text-xs text-gray-500">{selectedRecall.year} {selectedRecall.make} {selectedRecall.model} (VIN: {selectedRecall.vin})</p>
                </div>
                <button
                  onClick={handleCloseDrawer}
                  className="p-2 text-gray-400 hover:text-gray-600 text-lg font-bold rounded-lg hover:bg-gray-100"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-blue-600 font-mono">NHTSA #{selectedRecall.nhtsa_campaign_number}</span>
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">{selectedRecall.severity} Severity</span>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-gray-500">Defective Component</h4>
                  <p className="text-sm font-medium text-gray-800">{selectedRecall.component}</p>
                </div>
                {selectedRecall.summary && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-500">Defect Summary</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedRecall.summary}</p>
                  </div>
                )}
                {selectedRecall.remedy && (
                  <div>
                    <h4 className="text-xs font-semibold uppercase text-gray-500">Manufacturer Remedy</h4>
                    <p className="text-xs text-gray-600 mt-0.5">{selectedRecall.remedy}</p>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Update Remedy Status</h3>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Appointment / Repair Date</label>
                  <input
                    type="date"
                    disabled={!permissions.canUpdateTaskStatus}
                    value={scheduledDateInput}
                    onChange={(e) => setScheduledDateInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fleet Notes / Repair Invoice #</label>
                  <textarea
                    rows={3}
                    disabled={!permissions.canUpdateTaskStatus}
                    placeholder="Add dealership invoice numbers, technician notes, or service location details..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>

                <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
                  <label className="block text-xs font-bold text-gray-800">
                    Proof of Remedy / Repair Invoice (PDF or Image)
                  </label>

                  {selectedRecall.receipt_url ? (
                    <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                        <span>✅</span> Attached Repair Proof
                      </div>
                      <a
                        href={selectedRecall.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded border border-emerald-200 transition"
                      >
                        View Document ↗
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      Upload the dealership repair order or receipt to establish an unshakeable audit trail before clearing this recall.
                    </p>
                  )}

                  {permissions.canUploadReceipts && (
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                      className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                    />
                  )}
                  {receiptFile && (
                    <p className="text-xs text-blue-600 font-medium">Selected: {receiptFile.name}</p>
                  )}
                </div>
              </div>
            </div>

            <div className="border-t pt-4 space-y-2">
              {permissions.canUpdateTaskStatus ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => handleUpdateStatus('Scheduled')}
                    disabled={updatingStatus || uploadingReceipt}
                    className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
                  >
                    Mark Scheduled
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('In Progress')}
                    disabled={updatingStatus || uploadingReceipt}
                    className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
                  >
                    In Progress
                  </button>
                  <button
                    onClick={() => handleUpdateStatus('Cleared')}
                    disabled={updatingStatus || uploadingReceipt}
                    className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50"
                  >
                    {uploadingReceipt ? 'Uploading...' : 'Mark Cleared'}
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-gray-100 text-gray-600 text-center rounded-lg text-xs font-mono">
                  🔒 Read-Only Access (Role: {userRole})
                </div>
              )}
              <button
                onClick={handleCloseDrawer}
                className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition"
              >
                Close Drawer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. ⚡ INSTANT SINGLE-VIN SCAN CONSOLE MODAL */}
      {isScanModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>⚡</span> Instant Single-VIN Scan Console
                </h3>
                <p className="text-xs text-gray-500">Query live NHTSA safety defect databases on demand.</p>
              </div>
              <button
                onClick={() => setIsScanModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
                Enter 17-Digit Vehicle Identification Number (VIN)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={17}
                  placeholder="e.g. 1FTFW1ED4MFC12345"
                  value={singleVinInput}
                  onChange={(e) => setSingleVinInput(e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:ring-2 focus:ring-blue-500 uppercase"
                />
                <button
                  onClick={handleRunSingleVinScan}
                  disabled={scanning || !singleVinInput}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
                >
                  {scanning ? 'Scanning...' : 'Scan VIN'}
                </button>
              </div>
              {scanError && (
                <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
                  {scanError}
                </p>
              )}
            </div>

            {scanResult && (
              <div className="space-y-4 border-t pt-4">
                <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border">
                  <div>
                    <p className="text-xs font-bold text-gray-900">{scanResult.year} {scanResult.make} {scanResult.model}</p>
                    <p className="text-xs font-mono text-gray-500">VIN: {scanResult.vin}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                    scanResult.recallsCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {scanResult.recallsCount} Open Recalls Found
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                  {scanResult.recalls.length === 0 ? (
                    <p className="text-xs text-emerald-600 font-semibold text-center py-4 bg-emerald-50 rounded-lg border border-emerald-100">
                      ✅ No safety recalls currently registered with NHTSA for this VIN.
                    </p>
                  ) : (
                    scanResult.recalls.map((r, i) => (
                      <div key={i} className="p-3 bg-red-50/60 border border-red-100 rounded-lg text-xs space-y-1">
                        <div className="flex justify-between font-bold text-red-800">
                          <span>{r.component}</span>
                          <span className="font-mono text-red-600">#{r.campaignNumber}</span>
                        </div>
                        <p className="text-gray-700">{r.summary}</p>
                      </div>
                    ))
                  )}
                </div>

                <button
                  onClick={handleAddScannedVinToFleet}
                  disabled={addingToFleet}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition"
                >
                  {addingToFleet ? 'Saving Asset...' : '➕ Add Vehicle to Monitored Fleet'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 6. BULK FLEET CSV IMPORT MODAL */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-lg font-bold text-gray-900">Bulk Import Fleet VINs</h3>
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Upload a CSV file containing your fleet assets. Make sure your file includes a <code className="bg-gray-100 px-1 rounded font-bold text-gray-800">vin</code> column (optional: <code className="bg-gray-100 px-1 rounded font-bold text-gray-800">make</code>, <code className="bg-gray-100 px-1 rounded font-bold text-gray-800">model</code>, <code className="bg-gray-100 px-1 rounded font-bold text-gray-800">year</code>).
            </p>

            <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-blue-50/50 transition cursor-pointer">
              <input
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
                className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
              />
              {csvFile && (
                <p className="text-xs text-emerald-600 font-bold mt-2">Ready: {csvFile.name}</p>
              )}
            </div>

            {importFeedback && (
              <p className={`text-xs font-semibold p-3 rounded-lg ${
                importFeedback.startsWith('Error')
                  ? 'bg-red-50 text-red-600'
                  : importFeedback.startsWith('Success')
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-blue-50 text-blue-600'
              }`}>
                {importFeedback}
              </p>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleProcessCsvImport}
                disabled={!csvFile || importing}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50"
              >
                {importing ? 'Processing...' : 'Upload & Sync Fleet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 💳 PRICING / UPGRADE MODAL */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-5">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Upgrade Subscription Plan</h3>
                {gateReason && <p className="text-xs text-blue-600 font-semibold mt-0.5">{gateReason}</p>}
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              {/* Standard */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-50 flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Standard</span>
                  <p className="text-2xl font-extrabold text-gray-900">$99<span className="text-xs font-normal text-gray-500">/mo</span></p>
                  <ul className="text-xs text-gray-600 space-y-1.5 mt-2">
                    <li>✓ Up to 50 Vehicles</li>
                    <li>✓ Continuous Monitoring</li>
                    <li>✓ Full Workspace Access</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSubscriptionTier('standard');
                    setIsUpgradeModalOpen(false);
                  }}
                  className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Select Standard
                </button>
              </div>

              {/* Professional */}
              <div className="p-4 rounded-xl border-2 border-indigo-600 bg-indigo-50/20 flex flex-col justify-between space-y-3 relative">
                <span className="absolute -top-3 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">Recommended</span>
                <div>
                  <span className="text-[10px] font-bold text-indigo-600 uppercase">Professional</span>
                  <p className="text-2xl font-extrabold text-gray-900">$249<span className="text-xs font-normal text-gray-500">/mo</span></p>
                  <ul className="text-xs text-gray-600 space-y-1.5 mt-2">
                    <li>✓ Up to 250 Vehicles</li>
                    <li>✓ Single-VIN Scan Console</li>
                    <li>✓ Signed PDF Compliance Card</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSubscriptionTier('professional');
                    setIsUpgradeModalOpen(false);
                  }}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition"
                >
                  Select Professional
                </button>
              </div>

              {/* Enterprise */}
              <div className="p-4 rounded-xl border border-gray-200 bg-gray-900 text-white flex flex-col justify-between space-y-3">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase">Enterprise</span>
                  <p className="text-2xl font-extrabold text-white">Custom</p>
                  <ul className="text-xs text-gray-300 space-y-1.5 mt-2">
                    <li>✓ Unlimited Vehicles</li>
                    <li>✓ Telematics (Geotab/Samsara)</li>
                    <li>✓ Dedicated Broker QBR</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setSubscriptionTier('enterprise');
                    setIsUpgradeModalOpen(false);
                  }}
                  className="w-full py-2 bg-white text-gray-900 hover:bg-gray-100 font-bold text-xs rounded-lg transition"
                >
                  Select Enterprise
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TEAM ACCESS CONTROL MODAL */}
      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default TaskBoard;