import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Building2, 
  FileText, 
  Share2, 
  ChevronRight,
  TrendingUp,
  DollarSign
} from "lucide-react";

interface ClientAccount {
  id: string;
  name: string;
  tier: string;
  totalVins: number;
  openRecalls: number;
  clearedRecalls: number;
  safetyScore: number;
  riskTier?: string;
  nuclearLiabilityCount?: number;
  financialExposureUsd?: number;
  underwriterDiscount?: string;
  hasNuclearRecall: boolean;
  nuclearCampaign?: string;
  nuclearComponent?: string;
}

export const BrokerPortal: React.FC = () => {
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);

  useEffect(() => {
    const fetchBrokerPortfolio = async () => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://recalllogic-api.onrender.com";
      
      const mockClients = [
        { id: "apex-logistics", name: "Apex Logistics & Freight", tier: "ENTERPRISE TIER" },
        { id: "summit-regional", name: "Summit Regional Transport", tier: "PROFESSIONAL TIER" },
        { id: "titan-hauling", name: "Titan Heavy Hauling Co.", tier: "PROFESSIONAL TIER" },
        { id: "metro-delivery", name: "Metro Last-Mile Delivery", tier: "STANDARD TIER" }
      ];

      const updatedAccounts = await Promise.all(
        mockClients.map(async (client) => {
          try {
            const res = await fetch(`${API_BASE_URL}/dashboard/actuarial-score/${client.id}`);
            if (!res.ok) throw new Error("Failed to fetch actuarial metrics");
            const data = await res.json();

            return {
              id: client.id,
              name: client.name,
              tier: client.tier,
              totalVins: data.total_vins || 100,
              openRecalls: data.open_recalls || 0,
              clearedRecalls: Math.max(0, (data.total_vins || 100) - (data.open_recalls || 0)),
              safetyScore: data.safety_score ?? 85,
              riskTier: data.risk_tier || "PREFERRED",
              nuclearLiabilityCount: data.nuclear_liability_count || 0,
              financialExposureUsd: data.financial_exposure_usd || 0,
              underwriterDiscount: data.underwriter_discount_eligibility || "Standard Rates",
              hasNuclearRecall: (data.nuclear_liability_count || 0) > 0,
              nuclearCampaign: data.nuclear_liability_count > 0 ? "Campaign #23V-891" : undefined,
              nuclearComponent: data.nuclear_liability_count > 0 ? "STEERING / BRAKE ASSEMBLY" : undefined
            };
          } catch (err) {
            return {
              id: client.id,
              name: client.name,
              tier: client.tier,
              totalVins: client.id === "apex-logistics" ? 142 : client.id === "titan-hauling" ? 210 : 68,
              openRecalls: client.id === "apex-logistics" ? 3 : client.id === "titan-hauling" ? 14 : 0,
              clearedRecalls: client.id === "apex-logistics" ? 139 : client.id === "titan-hauling" ? 196 : 68,
              safetyScore: client.id === "apex-logistics" ? 82 : client.id === "titan-hauling" ? 58 : 98,
              riskTier: client.id === "titan-hauling" ? "ELEVATED" : "PREFERRED",
              nuclearLiabilityCount: client.id === "apex-logistics" || client.id === "titan-hauling" ? 1 : 0,
              financialExposureUsd: client.id === "apex-logistics" ? 250000 : client.id === "titan-hauling" ? 500000 : 0,
              underwriterDiscount: client.id === "apex-logistics" ? "12-15% Underwriter Credit" : client.id === "titan-hauling" ? "Subject to Audit / Surcharge" : "15% Optimal Credit",
              hasNuclearRecall: client.id === "apex-logistics" || client.id === "titan-hauling"
            };
          }
        })
      );

      setClientAccounts(updatedAccounts);
    };

    fetchBrokerPortfolio();
  }, []);

  const totalManagedVins = clientAccounts.reduce((acc, curr) => acc + curr.totalVins, 0);
  const totalFinancialExposure = clientAccounts.reduce((acc, curr) => acc + (curr.financialExposureUsd || 0), 0);
  const nuclearAlerts = clientAccounts.filter(a => a.hasNuclearRecall);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">
      {/* HEADER COMMAND BAR */}
      <div className="flex justify-between items-center mb-8 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-cyan-400" />
            <h1 className="text-2xl font-bold tracking-tight text-white">Apex Risk Brokers</h1>
            <span className="bg-cyan-950 text-cyan-400 text-xs px-2.5 py-1 rounded-full border border-cyan-800 font-mono">
              PORTFOLIO COMMAND
            </span>
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Co-branded book-of-business loss control tracking, risk scoring, and underwriter compliance audits.
          </p>
        </div>

        <div className="flex gap-4">
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition">
            <Share2 className="w-4 h-4 text-cyan-400" /> Share Client Onboarding Link
          </button>
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-lg shadow-cyan-900/40 transition">
            <FileText className="w-4 h-4" /> Export Portfolio Audit PDF
          </button>
        </div>
      </div>

      {/* CRITICAL NUCLEAR LIABILITY ALERT BANNER */}
      {nuclearAlerts.length > 0 && (
        <div className="mb-8 bg-red-950/60 border border-red-600/60 rounded-xl p-5 backdrop-blur-md">
          <div className="flex items-start gap-4">
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-red-200">
                  ⚠️ {nuclearAlerts.length} High Liability Exposure Alert(s) Detected in Portfolio
                </h3>
                <span className="bg-red-900/80 text-red-200 text-xs px-3 py-1 rounded font-mono font-semibold uppercase tracking-wider">
                  UNDERWRITER RISK FLAG
                </span>
              </div>
              <p className="text-red-300/80 text-sm mt-1">
                Commercial policyholders in your book are operating vehicles with unaddressed, critical safety recalls (Brakes/Steering).
              </p>

              <div className="mt-4 space-y-2">
                {nuclearAlerts.map(account => (
                  <div key={account.id} className="flex justify-between items-center bg-red-900/30 border border-red-800/40 p-3 rounded-lg text-sm">
                    <span className="font-semibold text-red-200">
                      {account.name}: <span className="font-mono text-red-300">{account.nuclearCampaign || "Campaign #23V-891"}</span> ({account.nuclearComponent || "CRITICAL SAFETY COMPONENT"})
                    </span>
                    <button className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-medium transition">
                      Audit Client Workspace →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MACRO PORTFOLIO KPI METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">ACTIVE FLEETS</span>
          <p className="text-3xl font-bold text-white mt-2">{clientAccounts.length}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">MANAGED VINS</span>
          <p className="text-3xl font-bold text-white mt-2">{totalManagedVins}</p>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">BOOK SAFETY SCORE</span>
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-emerald-400">82</p>
            <span className="text-slate-500 text-sm font-mono">/ 100</span>
          </div>
        </div>
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl">
          <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">PUNITIVE LIABILITY EXPOSURE</span>
          <p className="text-3xl font-bold text-red-400 mt-2">
            \${totalFinancialExposure.toLocaleString()}
          </p>
        </div>
      </div>

      {/* CLIENT ACCOUNTS GRID WITH DYNAMIC DOLLAR METRICS */}
      <div className="mb-4">
        <h2 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-4">
          APEX RISK BROKERS — CLIENT ACCOUNTS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clientAccounts.map((account) => (
            <div 
              key={account.id} 
              className={`bg-slate-900/90 border rounded-xl p-6 transition-all ${
                account.hasNuclearRecall 
                  ? "border-red-600/70 shadow-lg shadow-red-950/30" 
                  : "border-slate-800 hover:border-slate-700"
              }`}
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-bold text-white">{account.name}</h3>
                  <span className="text-slate-400 text-xs font-mono uppercase">{account.tier}</span>
                </div>
                
                <div className="text-right">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                    account.safetyScore >= 85 
                      ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                      : account.safetyScore >= 70 
                      ? "bg-amber-950 text-amber-400 border-amber-800"
                      : "bg-red-950 text-red-400 border-red-800"
                  }`}>
                    Safety Score: {account.safetyScore}/100
                  </span>
                </div>
              </div>

              {/* DYNAMIC FINANCIAL LIABILITY & UNDERWRITER CREDIT HIGHLIGHTS */}
              <div className="my-4 p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-red-400" /> Punitive Liability Risk:
                  </span>
                  <span className={`font-mono font-bold ${
                    (account.financialExposureUsd || 0) > 0 ? "text-red-400" : "text-emerald-400"
                  }`}>
                    \${(account.financialExposureUsd || 0).toLocaleString()} USD
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-emerald-400" /> Underwriter Credit:
                  </span>
                  <span className="font-mono text-emerald-400 font-medium">
                    {account.underwriterDiscount}
                  </span>
                </div>
              </div>

              {/* STATS BREAKDOWN */}
              <div className="grid grid-cols-3 gap-4 my-4 p-3 bg-slate-950/60 rounded-lg border border-slate-800/50 text-center">
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">TOTAL VINS</span>
                  <p className="text-slate-200 font-bold text-sm">{account.totalVins}</p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">OPEN RECALLS</span>
                  <p className={`font-bold text-sm ${account.openRecalls > 0 ? "text-red-400" : "text-emerald-400"}`}>
                    {account.openRecalls}
                  </p>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] font-mono uppercase">CLEARED</span>
                  <p className="text-emerald-400 font-bold text-sm">{account.clearedRecalls}</p>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-800/60">
                <span className="text-xs text-slate-500 font-mono">
                  Partnered via Apex Risk Brokers
                </span>
                <button className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition">
                  Audit Client Workspace <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BrokerPortal;