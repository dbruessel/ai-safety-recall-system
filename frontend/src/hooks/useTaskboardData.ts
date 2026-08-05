import { useState, useEffect, useMemo, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useTaskboardData() {
  // DATA & USER STATES
  const [recalls, setRecalls] = useState<TaskboardRecallItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [userEmail, setUserEmail] = useState<string>('lasvegas_fleet_test@example.com');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('professional');
  const [vinChecksUsed, setVinChecksUsed] = useState<number>(0);

  // FILTER & SORT STATES
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedMake, setSelectedMake] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('All');
  const [sortBy, setSortBy] = useState<'created_at' | 'unit_number' | 'severity'>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // PERMISSIONS MAP
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

  // VEHICLE LIMIT BASED ON SUBSCRIPTION
  const vehicleLimit = useMemo(() => {
    switch (subscriptionTier) {
      case 'free': return 10;
      case 'standard': return 50;
      case 'professional': return 250;
      case 'enterprise': return 999999;
      default: return 10;
    }
  }, [subscriptionTier]);

  // FETCH USER PROFILE
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

  // FETCH TASKBOARD DATA
  const fetchTaskboardData = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchTaskboardData();
  }, [fetchTaskboardData]);

  // DERIVED MEMOIZED VALUES
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

  return {
    recalls,
    setRecalls,
    loading,
    userRole,
    setUserRole,
    userEmail,
    currentUserId,
    subscriptionTier,
    setSubscriptionTier,
    vinChecksUsed,
    setVinChecksUsed,
    searchTerm,
    setSearchTerm,
    selectedMake,
    setSelectedMake,
    selectedStatus,
    setSelectedStatus,
    selectedSeverity,
    setSelectedSeverity,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    uniqueMakes,
    filteredRecalls,
    metrics,
    permissions,
    vehicleLimit,
    refetchTaskboardData: fetchTaskboardData,
  };
}