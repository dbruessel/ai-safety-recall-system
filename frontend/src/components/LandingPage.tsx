import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export interface LandingPageProps {
  onSignIn: () => void;
  onSelectTier?: (tierId: 'standard' | 'professional' | 'enterprise', email?: string, companyName?: string) => void;
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
  const [realRecallCount, setRealRecallCount] = useState<number>(totalGlobalRecalls || 30381);

  // BROKER LEAD CAPTURE MODAL STATE
  const [isBrokerModalOpen, setIsBrokerModalOpen] = useState<boolean>(false);
  const [brokerEmail, setBrokerEmail] = useState<string>('');
  const [brokerageName, setBrokerageName] = useState<string>('');
  const [portfolioSize, setPortfolioSize] = useState<string>('10-50');
  const [isSubmittingBrokerLead, setIsSubmittingBrokerLead] = useState<boolean>(false);
  const [brokerLeadSuccess, setBrokerLeadSuccess] = useState<boolean>(false);
  const [brokerLeadError, setBrokerLeadError] = useState<string>('');

  // AUTH MODAL STATES
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isSignUp, setIsSignUp] = useState<boolean>(false);
  const [selectedTier, setSelectedTier] = useState<'standard' | 'professional' | 'enterprise'>('standard');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [companyName, setCompanyName] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [isSubmittingAuth, setIsSubmittingAuth] = useState<boolean>(false);

  // DUAL-MODE VIN SCANNER STATE
  const [ingestMode, setIngestMode] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

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

  const handleBrokerLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingBrokerLead(true);
    setBrokerLeadError('');

    try {
      const { error } = await supabase.from('broker_leads').insert([
        {
          email: brokerEmail.trim(),
          brokerage_name: brokerageName.trim(),
          portfolio_size: portfolioSize,
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) throw error;
      setBrokerLeadSuccess(true);
    } catch (err: any) {
      console.error('Supabase broker lead submission error:', err);
      setBrokerLeadError(err.message || 'Failed to submit request. Please check database permissions.');
    } finally {
      setIsSubmittingBrokerLead(false);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setIsSubmittingAuth(true);

    try {
      if (isSignUp) {
        const finalCompanyName = companyName.trim() || `${email.split('@')[0].toUpperCase()} Fleet Co.`;
        const referredBrokerId = sessionStorage.getItem('broker_id') || 'direct';
        const referredBrokerName = sessionStorage.getItem('broker_name') || '';

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              company_name: finalCompanyName,
              subscription_tier: selectedTier,
              selected_tier: selectedTier,
              broker_id: referredBrokerId,
              referred_by_broker: referredBrokerId,
              broker_name: referredBrokerName,
            },
          },
        });

        if (error) throw error;

        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id,
            email: data.user.email,
            company_name: finalCompanyName,
            role: 'admin',
          });
        }

        setIsAuthModalOpen(false);
        await supabase.auth.signOut();

        if (onSelectTier) {
          onSelectTier(selectedTier, email.trim(), finalCompanyName);
        } else {
          onSignIn();
        }
      } else {
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

  const extractAndAuditVins = async (rawInput: string) => {
    setScanError('');

    const rawTokens = rawInput.toUpperCase().split(/[^A-Z0-9]+/);
    const uniqueVins = Array.from(new Set(rawTokens.filter(token => 
      token.length === 17 && !/[IOQ]/.test(token)
    )));

    if (uniqueVins.length === 0) {
      setScanError('No valid 17-character VINs found. Please check your formatting.');
      return;
    }

    setIsAuditing(true);
    setAuditResult(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'https://recalllogic-api.onrender.com';

      const apiPromises = uniqueVins.map(vin =>
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
          ? `CRITICAL RISK: ${totalOpenRecalls} UNADDRESSED RECALL(S)` 
          : 'PREFERRED RISK • ELIGIBLE FOR 15% CREDIT',
      });

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
    setSelectedTier(tier.id);
    setIsSignUp(true);
    setAuthError('');
    setIsAuthModalOpen(true);
  };

  const activeBrokerName = sessionStorage.getItem('broker_name') || sessionStorage.getItem('recalllogic_referred_broker_name') || '';

  const pricingTiers: PricingTier[] = [
    {
      id: 'standard',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_STANDARD || '',
      name: 'Standard',
      subtitle: 'Fleet Loss Control Baseline',
      price: '\$99',
      billing: 'per month',
      badge: 'ESSENTIAL SHIELD',
      color: 'border-slate-800 bg-slate-900/50',
      buttonStyle: 'bg-slate-800 text-slate-200 hover:bg-slate-700 font-bold',
      features: [
        'Up to 50 Vehicles Monitored',
        'Continuous NHTSA Recall Ingestion',
        'Remediation Taskboard Workspace',
        'Punitive Exposure Threshold Alerts',
        'Standard Underwriter Compliance Export'
      ]
    },
    {
      id: 'professional',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_PRO || '',
      name: 'Professional',
      subtitle: 'Underwriter & Risk Intelligence',
      price: '\$249',
      billing: 'per month',
      badge: 'MOST POPULAR',
      popular: true,
      color: 'border-[#06B6D4] bg-gradient-to-b from-[#06B6D4]/10 to-slate-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)]',
      buttonStyle: 'bg-[#06B6D4] text-slate-950 hover:bg-cyan-400 font-bold',
      features: [
        'Everything in Standard, plus:',
        'Up to 250 Monitored VINs',
        'Automated Fleetio & Telematics Webhook Sync',
        'Two-Way Fleetio Work Order Fix-It Loop',
        'Signed Underwriter Compliance Certificates (PDF)',
        'Shareable Broker Audit Links',
        '12–15% Premium Credit Evidence Locker'
      ]
    },
    {
      id: 'enterprise',
      stripePriceId: import.meta.env.VITE_STRIPE_PRICE_ENTERPRISE || '',
      name: 'Enterprise',
      subtitle: 'Multi-Fleet Broker Command',
      price: '\$499',
      billing: 'per month',
      badge: 'TOTAL AUTOMATION',
      color: 'border-amber-500/40 bg-gradient-to-b from-amber-500/10 to-slate-900/80',
      buttonStyle: 'bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold',
      features: [
        'Everything in Professional, plus:',
        'Unlimited Monitored Vehicles',
        'Co-Branded Broker Command Center',
        'Samsara, Geotab & Motive ELD Ingestion',
        'Actuarial Book Safety Score Analytics',
        'Custom Carrier Underwriter SLAs',
        'Dedicated Loss Control Advisor'
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black overflow-x-hidden relative">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[350px] bg-gradient-to-b from-[#06B6D4]/10 via-[#EF4444]/5 to-transparent blur-3xl opacity-60" />
      </div>

      {/* GLOBAL NAV BAR */}
      <nav className="border-b border-slate-800/80 bg-[#0B0F17]/90 backdrop-blur-md sticky top-0 z-40 px-4 sm:px-8 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <img src="/recall-logo.png" alt="RecallLogic Logo" className="h-7 w-auto object-contain" />
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white text-base tracking-tight font-mono">RecallLogic</span>
              <span className="text-slate-600 text-xs hidden sm:inline">|</span>
              <span className="text-xs font-semibold tracking-wide text-cyan-400 font-mono hidden sm:inline">
                Insurtech Loss-Control Engine
              </span>
            </div>
          </div>

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
                Active Safety Recalls Monitored
              </span>
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-4">
            <button 
              type="button"
              onClick={() => { setBrokerLeadSuccess(false); setBrokerLeadError(''); setIsBrokerModalOpen(true); }}
              className="hidden md:flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-400 hover:text-cyan-300 transition-colors cursor-pointer"
            >
              For Brokers &amp; Agencies &rarr;
            </button>
            <button
              type="button"
              onClick={() => { setIsSignUp(false); setSelectedTier('standard'); setIsAuthModalOpen(true); }}
              className="px-4 py-1.5 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg shadow-md shadow-cyan-500/10 transition-all cursor-pointer font-mono whitespace-nowrap"
            >
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* HERO SECTION WITH UNLIMITED INSTANT ACTUARIAL AUDIT */}
      <section className="relative pt-6 pb-8 px-4 max-w-5xl mx-auto text-center space-y-4">
        <div className="rounded-2xl bg-[#0B101D] border border-slate-800/80 p-6 shadow-2xl space-y-4 text-left backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
              <span className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
                1-CLICK UNDERWRITER AUDIT • UNLOCK UP TO 15% RATE CREDIT
              </span>
            </div>
            <div className="px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-800/80 text-xs font-mono text-cyan-300 font-bold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
              INSTANT ACTUARIAL AUDIT
            </div>
          </div>

          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white font-mono tracking-tight">
              The Insurtech Loss-Control Engine for Commercial Fleets
            </h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed font-mono">
              Translate raw Fleetio, Samsara, and NHTSA recall data into certified Underwriter Compliance Packets[cite: 1]. Eliminate uninsurable <strong className="text-red-400">\$250,000 punitive liability threats</strong> and secure <strong className="text-emerald-400">12–15% renewal rate credits</strong>[cite: 1].
            </p>
          </div>

          {/* ECOSYSTEM BADGES WITH NEON STATUS DOTS */}
          <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-slate-400">
            <span className="text-slate-500 font-bold uppercase text-[10px]">Connected Feeds:</span>
            <span className="bg-slate-900 border border-cyan-800/80 text-cyan-300 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> Fleetio
            </span>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Samsara
            </span>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> Geotab
            </span>
            <span className="bg-slate-900 border border-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Motive
            </span>
          </div>

          <div className="flex border-b border-slate-800/80 font-mono text-xs gap-4 pt-2 justify-between items-center">
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setIngestMode('paste')}
                className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                  ingestMode === 'paste' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Direct VIN Input / Paste
              </button>
              <button
                type="button"
                onClick={() => setIngestMode('upload')}
                className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
                  ingestMode === 'upload' ? 'border-[#06B6D4] text-[#06B6D4]' : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Upload .CSV / .TXT Fleet List
              </button>
            </div>

            {/* SAMPLE AUTOFILL BUTTON */}
            {ingestMode === 'paste' && (
              <button
                type="button"
                onClick={() => setPastedText("FREIGHTLINER / CASCADIA / 1FUJGLDR5MLKE1234\nFORD / TRANSIT / 1FTBW1Y85PKA54321\nVOLVO / VNL 860 / 5YJ3E1EA7MF987654")}
                className="pb-2 text-[11px] font-mono text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
              >
                ⚡ Load Sample Fleet (3 VINs)
              </button>
            )}
          </div>

          {ingestMode === 'paste' ? (
            <form onSubmit={handlePasteSubmit} className="space-y-3">
              <textarea
                rows={3}
                placeholder={`FREIGHTLINER / CASCADIA / 1FUJGLDR5MLKE1234\nFORD / TRANSIT / 1FTBW1Y85PKA54321\nTESLA / MODEL 3 / 5YJ3E1EA7MF987654`}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value.toUpperCase())}
                disabled={isAuditing}
                className="w-full bg-[#070B14] border border-slate-800 rounded-xl p-3 font-mono text-xs uppercase text-white placeholder-slate-600 focus:outline-none focus:border-[#06B6D4] transition"
              />
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <span className="text-[10px] text-slate-400 font-mono">
                  Accepted Format: <strong className="text-cyan-300">Make / Model / VIN</strong> (or raw VIN lists).
                </span>
                <button
                  type="submit"
                  disabled={isAuditing}
                  className="px-6 py-2.5 bg-[#06B6D4] hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs font-mono rounded-xl transition cursor-pointer whitespace-nowrap self-end sm:self-auto shadow-lg shadow-cyan-950"
                >
                  {isAuditing ? 'CALCULATING ACTUARIAL RISK...' : 'AUDIT FLEET RISK & UNLOCK CREDITS →'}
                </button>
              </div>
            </form>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                isDragging ? 'border-[#06B6D4] bg-[#06B6D4]/10' : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <input type="file" id="main-landing-file-upload" accept=".csv,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && processVinFile(e.target.files[0])} />
              <label htmlFor="main-landing-file-upload" className="cursor-pointer space-y-2 block">
                <p className="text-xs font-semibold text-white">
                  Drop fleet list here or <span className="text-[#06B6D4] underline">browse files</span>
                </p>
                <p className="text-[11px] text-slate-500 font-mono">Supported formats: .csv or .txt</p>
              </label>
            </div>
          )}

          {scanError && <p className="text-red-400 text-xs font-mono">{scanError}</p>}

          {auditResult && (
            <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
              auditResult.has_open_recall ? 'bg-red-950/20 border-red-800/80 text-red-200' : 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200'
            }`}>
              <div className="flex justify-between items-center font-bold">
                <span>{auditResult.vin}</span>
                <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
                  {auditResult.status_label}
                </span>
              </div>
              {auditResult.has_open_recall ? (
                <div className="space-y-2 pt-1">
                  <p className="text-[11px] text-red-300">Found {auditResult.recall_count} active safety recall(s) creating uninsurable legal exposure:</p>
                  {auditResult.recalls.map((r, idx) => (
                    <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-red-900/50 text-slate-300">
                      <strong className="text-white">Campaign #{r.campaign_number}</strong> — {r.component}
                      <p className="text-slate-400 text-[11px] mt-1">{r.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-emerald-300">
                  Zero active safety recalls detected. Fleet is in Preferred Risk Tier (Eligible for 15% rate credit)[cite: 1].
                </p>
              )}
            </div>
          )}
        </div>

        {/* SUB-HERO BROKER CALLOUT BANNER */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-left shadow-lg backdrop-blur-sm mt-4">
          <div className="flex items-center gap-3">
            <div>
              <p className="text-xs font-bold text-slate-200 font-mono">Commercial Auto Broker or Risk Manager?</p>
              <p className="text-[11px] text-slate-400">Access co-branded portfolio safety scoring, generate Underwriter Loss Control Certificates, and protect book loss ratios.</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={() => { setBrokerLeadSuccess(false); setBrokerLeadError(''); setIsBrokerModalOpen(true); }}
            className="whitespace-nowrap px-4 py-2 rounded-lg text-xs font-mono font-bold bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 border border-cyan-500/30 transition-all shrink-0 cursor-pointer"
          >
            Explore Broker Command Center &rarr;
          </button>
        </div>
      </section>

      {/* BROKER & AGENCY VALUE SECTION */}
      <section className="py-12 bg-slate-950/60 border-y border-slate-800/80 my-4">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-8 space-y-1">
            <span className="text-[10px] font-mono font-bold tracking-widest text-cyan-400 uppercase">Broker &amp; Agency Distribution Wedge</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white font-mono">Co-Branded Loss Control Solutions</h2>
            <p className="text-slate-400 text-xs">Drive client retention, optimize policy renewals, and eliminate uninsurable lawsuit penalties across your portfolio.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <h3 className="text-sm font-bold text-slate-100 font-mono">Eliminate \$250k Punitive Exposure</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Automatically detect nuclear brake/steering recalls and push repair tickets directly into Fleetio before catastrophic crashes occur[cite: 1].</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <h3 className="text-sm font-bold text-slate-100 font-mono">Unlock 12–15% Underwriter Credits</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Export certified Underwriter Audit Packets that shift fleet accounts from Standard to Preferred risk pricing at renewal[cite: 1].</p>
            </div>

            <div className="p-5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all">
              <h3 className="text-sm font-bold text-slate-100 font-mono">Automated Two-Way Fix-It Loop</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">Continuous sync with Fleetio, Samsara, and Geotab auto-clears safety risks in real time as mechanics complete work orders[cite: 1].</p>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING GRID */}
      <section id="pricing" className="relative z-10 py-8 bg-slate-950/80 border-t border-slate-800/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-6 space-y-1">
            <h2 className="text-[10px] font-bold text-[#06B6D4] uppercase tracking-widest font-mono">Transparent Subscription Plans</h2>
            <p className="text-xl sm:text-2xl font-extrabold text-white font-mono">Choose Your Loss Control Tier</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 items-stretch">
            {pricingTiers.map((tier) => (
              <div key={tier.id} className={`relative rounded-xl border p-5 flex flex-col justify-between ${tier.color}`}>
                {tier.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#06B6D4] text-slate-950 font-black text-[9px] tracking-wider uppercase shadow-md font-mono">
                    {tier.badge}
                  </div>
                )}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-white font-mono">{tier.name}</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">{tier.subtitle}</p>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-white font-mono">{tier.price}</span>
                    <span className="text-[11px] text-slate-400 font-mono">{tier.billing}</span>
                  </div>
                  <ul className="space-y-2 text-[11px] text-slate-300">
                    {tier.features.map((feat, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <span className="text-[#06B6D4] font-bold">✓</span>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  type="button"
                  onClick={() => handleTierCheckout(tier)}
                  className={`w-full mt-5 py-2.5 rounded-lg transition-all text-xs cursor-pointer font-mono ${tier.buttonStyle}`}
                >
                  Subscribe to {tier.name}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BROKER PARTNER MODAL */}
      {isBrokerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Request Agency Partner Access</h3>
                <p className="text-[11px] text-cyan-400 mt-0.5">Get a custom co-branded portal &amp; loss-control suite for your agency.</p>
              </div>
              <button type="button" onClick={() => setIsBrokerModalOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            {brokerLeadSuccess ? (
              <div className="py-6 text-center space-y-3">
                <h4 className="text-sm font-bold text-white">Partner Access Requested!</h4>
                <p className="text-xs text-slate-400">Our partnership team will configure your agency portal and email <span className="text-cyan-300 font-bold">{brokerEmail}</span> shortly.</p>
                <button type="button" onClick={() => setIsBrokerModalOpen(false)} className="px-6 py-2 bg-slate-800 text-slate-200 text-xs font-bold rounded-lg mt-2">Close</button>
              </div>
            ) : (
              <form onSubmit={handleBrokerLeadSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Work Email</label>
                  <input type="email" required value={brokerEmail} onChange={(e) => setBrokerEmail(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]" placeholder="broker@agency.com" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Brokerage / Agency Name</label>
                  <input type="text" required value={brokerageName} onChange={(e) => setBrokerageName(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]" placeholder="e.g. Apex Risk Advisors" />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Commercial Fleet Book Size</label>
                  <select value={portfolioSize} onChange={(e) => setPortfolioSize(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]">
                    <option value="1-10">1 – 10 Commercial Accounts</option>
                    <option value="10-50">10 – 50 Commercial Accounts</option>
                    <option value="50-200">50 – 200 Commercial Accounts</option>
                    <option value="200+">200+ Accounts (Enterprise Agency)</option>
                  </select>
                </div>
                {brokerLeadError && <div className="p-2.5 rounded bg-red-950/40 border border-red-800/80 text-red-300 text-xs font-mono">{brokerLeadError}</div>}
                <button type="submit" disabled={isSubmittingBrokerLead} className="w-full py-2.5 bg-[#06B6D4] text-slate-950 font-bold text-xs rounded-lg font-mono">
                  {isSubmittingBrokerLead ? 'Submitting...' : 'Request Agency Workspace →'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* AUTHENTICATION MODAL */}
      {isAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 font-mono">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white uppercase">{isSignUp ? `Create Account (${selectedTier.toUpperCase()})` : 'Sign In'}</h3>
                {isSignUp && activeBrokerName && (
                  <p className="text-[11px] text-cyan-400 mt-1">
                    🛡️ Linked to Broker: {activeBrokerName}
                  </p>
                )}
              </div>
              <button type="button" onClick={() => setIsAuthModalOpen(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Email Address</label>
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]" placeholder="name@company.com" />
              </div>
              {isSignUp && (
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Company / Fleet Name</label>
                  <input type="text" required={isSignUp} value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]" placeholder="e.g. Apex Freight Logistics" />
                </div>
              )}
              <div>
                <label className="block text-xs text-slate-400 mb-1">Password</label>
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-[#070B14] border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-[#06B6D4]" placeholder="••••••••" />
              </div>
              {authError && <div className="p-2.5 rounded bg-red-950/40 border border-red-800/80 text-red-300 text-xs font-mono">{authError}</div>}
              <button type="submit" disabled={isSubmittingAuth} className="w-full py-2.5 bg-[#06B6D4] text-slate-950 font-bold text-xs rounded-lg font-mono">
                {isSubmittingAuth ? 'Processing...' : isSignUp ? 'Continue to Checkout' : 'Sign In'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;