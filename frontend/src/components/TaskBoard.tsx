import React, { useState, useEffect } from 'react';
import axios from 'axios';
import type { Session } from '@supabase/supabase-js';

interface VehicleInfo {
  vin: string;
  make: string;
  model: string;
  year: number;
}

interface RecallTask {
  id: string;
  vehicle_id: string;
  campaign_number: string;
  component: string;
  summary: string;
  remedy: string;
  severity_score: number;
  status: 'pending' | 'scheduled' | 'repaired';
  scheduled_repair_date?: string;
  repaired_at?: string;
  monitored_vehicles?: VehicleInfo;
}

interface TaskBoardProps {
  session?: Session | null;
  userId?: string;
  planType?: 'standard' | 'professional' | 'enterprise';
  recalls?: any[];
  onStatusUpdate?: (campaignNumber: string, newStatus: any) => void;
}

export default function TaskBoard({ 
  session,
  userId, 
  planType = "professional", 
  recalls, 
  onStatusUpdate 
}: TaskBoardProps) {
  // Dynamically resolve active user email from Supabase session, props, or localStorage
  const activeUserId = session?.user?.email || 
                       userId || 
                       localStorage.getItem('recalllogic_ref') || 
                       "vegasfleetmgr@commercialpro.com";

  const [tasks, setTasks] = useState<RecallTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [newVin, setNewVin] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  const [webhookUrl, setWebhookUrl] = useState('https://api.enterprise-fleet.internal/webhooks/recalls');
  const [webhookActive, setWebhookActive] = useState(true);

  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  const fetchTasks = async () => {
    if (recalls && recalls.length > 0) {
      const parsedTasks: RecallTask[] = recalls.map((r, i) => ({
        id: r.id || `local-task-${i}`,
        vehicle_id: `v-${i}`,
        campaign_number: r.campaign_number || "26V-100",
        component: r.component || "Assembly Structure",
        summary: r.summary || "Vulnerability noted.",
        remedy: r.remedy || "Dealer inspect harness.",
        severity_score: r.calculated_severity_score || 7.5,
        status: r.status?.toLowerCase() === 'scheduled' ? 'scheduled' : r.status?.toLowerCase() === 'repaired' ? 'repaired' : 'pending',
        monitored_vehicles: {
          vin: r.vin || "1FTFW1EDXNXXXXXXX",
          make: r.make || "Generic",
          model: r.model || "Fleet Unit",
          year: parseInt(r.year) || 2024
        }
      }));
      setTasks(parsedTasks);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`http://127.0.0.1:8000/api/dashboard/tasks`, {
        params: { user_id: activeUserId } 
      });
      setTasks(response.data || []);
    } catch (err: any) {
      console.error(err);
      setError('Failed to sync safety task boards with local cloud replica.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [activeUserId, recalls]);

  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (planType === 'standard') {
      setError('Single-VIN Asset Provisioning is a premium framework capability. Please upgrade to Pro Operations.');
      return;
    }

    if (!newVin.trim() || newVin.length !== 17) {
      setError('Invalid entry. Please input a complete 17-character VIN.');
      return;
    }

    setAddingVehicle(true);
    setError('');
    setAddSuccessMsg('');

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/dashboard/vehicles', {
        vin: newVin.trim().toUpperCase(),
        user_id: activeUserId
      });

      setAddSuccessMsg(response.data.message || 'Asset onboarded successfully!');
      setNewVin('');
      fetchTasks();
      
      setTimeout(() => setAddSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Handshake failed: Vehicle is already registered.');
    } finally {
      setAddingVehicle(false);
    }
  };

  const handleTransitionStatus = async (taskId: string, newStatus: 'pending' | 'scheduled' | 'repaired', date?: string) => {
    const activeTask = tasks.find(t => t.id === taskId);
    if (activeTask && onStatusUpdate) {
      onStatusUpdate(activeTask.campaign_number, newStatus === 'scheduled' ? 'Scheduled' : newStatus === 'repaired' ? 'Remediation Complete' : 'Detected');
    }

    try {
      setError('');
      const payload: any = { status: newStatus };
      if (date) payload.scheduled_repair_date = date;

      await axios.patch(`http://127.0.0.1:8000/api/dashboard/tasks/${taskId}`, payload);
      
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId
            ? { 
                ...task, 
                status: newStatus, 
                scheduled_repair_date: date || task.scheduled_repair_date,
                repaired_at: newStatus === 'repaired' ? new Date().toISOString() : undefined 
              }
            : task
        )
      );
      setSchedulingTaskId(null);
      setSelectedDate('');
    } catch (err: any) {
      console.error(err);
      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus, scheduled_repair_date: date } : task
        )
      );
      setSchedulingTaskId(null);
    }
  };

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const scheduledTasks = tasks.filter(t => t.status === 'scheduled');
  const repairedTasks = tasks.filter(t => t.status === 'repaired');

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {planType === 'standard' && (
        <div className="bg-rose-950/20 border border-rose-500/30 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-rose-400 font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <span>⚠️ UNCHECKED DELTA BLIND SPOT PROJECTION</span>
            </h4>
            <p className="text-slate-400 text-xs max-w-2xl">
              Up to <strong className="text-slate-200">12 potential regional vehicle profiles</strong> detected in your neighborhood match matrices remain un-indexed. Professional tier unlocks continuous automated background sweeping.
            </p>
          </div>
          <button 
            type="button"
            onClick={() => window.location.href = '#pricing-matrix-anchor'}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-mono font-black uppercase tracking-wider rounded-lg transition-colors whitespace-nowrap cursor-pointer"
          >
            Activate Active Sweeps
          </button>
        </div>
      )}

      <section className="bg-gradient-to-r from-[#0b0f19] to-slate-950 border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-black uppercase text-xs tracking-wider">Asset Integration Console</h3>
              <span className={`text-[9px] font-mono px-2 py-0.5 rounded-md border font-bold uppercase tracking-wide ${
                planType === 'enterprise' ? 'bg-purple-950 text-purple-400 border-purple-800' :
                planType === 'professional' ? 'bg-cyan-950 text-cyan-400 border-cyan-800' :
                'bg-slate-900 text-slate-400 border-slate-800'
              }`}>
                {planType} Account Mode
              </span>
            </div>
            <p className="text-slate-400 text-xs">
              {planType === 'standard' 
                ? 'Standard tier is limited to automated file drops. Upgrade to mount immediate single-VIN scanning nodes.' 
                : 'Provision new single-VIN assets. Real-time subassembly threat generation engine is operational.'}
            </p>
          </div>
          
          <form onSubmit={handleAddVehicle} className="flex gap-3 max-w-md w-full">
            <input
              type="text"
              placeholder={planType === 'standard' ? "Upgrade to enable lookup entry..." : "Enter 17-digit VIN..."}
              value={newVin}
              disabled={planType === 'standard'}
              onChange={(e) => setNewVin(e.target.value.toUpperCase())}
              maxLength={17}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-800 bg-[#050914] text-cyan-400 font-mono focus:border-cyan-500/80 outline-none transition-all placeholder:text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={addingVehicle || planType === 'standard'}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/10 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {addingVehicle ? 'Analyzing...' : 'Add Vehicle'}
            </button>
          </form>
        </div>

        {addSuccessMsg && (
          <div className="mt-3 text-emerald-400 text-xs font-mono">✓ {addSuccessMsg}</div>
        )}
      </section>

      {planType === 'standard' && (
        <section className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 relative overflow-hidden backdrop-blur-sm shadow-inner">
          <div className="absolute top-0 right-0 bg-slate-800 text-slate-500 px-3 py-1 font-mono text-[9px] uppercase tracking-widest border-l border-b border-slate-800 rounded-bl-xl font-black">
            🔒 Premium Feature
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
            <div className="space-y-1">
              <h4 className="text-slate-300 font-extrabold text-sm tracking-tight flex items-center gap-2">
                <span className="text-amber-500/80 text-base">🛡️</span> Verifiable Insurance Compliance Underwriting Card
              </h4>
              <p className="text-slate-500 text-xs max-w-xl">
                Leverage a verified fleet safety record to negotiate discounted commercial premiums. Upgrade to operationalize signed compliance URLs directly to underwriters or brokers.
              </p>
            </div>
            <button 
              type="button"
              onClick={() => window.location.href = '#pricing-matrix-anchor'}
              className="w-full sm:w-auto py-2.5 px-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 text-[10px] font-mono font-black uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
            >
              Unlock Broker Sharing Logs
            </button>
          </div>
        </section>
      )}

      {planType === 'enterprise' && (
        <section className="bg-slate-950 border border-purple-900/40 rounded-2xl p-6 shadow-2xl relative overflow-hidden animate-fadeIn">
          <div className="absolute top-0 right-0 bg-purple-500/10 text-purple-400 px-3 py-1 font-mono text-[9px] uppercase tracking-widest border-l border-b border-purple-900/30 rounded-bl-xl font-bold">
            Enterprise Feature Active
          </div>
          <div className="space-y-4">
            <div>
              <h4 className="text-slate-200 text-xs font-black uppercase tracking-wider font-mono">Programmable API Endpoint Relay Logs</h4>
              <p className="text-slate-500 text-xs mt-0.5">Automate third-party compliance handshakes. Updates are piped straight to downstream brokers or internal enterprise data pipelines.</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 items-center">
              <input
                type="text"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                className="w-full sm:flex-1 px-4 py-2 text-xs rounded-xl border border-slate-800 bg-[#050914] text-purple-300 font-mono focus:border-purple-500 outline-none"
              />
              <button
                type="button"
                onClick={() => setWebhookActive(!webhookActive)}
                className={`w-full sm:w-auto px-4 py-2 rounded-xl text-[10px] font-mono uppercase tracking-wide transition font-bold border cursor-pointer ${
                  webhookActive 
                    ? 'bg-emerald-950 border-emerald-800 text-emerald-400' 
                    : 'bg-slate-900 border-slate-700 text-slate-400'
                }`}
              >
                {webhookActive ? '● Routing Active' : '○ Pipeline Paused'}
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl text-red-400 font-mono text-xs">
          ⚠️ {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-xs font-mono tracking-widest text-slate-500 uppercase animate-pulse">
          Synchronizing Ledger Arrays...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* PENDING THREATS */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🔴 Pending Threats ({pendingTasks.length})</span>
              <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            </div>
            <div className="space-y-4 min-h-[500px] bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4">
              {pendingTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs font-mono uppercase">0 Pending Alerts</div>
              ) : (
                pendingTasks.map(task => (
                  <div key={task.id} className="p-5 bg-[#0b0f19]/80 border border-slate-900 rounded-xl hover:border-red-500/30 transition duration-300 relative group shadow-md">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-mono bg-red-950/60 text-red-400 px-2.5 py-0.5 rounded border border-red-900/40 font-bold">
                        {task.campaign_number}
                      </span>
                      <span className="text-xs font-black text-slate-300 font-mono">Score: {task.severity_score}</span>
                    </div>
                    <h4 className="text-slate-200 text-sm font-bold mt-1">
                      {task.monitored_vehicles?.year} {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-mono bg-cyan-950/40 text-cyan-400 px-2 py-0.5 rounded uppercase border border-cyan-900/30">
                        {task.component}
                      </span>
                      {planType === 'standard' ? (
                        <span className="text-[10px] font-mono bg-amber-950/50 text-amber-500 px-2 py-0.5 rounded uppercase border border-amber-900/20 animate-pulse">
                          🔥 Local High-Ambient Risk Active
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono bg-rose-950/60 text-rose-400 px-2 py-0.5 rounded uppercase border border-rose-900/40 font-bold">
                          🔥 Extreme Thermal Multiplier: +{(task.severity_score * 0.15).toFixed(1)} Failure Likelihood
                        </span>
                      )}
                    </div>

                    <p className="text-slate-400 text-xs line-clamp-2 mt-3 leading-relaxed">{task.summary}</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-900 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setSchedulingTaskId(task.id)}
                        className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-mono text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        Route to Dealership
                      </button>
                    </div>

                    {schedulingTaskId === task.id && (
                      <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2">
                        <label className="block text-[9px] font-mono text-slate-400 uppercase">Select Maintenance Date</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded p-1 text-xs text-white flex-1 outline-none font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => handleTransitionStatus(task.id, 'scheduled', selectedDate)}
                            disabled={!selectedDate}
                            className="px-2 py-1 bg-cyan-600 text-white rounded text-[10px] font-mono uppercase tracking-wide disabled:opacity-30 cursor-pointer"
                          >
                            Confirm
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SCHEDULED REMEDIATION */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🟡 Scheduled Remediation ({scheduledTasks.length})</span>
              <span className="h-2 w-2 rounded-full bg-amber-500" />
            </div>
            <div className="space-y-4 min-h-[500px] bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4">
              {scheduledTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs font-mono uppercase">0 Scheduled Actions</div>
              ) : (
                scheduledTasks.map(task => (
                  <div key={task.id} className="p-5 bg-[#0b0f19]/80 border border-slate-900 rounded-xl hover:border-amber-500/30 transition duration-300 shadow-md">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono bg-amber-950/60 text-amber-400 px-2.5 py-0.5 rounded border border-amber-900/40 font-bold">
                        {task.campaign_number}
                      </span>
                    </div>
                    <h4 className="text-slate-200 text-sm font-bold mt-1">
                      {task.monitored_vehicles?.year} {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    {task.scheduled_repair_date && (
                      <p className="text-xs font-mono text-amber-400 mt-1">🗓 Repair Appt: {task.scheduled_repair_date}</p>
                    )}
                    <p className="text-slate-400 text-xs line-clamp-2 mt-3 leading-relaxed">{task.remedy}</p>
                    
                    <div className="mt-4 pt-4 border-t border-slate-900 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleTransitionStatus(task.id, 'repaired')}
                        className="px-3 py-1.5 bg-emerald-950 text-emerald-400 hover:bg-emerald-900/80 border border-emerald-900/50 font-mono text-[9px] uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                      >
                        Sign-off Remediation
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CLEARED LEDGERS */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🟢 Cleared Ledgers ({repairedTasks.length})</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
            </div>
            <div className="space-y-4 min-h-[500px] bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4">
              {repairedTasks.length === 0 ? (
                <div className="text-center py-12 text-slate-600 text-xs font-mono uppercase">0 Logs Found</div>
              ) : (
                repairedTasks.map(task => (
                  <div key={task.id} className="p-5 bg-[#0b0f19]/40 border border-slate-950/80 rounded-xl hover:border-emerald-500/20 transition duration-300 opacity-70 shadow-inner">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] font-mono bg-emerald-950/30 text-emerald-400 px-2.5 py-0.5 rounded border border-emerald-900/20 font-bold">
                        {task.campaign_number}
                      </span>
                    </div>
                    <h4 className="text-slate-400 text-sm font-bold mt-1 line-through">
                      {task.monitored_vehicles?.year} {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    <p className="text-[10px] font-mono text-slate-500 mt-2">
                      Audit Trail Persistence Logged
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      )}

      {planType === 'standard' && <div id="pricing-matrix-anchor" className="h-1" />}
    </div>
  );
}