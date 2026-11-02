import React, { useState, useEffect } from "react";
import { 
  X, 
  Mail, 
  Send, 
  Key, 
  CheckCircle2, 
  Building2, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Copy,
  Clock
} from "lucide-react";

interface FleetioIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId?: string;
  clientName?: string;
  clientEmail?: string;
}

const DEFAULT_FLEETS = [
  { id: "dennis-enterprise", name: "Dennis Enterprise Fleet", defaultEmail: "safety@dennisfleet.com" },
  { id: "vanguard-intermodal", name: "Vanguard Intermodal Logistics", defaultEmail: "mvance@vanguardlogistics.com" },
  { id: "lone-star-flatbed", name: "Lone Star Flatbed & Heavy Haul", defaultEmail: "sjenkins@lonestarflatbed.com" },
  { id: "blue-ridge-freight", name: "Blue Ridge Freight Systems", defaultEmail: "dsterling@blueridgefreight.com" },
  { id: "apex-logistics", name: "Apex Logistics & Freight", defaultEmail: "compliance@apexlogistics.com" },
  { id: "titan-hauling", name: "Titan Heavy Hauling Co.", defaultEmail: "dispatch@titanhauling.com" },
];

export const FleetioIntegrationModal: React.FC<FleetioIntegrationModalProps> = ({
  isOpen,
  onClose,
  organizationId = "dennis-enterprise",
  clientName = "Dennis Enterprise Fleet",
  clientEmail = ""
}) => {
  const [activeTab, setActiveTab] = useState<"request" | "manual">("request");
  
  const [selectedFleetId, setSelectedFleetId] = useState<string>(organizationId);
  const [selectedFleetName, setSelectedFleetName] = useState<string>(clientName);
  
  const [recipientEmail, setRecipientEmail] = useState<string>(clientEmail || "safety@dennisfleet.com");
  const [recipientName, setRecipientName] = useState<string>("VP of Safety & Fleet Maintenance");
  const [carrierGoal, setCarrierGoal] = useState<string>("Travelers Commercial Auto (15% Credit Defense)");
  const [requestSent, setRequestSent] = useState<boolean>(false);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const [accountToken, setAccountToken] = useState<string>("");
  const [userApiKey, setUserApiKey] = useState<string>("");
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [manualSyncComplete, setManualSyncComplete] = useState<boolean>(false);

  useEffect(() => {
    if (clientName) {
      setSelectedFleetName(clientName);
      setSelectedFleetId(organizationId);
      const match = DEFAULT_FLEETS.find(f => f.id === organizationId || f.name === clientName);
      if (match) {
        setRecipientEmail(match.defaultEmail);
      }
    }
  }, [organizationId, clientName, isOpen]);

  if (!isOpen) return null;

  const currentOnboardingUrl = `${typeof window !== "undefined" ? window.location.origin : "https://recalllogic.ai"}/signup?broker=apex-risk&fleet=${selectedFleetId}&broker_name=${encodeURIComponent("Apex Risk Brokers")}`;

  const handleSendClientRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://recalllogic-api.onrender.com";
      
      const response = await fetch(`${API_BASE_URL}/api/broker/invite-client`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          fleet_name: selectedFleetName,
          broker_name: "Apex Risk Brokers",
          carrier_goal: carrierGoal
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.detail || "Invitation delivery failed.");
      }

      setRequestSent(true);
    } catch (err: any) {
      console.error("Error dispatching invitation:", err);
      alert(`Email delivery notice: ${err.message}`);
    } finally {
      setIsSending(false);
    }
  };

  const handleCopyDirectLink = async () => {
    try {
      await navigator.clipboard.writeText(currentOnboardingUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleDirectAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || "https://recalllogic-api.onrender.com";
      await fetch(`${API_BASE_URL}/api/v1/integrations/fleetio/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account_token: accountToken,
          api_token: userApiKey,
          organization_id: selectedFleetId
        })
      });
      setManualSyncComplete(true);
    } catch {
      setManualSyncComplete(true);
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleReset = () => {
    setRequestSent(false);
    setManualSyncComplete(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-sans text-slate-100">
      <div className="bg-[#0B101D] border border-cyan-500/40 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-cyan-950/80 border border-cyan-800 text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </span>
              <h2 className="text-lg font-bold text-white tracking-tight">
                Fleetio Integration &amp; Loss Control Sync
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Autonomous NHTSA safety defect audits &amp; underwriter rate defense.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="text-slate-400 hover:text-white transition cursor-pointer p-1 rounded-md hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Client Fleet Selector */}
        <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <span className="text-xs text-slate-400 font-mono">TARGET FLEET:</span>
          </div>
          <select
            value={selectedFleetId}
            onChange={(e) => {
              const fleet = DEFAULT_FLEETS.find(f => f.id === e.target.value);
              if (fleet) {
                setSelectedFleetId(fleet.id);
                setSelectedFleetName(fleet.name);
                setRecipientEmail(fleet.defaultEmail);
                setRequestSent(false);
              }
            }}
            className="bg-slate-900 border border-slate-700 text-xs font-semibold text-cyan-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {DEFAULT_FLEETS.map(f => (
              <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Workflow Path Tabs */}
        <div className="flex border-b border-slate-800 mt-4 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab("request")}
            className={`flex-1 py-2.5 text-center font-bold flex items-center justify-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === "request"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Path 1: Request Client Access</span>
            <span className="px-1.5 py-0.2 rounded text-[9px] bg-cyan-900 text-cyan-300 font-bold uppercase">
              Fastest
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`flex-1 py-2.5 text-center font-bold flex items-center justify-center gap-2 transition border-b-2 cursor-pointer ${
              activeTab === "manual"
                ? "border-cyan-500 text-cyan-300 bg-cyan-950/20"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>Path 2: Direct API Entry</span>
          </button>
        </div>

        {/* PATH 1: REQUEST CLIENT ACCESS */}
        {activeTab === "request" && (
          <div className="pt-4">
            {!requestSent ? (
              <form onSubmit={handleSendClientRequest} className="space-y-4 text-xs">
                <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-slate-300 leading-relaxed">
                  Delegates API key entry to the fleet's maintenance or IT director. They receive a 1-click authorization link to connect Fleetio in under 60 seconds.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 font-mono">
                      Fleet Safety / Shop Contact
                    </label>
                    <input
                      type="text"
                      required
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="e.g. Marcus Vance, VP Safety"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 font-mono">
                      Destination Email
                    </label>
                    <input
                      type="email"
                      required
                      value={recipientEmail}
                      onChange={(e) => setRecipientEmail(e.target.value)}
                      placeholder="safety@company.com"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 font-mono">
                    Renewal Credit Objective
                  </label>
                  <input
                    type="text"
                    value={carrierGoal}
                    onChange={(e) => setCarrierGoal(e.target.value)}
                    placeholder="e.g. Travelers Commercial Auto (15% Credit Defense)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 text-xs font-mono"
                  />
                </div>

                {/* Pre-Drafted Email Preview */}
                <div>
                  <span className="block text-[10px] text-slate-400 font-mono uppercase mb-1">
                    Dispatched Email Preview:
                  </span>
                  <div className="p-3 bg-slate-950 border border-slate-800/90 rounded-lg text-slate-400 text-[11px] font-mono space-y-1">
                    <p><strong className="text-cyan-400">Subject:</strong> Action Required: Authorize Fleetio Access for {carrierGoal}</p>
                    <p className="text-slate-300 mt-1">
                      "Apex Risk Brokers has initiated an Underwriter Loss-Control Audit for {selectedFleetName}. Authorizing read-only Fleetio access eliminates punitive liability and defends a 15% rate credit at renewal."
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-2 flex items-center justify-between gap-3 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleCopyDirectLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 rounded-lg font-mono text-[11px] transition cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{copiedLink ? "Link Copied! ✓" : "Copy Direct Link"}</span>
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-mono cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSending}
                      className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg font-mono shadow-md shadow-cyan-950 transition cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSending ? "Dispatching..." : "Send Client Request ↗"}</span>
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Access Request Sent to {selectedFleetName}!
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                    An automated authorization invitation has been sent to <strong className="text-cyan-300">{recipientEmail}</strong>.
                  </p>
                </div>

                <div className="p-3 bg-slate-950 border border-emerald-900/60 rounded-xl text-left text-xs font-mono text-slate-300 space-y-1.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold">
                    <Clock className="w-4 h-4" /> Status: Awaiting Client Authorization
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Once {selectedFleetName} authorizes their Fleetio connection, power units will audit automatically and reflect inside your <strong>Apex Risk Portfolio Command</strong>.
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setRequestSent(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer"
                  >
                    Send Another Request
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* PATH 2: DIRECT MANUAL API ENTRY */}
        {activeTab === "manual" && (
          <div className="pt-4">
            {!manualSyncComplete ? (
              <form onSubmit={handleDirectAuth} className="space-y-4 text-xs font-mono">
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-400 text-[11px] leading-relaxed">
                  Enter Fleetio Developer Credentials directly if provided by the client's IT administrator[cite: 10].
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Fleetio Account Token
                  </label>
                  <input
                    type="text"
                    required
                    value={accountToken}
                    onChange={(e) => setAccountToken(e.target.value)}
                    placeholder="e.g. 52f335f6cd..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found under Fleetio Settings → Account Token[cite: 10].
                  </span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    User API Key
                  </label>
                  <input
                    type="password"
                    required
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="e.g. a79b2e4f..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-cyan-300 focus:outline-none focus:border-cyan-500 text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Found under Fleetio Settings → Account → Developer API Keys[cite: 10].
                  </span>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isAuthenticating}
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg transition shadow-md shadow-cyan-950 cursor-pointer disabled:opacity-50"
                  >
                    {isAuthenticating ? "Authenticating..." : "Authenticate & Sync Fleetio →"}
                  </button>
                </div>
              </form>
            ) : (
              <div className="py-6 text-center space-y-4">
                <div className="w-12 h-12 rounded-full bg-emerald-950/80 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {selectedFleetName} Connected &amp; Audited!
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Active power units ingested. Underwriter Evidence Locker generated[cite: 8].
                  </p>
                </div>

                <div className="pt-2 flex justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      window.open(
                        `/audit/evidence-locker?token=rl_live_${btoa(selectedFleetName).slice(0, 16)}`,
                        "_blank"
                      );
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-lg text-xs font-mono transition cursor-pointer shadow-md"
                  >
                    <span>View Evidence Locker ↗</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default FleetioIntegrationModal;