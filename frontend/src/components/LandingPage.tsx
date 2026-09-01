import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import BulkCsvImportModal from './BulkCsvImportModal';

export interface LandingPageProps {
  onSignIn: () => void;
  onSelectTier?: (tierId: 'standard' | 'professional' | 'enterprise') => void;
  totalGlobalRecalls?: number;
}

export interface PricingTier {
  id: 'standard' | 'professional' | 'enterprise';
  stripePriceId: string;
  name: string;
  subtitle: string;
  price: string;
  billing: string;
  badge: string;
  popular?: boolean;
  color: string;
  buttonStyle: string;
  features: string[];
}

interface RecallItem {
  campaign_number: string;
  component: string;
  summary: string;
}

interface AuditResult {
  vin: string;
  has_open_recall: boolean;
  recall_count: number;
  recalls: RecallItem[];
  status_label: string;
}

export const LandingPage: React.FC<LandingPageProps> = ({ 
  onSignIn, 
  onSelectTier,
  totalGlobalRecalls 
}) => {
  const [realRecallCount, setRealRecallCount] = useState<number>(totalGlobalRecalls || 30000);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState<boolean>(false);

  // AUTH MODAL STATES (SIGN IN VS SIGN UP TOGGLE)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // DUAL-MODE VIN SCANNER STATE
  const [ingestMode, setIngestMode] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [scansLeft, setScansLeft] = useState<number>(10);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Track 10 Free Scans in browser session
  useEffect(() => {
    const storedScans = sessionStorage.getItem('recalllogic_demo_scans');
    if (storedScans !== null) {
      setScansLeft(parseInt(storedScans, 10));
    } else {
      sessionStorage.setItem('recalllogic_demo_scans', '10');
    }
  }, []);

  // Fetch count directly from Supabase recall_definitions table
  useEffect(() => {
    async function fetchRecallCount() {
      try {
        const { count, error } = await supabase
          .from('recall_definitions')
          .select('*', { count: 'exact', head: true });

        if (!error && count !== null) {
          setRealRecallCount(count);
        }
      } catch (err) {
        console.warn('Could not fetch recall count from Supabase:', err);
      }
    }

    fetchRecallCount();
  }, []);

  // REAL SUPABASE SIGN IN / SIGN UP AUTH HANDLER
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    try {
      if (isSignUp) {
        const finalCompanyName = companyName.trim() || `${email.split('@')[0].toUpperCase()} Fleet Co.`;

        // 1. Create User in Supabase auth.users passing company_name in options metadata
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              company_name: finalCompanyName,
            },
          },
        });

        if (error) throw error;

        // 2. Ensure explicit sync on matching profile row
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            company_name: finalCompanyName,
            role: 'admin',
          });
        }

        setIsAuthModalOpen(false);
        onSignIn();
      } else {
        // Sign In Flow
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        if (data.session) {
          setIsAuthModalOpen(false);
          onSignIn();
        }
      }
    } catch (err: any) {
      setAuthError(err.message || 'An error occurred during authentication.');
    } finally {
      setIsSubmittingAuth(false);
    }
  };

  // Universal Multi-VIN Extractor & Parallel Batch Auditor
  const extractAndAuditVins = async (rawInput: string) => {
    setScanError('');
    if (scansLeft <= 0) {
      setScanError('You have used all 10 free trial VIN checks. Upgrade to Pro Tier for unlimited fleet monitoring.');
      return;
    }

    const rawTokens = rawInput.toUpperCase().split(/[^A-Z0-9]+/);
    const uniqueVins = Array.from(new Set(rawTokens.filter(token => 
      token.length === 17 && !/[IOQ]/.test(token)
    )));

    if (uniqueVins.length === 0) {
      setScanError('No valid 17-character VINs found. Please check your formatting.');
      return;
    }

    const vinsToAudit = uniqueVins.slice(0, scansLeft);

    setIsAuditing(true);
    setAuditResult(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

      const apiPromises = vinsToAudit.map(vin =>
        fetch(`${apiBaseUrl}/api/audit/verify-vin`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vin: vin,
            broker: 'RecallLogic Direct',
            fleet: 'Inspected Fleet Unit',
          }),
        }).then(res => res.ok ? res.json() : null)
      );

      const results = (await Promise.all(apiPromises)).filter(Boolean);

      if (results.length === 0) {
        throw new Error('Failed to audit the provided VIN list.');
      }

      const allRecalls: RecallItem[] = [];
      let totalOpenRecalls = 0;

      results.forEach(res => {
        if (res.has_open_recall) {
          totalOpenRecalls += res.recall_count;
          res.recalls.forEach((r: RecallItem) => {
            allRecalls.push({
              ...r,
              campaign_number: `${res.vin} — ${r.campaign_number}`
            });
          });
        }
      });

      const hasAnyOpenRecalls = totalOpenRecalls > 0;

      setAuditResult({
        vin: `${results.length} Power Unit(s) Audited (${results.map(r => r.vin.slice(-6)).join(', ')})`,
        has_open_recall: hasAnyOpenRecalls,
        recall_count: totalOpenRecalls,
        recalls: allRecalls,
        status_label: hasAnyOpenRecalls 
          ? `CRITICAL: ${totalOpenRecalls} OPEN RECALL(S) DETECTED` 
          : '100% CLEAN / ZERO OPEN RECALLS',
      });

      const nextScans = Math.max(0, scansLeft - results.length);
      setScansLeft(nextScans);
      sessionStorage.setItem('recalllogic_demo_scans', nextScans.toString());

    } catch (err: any) {
      setScanError(err.message || 'Error connecting to NHTSA recall engine.');
    } finally {
      setIsAuditing(false);
    }
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setScanError('Please enter at least one Make / Model / VIN line.');
      return;
    }
    extractAndAuditVins(pastedText);
  };

  const processVinFile = async (file: File) => {
    try {
      const text = await file.text();
      await extractAndAuditVins(text);
    } catch (err) {
      setScanError('Failed to parse file. Please upload a valid .csv or .txt file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processVinFile(e.dataTransfer.files[0]);
    }
  };

  const handleTierCheckout = async (tier: PricingTier) => {
    if (typeof onSelectTier === 'function') {
      try {
        onSelectTier(tier.id);
        return;
      } catch (err) {
        console.error('Error invoking onSelectTier callback:', err);
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { tier: tier.id },
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        console.warn('No Stripe checkout URL returned from Supabase Edge Function.', error);
      }
    } catch (err) {
      console.error('Error triggering Stripe checkout session:', err);
    }
  };

  const pricingTiers: PricingTier[] = [
    {
      id: 'standard',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STANDARD || 'price_1TrIFTDXs4xycz0o1e9gfg9d',
      name: 'Standard',
      subtitle: 'Fleet Operations Baseline',
      price: '$99',
      billing: 'per month',
      badge: 'ESSENTIAL MONITORING',
      color: 'border-slate-800 bg-slate-900/50',
      buttonStyle: 'bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold',
      features: [
        'Up to 50 Vehicles Monitored',
        'Continuous Active NHTSA & CPSC Monitoring',
        'Full Kanban TaskBoard Workspace Access',
        'Manual Status & Remediation Tracking',
        'Standard Email Risk & Safety Alerts'
      ]
    },
    {
      id: 'professional',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PRO || 'price_1TrIFPRO',
      name: 'Professional',
      subtitle: 'Underwriter & Risk Intelligence',
      price: '$249',
      billing: 'per month',
      badge: 'MOST POPULAR',
      popular: true,
      color: 'border-[#06B6D4] bg-gradient-to-b from-[#06B6D4]/10 to-slate-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      buttonStyle: 'bg-[#06B6D4] text-slate-950 hover:bg-cyan-400 font-bold',
      features: [
        'Everything in Standard, plus:',
        'Up to 250 Vehicles Monitored',
        'Instant Single-VIN Scan Console',
        'Real-Time Thermal & High-Severity Hazard Alerts',
        'Signed Underwriter Compliance Cards (PDF Certificates)',
        'Shareable Read-Only Broker Audit Links',
        'Proof-of-Remedy & Repair Receipt Storage'
      ]
    },
    {
      id: 'enterprise',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || 'price_1TrIFENTERPRISE',
      name: 'Enterprise',
      subtitle: 'Automated Multi-Fleet Control',
      price: '$499',
      billing: 'per month',
      badge: 'TOTAL AUTOMATION',
      color: 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/80',
      buttonStyle: 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold',
      features: [
        'Everything in Professional, plus:',
        'Unlimited Vehicles & Multi-Fleet Portfolios',
        'Telematics & TMS Platform Integrations',
        'Dedicated Broker Quarterly Business Reviews (QBR)',
        'Custom Batch Ingestion Engine & Webhooks',
        'Multi-Site Operational Isolation & SSO',
        'Custom Carrier SLA & Terms'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black overflow-x-hidden relative">
      
      {/* Background Lighting */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-[#06B6D4]/10 via-[#EF4444]/5 to-transparent blur-3xl opacity-60" />
      </div>

      {/* GLOBAL NAV BAR */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          
          {/* Logo & Branding */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img 
              src="/recall-logo.png" 
              alt="RecallLogic Logo" 
              className="h-7 w-auto object-contain"
            />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight font-mono">
                RecallLogic
              </span>
              <span className="text-slate-600 text-xs hidden sm:inline">|</span>
              <span className="text-xs font-semibold tracking-wide text-slate-400 font-mono hidden sm:inline">
                Safety Intelligence System
              </span>
            </div>
          </div>

          {/* Real Supabase Record Counter Banner */}
          <div className="flex-1 max-w-md mx-2 px-3 py-1 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/40 flex items-center justify-center gap-2.5 shadow-[0_0_12px_rgba(239,68,68,0.12)]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#EF4444]"></span>
            </span>
            <div className="text-center font-mono flex items-center gap-1.5 flex-wrap justify-center">
              <span className="text-[#EF4444] font-black text-sm sm:text-base tracking-wider">
                {realRecallCount.toLocaleString()}
              </span>
              <span className="text-[#EF4444] font-bold text-[10px] sm:text-[11px] uppercase tracking-wide">
                Active Recalls Monitored
              </span>
            </div>
          </div>

          {/* Sign In / Sign Up Trigger */}
          <div className="shrink-0 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setIsAuthModalOpen(true);
              }}
              className="px-4 py-1.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-500/10 transition-all cursor-pointer font-mono whitespace-nowrap"
            >
              Sign In
            </button>
          </div>

        </div>
      </nav>

      {/* HERO SECTION WITH INLINE COMPREHENSIVE VIN SCANNER */}
      <section className="relative pt-6 pb-8 px-4 max-w-5xl mx-auto text-center space-y-4">
        <div className="rounded-2xl bg-[#0B101D] border border-slate-800/80 p-6 shadow-2xl space-y-4 text-left">
          
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
              <span className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
                Real-Time VIN Safety Sync Active
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400 font-bold">
              {scansLeft} FREE VIN LOOKUPS REMAINING
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              Instant Fleet VIN Safety &amp; Recall Control
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Paste your VINs directly or drop a fleet file to test our Real-Time Safety Sync engine with 10 free lookups.
            </p>
          </div>

          <div className="flex border-b border-slate-800/80 font-mono text-xs gap-4 pt-2">
            <button
              type="button"
              onClick={() => setIngestMode('paste')}
              className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                ingestMode === 'paste'
                  ? 'border-[#06B6D4] text-[#06B6D4]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct VIN Input / Paste
            </button>
            <button
              type="button"
              onClick={() => setIngestMode('upload')}
              className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                ingestMode === 'upload'
                  ? 'border-[#06B6D4] text-[#06B6D4]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Upload .CSV / .TXT File
            </button>
          </div>

          {ingestMode === 'paste' ? (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder={`FREIGHTLINER / CASCADIA / 1FUJGLDR5MLKE1234\nFORD / TRANSIT / 1FTBW1Y85PKA54321\nTESLA / MODEL 3 / 5YJ3E1EA7MF987654`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value.toUpperCase())}
                disabled={scansLeft <= 0 || isAuditing}
                className="w-full bg-[#070B14] border border-slate-800 rounded-xl p-3 font-mono text-xs uppercase text-white placeholder-slate-600 focus:outline-none focus:border-[#06B6D4] transition"
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Accepted Format: <strong className="text-cyan-300">Make / Model / VIN</strong> or <strong className="text-cyan-300">Make, Model, VIN</strong> (up to 10 entries).
                </span>
                <button
                  type="submit"
                  disabled={scansLeft <= 0 || isAuditing}
                  className="px-6 py-2.5 bg-[#06B6D4] hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs font-mono rounded-xl transition cursor-pointer whitespace-nowrap self-end sm:self-auto"
                >
                  {isAuditing ? 'AUDITING FLEET...' : 'RUN VIN AUDIT'}
                </button>
              </div>
            </form>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragging 
                  ? 'border-[#06B6D4] bg-[#06B6D4]/10' 
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <input
                type="file"
                id="main-landing-file-upload"
                accept=".csv,.txt"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && processVinFile(e.target.files[0])}
              />
              <label htmlFor="main-landing-file-upload" className="cursor-pointer space-y-2 block">
                <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-[#06B6D4]">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-xs font-semibold text-white">
                  Drop your fleet list here or <span className="text-[#06B6D4] underline">browse files</span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono">
                  Supported formats: <strong className="text-slate-400">.csv</strong> or <strong className="text-slate-400">.txt</strong>
                </p>
              </label>
            </div>
          )}

          {scanError && <p className="text-red-400 text-xs font-mono">{scanError}</p>}

          {auditResult && (
            <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
              auditResult.has_open_recall
                ? 'bg-red-950/20 border-red-800/80 text-red-200'
                : 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200'
            }`}>
              <div className="flex justify-between items-center font-bold">
                <span>{auditResult.vin}</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                  {auditResult.status_label}
                </span>
              </div>
              {auditResult.has_open_recall ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-red-300">Found {auditResult.recall_count} active safety recall(s):</p>
                  {auditResult.recalls.map((r, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-red-900/50 text-slate-300">
                      <strong className="text-white">Campaign #{r.campaign_number}</strong> — {r.component}
                      <p className="text-slate-400 text-[11px] mt-1">{r.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-300">
                  Zero active safety recalls detected on NHTSA records across the audited VINs.
                </p>
              )}
            </div>
          )}

        </div>
      </section>

      {/* STRIPE PRICING GRID */}
      <section id="pricing" className="relative z-10 py-8 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <h2 className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-widest">Transparent Pricing</h2>
            <p className="text-xl sm:text-2xl font-extrabold text-white">Choose Your Safety Tier</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {pricingTiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative rounded-xl border p-5 flex flex-col justify-between ${tier.color}`}
              >
                {tier.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#06B6D4] text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md">
                    {tier.badge}
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white">{tier.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tier.subtitle}</p>
                  </div>

                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">{tier.price}</span>
                    <span className="text-[11px] text-slate-400">{tier.billing}</span>
                  </div>

                  <ul className="space-y-2 text-[11px] text-slate-300">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#06B6D4] shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => handleTierCheckout(tier)}
                  className={`w-full mt-5 py-2.5 rounded-lg transition-all text-xs cursor-pointer ${tier.buttonStyle}`}
                >
                  Subscribe to {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AUTHENTICATION MODAL OVERLAY (TOGGLES BETWEEN SIGN IN & SIGN UP) */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                {isSignUp ? 'Create Your Account' : 'Sign In to RecallLogic'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAuthModalOpen(false)}
                className="text-slate-400 hover:text-white transition cursor-pointer text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                  placeholder="name@company.com"
                />
              </div>

              {isSignUp && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company / Fleet Name</label>
                  <input
                    type="text"
                    required={isSignUp}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                    placeholder="e.g. Apex Freight Logistics"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]"
                  placeholder="••••••••"
                />
              </div>

              {authError && (
                <div className="p-2.5 rounded bg-red-950/40 border border-red-800/80 text-red-300 text-xs font-mono">
                  {authError}
                </div>
              )}

              <div className="flex justify-end items-center pt-2">
                <button
                  type="submit"
                  disabled={isSubmittingAuth}
                  className="w-full py-2.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition cursor-pointer font-mono"
                >
                  {isSubmittingAuth ? 'Processing...' : isSignUp ? 'Sign Up' : 'Sign In'}
                </button>
              </div>
            </form>

            <div className="border-t border-slate-800/80 pt-3 text-center">
              <p className="text-xs text-slate-400">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setAuthError('');
                    setIsSignUp(!isSignUp);
                  }}
                  className="text-[#06B6D4] font-bold hover:underline ml-1 cursor-pointer"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>

          </div>
        </div>
      )}

      {/* BULK IMPORT MODAL */}
      {isBulkModalOpen && (
        <BulkCsvImportModal
          isOpen={isBulkModalOpen}
          onClose={() => setIsBulkModalOpen(false)}
        />
      )}

    </div>
  );
};

export default LandingPage;