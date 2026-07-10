import React, { useState, useEffect } from 'react';
import axios from 'axios';

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
  monitored_vehicles?: VehicleInfo; // Joined from our PostgreSQL relation
}

interface TaskBoardProps {
  userId: string; // Dynamic user profile mapping
}

export default function TaskBoard({ userId }: TaskBoardProps) {
  const [tasks, setTasks] = useState<RecallTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // New Vehicle Input States
  const [newVin, setNewVin] = useState('');
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Date selection state for scheduling
  const [schedulingTaskId, setSchedulingTaskId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState('');

  // 1. Fetch tasks on mount
  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await axios.get(`http://127.0.0.1:8000/api/dashboard/tasks`, {
        params: { user_id: userId }
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
  }, [userId]);

  // 2. Handle adding a new vehicle & scanning in real-time
  const handleAddVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
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
        user_id: userId
      });

      setAddSuccessMsg(response.data.message || 'Asset added successfully!');
      setNewVin('');
      fetchTasks(); // Reload board with newly scanned database task cards
      
      // Auto-clear success message
      setTimeout(() => setAddSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Handshake failed: Vehicle is already registered.');
    } finally {
      setAddingVehicle(false);
    }
  };

  // 3. Handle task column transitions (Kanban updates)
  const handleTransitionStatus = async (taskId: string, newStatus: 'pending' | 'scheduled' | 'repaired', date?: string) => {
    try {
      setError('');
      const payload: any = { status: newStatus };
      if (date) payload.scheduled_repair_date = date;

      await axios.patch(`http://127.0.0.1:8000/api/dashboard/tasks/${taskId}`, payload);
      
      // Optimistic state update for instant, frictionless UI transition
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
      setError('Failed to update task state. Please try again.');
    }
  };

  // Filter tasks into their respective Kanban columns
  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const scheduledTasks = tasks.filter(t => t.status === 'scheduled');
  const repairedTasks = tasks.filter(t => t.status === 'repaired');

  return (
    <div className="space-y-8 animate-fadeIn">
      
      {/* 🟢 TOP CONSOLE: On-board New Assets Directly Into Dashboard */}
      <section className="bg-gradient-to-r from-[#0b0f19] to-slate-950 border border-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-white font-black uppercase text-xs tracking-wider">Asset Integration Console</h3>
            <p className="text-slate-400 text-xs">Onboard new vehicles. Our background worker will automatically scan, decode, and generate task cards.</p>
          </div>
          
          <form onSubmit={handleAddVehicle} className="flex gap-3 max-w-md w-full">
            <input
              type="text"
              placeholder="Enter 17-digit VIN..."
              value={newVin}
              onChange={(e) => setNewVin(e.target.value.toUpperCase())}
              maxLength={17}
              className="flex-1 px-4 py-2 text-xs rounded-xl border border-slate-800 bg-[#050914] text-cyan-400 font-mono focus:border-cyan-500/80 outline-none transition-all placeholder:text-slate-700"
            />
            <button
              type="submit"
              disabled={addingVehicle}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-[10px] tracking-wider rounded-xl transition shadow-lg shadow-cyan-500/10 disabled:opacity-50"
            >
              {addingVehicle ? 'Analyzing...' : 'Add Vehicle'}
            </button>
          </form>
        </div>

        {addSuccessMsg && (
          <div className="mt-3 text-emerald-400 text-xs font-mono">✓ {addSuccessMsg}</div>
        )}
      </section>

      {/* ⚠️ SYSTEM MESSAGES BANNER */}
      {error && (
        <div className="p-4 bg-red-950/10 border border-red-900/30 rounded-xl text-red-400 font-mono text-xs">
          ⚠️ {error}
        </div>
      )}

      {/* 📊 THE THREE-COLUMN KANBAN BOARD */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ========================================== */}
        {/* COLUMN 1: PENDING THREATS                  */}
        {/* ========================================== */}
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
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20 uppercase font-mono tracking-wider">
                      Severity {task.severity_score}/100
                    </span>
                    <h4 className="text-white font-black text-sm uppercase mt-1">
                      {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    <p className="text-slate-500 text-[10px] font-mono">VIN: {task.monitored_vehicles?.vin}</p>
                    
                    <div className="text-slate-400 text-xs font-medium space-y-1.5 pt-2 border-t border-slate-900">
                      <p><span className="text-slate-500 uppercase text-[9px] font-bold font-mono">Component:</span> {task.component}</p>
                      <p className="text-slate-400 leading-normal line-clamp-3">{task.summary}</p>
                    </div>

                    {/* Schedule Interface Action Drawer */}
                    {schedulingTaskId === task.id ? (
                      <div className="space-y-2 pt-3 border-t border-slate-900">
                        <label className="text-[9px] text-slate-500 uppercase font-mono font-bold block">Appointment Date:</label>
                        <div className="flex gap-2">
                          <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="flex-1 px-2 py-1.5 text-xs rounded-lg border border-slate-800 bg-[#050914] text-cyan-400 font-mono outline-none"
                          />
                          <button
                            onClick={() => handleTransitionStatus(task.id, 'scheduled', selectedDate)}
                            disabled={!selectedDate}
                            className="px-3 py-1 bg-amber-500 text-slate-950 font-black uppercase text-[9px] rounded-lg disabled:opacity-40"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="pt-3 border-t border-slate-900">
                        <button
                          onClick={() => setSchedulingTaskId(task.id)}
                          className="w-full py-2 bg-slate-900 hover:bg-slate-850 text-amber-400 border border-slate-800 font-black uppercase text-[10px] tracking-wider rounded-lg transition"
                        >
                          🗓️ Schedule Dealership Fix
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* COLUMN 2: SCHEDULED REPAIRS                */}
        {/* ========================================== */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🟡 Scheduled Repairs ({scheduledTasks.length})</span>
            <span className="h-2 w-2 rounded-full bg-amber-500" />
          </div>

          <div className="space-y-4 min-h-[500px] bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4">
            {scheduledTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-mono uppercase">0 Scheduled Repairs</div>
            ) : (
              scheduledTasks.map(task => (
                <div key={task.id} className="p-5 bg-[#0b0f19]/80 border border-slate-900 rounded-xl hover:border-amber-500/30 transition duration-300 shadow-md">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase font-mono tracking-wider">
                        Scheduled
                      </span>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">{task.scheduled_repair_date}</span>
                    </div>
                    
                    <h4 className="text-white font-black text-sm uppercase">
                      {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    <p className="text-slate-500 text-[10px] font-mono">VIN: {task.monitored_vehicles?.vin}</p>

                    <div className="text-slate-400 text-xs font-medium space-y-1.5 pt-2 border-t border-slate-900">
                      <p><span className="text-slate-500 uppercase text-[9px] font-bold font-mono">Dealership Remedy:</span> {task.remedy}</p>
                    </div>

                    <div className="pt-3 border-t border-slate-900">
                      <button
                        onClick={() => handleTransitionStatus(task.id, 'repaired')}
                        className="w-full py-2 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 font-black uppercase text-[10px] tracking-wider rounded-lg transition"
                      >
                        ✓ Mark Repair Complete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ========================================== */}
        {/* COLUMN 3: RESOLVED & SECURED               */}
        {/* ========================================== */}
        <div className="space-y-4">
          <div className="flex justify-between items-center px-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">🟢 Resolved & Secured ({repairedTasks.length})</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
          </div>

          <div className="space-y-4 min-h-[500px] bg-slate-950/20 border border-slate-900/40 rounded-2xl p-4">
            {repairedTasks.length === 0 ? (
              <div className="text-center py-12 text-slate-600 text-xs font-mono uppercase">0 Resolved Records</div>
            ) : (
              repairedTasks.map(task => (
                <div key={task.id} className="p-5 bg-[#0b0f19]/80 border border-slate-900 rounded-xl hover:border-emerald-500/30 transition duration-300 shadow-md">
                  <div className="space-y-2">
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 uppercase font-mono tracking-wider">
                      Secured
                    </span>
                    
                    <h4 className="text-white font-black text-sm uppercase">
                      {task.monitored_vehicles?.make} {task.monitored_vehicles?.model}
                    </h4>
                    <p className="text-slate-500 text-[10px] font-mono font-bold">VIN: {task.monitored_vehicles?.vin}</p>

                    <div className="pt-3 border-t border-slate-900 text-slate-500 font-mono text-[9px] space-y-1">
                      <p className="text-emerald-500 font-bold">✓ Audit Clearance Logged</p>
                      <p>Time: {task.repaired_at ? new Date(task.repaired_at).toLocaleDateString() : 'Instant'}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}