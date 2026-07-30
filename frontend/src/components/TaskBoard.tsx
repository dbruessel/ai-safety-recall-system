import React, { useState, useMemo, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase directly using Vite environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ==========================================
// TYPES & INTERFACES
// ==========================================
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
}

export const TaskBoard: React.FC = () => {
  // ==========================================
  // STATE MANAGEMENT
  // ==========================================
  const [recalls, setRecalls] = useState<TaskboardRecallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedRecall, setSelectedRecall] = useState<TaskboardRecallItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

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

  // ==========================================
  // DIRECT SUPABASE FETCHING
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
          monitored_vehicles!inner (
            vin,
            make,
            model,
            year,
            profile_id
          )
        `)
        .eq('monitored_vehicles.profile_id', '07136e5d-0b6e-4ccf-b774-c2f3f01154bf');

      if (error) throw error;

      // Transform raw Supabase rows to UI TaskboardRecallItem type
      const formattedData: TaskboardRecallItem[] = (data || []).map((item: any) => {
        const vehicle = item.monitored_vehicles;
        
        // Severity mapping logic based on score
        let severityLabel = 'Medium';
        if (item.severity_score >= 8.5) severityLabel = 'Critical';
        else if (item.severity_score >= 7.0) severityLabel = 'High';
        else if (item.severity_score < 4.0) severityLabel = 'Low';

        // Status mapping to match UI badges & KPI metrics
        let statusLabel = 'Open';
        const rawStatus = (item.status || '').toLowerCase();
        if (rawStatus === 'scheduled' || rawStatus === 'in progress') statusLabel = 'Scheduled';
        else if (rawStatus === 'repaired' || rawStatus === 'cleared') statusLabel = 'Cleared';
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
          created_at: item.created_at
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

  // Fleet Resolution & Risk KPIs
  const metrics = useMemo(() => {
    const total = recalls.length;
    const open = recalls.filter((r) => r.status === 'Open').length;
    const scheduled = recalls.filter((r) => r.status === 'Scheduled' || r.status === 'In Progress').length;
    const cleared = recalls.filter((r) => r.status === 'Cleared').length;
    const safeRate = total > 0 ? Math.round((cleared / total) * 100) : 100;

    return { total, open, scheduled, cleared, safeRate };
  }, [recalls]);

  // ==========================================
  // HANDLERS & ACTIONS
  // ==========================================
  const handleOpenDrawer = (item: TaskboardRecallItem) => {
    setSelectedRecall(item);
    setScheduledDateInput(item.scheduled_date || '');
    setNotesInput(item.repair_notes || '');
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setSelectedRecall(null);
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedRecall) return;
    try {
      setUpdatingStatus(true);
      
      // Map UI status back to DB constrained status string ('pending', 'scheduled', 'repaired')
      let dbStatus = 'pending';
      if (newStatus === 'Scheduled' || newStatus === 'In Progress') dbStatus = 'scheduled';
      if (newStatus === 'Cleared') dbStatus = 'repaired';

      const { error } = await supabase
        .from('recall_tasks')
        .update({
          status: dbStatus,
          scheduled_repair_date: scheduledDateInput || null,
        })
        .eq('id', selectedRecall.id);

      if (error) throw error;

      // Update UI state locally
      setRecalls((prev) =>
        prev.map((r) =>
          r.id === selectedRecall.id
            ? { ...r, status: newStatus, scheduled_date: scheduledDateInput, repair_notes: notesInput }
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
            }
          : null
      );
    } catch (err) {
      console.error('Failed to update status in Supabase:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecalls.length === 0) return;
    const headers = ['Unit Number', 'VIN', 'Year', 'Make', 'Model', 'Component', 'NHTSA Campaign', 'Severity', 'Status'];
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

  const handleDownloadPDF = () => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
    window.open(`${baseUrl}/api/broker/compliance-report/FLT-1001/pdf?broker_name=Aon%20Risk%20Solutions`, '_blank');
  };

  // ==========================================
  // RENDER UI
  // ==========================================
  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto font-sans bg-gray-50 min-h-screen">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fleet Recall Operations</h1>
          <p className="text-sm text-gray-500">Monitor, filter, and schedule safety recall remedies across active fleet assets.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleDownloadPDF}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>📄</span> Download Risk Certificate (PDF)
          </button>
          <button
            onClick={handleExportCSV}
            className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold rounded-lg shadow-sm transition flex items-center gap-2"
          >
            <span>📥</span> Export CSV Report
          </button>
        </div>
      </div>

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
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Cleared / Cleared</p>
          <p className="text-3xl font-extrabold text-emerald-600 mt-1">{metrics.cleared}</p>
          <span className="text-xs text-emerald-600 font-medium">Verified completed repairs</span>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200/80">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fleet Safety Score</p>
          <p className="text-3xl font-extrabold text-blue-600 mt-1">{metrics.safeRate}%</p>
          <span className="text-xs text-blue-500 font-medium">Overall fleet compliance</span>
        </div>
      </div>

      {/* 2. MULTI-DIMENSIONAL FILTER CONTROL BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200/80 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full lg:w-96">
            <input
              type="text"
              placeholder="Search Unit #, VIN, Model, NHTSA ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-3 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 focus:bg-white transition"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-end">
            <select
              value={selectedMake}
              onChange={(e) => setSelectedMake(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Makes</option>
              {uniqueMakes.filter((m) => m !== 'All').map((make) => (
                <option key={make} value={make}>{make}</option>
              ))}
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
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
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 font-medium focus:ring-2 focus:ring-blue-500"
            >
              <option value="All">All Statuses</option>
              <option value="Open">Open</option>
              <option value="Scheduled">Scheduled</option>
              <option value="In Progress">In Progress</option>
              <option value="Cleared">Cleared</option>
            </select>

            <div className="h-6 w-px bg-gray-200 hidden sm:block mx-1"></div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-700 font-semibold focus:ring-2 focus:ring-blue-500"
            >
              <option value="created_at">Sort by Date</option>
              <option value="severity">Sort by Severity</option>
              <option value="unit_number">Sort by Unit #</option>
            </select>

            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="p-2 border border-gray-300 rounded-lg text-sm bg-gray-50 hover:bg-gray-100 transition text-gray-600 font-bold"
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

      {/* 4. RECALL MANAGEMENT DRAWER MODAL */}
      {isDrawerOpen && selectedRecall && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-sm flex justify-end">
          <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              {/* Drawer Header */}
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

              {/* Recall Safety Details */}
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

              {/* Action Form */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-900">Update Remedy Status</h3>
                
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Appointment Date</label>
                  <input
                    type="date"
                    value={scheduledDateInput}
                    onChange={(e) => setScheduledDateInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Fleet Notes / Repair Invoice #</label>
                  <textarea
                    rows={3}
                    placeholder="Add dealership invoice numbers, technician notes, or service location details..."
                    value={notesInput}
                    onChange={(e) => setNotesInput(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="border-t pt-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleUpdateStatus('Scheduled')}
                  disabled={updatingStatus}
                  className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition"
                >
                  Mark Scheduled
                </button>
                <button
                  onClick={() => handleUpdateStatus('In Progress')}
                  disabled={updatingStatus}
                  className="py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition"
                >
                  In Progress
                </button>
                <button
                  onClick={() => handleUpdateStatus('Cleared')}
                  disabled={updatingStatus}
                  className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition"
                >
                  Mark Cleared
                </button>
              </div>
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
    </div>
  );
};

export default TaskBoard;