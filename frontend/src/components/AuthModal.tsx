import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface AuthModalProps {
  isOpen: boolean;
  selectedTier: string;
  onClose: () => void;
  onSuccessCheckout: (tier: string, email: string, companyName: string) => Promise<void>;
  onSwitchToSignIn?: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  selectedTier,
  onClose,
  onSuccessCheckout,
  onSwitchToSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);

    try {
      // 1. Create Supabase Auth Account & Profile
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName,
            subscription_tier: selectedTier || 'standard',
          },
        },
      });

      if (error) throw error;

      // 2. Immediately sign out to enforce paywall
      await supabase.auth.signOut();

      // 3. Trigger Stripe Checkout creation via parent callback
      await onSuccessCheckout(selectedTier || 'standard', email, companyName);
    } catch (err: any) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono">
      <div className="relative w-full max-w-md bg-[#0D1322] border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5 text-slate-100">
        
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white text-sm"
        >
          ✕
        </button>

        {/* HEADER */}
        <div>
          <h2 className="text-sm font-bold tracking-wider text-white uppercase">
            Create Account ({selectedTier.toUpperCase()} TIER)
          </h2>
        </div>

        {errorMsg && (
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/30 rounded-lg text-xs text-rose-400 text-center">
            {errorMsg}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block text-slate-400 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#070A12] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Company / Fleet Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Apex Freight Logistics"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-[#070A12] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#070A12] border border-slate-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition-all cursor-pointer mt-2"
          >
            {loading ? 'Creating Account & Redirecting...' : 'Continue to Checkout'}
          </button>
        </form>

        {onSwitchToSignIn && (
          <p className="text-[11px] text-slate-400 text-center">
            Already have an account?{' '}
            <button
              type="button"
              onClick={onSwitchToSignIn}
              className="text-cyan-400 hover:underline font-bold"
            >
              Sign In
            </button>
          </p>
        )}
      </div>
    </div>
  );
};

export default AuthModal;