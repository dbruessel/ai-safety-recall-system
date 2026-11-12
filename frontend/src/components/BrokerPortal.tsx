import React, { useState, useEffect } from "react";
import { 
  ShieldAlert, 
  Building2, 
  FileText, 
  Share2, 
  ChevronRight,
  TrendingUp,
  DollarSign,
  Info,
  X,
  CheckCircle2,
  Wrench,
  Radio,
  Plug,
  Mail,
  CreditCard,
  Sparkles,
} from "lucide-react";
import { FleetioIntegrationModal } from "./FleetioIntegrationModal";
import { PricingUpgradeModal } from "./PricingUpgradeModal";
import { trackEvent } from "../utils/telemetry";

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
  recallPenalty?: number;
  maintenancePenalty?: number;
  telematicsPenalty?: number;
  connectedProviders?: string[];
}

interface BrokerPortalProps {
  onAuditClient?: (clientName: string) => void;
}

export const BrokerPortal: React.FC<BrokerPortalProps> = ({ onAuditClient }) => {
  const [clientAccounts, setClientAccounts] = useState<ClientAccount[]>([]);
  const [showScoreTooltip, setShowScoreTooltip] = useState<boolean>(false);
  const [showLiabilityTooltip, setShowLiabilityTooltip] = useState<boolean>(false);
  const [isFleetioModalOpen, setIsFleetioModalOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [activeSelectedClient, setActiveSelectedClient] = useState<{ id: string; name: string }>({
    id: "dennis-enterprise",
    name: "Dennis Enterprise Fleet",
  });

  useEffect(() => {
    document.title = "RECALLLOGIC — Enterprise Loss Control System";

    trackEvent({
      event: "sandbox_opened",
      portal: "broker",
    });

    const fetchBrokerPortfolio = async () => {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://recalllogic-api.onrender.com";
      
      const mockClients = [
        { id: "dennis-enterprise", name: "Dennis Enterprise Fleet", tier: "ENTERPRISE TIER" },
        { id: "apex-logistics", name: "Apex Logistics & Freight", tier: "ENTERPRISE TIER" },
        { id: "summit-regional", name: "Summit Regional Transport", tier: "PROFESSIONAL TIER" },
        { id: "titan-hauling", name: "Titan Heavy Hauling Co.", tier: "PROFESSIONAL TIER" },
        { id: "metro-delivery", name: "Metro Last-Mile Delivery", tier: "STANDARD TIER" }
      ];

      const getFallbackAccount = (client: { id: string; name: string; tier: string }): ClientAccount => ({
        id: client.id,
        name: client.name,
        tier: client.tier,
        totalVins:
          client.id === "dennis-enterprise"
            ? 4
            : client.id === "apex-logistics"
            ? 142
            : client.id === "titan-hauling"
            ? 210
            : client.id === "summit-regional"
            ? 68
            : 45,
        openRecalls:
          client.id === "dennis-enterprise"
            ? 1
            : client.id === "apex-logistics"
            ? 3
            : client.id === "titan-hauling"
            ? 14
            : client.id === "metro-delivery"
            ? 1
            : 0,
        clearedRecalls:
          client.id === "dennis-enterprise"
            ? 3
            : client.id === "apex-logistics"
            ? 139
            : client.id === "titan-hauling"
            ? 196
            : client.id === "summit-regional"
            ? 68
            : 44,
        safetyScore:
          client.id === "dennis-enterprise"
            ? 82
            : client.id === "apex-logistics"
            ? 82
            : client.id === "titan-hauling"
            ? 58
            : client.id === "metro-delivery"
            ? 90
            : 98,
        riskTier:
          client.id === "titan-hauling"
            ? "HIGH RISK / NUCLEAR EXPOSURE"
            : client.id === "dennis-enterprise" || client.id === "apex-logistics"
            ? "STANDARD"
            : "PREFERRED",
        nuclearLiabilityCount:
          client.id === "dennis-enterprise" ||
          client.id === "apex-logistics" ||
          client.id === "titan-hauling"
            ? 1
            : 0,
        financialExposureUsd:
          client.id === "dennis-enterprise"
            ? 250000
            : client.id === "apex-logistics"
            ? 250000
            : client.id === "titan-hauling"
            ? 500000
            : 0,
        underwriterDiscount:
          client.id === "dennis-enterprise" ||
          client.id === "apex-logistics" ||
          client.id === "titan-hauling"
            ? "Locked — Resolve Recalls to Unlock 15% Credit"
            : "15% Optimal Credit",
        hasNuclearRecall:
          client.id === "dennis-enterprise" ||
          client.id === "apex-logistics" ||
          client.id === "titan-hauling",
        nuclearCampaign:
          client.id === "dennis-enterprise" || client.id === "apex-logistics"
            ? "Campaign #23V-891"
            : client.id === "titan-hauling"
            ? "Campaign #23V-838"
            : undefined,
        nuclearComponent:
          client.id === "dennis-enterprise" || client.id === "apex-logistics"
            ? "STEERING AXLE DRAG LINK"
            : client.id === "titan-hauling"
            ? "AIR BRAKE ACTUATOR DIAPHRAGM"
            : undefined,
        recallPenalty:
          client.id === "dennis-enterprise"
            ? 11
            : client.id === "apex-logistics"
            ? 11
            : client.id === "titan-hauling"
            ? 28
            : client.id === "metro-delivery"
            ? 2
            : 0,
        maintenancePenalty:
          client.id === "dennis-enterprise"
            ? 7
            : client.id === "apex-logistics"
            ? 7
            : client.id === "titan-hauling"
            ? 14
            : 0,
        telematicsPenalty: 0,
        connectedProviders:
          client.id === "dennis-enterprise"
            ? ["fleetio", "samsara"]
            : client.id === "apex-logistics"
            ? ["fleetio", "samsara"]
            : client.id === "titan-hauling"
            ? ["geotab"]
            : ["fleetio"],
      });

      const params = new URLSearchParams(window.location.search);
      if (params.get("demo") === "true") {
        setClientAccounts(mockClients.map(getFallbackAccount));
        return;
      }

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
              totalVins: data.total_vins || (client.id === "dennis-enterprise" ? 4 : 100),
              openRecalls: data.open_recalls ?? (client.id === "dennis-enterprise" ? 1 : 0),
              clearedRecalls: Math.max(0, (data.total_vins || 100) - (data.open_recalls || 0)),
              safetyScore: data.safety_score ?? (client.id === "dennis-enterprise" ? 82 : 85),
              riskTier: data.risk_tier || (client.id === "dennis-enterprise" ? "NUCLEAR RISK" : "PREFERRED"),
              nuclearLiabilityCount: data.nuclear_liability_count ?? (client.id === "dennis-enterprise" ? 1 : 0),
              financialExposureUsd: data.financial_exposure_usd ?? (client.id === "dennis-enterprise" ? 250000 : 0),
              underwriterDiscount: data.underwriter_discount_eligibility || (client.id === "dennis-enterprise" ? "Locked — Resolve Recalls for 15% Credit" : "Standard Rates"),
              hasNuclearRecall: (data.nuclear_liability_count ?? (client.id === "dennis-enterprise" ? 1 : 0)) > 0,
              nuclearCampaign: (data.nuclear_liability_count || client.id === "dennis-enterprise") ? "Campaign #23V-891" : undefined,
              nuclearComponent: (data.nuclear_liability_count || client.id === "dennis-enterprise") ? "STEERING AXLE DRAG LINK" : undefined,
              recallPenalty: data.breakdown?.recall_penalty ?? 11,
              maintenancePenalty: data.breakdown?.maintenance_penalty ?? 7,
              telematicsPenalty: data.breakdown?.telematics_penalty ?? 0,
              connectedProviders: client.id === "dennis-enterprise" ? ["fleetio", "samsara"] : client.id === "apex-logistics" ? ["fleetio", "samsara"] : client.id === "titan-hauling" ? ["geotab"] : ["fleetio"]
            };
          } catch {
            return getFallbackAccount(client);
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

  const avgRecallDeduction = Math.round(clientAccounts.reduce((acc, curr) => acc + (curr.recallPenalty || 0), 0) / (clientAccounts.length || 1));
  const avgMaintDeduction = Math.round(clientAccounts.reduce((acc, curr) => acc + (curr.maintenancePenalty || 0), 0) / (clientAccounts.length || 1));

  const handleOpenIntegrationModal = (clientId: string, clientName: string) => {
    trackEvent({
      event: "sync_fleetio_modal_opened",
      portal: "broker",
      metadata: { client_id: clientId, client_name: clientName },
    });
    setActiveSelectedClient({ id: clientId, name: clientName });
    setIsFleetioModalOpen(true);
  };

  const handleAuditClient = (clientName: string, source: "alert_banner" | "account_card") => {
    trackEvent({
      event: "broker_client_drilled_down",
      portal: "broker",
      metadata: { client_name: clientName, source },
    });

    if (onAuditClient) {
      onAuditClient(clientName);
    } else {
      const fleetUrl = new URL("/portal/fleet", window.location.origin);
      fleetUrl.searchParams.set("demo", "true");
      fleetUrl.searchParams.set("fleet", clientName);
      fleetUrl.searchParams.set("from", "broker");
      window.location.href = fleetUrl.toString();
    }
  };

  const handleOpenPricing = (source: string) => {
    trackEvent({
      event: "pricing_modal_opened",
      portal: "broker",
      metadata: { source },
    });
    setIsPricingOpen(true);
  };

  const getTierBadgeDetails = (score: number, hasNuclear: boolean) => {
    if (hasNuclear || score < 60) {
      return {
        label: "NUCLEAR RISK • High Lawsuit Vulnerability",
        colorClass: "bg-red-950 text-red-300 border-red-700/80"
      };
    } else if (score >= 85) {
      return {
        label: "PREFERRED RISK • Eligible for 15% Rate Credit",
        colorClass: "bg-emerald-950 text-emerald-300 border-emerald-700/80"
      };
    } else if (score >= 70) {
      return {
        label: "STANDARD RISK • Baseline Renewal Rate",
        colorClass: "bg-amber-950 text-amber-300 border-amber-700/80"
      };
    } else {
      return {
        label: "ELEVATED EXPOSURE • Subject to Carrier Audit",
        colorClass: "bg-orange-950 text-orange-300 border-orange-700/80"
      };
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 relative">
      
      {/* ENTERPRISE PLATFORM BRANDING BAR */}
      <div className="flex items-center justify-between pb-3 mb-6 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-3">
          <span className="font-extrabold tracking-wider text-cyan-400 font-mono text-sm">
            RECALLLOGIC
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400 font-medium tracking-wide uppercase text-[11px]">
            Continuous Risk Defense Platform
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-300/80 font-mono text-[11px] bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
            Enterprise Loss Control System
          </span>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>NHTSA Sync Active</span>
        </div>
      </div>

      {/* HEADER COMMAND BAR */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-800 pb-5">
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

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => handleOpenPricing("header_button")}
            className="flex items-center gap-1.5 bg-emerald-950/80 border border-emerald-600/70 hover:bg-emerald-900/90 text-emerald-300 px-3.5 py-2 rounded-lg text-xs font-bold transition shadow-sm cursor-pointer font-mono"
          >
            <CreditCard className="w-3.5 h-3.5 text-emerald-400" />
            <span>Plans &amp; Pricing ($99+/mo)</span>
          </button>

          <button 
            onClick={() => handleOpenIntegrationModal("dennis-enterprise", "Dennis Enterprise Fleet")}
            className="flex items-center gap-2 bg-slate-900 border border-cyan-500/50 hover:bg-slate-800 text-cyan-300 px-3.5 py-2 rounded-lg text-xs font-semibold transition shadow-sm shadow-cyan-950 cursor-pointer"
          >
            <Plug className="w-4 h-4 text-cyan-400" /> Connect Fleetio &amp; Telematics
          </button>
          
          {/* COMBINED ONBOARDING ACTIONS (COPY & MAILTO) */}
          <div className="flex items-center bg-slate-900 border border-slate-700 rounded-lg p-0.5">
            <button 
              type="button"
              onClick={async () => {
                const onboardingLink = `${window.location.origin}/signup?broker=apex-risk&broker_name=${encodeURIComponent('Apex Risk Brokers')}`;
                trackEvent({
                  event: "broker_onboarding_link_copied",
                  portal: "broker",
                });
                try {
                  await navigator.clipboard.writeText(onboardingLink);
                  setIsCopied(true);
                  setTimeout(() => setIsCopied(false), 2500);
                } catch (err) {
                  console.error("Clipboard copy failed:", err);
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
              title="Copy onboarding URL to clipboard"
            >
              <Share2 className={`w-3.5 h-3.5 ${isCopied ? "text-emerald-400" : "text-cyan-400"}`} />
              <span>{isCopied ? "✓ Copied!" : "Share Link"}</span>
            </button>

            <span className="text-slate-700">|</span>

            <button
              type="button"
              onClick={() => {
                trackEvent({
                  event: "broker_email_draft_opened",
                  portal: "broker",
                });
                const onboardingLink = `${window.location.origin}/signup?broker=apex-risk&broker_name=${encodeURIComponent('Apex Risk Brokers')}`;
                const subject = encodeURIComponent("Action Required: Loss-Control Audit & Pre-Renewal Rate Credit");
                const body = encodeURIComponent(
`Hi Team,

In preparation for upcoming commercial auto renewal negotiations with underwriters, Apex Risk Brokers has provisioned an Underwriter Loss-Control Audit for your fleet.

Operating power units with open NHTSA safety recalls exposes your business to uninsurable punitive liability in highway litigation and triggers carrier rate surcharges.

Please claim your fleet workspace to verify your units and defend up to a 15% rate credit at renewal:
👉 ${onboardingLink}

You can connect your Fleetio instance in under 60 seconds (or upload your active VIN list) to certify zero open safety defects.

Best regards,
Commercial Transportation Risk Division
Apex Risk Brokers`
                );
                window.location.href = `mailto:?subject=${subject}&body=${body}`;
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:text-cyan-200 hover:bg-cyan-950/40 rounded transition cursor-pointer"
              title="Open pre-drafted email invitation in Outlook / Gmail"
            >
              <Mail className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open Email Draft ↗</span>
            </button>
          </div>
          
          <button 
            onClick={() => {
              trackEvent({
                event: "portfolio_pdf_exported",
                portal: "broker",
              });
              alert("Generating aggregate portfolio loss control audit PDF for underwriters...");
            }}
            className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-lg text-xs font-semibold shadow-lg shadow-cyan-900/40 transition cursor-pointer"
          >
            <FileText className="w-4 h-4" /> Export Portfolio Audit PDF
          </button>
        </div>
      </div>

      {/* BROKER SANDBOX CONVERSION & PRICING STRIP */}
      <div className="mb-8 p-3.5 rounded-xl bg-slate-900/90 border border-cyan-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 text-xs">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="text-slate-300">
            <strong className="text-white font-semibold">Broker Portfolio Sandbox:</strong> Click any client workspace below to inspect unit-level NHTSA defects, run a free 5-VIN renewal scrub, or deploy across your book starting at{' '}
            <strong className="text-emerald-400 font-mono">$99/mo</strong>.
          </span>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            type="button"
            onClick={() => handleAuditClient("Dennis Enterprise Fleet", "account_card")}
            className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
          >
            Test Live VIN Scanner
          </button>
          <button
            type="button"
            onClick={() => handleOpenPricing("sandbox_banner")}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-mono font-bold transition cursor-pointer"
          >
            See Pricing →
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
                    <button 
                      onClick={() => handleAuditClient(account.name, "alert_banner")}
                      className="text-xs bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded font-medium transition cursor-pointer"
                    >
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

        {/* BOOK SAFETY SCORE */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl relative">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">BOOK SAFETY SCORE</span>
            <button 
              onClick={() => {
                const next = !showScoreTooltip;
                setShowScoreTooltip(next);
                if (next) {
                  trackEvent({ event: "actuarial_score_tooltip_opened", portal: "broker" });
                }
              }}
              className="text-slate-400 hover:text-cyan-400 p-1 transition cursor-pointer"
              title="Click to view actuarial calculation breakdown"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          
          <div className="flex items-baseline gap-2 mt-2">
            <p className="text-3xl font-bold text-emerald-400">82</p>
            <span className="text-slate-500 text-sm font-mono">/ 100</span>
          </div>

          {showScoreTooltip && (
            <div className="absolute top-16 left-0 right-0 z-50 p-5 bg-slate-900 border border-cyan-500/60 rounded-xl shadow-2xl shadow-cyan-950/80 text-xs w-[320px] md:w-[380px] backdrop-blur-lg">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-cyan-400 flex items-center gap-1.5 text-sm">
                  <Info className="w-4 h-4" /> Actuarial Score Breakdown
                </span>
                <button onClick={() => setShowScoreTooltip(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 mb-3 leading-relaxed">
                Measures portfolio-wide loss control compliance (<strong>NOT</strong> crash probability). 100 represents zero unaddressed recalls or maintenance defects.
              </p>

              <div className="space-y-2 font-mono text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                  <span>BASE COMPLIANCE SCORE:</span>
                  <span className="text-emerald-400 font-bold">100 PTS</span>
                </div>
                <div className="flex justify-between text-red-400">
                  <span className="flex items-center gap-1"><ShieldAlert className="w-3 h-3" /> Recall Penalty (40% Wt):</span>
                  <span>-{avgRecallDeduction} PTS</span>
                </div>
                <div className="flex justify-between text-amber-400">
                  <span className="flex items-center gap-1"><Wrench className="w-3 h-3" /> Maint. Backlog (35% Wt):</span>
                  <span>-{avgMaintDeduction} PTS</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span className="flex items-center gap-1"><Radio className="w-3 h-3" /> Telematics Style (25% Wt):</span>
                  <span>-0 PTS</span>
                </div>
                <div className="flex justify-between text-cyan-300 border-t border-slate-800 pt-1 font-bold">
                  <span>CURRENT RATING:</span>
                  <span>STANDARD RISK (82/100)</span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-cyan-950/50 border border-cyan-800/60 rounded text-[11px] text-cyan-200">
                💡 <strong>Underwriter Tip:</strong> Resolve active nuclear recalls to elevate this book to <strong>Preferred Tier (92/100)</strong>.
              </div>
            </div>
          )}
        </div>

        {/* PUNITIVE LIABILITY EXPOSURE */}
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-xl relative">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">PUNITIVE LIABILITY EXPOSURE</span>
            <button 
              onClick={() => {
                const next = !showLiabilityTooltip;
                setShowLiabilityTooltip(next);
                if (next) {
                  trackEvent({ event: "punitive_liability_tooltip_opened", portal: "broker" });
                }
              }}
              className="text-slate-400 hover:text-red-400 p-1 transition cursor-pointer"
              title="Click to view legal exposure calculation breakdown"
            >
              <Info className="w-4 h-4" />
            </button>
          </div>
          
          <p className="text-3xl font-bold text-red-400 mt-2">
            ${totalFinancialExposure.toLocaleString()}
          </p>

          {showLiabilityTooltip && (
            <div className="absolute top-16 right-0 z-50 p-5 bg-slate-900 border border-red-500/60 rounded-xl shadow-2xl shadow-red-950/90 text-xs w-[320px] md:w-[380px] backdrop-blur-lg">
              <div className="flex justify-between items-center border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-red-400 flex items-center gap-1.5 text-sm">
                  <ShieldAlert className="w-4 h-4 text-red-500" /> Uninsurable Legal Exposure
                </span>
                <button onClick={() => setShowLiabilityTooltip(false)} className="text-slate-400 hover:text-white cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-slate-300 mb-3 leading-relaxed">
                Estimated <strong>out-of-pocket court damages</strong> awarded in gross-negligence lawsuits when crashes involve unaddressed critical safety recalls. Standard insurance policies <strong>DO NOT</strong> cover punitive penalties.
              </p>

              <div className="space-y-2 font-mono text-[11px] bg-slate-950 p-3 rounded-lg border border-slate-800">
                <div className="flex justify-between text-slate-400 border-b border-slate-800 pb-1">
                  <span>PORTFOLIO NUCLEAR RECALLS:</span>
                  <span className="text-red-400 font-bold">{nuclearAlerts.length} ACTIVE</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Dennis Enterprise Fleet:</span>
                  <span className="text-red-400 font-bold">$250,000</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Apex Logistics (Campaign #23V-891):</span>
                  <span className="text-red-400 font-bold">$250,000</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Titan Heavy Hauling (Campaign #23V-838):</span>
                  <span className="text-red-400 font-bold">$500,000</span>
                </div>
                <div className="flex justify-between text-red-400 border-t border-slate-800 pt-1 font-bold">
                  <span>TOTAL UNINSURABLE RISK:</span>
                  <span>${totalFinancialExposure.toLocaleString()} USD</span>
                </div>
              </div>

              <div className="mt-3 p-2 bg-red-950/60 border border-red-800/80 rounded text-[11px] text-red-200">
                ⚖️ <strong>Legal Impact:</strong> Syncing Fleetio automatically pushes repair Work Orders to shops, proving due diligence and eliminating 100% of punitive lawsuit liability.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* CLIENT ACCOUNTS GRID */}
      <div className="mb-4">
        <h2 className="text-sm font-mono text-slate-400 uppercase tracking-wider mb-4">
          APEX RISK BROKERS — CLIENT ACCOUNTS
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {clientAccounts.map((account) => {
            const tierBadge = getTierBadgeDetails(account.safetyScore, account.hasNuclearRecall);

            return (
              <div 
                key={account.id} 
                className={`bg-slate-900/90 border rounded-xl p-6 transition-all ${
                  account.hasNuclearRecall 
                    ? "border-red-600/70 shadow-lg shadow-red-950/30" 
                    : "border-slate-800 hover:border-slate-700"
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-lg font-bold text-white">{account.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-slate-400 text-xs font-mono uppercase">{account.tier}</span>
                      {account.connectedProviders && account.connectedProviders.map(p => (
                        <span key={p} className="bg-cyan-950/80 border border-cyan-800 text-cyan-300 text-[10px] font-mono px-1.5 py-0.2 rounded uppercase">
                          🔌 {p}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                      account.safetyScore >= 85 && !account.hasNuclearRecall
                        ? "bg-emerald-950 text-emerald-400 border-emerald-800" 
                        : account.safetyScore >= 70 && !account.hasNuclearRecall
                        ? "bg-amber-950 text-amber-400 border-amber-800"
                        : "bg-red-950 text-red-400 border-red-800"
                    }`}>
                      Safety Score: {account.safetyScore}/100
                    </span>
                  </div>
                </div>

                <div className="mb-4">
                  <span className={`inline-block text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded border ${tierBadge.colorClass}`}>
                    {tierBadge.label}
                  </span>
                </div>

                <div className="my-4 p-3.5 bg-slate-950 rounded-lg border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <DollarSign className="w-4 h-4 text-red-400" /> Punitive Liability Exposure:
                    </span>
                    <span className={`font-mono font-bold ${
                      (account.financialExposureUsd || 0) > 0 ? "text-red-400" : "text-emerald-400"
                    }`}>
                      ${(account.financialExposureUsd || 0).toLocaleString()} USD
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-emerald-400" /> Underwriter Rate Credit:
                    </span>
                    <span className={`font-mono font-medium ${
                      account.hasNuclearRecall ? "text-amber-400" : "text-emerald-400"
                    }`}>
                      {account.hasNuclearRecall 
                        ? "Locked — Resolve Recalls to Unlock 15% Credit" 
                        : account.underwriterDiscount}
                    </span>
                  </div>
                </div>

                {account.hasNuclearRecall && (
                  <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-lg text-xs">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-cyan-300">Actionable Underwriter ROI:</span>
                        <p className="text-slate-300 mt-0.5 leading-normal">
                          Clearing <strong className="text-white font-mono">{account.nuclearCampaign || "active recall"}</strong> will remove <strong className="text-red-300">${(account.financialExposureUsd || 0).toLocaleString()}</strong> in punitive exposure, raising fleet score to <strong className="text-emerald-300">92/100</strong> and unlocking a <strong className="text-emerald-300">15% renewal premium credit</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

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
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleOpenIntegrationModal(account.id, account.name)}
                      className="text-xs font-medium text-slate-400 hover:text-cyan-300 border border-slate-800 px-2.5 py-1 rounded transition flex items-center gap-1 cursor-pointer"
                    >
                      <Plug className="w-3 h-3 text-cyan-400" /> Sync Fleetio
                    </button>
                    <button 
                      onClick={() => handleAuditClient(account.name, "account_card")}
                      className="text-xs font-medium text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition cursor-pointer"
                    >
                      Audit Client Workspace <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <FleetioIntegrationModal
        isOpen={isFleetioModalOpen}
        onClose={() => setIsFleetioModalOpen(false)}
        organizationId={activeSelectedClient.id}
        clientName={activeSelectedClient.name}
      />

      <PricingUpgradeModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
        portal="broker"
      />
    </div>
  );
};

export default BrokerPortal;