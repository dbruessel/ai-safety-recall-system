import React, { useState } from 'react';

export interface TeamMember {
  id: string;
  email: string;
  role: 'admin' | 'mechanic' | 'viewer' | string;
  isOwner?: boolean;
}

export interface TeamManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  members?: TeamMember[];
  onInviteMember?: (email: string, role: string) => Promise<void>;
}

export const TeamManagementModal: React.FC<TeamManagementModalProps> = ({
  isOpen,
  onClose,
  members = [],
  onInviteMember,
}) => {
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<string>('mechanic');
  const [isSending, setIsSending] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsSending(true);
    try {
      if (onInviteMember) {
        await onInviteMember(inviteEmail.trim(), inviteRole);
      }
      setInviteEmail('');
    } catch (err: any) {
      console.error('Failed to send team invitation:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Fallback sample team list if no members array is passed
  const displayMembers: TeamMember[] = members.length > 0 ? members : [
    {
      id: 'usr-001',
      email: 'dennis+broker@recalllogic.ai',
      role: 'admin',
      isOwner: true,
    }
  ];

  const getRoleBadgeLabel = (role: string) => {
    const norm = role.toLowerCase();
    if (norm === 'admin') return 'ADMIN';
    if (norm === 'mechanic' || norm === 'manager') return 'MECHANIC / TECH';
    return 'VIEWER / AUDITOR';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-5 font-mono text-slate-100">
        
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400 text-base">👥</span>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Manage Team &amp; Role Permissions
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white cursor-pointer transition text-sm"
          >
            ✕ Close
          </button>
        </div>

        {/* INVITE FORM */}
        <div className="p-4 bg-[#070B14] border border-slate-800 rounded-xl space-y-3">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Invite Team Member
          </p>

          <form onSubmit={handleSendInvite} className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
            />

            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="admin">Admin</option>
              <option value="mechanic">Mechanic / Safety Tech</option>
              <option value="viewer">Viewer / Auditor</option>
            </select>

            <button
              type="submit"
              disabled={isSending}
              className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer transition whitespace-nowrap"
            >
              {isSending ? 'Sending...' : 'Send Invite'}
            </button>
          </form>
        </div>

        {/* ORGANIZATION MEMBERS LIST */}
        <div className="space-y-2">
          <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">
            Organization Members ({displayMembers.length})
          </p>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {displayMembers.map((member) => (
              <div
                key={member.id}
                className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl flex justify-between items-center text-xs"
              >
                <div>
                  <p className="font-bold text-white">{member.email}</p>
                  <p className="text-[10px] text-slate-500">
                    {member.isOwner ? 'Account Owner / System Administrator' : 'Fleet Operations Team'}
                  </p>
                </div>

                <span
                  className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase border ${
                    member.role.toLowerCase() === 'admin'
                      ? 'bg-cyan-950/80 border-cyan-500/40 text-cyan-400'
                      : member.role.toLowerCase() === 'mechanic' || member.role.toLowerCase() === 'manager'
                      ? 'bg-amber-950/80 border-amber-500/40 text-amber-400'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {getRoleBadgeLabel(member.role)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-lg cursor-pointer border border-slate-700"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default TeamManagementModal;