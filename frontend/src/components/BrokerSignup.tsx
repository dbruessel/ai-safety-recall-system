import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';

export const BrokerSignup: React.FC = () => {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [brokerageName, setBrokerageName] = useState('your insurance broker');
  const [brokerId, setBrokerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('broker_id');
    
    if (id) {
      setBrokerId(id);
      if (id !== 'demo-broker') {
        // Fetch official brokerage name if it's a real brokerage ID
        supabase
          .from('brokerages')
          .select('name')
          .eq('id', id)
          .single()
          .then(({ data }) => {
            if (data?.name) {
              setBrokerageName(data.name);
            }
          });
      } else {
        setBrokerageName('RecallLogic Partner Brokerage');
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Sign up user via AuthContext
      const authRes = await signUp(email, password, companyName);
      
      // 2. Link created profile / org to parent brokerage if broker_id exists
      if (authRes?.user && brokerId && brokerId !== 'demo-broker') {
        // Fetch user profile to get org ID or update company profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id')
          .eq('id', authRes.user.id)
          .single();

        if (profile?.organization_id) {
          await supabase
            .from('organizations')
            .update({ parent_brokerage_id: brokerId })
            .eq('id', profile.organization_id);
        }
      }

      // Redirect to workspace after registration
      window.location.href = '/';
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 flex flex-col justify-center items-center px-4 font-mono">
      <div className="max-w-md w-full bg-[#0D1322] border border-slate-800 rounded-2xl p-8 shadow-2xl space-y-6">
        
        {/* CO-BRANDED HEADER */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 text-xs font-bold uppercase">
            <span>🛡️</span> Broker Invocation
          </div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            Activate Safety Workspace
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            You’ve been invited by <span className="text-cyan-400 font-bold">{brokerageName}</span> to activate your Fleet Safety &amp; Loss Control Audit Workspace.
          </p>
        </div>

        {/* SYNC NOTICE BANNER */}
        <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-xl text-[11px] text-slate-300 flex items-start gap-2">
          <span className="text-emerald-400 font-bold">✓</span>
          <span>
            Your live safety score will automatically sync with <strong>{brokerageName}</strong> to support your upcoming policy renewal.
          </span>
        </div>

        {errorMsg && (
          <div className="bg-red-950/80 border border-red-500/50 p-3 rounded-xl text-xs text-red-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* FORM FIELDS */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">COMPANY / FLEET NAME</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Logistics LLC"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">WORK EMAIL</label>
            <input
              type="email"
              required
              placeholder="fleetmanager@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">PASSWORD</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2.5 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-950/50 mt-2"
          >
            {loading ? 'Setting up Workspace...' : 'Create Account & Link to Broker →'}
          </button>
        </form>

        <p className="text-[10px] text-slate-500 text-center">
          By registering, your recall statuses and compliance scores are shared securely with your broker's underwriter portal.
        </p>
      </div>
    </div>
  );
};

export default BrokerSignup;