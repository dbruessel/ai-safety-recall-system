import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'mechanic' | 'viewer';

export interface TeamMember {
  id: string;
  email: string;
  role: UserRole;
  created_at?: string;
}

export interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId?: string;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  currentUserId,
}) => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Invite Form States
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<UserRole>('mechanic');
  const [inviting, setInviting] = useState<boolean>(false);
  const [inviteFeedback, setInviteFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // FETCH MEMBERS
  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: fetchErr } = await supabase
        .from('profiles')
        .select('id, email, role, created_at');

      if (fetchErr) throw fetchErr;

      if (data) {
        setMembers(data as TeamMember[]);
      }
    } catch (err: any) {
      console.error('Failed to load team members:', err);
      setError('Failed to load team members.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // INVITE / CREATE MEMBER
  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    try {
      setInviting(true);
      setInviteFeedback(null);

      // Upsert profile record with assigned role
      const { error: upsertErr } = await supabase
        .from('profiles')
        .upsert(
          {
            email: inviteEmail.trim().toLowerCase(),
            role: inviteRole,
          },
          { onConflict: 'email' }
        );

      if (upsertErr) throw upsertErr;

      setInviteFeedback({
        type: 'success',
        msg: `Successfully added ${inviteEmail} as ${inviteRole.toUpperCase()}.`,
      });
      setInviteEmail('');
      fetchTeamMembers();
    } catch (err: any) {
      console.error('Invite Error:', err);
      setInviteFeedback({
        type: 'error',
        msg: err.message || 'Failed to add team member.',
      });
    } finally {
      setInviting(false);
    }
  };

  // UPDATE MEMBER ROLE
  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', memberId);

      if (updateErr) throw updateErr;

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch (err: any) {
      console.error('Failed to update role:', err);
      alert('Could not update user role.');
    }
  };

  // REMOVE MEMBER
  const handleRemoveMember = async (memberId: string, email: string) => {
    if (!window.confirm(`Are you sure you want to remove ${email} from the workspace?`)) return;

    try {
      const { error: deleteErr } = await supabase
        .from('profiles')
        .delete()
        .eq('id', memberId);

      if (deleteErr) throw deleteErr;

      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err: any) {
      console.error('Failed to delete user:', err);
      alert('Could not remove member.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 text-slate-100 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-6 relative font-mono text-xs">
        
        {/* HEADER */}
        <div className="flex justify-between items-start border-b border-slate-800 pb-4">
          <div>
            <span className="text-[10px] text-cyan-400 uppercase font-bold tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              Enterprise Risk & Compliance
            </span>
            <h2 className="text-xl font-bold text-white font-sans mt-1">Team Access Control & Roles</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white font-bold text-sm cursor-pointer p-1"
          >
            ✕ Close
          </button>
        </div>

        {/* INVITE NEW MEMBER FORM */}
        <form onSubmit={handleInviteMember} className="bg-slate-950 border border-slate-800/80 p-4 rounded-xl space-y-3">
          <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Grant User Access</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              placeholder="operator@fleetcompany.com"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as UserRole)}
              className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2.5 text-slate-200 font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="mechanic">Mechanic</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={inviting || !inviteEmail}
              className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-extrabold uppercase rounded-lg transition disabled:opacity-50 cursor-pointer whitespace-nowrap"
            >
              {inviting ? 'Saving...' : 'Add Member'}
            </button>
          </div>

          {inviteFeedback && (
            <p className={`p-2.5 rounded-lg text-[11px] ${
              inviteFeedback.type === 'error'
                ? 'bg-rose-950/40 border border-rose-900/50 text-rose-400'
                : 'bg-emerald-950/40 border border-emerald-900/50 text-emerald-400'
            }`}>
              {inviteFeedback.type === 'error' ? '⚠️ ' : '✅ '}{inviteFeedback.msg}
            </p>
          )}
        </form>

        {/* MEMBERS LIST TABLE */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
              Organization Members ({members.length})
            </p>
            {loading && <span className="text-cyan-400 animate-pulse text-[10px]">Syncing...</span>}
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-900/50 rounded-lg text-rose-400">
              ⚠️ {error}
            </div>
          )}

          <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950/50 max-h-56 overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[10px] uppercase">
                <tr>
                  <th className="p-3">User Identity</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {members.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={3} className="p-4 text-center text-slate-500">
                      No team profiles found. Use the invite box above to grant access.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-800/40 transition">
                      <td className="p-3">
                        <div className="font-bold text-white">{member.email}</div>
                        {member.id === currentUserId && (
                          <span className="text-[9px] text-cyan-400 font-bold uppercase">(You)</span>
                        )}
                      </td>
                      <td className="p-3">
                        <select
                          value={member.role || 'viewer'}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                          className="bg-slate-900 border border-slate-800 text-slate-200 px-2 py-1 rounded text-[11px] font-bold focus:border-cyan-500 cursor-pointer"
                        >
                          <option value="admin">Admin</option>
                          <option value="mechanic">Mechanic</option>
                          <option value="viewer">Viewer</option>
                        </select>
                      </td>
                      <td className="p-3 text-right">
                        {member.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.id, member.email)}
                            className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 hover:bg-rose-500/10 rounded transition cursor-pointer"
                          >
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ROLE CAPABILITIES SUMMARY */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1 text-[11px] text-slate-400">
          <p className="font-bold text-slate-300 uppercase text-[10px]">Role Capabilities Summary:</p>
          <ul className="space-y-1 list-disc list-inside text-[10px]">
            <li><strong className="text-cyan-400">Admin:</strong> Complete platform access, Stripe billing management, user management, and PDF report exports.</li>
            <li><strong className="text-amber-400">Mechanic:</strong> Operational access only—can view tasks, update repair statuses, and upload repair receipts. Cannot delete assets or change billing.</li>
            <li><strong className="text-slate-300">Viewer:</strong> Read-only access for insurance agents or fleet auditing partners.</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default TeamManagementModal;