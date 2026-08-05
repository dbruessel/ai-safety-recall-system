import React, { useState } from 'react';

export type UserRole = 'admin' | 'mechanic' | 'viewer';
export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';

export interface AccountMenuProps {
  userEmail: string;
  orgName?: string;
  userRole: UserRole;
  subscriptionTier: SubscriptionTier;
  onOpenTeamModal: () => void;
  onOpenUpgradeModal: () => void;
  onCopyUnderwriterLink: () => void;
  onDownloadRiskCard: () => void;
  onSignOut: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  userEmail,
  orgName = 'Las Vegas Fleet Test Co.',
  userRole,
  subscriptionTier,
  onOpenTeamModal,
  onOpenUpgradeModal,
  onCopyUnderwriterLink,
  onDownloadRiskCard,
  onSignOut,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const displayTitle = orgName || 'Las Vegas Fleet Test Co.';

  return (
    <div className="relative inline-block text-left font-sans">
      {/* 🏢 TRIGGER BUTTON — ORGANIZATIONAL IDENTITY */}
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

      {/* DROPDOWN MENU POPOVER */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>

          <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl z-50 p-3 space-y-3 font-mono text-xs text-white">
            
            {/* BLOCK 1: ACTIVE WORKSPACE & OPERATOR */}
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
                  {userRole}
                </span>
              </div>
            </div>

            {/* BLOCK 2: ADMINISTRATION (ADMIN ONLY) */}
            {userRole === 'admin' && (
              <div className="space-y-1">
                <p className="text-[9px] text-slate-500 uppercase font-bold px-1 tracking-wider">Administration</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenTeamModal();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
                >
                  <span>👥 Team & Permissions</span>
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
                  <span>💳 Plan & Billing Surcharge</span>
                  <span className="text-slate-500">→</span>
                </button>
              </div>
            )}

            {/* BLOCK 3: UNDERWRITER QUICK TOOLS */}
            <div className="space-y-1 border-t border-slate-800/80 pt-2">
              <p className="text-[9px] text-slate-500 uppercase font-bold px-1 tracking-wider">Underwriter Quick Tools</p>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onCopyUnderwriterLink();
                }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition flex items-center justify-between cursor-pointer"
              >
                <span>🔗 Copy Broker Share Link</span>
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
                <span>📄 Download Compliance Card</span>
                <span className="text-slate-500">⬇️</span>
              </button>
            </div>

            {/* BLOCK 4: SESSION CONTROL */}
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
    </div>
  );
};

export default AccountMenu;