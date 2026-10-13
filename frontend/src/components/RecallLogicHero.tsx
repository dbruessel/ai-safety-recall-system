import React, { useState, useEffect } from 'react';

interface ProductOffering {
  id: string;
  name: string;
  subtitle: string;
  desc: string;
  badge: string;
  color: string;
  borderColor: string;
  iconColor: string;
  metrics: string;
}

export default function RecallLogicHero(): React.ReactElement {
  const [recallCount, setRecallCount] = useState<number>(30381);
  const [latency, setLatency] = useState<number>(14);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  useEffect(() => {
    const recallInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        setRecallCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
      }
    }, 3500);

    const latencyInterval = setInterval(() => {
      setLatency(Math.floor(Math.random() * 8) + 11);
    }, 2000);

    return () => {
      clearInterval(recallInterval);
      clearInterval(latencyInterval);
    };
  }, []);

  const products: ProductOffering[] = [
    {
      id: 'nuclear-shield',
      name: '1. Punitive Liability Shield',
      subtitle: 'Uninsurable Risk Neutralization',
      desc: 'Detects high-severity brake and steering recalls, quantifies out-of-pocket lawsuit exposure (\$250k+ per unit), and auto-creates priority repair tickets in Fleetio.',
      badge: 'LIABILITY SHIELD',
      color: 'from-red-500/20 to-amber-600/10',
      borderColor: 'border-red-500/40',
      iconColor: 'text-red-400',
      metrics: 'Eliminates 100% of uninsurable punitive lawsuit exposure'
    },
    {
      id: 'actuarial-score',
      name: '2. Actuarial Safety Engine',
      subtitle: '3-Pillar Loss Control Scoring',
      desc: 'Combines NHTSA recall severity (40%), Fleetio maintenance backlogs (35%), and Samsara/Geotab telematics (25%) into a certified Book Safety Score.',
      badge: 'ACTUARIAL CORE',
      color: 'from-cyan-500/20 to-blue-600/10',
      borderColor: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      metrics: 'Unlocks 12–15% renewal premium credits'
    },
    {
      id: 'broker-portal',
      name: '3. Broker Portfolio Command',
      subtitle: 'Co-Branded Agency Wedge',
      desc: 'Empowers commercial auto agencies to monitor book-of-business loss ratios, generate underwriter audit packets, and secure client policy renewals.',
      badge: 'BROKER DISTRIBUTION',
      color: 'from-amber-500/20 to-emerald-600/10',
      borderColor: 'border-amber-500/40',
      iconColor: 'text-amber-400',
      metrics: 'Certified PDF audit packets for carrier underwriters'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#06B6D4]/10 via-[#EF4444]/5 to-transparent blur-3xl opacity-60" />
      </div>

      {/* Global Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0B0F17]/80 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5">
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1 font-mono">
                  RecallLogic<span className="text-[#06B6D4]">.ai</span>
                </span>
                <span className="text-[9px] font-bold tracking-widest text-cyan-400 uppercase -mt-1 font-mono">
                  Insurtech Loss-Control Engine
                </span>
              </div>
            </a>
          </div>

          <nav className="hidden xl:flex items-center space-x-8 text-sm font-medium text-slate-300 font-mono">
            <a href="#products" className="hover:text-[#06B6D4]">3-Pillar Framework</a>
            <a href="/audit/demo" className="hover:text-[#06B6D4]">Broker Portal</a>
            <a href="/taskboard/demo" className="hover:text-[#06B6D4]">Remediation Workspace</a>
          </nav>

          <div className="hidden lg:flex items-center gap-5 font-mono">
            {/* Re-integrated latency state badge */}
            <div className="flex items-center gap-2 text-xs text-cyan-400 bg-cyan-950/60 border border-cyan-800 px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span>{latency}ms Sync Latency</span>
            </div>

            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/40">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF4444]"></span>
              </span>
              <span className="font-bold text-[#EF4444] text-xs">
                {recallCount.toLocaleString()} RECALLS MONITORED
              </span>
            </div>

            <a 
              href="/audit/demo" 
              className="px-4 py-2 rounded-lg bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all"
            >
              Launch Audit Demo →
            </a>
          </div>

          {/* Re-integrated Mobile Navigation Menu Toggle */}
          <div className="flex lg:hidden items-center gap-3">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              ☰
            </button>
          </div>
        </div>

        {/* Re-integrated Mobile Dropdown */}
        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-[#0B0F17]/95 px-4 pt-3 pb-6 space-y-3 font-mono text-xs">
            <a href="#products" className="block text-slate-300 py-1">3-Pillar Framework</a>
            <a href="/audit/demo" className="block text-cyan-400 py-1">Broker Portal Demo</a>
            <a href="/taskboard/demo" className="block text-slate-300 py-1">Remediation Workspace</a>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20 lg:pt-20 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 font-sans">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-[#06B6D4]/30">
              <span className="text-xs font-mono text-cyan-300 font-bold">
                COMMERCIAL AUTO RISK MITIGATION & PREMIUM REDUCTION
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Neutralize Fleet Risk &amp; Unlock{' '}
                <span className="bg-gradient-to-r from-[#06B6D4] via-cyan-300 to-white bg-clip-text text-transparent">
                  12–15% Rate Credits
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-300 leading-relaxed">
                The <strong className="text-white">Insurtech Loss-Control Engine</strong>. Translate raw Fleetio maintenance logs and Samsara/Geotab telematics into certified Underwriter Compliance Packets that eliminate uninsurable \$250k punitive liability threats.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <a 
                href="/audit/demo" 
                className="px-7 py-4 rounded-xl bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-base transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] flex items-center justify-center gap-3 font-mono"
              >
                <span>Audit Broker Portfolio →</span>
              </a>

              <a 
                href="/taskboard/demo" 
                className="px-7 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-700/80 flex items-center justify-center gap-2 font-mono"
              >
                <span>View Evidence Locker</span>
              </a>
            </div>

            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4 font-mono">
              <div>
                <div className="text-2xl font-extrabold text-white">\$250K+</div>
                <div className="text-xs text-slate-400 mt-0.5">Punitive Risk Shielded / Unit</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#06B6D4]">12–15%</div>
                <div className="text-xs text-slate-400 mt-0.5">Underwriter Premium Credit</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#34d399]">100%</div>
                <div className="text-xs text-slate-400 mt-0.5">Automated Fleetio Fix-It Loop</div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative font-mono text-xs">
            <div className="relative rounded-2xl bg-[#0F172A]/90 border border-slate-800 p-6 backdrop-blur-xl space-y-4">
              <div className="text-slate-400 text-[11px] uppercase tracking-wider font-bold border-b border-slate-800 pb-2">
                Live Actuarial Loss-Control Stream
              </div>

              <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#EF4444]">NUCLEAR RECALL ALERT</span>
                  <span className="text-[10px] text-slate-400">APEX LOGISTICS</span>
                </div>
                <p className="text-slate-300 text-[11px]">Campaign #23V-891 — Steering Axle Drag Link</p>
                <p className="text-red-400 text-[10px] font-bold">Uninsurable Exposure: \$250,000 USD</p>
              </div>

              <div className="p-3 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#06B6D4]">AUTOMATED FIX-IT TRIGGER</span>
                  <span className="text-[10px] text-slate-400">🔌 FLEETIO SYNC</span>
                </div>
                <p className="text-slate-300 text-[11px]">Work Order #WO-FLT-889102 Generated</p>
                <p className="text-cyan-300 text-[10px]">Pushed Priority 1 Repair Ticket to Fleet Shop</p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/60 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">UNDERWRITER CREDIT UNLOCKED</span>
                  <span className="text-[10px] text-slate-400">VERIFIED</span>
                </div>
                <p className="text-slate-300 text-[11px]">Safety Score Raised to 91/100 (Preferred Risk)</p>
                <p className="text-emerald-300 text-[10px] font-bold">12% Renewal Rate Discount Applied</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Product Offerings Section */}
      <section id="products" className="relative z-10 py-20 bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold tracking-widest text-[#06B6D4] uppercase font-mono">
              The 3-Pillar Actuarial Risk Framework
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              Financial Insurance Translation for Commercial Fleets
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {products.map((item, idx) => (
              <div key={item.id} className={`relative rounded-2xl bg-gradient-to-b ${item.color} p-7 border ${item.borderColor} backdrop-blur-xl flex flex-col justify-between`}>
                <div className="space-y-4">
                  <div className="flex items-center justify-between font-mono">
                    <span className="text-[10px] font-extrabold px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200">
                      {item.badge}
                    </span>
                    <span className="text-xs text-slate-400">0{idx + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{item.name}</h3>
                    <p className={`text-xs font-semibold mt-0.5 ${item.iconColor}`}>{item.subtitle}</p>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed">{item.desc}</p>
                </div>
                <div className="pt-6 mt-6 border-t border-slate-800/80 font-mono text-xs text-slate-400">
                  {item.metrics}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}