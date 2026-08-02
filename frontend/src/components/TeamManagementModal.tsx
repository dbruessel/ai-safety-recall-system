import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase Client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'mechanic' | 'viewer';
  created_at?: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
}

export function TeamManagementModal({ isOpen, onClose, currentUserId }: TeamManagementModalProps) {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all team profiles
  const fetchTeamMembers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      setMessage({ type: 'error', text: 'Failed to load team members.' });
    } else {
      setTeamMembers(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
      setMessage(null);
    }
  }, [isOpen]);

  // Update a team member's role
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'mechanic' | 'viewer') => {
    setUpdatingId(memberId);
    setMessage(null);

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      setMessage({ type: 'error', text: 'Failed to update user role.' });
    } else {
      setTeamMembers(prev =>
        prev.map(member => (member.id === memberId ? { ...member, role: newRole } : member))
      );
      setMessage({ type: 'success', text: 'Role permissions updated successfully.' });
    }
    setUpdatingId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
        
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/50">
          <div>
            <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest font-bold">
              Enterprise Risk & Compliance
            </span>
            <h3 className="text-lg font-bold text-white font-mono">Team Access Control & Roles</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm font-mono px-2 py-1 rounded-lg hover:bg-slate-800 transition"
          >
            ✕ Close
          </button>
        </div>

        {/* CONTENT BODY */}
        <div className="p-6 space-y-6">
          {message && (
            <div
              className={`p-3 rounded-xl text-xs font-mono ${
                message.type === 'success'
                  ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              {message.text}
            </div>
          )}

          <div className="space-y-1">
            <h4 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Organization Members ({teamMembers.length})
            </h4>
            <p className="text-xs text-slate-400">
              Manage operational boundaries for fleet risk officers, mechanics, and external auditors.
            </p>
          </div>

          {loading ? (
            <div className="text-center py-8 text-xs font-mono text-slate-500 animate-pulse">
              Loading team directory...
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {teamMembers.map((member) => {
                const isSelf = member.id === currentUserId;
                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl hover:border-slate-700 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{member.email}</span>
                        {isSelf && (
                          <span className="bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono px-2 py-0.5 rounded-md">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-mono text-slate-500">
                        ID: {member.id.slice(0, 12)}...
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <select
                        disabled={isSelf || updatingId === member.id}
                        value={member.role || 'mechanic'}
                        onChange={(e) =>
                          handleRoleChange(member.id, e.target.value as 'admin' | 'mechanic' | 'viewer')
                        }
                        className="bg-slate-900 text-xs font-mono text-cyan-400 border border-slate-700 rounded-xl px-3 py-2 focus:outline-none focus:border-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <option value="admin">Admin (Full Control & Billing)</option>
                        <option value="mechanic">Mechanic (Tasks & Receipts)</option>
                        <option value="viewer">Viewer (Read Only)</option>
                      </select>

                      {updatingId === member.id && (
                        <span className="text-[10px] font-mono text-cyan-400 animate-spin">
                          🌀
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* PERMISSION MATRIX LEGEND */}
          <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-[11px] font-mono text-slate-400 space-y-2">
            <span className="text-xs font-bold text-slate-300">Role Capabilities Summary:</span>
            <ul className="list-disc list-inside space-y-1 text-[10px]">
              <li>
                <strong className="text-cyan-400">Admin:</strong> Complete platform access, Stripe billing management, user management, and PDF report exports.
              </li>
              <li>
                <strong className="text-amber-400">Mechanic:</strong> Operational access only—can view tasks, update repair statuses, and upload repair receipts. Cannot delete assets or change billing.
              </li>
              <li>
                <strong className="text-slate-400">Viewer:</strong> Read-only access for insurance agents or fleet auditing partners.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}