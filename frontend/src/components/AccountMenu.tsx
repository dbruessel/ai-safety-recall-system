import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';

export type UserRole = 'admin' | 'mechanic' | 'viewer' | string;
export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise' | string;

export interface AccountMenuProps {
  userEmail: string;
  orgName?: string;
  userRole: UserRole;
  subscriptionTier: SubscriptionTier;
  isBrokerPortal?: boolean;
  onOpenTeamModal: () => void;
  onOpenUpgradeModal: () => void;
  onCopyUnderwriterLink: () => void;
  onDownloadRiskCard: () => void;
  onSignOut: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  userEmail,
  orgName = 'My Fleet Co.',
  userRole = 'admin',
  subscriptionTier,
  isBrokerPortal = false,
  onOpenTeamModal,
  onOpenUpgradeModal,
  onCopyUnderwriterLink,
  onDownloadRiskCard,
  onSignOut,
}) => {
  const { refreshProfile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [currentOrgName, setCurrentOrgName] = useState(orgName);
  const [newOrgName, setNewOrgName] = useState(orgName);
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state when parent props change
  useEffect(() => {
    if (orgName) {
      setCurrentOrgName(orgName);
      setNewOrgName(orgName);
    }
  }, [orgName]);

  const displayTitle = currentOrgName || 'My Fleet Co.';
  const normalizedRole = (userRole || 'admin').toString().toLowerCase();
  const isAdmin = normalizedRole === 'admin';

  const handleSaveOrgName = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = newOrgName.trim();
    if (!trimmedName) return;

    setIsSaving(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('organization_id, company_name')
        .eq('email', userEmail)
        .single();

      const oldName = profile?.company_name || currentOrgName;

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ company_name: trimmedName })
        .eq('email', userEmail);

      if (profileError) throw profileError;

      if (profile?.organization_id) {
        await supabase
          .from('organizations')
          .update({ name: trimmedName })
          .eq('id', profile.organization_id);
      } else if (oldName) {
        await supabase
          .from('organizations')
          .update({ name: trimmedName })
          .eq('name', oldName);
      }

      setCurrentOrgName(trimmedName);
      setIsOrgModalOpen(false);
      if (refreshProfile) {
        await refreshProfile();
      }
    } catch (err: any) {
      alert(`Failed to update organization name: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="relative inline-block text-left font-sans">
      {/* TRIGGER BUTTON */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 rounded-xl text-xs font-mono text-slate-200 transition shadow-md cursor-pointer"
      >
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
        <span className="font-bold text-white max-w-[200px] truncate">
          🏢 {displayTitle}
        </span>
        <span className="text-slate-400 text-[10px]">▼</span>
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>

          <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-3 font-mono text-xs text-white">
            
            {/* ACTIVE WORKSPACE */}
            <div className="p-3 bg-slate-950 border border-slate-800/80 rounded-xl space-y-1.5">
              <div className="flex justify-between items-center">
                <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Active Workspace</p>
                <span className="bg-slate-800 text-cyan-400 text-[9px] px-2 py-0.5 rounded font-bold uppercase border border-cyan-500/20">
                  {subscriptionTier} Plan
                </span>
              </div>
              <p className="text-sm font-extrabold text-white truncate flex items-center gap-1.5">
                <span>🏢</span> {displayTitle}
              </p>
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400 truncate max-w-[160px]">{userEmail}</span>
                <span className="bg-cyan-500/10 text-cyan-400 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border border-cyan-500/30">
                  {normalizedRole}
                </span>
              </div>
            </div>

            {/* ADMINISTRATION (Hidden when viewing Broker Command) */}
            {isAdmin && !isBrokerPortal && (
              <div className="space-y-1 border-t border-slate-800/80 pt-2">
                <p className="text-[9px] text-slate-500 uppercase font-bold px-1 tracking-wider">Administration</p>
                
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    setNewOrgName(currentOrgName);
                    setIsOrgModalOpen(true);
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                >
                  <span>⚙️ Edit Fleet Company Name</span>
                  <span className="text-slate-500">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenTeamModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                >
                  <span>👥 Team &amp; Permissions</span>
                  <span className="text-slate-500">→</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenUpgradeModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-cyan-400 font-bold transition flex items-center justify-between cursor-pointer"
                >
                  <span>💳 Plan &amp; Billing Portal</span>
                  <span className="text-slate-500">→</span>
                </button>
              </div>
            )}

            {/* UNDERWRITER QUICK TOOLS */}
            <div className="space-y-1 border-t border-slate-800/80 pt-2">
              <p className="text-[9px] text-slate-500 uppercase font-bold px-1 tracking-wider">
                Underwriter Quick Tools
              </p>
              
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCopyUnderwriterLink();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{isBrokerPortal ? '🔗 Share Onboarding Link' : '🔗 Copy Underwriter Share Link'}</span>
                <span className="text-slate-500">📋</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onDownloadRiskCard();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>{isBrokerPortal ? '📄 Export Portfolio Audit (PDF)' : '📄 Download Risk Certificate'}</span>
                <span className="text-slate-500">⬇️</span>
              </button>
            </div>

            {/* SESSION CONTROL */}
            <div className="border-t border-slate-800 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onSignOut();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 font-bold transition flex items-center justify-between cursor-pointer"
              >
                <span>Sign Out</span>
                <span>🚪</span>
              </button>
            </div>
          </div>
        </>
      )}

      {/* EDIT ORGANIZATION NAME MODAL */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono text-slate-100">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                ⚙️ Organization Settings
              </h3>
              <button onClick={() => setIsOrgModalOpen(false)} className="text-slate-400 hover:text-white cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveOrgName} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Company / Fleet Name</label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                  placeholder="e.g. Apex Logistics Corp."
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsOrgModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg cursor-pointer"
                >
                  {isSaving ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountMenu;