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
  const [recallCount, setRecallCount] = useState<number>(48291);
  const [latency, setLatency] = useState<number>(14);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

  // Simulate real-time data sync updates
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
      id: 'predict',
      name: '1. Recall Logic Predict',
      subtitle: 'Predictive Hazard Intelligence',
      desc: 'Machine learning algorithms analyze early defect signals, warranty tickets, customer feedback, and component telemetry to flag risks before official mandates.',
      badge: 'PRE-EMPTIVE AI',
      color: 'from-cyan-500/20 to-blue-600/10',
      borderColor: 'border-cyan-500/40',
      iconColor: 'text-cyan-400',
      metrics: 'Catch defects 45 days prior to CPSC filing'
    },
    {
      id: 'sync',
      name: '2. Safety Sync Hub',
      subtitle: 'Real-Time Orchestration',
      desc: 'Automated nerve center connecting global databases (FDA, CPSC, NHTSA, RAPEX) directly into ERP/WMS for instant SKU batch isolation.',
      badge: 'CORE ENGINE',
      color: 'from-red-500/20 to-amber-600/10',
      borderColor: 'border-red-500/40',
      iconColor: 'text-red-400',
      metrics: '< 2 Second quarantine response time'
    },
    {
      id: 'trace',
      name: '3. Compliance & Audit Trace',
      subtitle: 'Governance & Defense',
      desc: 'Automated regulatory filing creation with an immutable ledger of every safety event, inventory lock, and customer communication.',
      badge: 'AUDIT READY',
      color: 'from-amber-500/20 to-emerald-600/10',
      borderColor: 'border-amber-500/40',
      iconColor: 'text-amber-400',
      metrics: '100% automated FDA eSubmitter docs'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F17] text-slate-100 font-sans selection:bg-[#06B6D4] selection:text-black overflow-x-hidden">
      
      {/* Background Grid & Glow Effects */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-[#06B6D4]/10 via-[#EF4444]/5 to-transparent blur-3xl opacity-60" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-[#EF4444]/10 rounded-full blur-3xl" />
        <div className="absolute top-96 -left-40 w-96 h-96 bg-[#06B6D4]/10 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.03]" 
          style={{
            backgroundImage: `radial-gradient(#94A3B8 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}
        />
      </div>

      {/* Global Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0B0F17]/80 border-b border-slate-800/80 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          <div className="flex items-center gap-3">
            <a href="#" className="flex items-center gap-2.5 group">
              <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-[#06B6D4] to-cyan-700 p-0.5 flex items-center justify-center shadow-[0_0_20px_rgba(6,182,212,0.3)] group-hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] transition-all">
                <div className="w-full h-full bg-[#0B0F17] rounded-[10px] flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#06B6D4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xl font-extrabold tracking-tight text-white flex items-center gap-1">
                  RecallLogic<span className="text-[#06B6D4]">.ai</span>
                </span>
                <span className="text-[9px] font-semibold tracking-widest text-slate-400 uppercase -mt-1">
                  Safety Intelligence System
                </span>
              </div>
            </a>
          </div>

          <nav className="hidden xl:flex items-center space-x-8 text-sm font-medium text-slate-300">
            <a href="#products" className="hover:text-[#06B6D4] transition-colors">Products</a>
            <a href="#sync-engine" className="hover:text-[#06B6D4] transition-colors flex items-center gap-1.5">
              <span>Real-Time Sync</span>
              <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-ping" />
            </a>
            <a href="#solutions" className="hover:text-[#06B6D4] transition-colors">Solutions</a>
            <a href="#docs" className="hover:text-[#06B6D4] transition-colors">Docs & API</a>
          </nav>

          <div className="hidden lg:flex items-center gap-5">
            <div className="flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/40 backdrop-blur-md shadow-[0_0_15px_rgba(239,68,68,0.15)]">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#EF4444] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#EF4444]"></span>
              </span>
              <div className="flex items-center gap-1.5 font-mono text-xs">
                <span className="font-bold text-[#EF4444] text-sm tracking-wider">
                  {recallCount.toLocaleString()}
                </span>
                <span className="text-[#EF4444]/90 font-semibold tracking-tight text-[11px] uppercase">
                  ACTIVE RECALLS MONITORED
                </span>
              </div>
            </div>

            <a 
              href="#demo" 
              className="px-4 py-2 rounded-lg bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center gap-2"
            >
              <span>Get Started</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
          </div>

          <div className="flex lg:hidden items-center gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EF4444]/15 border border-[#EF4444]/40">
              <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse" />
              <span className="font-mono text-xs font-bold text-[#EF4444]">
                {recallCount.toLocaleString()}
              </span>
            </div>

            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="lg:hidden border-b border-slate-800 bg-[#0B0F17]/95 px-4 pt-3 pb-6 space-y-4">
            <a href="#products" className="block text-slate-300 font-medium py-1">Products</a>
            <a href="#sync-engine" className="block text-slate-300 font-medium py-1">Real-Time Sync</a>
            <a href="#solutions" className="block text-slate-300 font-medium py-1">Solutions</a>
            <a href="#docs" className="block text-slate-300 font-medium py-1">Docs & API</a>
            <div className="pt-2">
              <a 
                href="#demo" 
                className="w-full text-center block py-2.5 rounded-lg bg-[#06B6D4] text-slate-950 font-semibold text-sm"
              >
                Access Safety System
              </a>
            </div>
          </div>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative z-10 pt-12 pb-20 lg:pt-20 lg:pb-32 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          <div className="lg:col-span-7 space-y-8">
            <div className="inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-[#06B6D4]/30 backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.15)]">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06B6D4] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06B6D4]"></span>
                </span>
                <span className="text-xs font-semibold text-slate-200 tracking-wide">
                  Real-Time Safety Sync Active
                </span>
              </div>
              <span className="h-3.5 w-px bg-slate-800" />
              <div className="flex items-center gap-1.5 font-mono text-xs text-[#06B6D4]">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>{latency}ms Latency</span>
              </div>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
                Predict, Prevent, and Neutralize Safety Risks in{' '}
                <span className="bg-gradient-to-r from-[#06B6D4] via-cyan-300 to-white bg-clip-text text-transparent">
                  Real Time
                </span>
              </h1>
              
              <p className="text-lg sm:text-xl text-slate-300 font-normal leading-relaxed max-w-2xl">
                The enterprise <strong className="text-white font-semibold">Safety Intelligence System</strong>. 
                Automatically ingest global regulatory feeds, supply chain telemetry, and early defect signals with 
                <span className="text-[#06B6D4] font-medium"> Real-Time Safety Sync</span> to lock compromised inventory before it impacts consumers.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <a 
                href="#sync" 
                className="px-7 py-4 rounded-xl bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-base transition-all shadow-[0_0_30px_rgba(6,182,212,0.4)] hover:shadow-[0_0_40px_rgba(6,182,212,0.6)] flex items-center justify-center gap-3 group"
              >
                <svg className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Start Real-Time Safety Sync</span>
              </a>

              <a 
                href="#demo" 
                className="px-7 py-4 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-200 font-semibold text-base border border-slate-700/80 hover:border-slate-600 transition-all flex items-center justify-center gap-2"
              >
                <span>Request Incident Demo</span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            </div>

            <div className="pt-6 border-t border-slate-800/80 grid grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-extrabold text-white font-mono">184+</div>
                <div className="text-xs text-slate-400 mt-0.5">Connected Regulatory Feeds</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#EF4444] font-mono">&lt; 2s</div>
                <div className="text-xs text-slate-400 mt-0.5">Automated SKU Quarantine</div>
              </div>
              <div>
                <div className="text-2xl font-extrabold text-[#06B6D4] font-mono">99.99%</div>
                <div className="text-xs text-slate-400 mt-0.5">System Sync Uptime</div>
              </div>
            </div>

          </div>

          <div className="lg:col-span-5 relative">
            <div className="absolute inset-0 bg-gradient-to-r from-[#06B6D4]/20 to-[#EF4444]/20 rounded-3xl blur-2xl opacity-60" />

            <div className="relative rounded-2xl bg-[#0F172A]/90 border border-slate-800 p-6 backdrop-blur-xl shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                  <div className="w-3 h-3 rounded-full bg-[#F59E0B]" />
                  <div className="w-3 h-3 rounded-full bg-[#06B6D4]" />
                  <span className="ml-2 font-mono text-xs text-slate-400">safety-sync-node-01</span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>ONLINE</span>
                </div>
              </div>

              <div className="space-y-3 font-mono text-xs">
                <div className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
                  Live Global Hazard Stream
                </div>

                <div className="p-3 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/30 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#EF4444] text-black">
                        CRITICAL RECALL
                      </span>
                      <span className="text-slate-300 font-semibold">FDA Feed #9401</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-tight">
                      Lithium Battery Thermal Runaway Risk - Batch #B8820
                    </p>
                  </div>
                  <span className="text-[10px] text-[#EF4444] font-bold whitespace-nowrap">JUST NOW</span>
                </div>

                <div className="p-3 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#06B6D4] text-black">
                        AUTO-LOCK EXEC
                      </span>
                      <span className="text-slate-300 font-semibold">Warehouse WMS-East</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-tight">
                      Quarantined 4,120 units across 12 distribution centers
                    </p>
                  </div>
                  <span className="text-[10px] text-[#06B6D4] font-bold whitespace-nowrap">1.2s AGO</span>
                </div>

                <div className="p-3 rounded-lg bg-[#F59E0B]/10 border border-[#F59E0B]/30 flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#F59E0B] text-black">
                        PREDICT SIGNAL
                      </span>
                      <span className="text-slate-300 font-semibold">Customer Ticket Anomaly</span>
                    </div>
                    <p className="text-slate-400 text-[11px] leading-tight">
                      Component #X7-900 showing 3.4x spike in heat complaints
                    </p>
                  </div>
                  <span className="text-[10px] text-[#F59E0B] font-bold whitespace-nowrap">4m AGO</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#06B6D4] animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-slate-300">Syncing CPSC, FDA, NHTSA, RAPEX</span>
                </div>
                <span className="text-slate-400 font-mono">100% Verified</span>
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* Product Offerings Section */}
      <section id="products" className="relative z-10 py-20 bg-slate-950/60 border-t border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
            <h2 className="text-xs font-bold tracking-widest text-[#06B6D4] uppercase">
              Modular Enterprise Architecture
            </h2>
            <p className="text-3xl sm:text-4xl font-extrabold text-white">
              3 Integrated Pillars of Safety Intelligence
            </p>
            <p className="text-slate-400 text-base">
              Deploy individually or combine into a unified safety ecosystem to protect your brand, inventory, and consumers.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {products.map((item, idx) => (
              <div 
                key={item.id}
                className={`relative rounded-2xl bg-gradient-to-b ${item.color} p-7 border ${item.borderColor} backdrop-blur-xl hover:translate-y-[-4px] transition-all duration-300 cursor-pointer flex flex-col justify-between group`}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold tracking-wider px-2.5 py-1 rounded bg-slate-900/80 border border-slate-700 text-slate-200">
                      {item.badge}
                    </span>
                    <span className="font-mono text-xs text-slate-400">0{idx + 1}</span>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-[#06B6D4] transition-colors">
                      {item.name}
                    </h3>
                    <p className={`text-xs font-semibold mt-0.5 ${item.iconColor}`}>
                      {item.subtitle}
                    </p>
                  </div>

                  <p className="text-sm text-slate-300 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-6 mt-6 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs font-mono text-slate-400">{item.metrics}</span>
                  <svg className={`w-5 h-5 ${item.iconColor} group-hover:translate-x-1 transition-transform`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

    </div>
  );
}