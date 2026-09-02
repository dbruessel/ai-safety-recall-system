import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'manager' | 'viewer';
  created_at: string;
}

interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'viewer'>('manager');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch all profiles belonging to the logged-in user's organization
  const fetchTeamMembers = useCallback(async () => {
    if (!userProfile?.organization_id) return;

    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, role, created_at')
      .eq('organization_id', userProfile.organization_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching team members:', error);
    } else {
      setTeamMembers(data || []);
    }
    setLoading(false);
  }, [userProfile?.organization_id]);

  useEffect(() => {
    if (isOpen) {
      fetchTeamMembers();
    }
  }, [isOpen, fetchTeamMembers]);

  // Handle user invitation & organization assignment
  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !userProfile?.organization_id) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const emailToInvite = inviteEmail.trim().toLowerCase();

      // Check if profile exists for this email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, organization_id')
        .eq('email', emailToInvite)
        .maybeSingle();

      if (existingUser) {
        const { error: updateError } = await supabase
          .from('profiles')
          .update({
            organization_id: userProfile.organization_id,
            role: selectedRole,
            subscription_tier: userProfile.subscription_tier,
            status: 'active',
          })
          .eq('id', existingUser.id);

        if (updateError) throw updateError;

        setMessage({
          type: 'success',
          text: `Added ${emailToInvite} to your organization as ${selectedRole.toUpperCase()}.`,
        });
      } else {
        setMessage({
          type: 'success',
          text: `Invitation staged for ${emailToInvite}. They will automatically join your fleet when they log in.`,
        });
      }

      setInviteEmail('');
      fetchTeamMembers();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to send invite.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Update role for an existing member
  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'manager' | 'viewer') => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
    );

    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', memberId);

    if (error) {
      console.error('Failed to update user role:', error);
      fetchTeamMembers();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-6 font-mono text-slate-100">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">👥</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Manage Team &amp; Role Permissions
            </h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">✕ Close</button>
        </div>

        {/* INVITE FORM */}
        <form onSubmit={handleInviteUser} className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
          <label className="text-xs font-bold text-slate-300 block uppercase tracking-wider">
            Invite Team Member
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 bg-slate-900 border border-slate-800 text-xs text-white rounded-lg px-3 py-2 focus:outline-none focus:border-cyan-500 font-mono"
              required
            />
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as any)}
              className="bg-slate-900 border border-slate-800 text-xs text-slate-300 rounded-lg px-2.5 py-2 font-mono focus:outline-none focus:border-cyan-500"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="viewer">Viewer</option>
            </select>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all cursor-pointer whitespace-nowrap"
            >
              {isSubmitting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
          {message && (
            <p className={`text-[11px] ${message.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
              {message.text}
            </p>
          )}
        </form>

        {/* ROSTER */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Organization Members ({teamMembers.length})
          </h4>

          {loading ? (
            <div className="text-center py-6 text-xs text-slate-500 animate-pulse">
              Loading organization team roster...
            </div>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-800/80 rounded-xl text-xs"
                >
                  <div>
                    <p className="font-bold text-white">{member.email}</p>
                    <p className="text-[10px] text-slate-500">
                      {member.id === userProfile?.id ? 'Account Owner / System Administrator' : 'Team Contributor'}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {userProfile?.role === 'admin' && member.id !== userProfile?.id ? (
                      <select
                        value={member.role || 'manager'}
                        onChange={(e) => handleRoleChange(member.id, e.target.value as any)}
                        className="bg-slate-900 border border-slate-800 text-[11px] text-cyan-400 font-bold rounded px-2 py-1 uppercase font-mono focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="px-2.5 py-1 bg-cyan-950 border border-cyan-800 text-cyan-400 text-[10px] font-bold rounded uppercase font-mono">
                        {(member.role || 'ADMIN').toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg transition-all cursor-pointer font-bold"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default TeamManagementModal;