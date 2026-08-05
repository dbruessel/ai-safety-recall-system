import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Modular Sub-Component Imports
import { AccountMenu } from './AccountMenu';
import { UnderwriterReportView } from './UnderwriterReportView';
import { TaskDrawerModal } from './TaskDrawerModal';
import { SingleVinScanModal } from './SingleVinScanModal';
import { BulkCsvImportModal } from './BulkCsvImportModal';
import { PricingUpgradeModal } from './PricingUpgradeModal';
import { TeamManagementModal } from './TeamManagementModal';

// Shared Types
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

// Supabase Client Initialization
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const TaskBoard: React.FC = () => {
  // WORKSPACE STATES
  const [recalls, setRecalls] = useState<TaskboardRecallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'workspace' | 'underwriter'>('workspace');

  // USER & PROFILE STATES
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [userEmail, setUserEmail] = useState<string>('lasvegas_fleet_test@example.com');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('professional');
  const [vinChecksUsed, setVinChecksUsed] = useState<number>(0);

  // MODAL CONTROLS
  const [selectedRecall, setSelectedRecall] = useState<TaskboardRecallItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isScanModalOpen, setIsScanModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);
  const [gateReason, setGateReason] = useState<string>('');

  // FILTER & SORT STATES
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created_at' | 'unit_number' | 'severity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // PERMISSIONS MAP FOR FRONTEND GATING
  const permissions = useMemo(() => {
    const isAdmin = userRole === 'admin';
    const isMechanic = userRole === 'mechanic';
    const isViewer = userRole === 'viewer';

    return {
      canManageBilling: isAdmin,
      canInviteUsers: isAdmin,
      canIngestAssets: isAdmin,
      canExportUnderwriterReport: isAdmin || isViewer,
      canUpdateTaskStatus: isAdmin || isMechanic,
      canUploadReceipts: isAdmin || isMechanic,
      isReadOnly: isViewer,
    };
  }, [userRole]);

  // VEHICLE CAPACITY LIMITS
  const vehicleLimit = useMemo(() => {
    switch (subscriptionTier) {
      case 'free': return 10;
      case 'standard': return 50;
      case 'professional': return 250;
      case 'enterprise': return 999999;
      default: return 10;
    }
  }, [subscriptionTier]);

  // FETCH USER PROFILE & ROLE
  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setUserEmail(user.email || '');
        const { data } = await supabase
          .from('profiles')
          .select('role, subscription_tier')
          .eq('id', user.id)
          .single();
        if (data?.role) setUserRole(data.role as UserRole);
        if (data?.subscription_tier) setSubscriptionTier(data.subscription_tier as SubscriptionTier);
      }
    }
    fetchUserProfile();
  }, []);

  // FETCH RECALL TASKS (WITH RELATIONAL FALLBACK RECOVERY)
  const fetchTaskboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('recall_tasks')
        .select(`
          id, campaign_number, component, summary, remedy, severity_score, status, created_at, proof_of_remedy_url, closed_by_user_email, closed_at,
          monitored_vehicles ( id, vin, make, model, year )
        `);

      let tasksPayload = data;

      if (error || !data || data.length === 0) {
        const { data: rawTasks } = await supabase.from('recall_tasks').select('*');
        const { data: rawVehicles } = await supabase.from('monitored_vehicles').select('*');

        if (rawTasks && rawVehicles) {
          const vehicleMap = new Map(rawVehicles.map(v => [v.id, v]));
          tasksPayload = rawTasks.map(task => ({
            ...task,
            monitored_vehicles: vehicleMap.get(task.vehicle_id) || null
          }));
        }
      }

      const formattedData: TaskboardRecallItem[] = (tasksPayload || []).map((item: any) => {
        const vehicle = Array.isArray(item.monitored_vehicles) ? item.monitored_vehicles[0] : item.monitored_vehicles;

        let severityLabel = 'Medium';
        if (item.severity_score >= 8.5) severityLabel = 'Critical';
        else if (item.severity_score >= 7.0) severityLabel = 'High';
        else if (item.severity_score < 4.0) severityLabel = 'Low';

        let statusLabel = 'Open';
        const rawStatus = (item.status || '').toLowerCase();
        if (rawStatus === 'scheduled' || rawStatus === 'in progress') statusLabel = 'Scheduled';
        else if (rawStatus === 'repaired' || rawStatus === 'cleared' || rawStatus === 'completed') statusLabel = 'Cleared';

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
      console.error('Error fetching taskboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTaskboardData();
  }, []);

  // MEMOIZED FILTERS & METRICS
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
        if (sortBy === 'created_at') comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        else if (sortBy === 'unit_number') comparison = (a.unit_number || '').localeCompare(b.unit_number || '');
        else if (sortBy === 'severity') {
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

  // HANDLERS
  const triggerUpgradeModal = (reason: string) => {
    setGateReason(reason);
    setIsUpgradeModalOpen(true);
  };

  const handleOpenSingleVinConsole = () => {
    if (!permissions.canIngestAssets) return;
    if (subscriptionTier === 'free' || subscriptionTier === 'standard') {
      triggerUpgradeModal('Instant Single-VIN Scan Console is exclusive to Professional & Enterprise plans.');
      return;
    }
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

  const handleExportCSV = () => {
    if (filteredRecalls.length === 0) return;
    const headers = ['Unit Number', 'VIN', 'Year', 'Make', 'Model', 'Component', 'NHTSA Campaign', 'Severity', 'Status', 'Receipt URL'];
    const rows = filteredRecalls.map((r) => [
      `"${r.unit_number || ''}"`, `"${r.vin || ''}"`, r.year, `"${r.make || ''}"`, `"${r.model || ''}"`,
      `"${r.component || ''}"`, `"${r.nhtsa_campaign_number || ''}"`, `"${r.severity || ''}"`, `"${r.status || ''}"`, `"${r.receipt_url || ''}"`,
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans relative text-slate-100">
      
      {/* WORKSPACE HEADER & TAB SWITCHER */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 text-gray-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'underwriter' ? 'Underwriter Compliance & Risk Portal' : 'Fleet Recall Operations'}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {activeTab === 'underwriter'
              ? 'Executive risk metrics and audit-grade proof of recall remediation for insurance carriers.'
              : 'Monitor, filter, and schedule safety recall remedies across active fleet assets.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setActiveTab('workspace')}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                activeTab === 'workspace' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Task Board
            </button>
            {permissions.canExportUnderwriterReport && (
              <button
                type="button"
                onClick={() => setActiveTab('underwriter')}
                className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                  activeTab === 'underwriter' ? 'bg-cyan-500 text-slate-950 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🛡️ Underwriter Audit
              </button>
            )}
          </div>

          {activeTab === 'workspace' && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📄</span> Risk Certificate
              </button>
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3.5 py-2 bg-gray-900 hover:bg-gray-800 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>📊</span> Export CSV
              </button>
            </div>
          )}
        </div>
      </div>

      {/* RENDER ACTIVE VIEW */}
      {activeTab === 'underwriter' ? (
        <UnderwriterReportView tasks={recalls} />
      ) : (
        <>
          {/* KPI STATS BAR */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-gray-900">
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

          {/* FILTER & CONTROL BAR */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 space-y-3 text-gray-900">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:flex-1 max-w-xl">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">🔍</span>
                <input
                  type="text"
                  placeholder="Search by Unit #, VIN, Make, Model, or NHTSA ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-500 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm transition"
                />
              </div>

              {permissions.canIngestAssets ? (
                <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                  <button
                    type="button"
                    onClick={handleOpenSingleVinConsole}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer"
                  >
                    ⚡ Single-VIN Scan
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm transition whitespace-nowrap cursor-pointer"
                  >
                    📥 Bulk CSV Import
                  </button>
                </div>
              ) : (
                <span className="text-xs font-mono text-slate-500 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-lg font-bold">
                  {userRole === 'mechanic' ? '🔧 Mechanic Operational View' : '👁️ Read-Only Auditor View'}
                </span>
              )}
            </div>

            <div className="border-t border-gray-100 my-1"></div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1">Filter By:</span>
                <select
                  value={selectedMake}
                  onChange={(e) => setSelectedMake(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold cursor-pointer"
                >
                  <option value="All">All Makes</option>
                  {uniqueMakes.filter((m) => m !== 'All').map((make) => (
                    <option key={make} value={make}>{make}</option>
                  ))}
                </select>

                <select
                  value={selectedSeverity}
                  onChange={(e) => setSelectedSeverity(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold cursor-pointer"
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
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-semibold cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Scheduled">Scheduled</option>
                  <option value="Cleared">Cleared</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white text-gray-700 font-bold cursor-pointer"
                >
                  <option value="created_at">Sort by Date</option>
                  <option value="severity">Sort by Severity</option>
                  <option value="unit_number">Sort by Unit #</option>
                </select>
                <button
                  type="button"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 border border-gray-300 rounded-lg text-xs bg-gray-50 hover:bg-gray-100 transition text-gray-600 font-bold shadow-sm cursor-pointer"
                >
                  {sortOrder === 'desc' ? '⬇️' : '⬆️'}
                </button>
              </div>
            </div>
          </div>

          {/* TASK TABLE */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200/80 overflow-hidden text-gray-900">
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
                        <td className="p-4 font-bold text-gray-900">Unit #{item.unit_number || 'Unassigned'}</td>
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
                            item.severity === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {item.severity}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-semibold ${
                            item.status === 'Cleared' ? 'bg-emerald-100 text-emerald-700' :
                            item.status === 'Scheduled' ? 'bg-amber-100 text-amber-700' : 'bg-red-50 text-red-600'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.receipt_url ? (
                            <a href={item.receipt_url} target="_blank" rel="noreferrer" className="text-xs text-emerald-600 font-semibold hover:underline">
                              🧾 Verified Invoice
                            </a>
                          ) : (
                            <span className="text-xs text-gray-400">No document</span>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecall(item);
                              setIsDrawerOpen(true);
                            }}
                            className="px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 font-semibold text-xs rounded-lg transition cursor-pointer"
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

      {/* ALL MODAL OVERLAYS */}
      <TaskDrawerModal
        isOpen={isDrawerOpen}
        selectedRecall={selectedRecall}
        userRole={userRole}
        userEmail={userEmail}
        permissions={permissions}
        onClose={() => setIsDrawerOpen(false)}
        onTaskUpdated={(updated) => {
          setRecalls((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setSelectedRecall(updated);
        }}
      />

      <SingleVinScanModal
        isOpen={isScanModalOpen}
        currentFleetCount={recalls.length}
        vehicleLimit={vehicleLimit}
        onClose={() => setIsScanModalOpen(false)}
        onSuccess={fetchTaskboardData}
        onTriggerUpgrade={triggerUpgradeModal}
        onIncrementVinChecks={() => setVinChecksUsed((prev) => prev + 1)}
      />

      <BulkCsvImportModal
        isOpen={isImportModalOpen}
        currentFleetCount={recalls.length}
        vehicleLimit={vehicleLimit}
        subscriptionTier={subscriptionTier}
        onClose={() => setIsImportModalOpen(false)}
        onSuccess={fetchTaskboardData}
      />

      <PricingUpgradeModal
        isOpen={isUpgradeModalOpen}
        gateReason={gateReason}
        onClose={() => setIsUpgradeModalOpen(false)}
        onSelectTier={setSubscriptionTier}
      />

      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
};

export default TaskBoard;