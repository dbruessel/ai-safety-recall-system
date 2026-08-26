import React from 'react';
import LandingPage from './components/LandingPage';
import TaskBoard from './components/TaskBoard';
import Footer from './components/Footer';
import { AuthProvider, useAuth } from './context/AuthContext';

const MainApp: React.FC = () => {
  const { user, userTier, signOut, signInDemo, demoAuthenticated } = useAuth();

  // User is authenticated if a Supabase session exists OR if demo mode was clicked
  const isAuthenticated = Boolean(user) || demoAuthenticated;

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-between font-sans">
      {/* MAIN WORKSPACE & PAGE ROUTING CONTENT */}
      <main className="flex-1">
        {!isAuthenticated ? (
          <LandingPage
            onSignIn={signInDemo}
            onSelectTier={() => signInDemo()}
          />
        ) : (
          <div className="py-6">
            {/* WORKSPACE NAVIGATION HEADER */}
            <header className="px-6 mb-6 flex justify-between items-center border-b border-slate-800/80 pb-4">
              <div className="flex items-center gap-3">
                <img 
                  src="/recall-logo.png" 
                  alt="RecallLogic Logo" 
                  className="h-6 w-auto object-contain"
                />
                <span className="font-extrabold text-white text-sm tracking-tight font-mono">
                  RECALLLOGIC WORKSPACE
                </span>
                <span className="text-slate-600 text-xs">|</span>
                <span className="text-xs text-slate-400 font-mono">
                  Safety Intelligence System
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-mono text-slate-300 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  <span>{user?.email || 'Las Vegas Fleet Test Co.'}</span>
                </div>

                <button
                  type="button"
                  onClick={signOut}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-semibold rounded-xl border border-slate-700 transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            </header>

            {/* MAIN TASKBOARD APP WORKSPACE */}
            <TaskBoard userTier={userTier} />
          </div>
        )}
      </main>

      {/* PERSISTENT GLOBAL FOOTER WITH DIRECT SUPPORT ACCESS */}
      <Footer />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;