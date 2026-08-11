import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

import TaskBoard from './components/TaskBoard';
import AccountMenu from './components/AccountMenu';
import BillingManagementModal from './components/BillingManagementModal';
import TeamManagementModal from './components/TeamManagementModal';

export type SubscriptionTier = 'free' | 'standard' | 'professional' | 'enterprise';
export type UserRole = 'admin' | 'mechanic' | 'viewer';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function App() {
  const [userEmail, setUserEmail] = useState<string>('lasvegas_fleet_test@example.com');
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [subscriptionTier, setSubscriptionTier] = useState<SubscriptionTier>('professional');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentFleetCount, setCurrentFleetCount] = useState<number>(23);

  // Modal Visibility States
  const [isBillingModalOpen, setIsBillingModalOpen] = useState<boolean>(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState<boolean>(false);

  // Fetch active Supabase user & workspace stats
  useEffect(() => {
    async function fetchUserProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setUserEmail(user.email || 'operator@fleetcompany.com');
        
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, subscription_tier')
          .eq('id', user.id)
          .single();

        if (profile?.role) setUserRole(profile.role as UserRole);
        if (profile?.subscription_tier) setSubscriptionTier(profile.subscription_tier as SubscriptionTier);
      }

      // Sync active fleet count for billing capacity meters
      const { count } = await supabase
        .from('monitored_vehicles')
        .select('*', { count: 'exact', head: true });

      if (count !== null && count !== undefined) {
        setCurrentFleetCount(count);
      }
    }

    fetchUserProfile();

    // Listen for global auth changes (like signing out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        localStorage.clear();
        sessionStorage.clear();
        window.location.href = '/';
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    try {
      // 1. Sign out from Supabase Auth
      await supabase.auth.signOut();

      // 2. Wipe cached browser storage
      localStorage.clear();
      sessionStorage.clear();

      // 3. Force hard redirect to the home screen / landing page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* GLOBAL TOP NAVIGATION HEADER */}
      <header className="border-b border-slate-800 bg-slate-950 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-bold text-white font-mono text-sm shadow-md">
            RL
          </div>
          <div>
            <h1 className="font-bold text-white text-sm tracking-wide font-mono">RECALLLOGIC WORKSPACE</h1>
            <p className="text-[10px] text-slate-400 font-mono">Active Operational Risk Control.</p>
          </div>
        </div>

        {/* ACCOUNT MENU DROPDOWN IN GLOBAL NAV */}
        <AccountMenu
          userEmail={userEmail}
          userRole={userRole}
          subscriptionTier={subscriptionTier}
          onOpenTeamModal={() => setIsTeamModalOpen(true)}
          onOpenUpgradeModal={() => setIsBillingModalOpen(true)}
          onCopyUnderwriterLink={async () => {
            const shareUrl = `${window.location.origin}/audit/share/FLT-${currentUserId || '1001'}`;
            await navigator.clipboard.writeText(shareUrl);
          }}
          onDownloadRiskCard={() => {
            const baseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
            window.open(`${baseUrl}/api/broker/compliance-report/FLT-1001/pdf?broker_name=Aon%20Risk%20Solutions`, '_blank');
          }}
          onSignOut={handleSignOut}
        />
      </header>

      {/* MAIN CONTENT WORKSPACE */}
      <main>
        <TaskBoard />
      </main>

      {/* GLOBAL OVERLAY MODALS */}
      <BillingManagementModal
        isOpen={isBillingModalOpen}
        subscriptionTier={subscriptionTier}
        currentFleetCount={currentFleetCount}
        userEmail={userEmail}
        onClose={() => setIsBillingModalOpen(false)}
        onSelectTier={setSubscriptionTier}
      />

      <TeamManagementModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        currentUserId={currentUserId}
      />
    </div>
  );
}

export default App;