import React, { useState } from "react";
import { 
  ShieldAlert, 
  Search, 
  FileText, 
  Share2, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Plug,
  Info,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface RecallTask {
  unitId: string;
  vin: string;
  makeModel: string;
  campaignId: string;
  component: string;
  severity: "critical" | "warning" | "cleared";
  connectedProviders: ("fleetio" | "samsara" | "geotab")[];
  workOrderId?: string;
  remedyLogistics: string;
  status: "OPEN" | "SCHEDULED" | "CLEARED";
}

export const Taskboard: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "OPEN" | "SCHEDULED" | "CLEARED">("ALL");

  const [tasks] = useState<RecallTask[]>([
    {
      unitId: "UNIT-101",
      vin: "1FUJGLDR5MLKE1234",
      makeModel: "FREIGHTLINER CASCADIA 2023",
      campaignId: "23V-891",
      component: "STEERING AXLE DRAG LINK",
      severity: "critical",
      connectedProviders: ["fleetio", "samsara"],
      workOrderId: "WO-FLT-889102",
      remedyLogistics: "Fleetio Work Order Issued",
      status: "OPEN",
    },
    {
      unitId: "UNIT-204",
      vin: "1FT8W1Y85PKA54321",
      makeModel: "FORD TRANSIT VAN 2022",
      campaignId: "24V-012",
      component: "REAR DRIVESHAFT FLEX COUPLING",
      severity: "warning",
      connectedProviders: ["fleetio"],
      workOrderId: "WO-FLT-889108",
      remedyLogistics: "Metro Ford Commercial (Parts Backorder)",
      status: "SCHEDULED",
    },
    {
      unitId: "UNIT-309",
      vin: "5YJ3E1EA7MF987654",
      makeModel: "VOLVO VNL 860 2023",
      campaignId: "23V-838",
      component: "AIR BRAKE ACTUATOR DIAPHRAGM",
      severity: "cleared",
      connectedProviders: ["fleetio", "geotab"],
      workOrderId: "WO-FLT-889045",
      remedyLogistics: "Volvo Truck Center (Remedy Complete)",
      status: "CLEARED",
    },
  ]);

  const filteredTasks = tasks.filter((t) => {
    const matchesSearch =
      t.unitId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.campaignId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.makeModel.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "ALL" ? true : t.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const nuclearTasks = tasks.filter((t) => t.severity === "critical" && t.status === "OPEN");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8 relative font-sans">
      {/* FEATURE 3: UNDERWRITER EVIDENCE LOCKER HEADER BREADCRUMB & TOOLBAR */}
      <div className="flex justify-between items-center mb-6 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono mb-1">
            <span>PORTFOLIO COMMAND</span>
            <ChevronRight className="w-3 h-3 text-slate-600" />
            <span className="text-cyan-400 font-bold">APEX LOGISTICS & FREIGHT</span>
            <span className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-400 text-[10px] font-mono px-2 py-0.5 rounded flex items-center gap-1 ml-2">
              <ShieldCheck className="w-3 h-3" /> VERIFIED EVIDENCE LOCKER
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            Underwriter Audit & Remediation Workspace
          </h1>
        </div>

        <div className="flex gap-3">
          <button className="flex items-center gap-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-200 px-3.5 py-2 rounded-lg text-xs font-medium transition">
            <Share2 className="w-3.5 h-3.5 text-cyan-400" /> Share Live Underwriter Link
          </button>
          <button className="flex items-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white px-3.5 py-2 rounded-lg text-xs font-medium shadow-lg shadow-cyan-900/40 transition">
            <FileText className="w-3.5 h-3.5" /> Export Loss Control PDF
          </button>
        </div>
      </div>

      {/* CRITICAL ALERT BANNER */}
      {nuclearTasks.length > 0 && (
        <div className="mb-6 bg-red-950/70 border border-red-600/70 rounded-xl p-4 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-6 h-6 text-red-500 shrink-0" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-red-200 uppercase tracking-wider">
                  ⚠️ {nuclearTasks.length} Nuclear Liability Alert(s) Detected
                </h3>
                <span className="bg-red-900/80 text-red-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase">
                  HIGH LEGAL EXPOSURE
                </span>
              </div>
              <p className="text-xs text-red-300/80 mt-0.5">
                Vehicles operating with unaddressed, critical safety recalls (Brakes/Steering). Standard insurance policies DO NOT cover punitive penalties.
              </p>
            </div>
          </div>

          <a
            href="https://app.fleetio.com"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-500 text-white text-xs px-3.5 py-2 rounded-lg font-medium transition shrink-0"
          >
            View in Fleetio <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      )}

      {/* FILTER & CONTROL BAR */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Unit #, VIN, or Campaign..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 self-start md:self-auto">
          {(["ALL", "OPEN", "SCHEDULED", "CLEARED"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1 rounded text-xs font-mono font-medium transition ${
                statusFilter === status
                  ? "bg-cyan-950 border border-cyan-500/50 text-cyan-300 font-bold"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* RECALL WORKSPACE TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <th className="p-4">Vehicle / VIN</th>
              <th className="p-4">Make & Model</th>
              <th className="p-4">Safety Recall Details</th>
              <th className="p-4">Ecosystem Feeds</th>
              <th className="p-4">Remedy Logistics</th>
              <th className="p-4">Compliance Status</th>
              <th className="p-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {filteredTasks.map((task) => (
              <tr key={task.unitId} className="hover:bg-slate-850/50 transition">
                <td className="p-4 font-mono">
                  <div className="font-bold text-slate-100">{task.unitId}</div>
                  <div className="text-[10px] text-slate-500">{task.vin}</div>
                </td>

                <td className="p-4 font-mono text-slate-300 text-[11px]">
                  {task.makeModel}
                </td>

                <td className="p-4 max-w-xs">
                  <div className="font-mono font-bold text-red-300 text-[11px] flex items-center gap-1.5">
                    {task.campaignId} — {task.component}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                    NHTSA Priority Safety Campaign • Action Required
                  </div>
                </td>

                {/* FEATURE 1: ECOSYSTEM DATA BADGES PER VEHICLE */}
                <td className="p-4">
                  <div className="flex items-center gap-1.5">
                    {task.connectedProviders.map((provider) => (
                      <span
                        key={provider}
                        className="bg-cyan-950/80 border border-cyan-800/80 text-cyan-300 text-[9px] font-mono px-2 py-0.5 rounded uppercase flex items-center gap-1 shadow-sm"
                      >
                        <Plug className="w-2.5 h-2.5 text-cyan-400" /> {provider}
                      </span>
                    ))}
                  </div>
                </td>

                <td className="p-4 text-slate-300 text-[11px] font-mono">
                  {task.remedyLogistics}
                </td>

                <td className="p-4">
                  <span
                    className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                      task.status === "OPEN"
                        ? "bg-red-950 text-red-400 border-red-800"
                        : task.status === "SCHEDULED"
                        ? "bg-amber-950 text-amber-400 border-amber-800"
                        : "bg-emerald-950 text-emerald-400 border-emerald-800"
                    }`}
                  >
                    {task.status === "OPEN" && <AlertCircle className="w-3 h-3" />}
                    {task.status === "SCHEDULED" && <Clock className="w-3 h-3" />}
                    {task.status === "CLEARED" && <CheckCircle2 className="w-3 h-3" />}
                    {task.status}
                  </span>
                </td>

                {/* FEATURE 2: DIRECT ACTION TRIGGERS */}
                <td className="p-4 text-right">
                  {task.status === "OPEN" && (
                    <a
                      href="https://app.fleetio.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-700/60 text-cyan-300 text-xs px-2.5 py-1.5 rounded transition font-mono shadow-sm"
                    >
                      View Fleetio {task.workOrderId || "WO"} <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {task.status === "SCHEDULED" && (
                    <button className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-2.5 py-1.5 rounded transition font-mono">
                      <RefreshCw className="w-3 h-3 text-cyan-400" /> Sync Status
                    </button>
                  )}
                  {task.status === "CLEARED" && (
                    <button className="inline-flex items-center gap-1 bg-emerald-950 border border-emerald-800/80 hover:bg-emerald-900 text-emerald-300 text-xs px-2.5 py-1.5 rounded transition font-mono shadow-sm">
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Download Cert
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* FOOTER AUDIT NOTE */}
      <div className="mt-6 flex justify-between items-center text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-cyan-400" />
          <span>Automated two-way sync via Fleetio, Samsara, and Geotab Webhooks (Last sync: Just now).</span>
        </div>
        <span>RecallLogic Underwriter Verification Engine v2.4</span>
      </div>
    </div>
  );
};

export default Taskboard;