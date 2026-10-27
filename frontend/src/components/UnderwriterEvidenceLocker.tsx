import React, { useState } from 'react';

interface UnderwriterEvidenceLockerProps {
  fleetName?: string;
  carrierName?: string;
  brokerName?: string;
  carrierLogoUrl?: string;
  riskOfficerName?: string;
  riskOfficerEmail?: string;
  riskOfficerPhone?: string;
  token?: string;
  onClosePreview?: () => void;
}

interface EvidenceVehicle {
  unit: string;
  vin: string;
  makeModel: string;
  terminal: string;
  status: 'CLEARED' | 'SCHEDULED' | 'OPEN';
  recallSummary: string;
  nhtsaStatus: string;
  auditHash: string;
}

const SAMPLE_EVIDENCE: EvidenceVehicle[] = [
  {
    unit: 'UNIT-101',
    vin: '1FUJGLDR5MLKE1234',
    makeModel: '2023 FREIGHTLINER CASCADIA',
    terminal: 'Dallas Hub (TX)',
    status: 'SCHEDULED',
    recallSummary: 'Campaign #23V-891: Steering Drag Link — Sourced via Fleetio WO-FLT-889102',
    nhtsaStatus: 'Remediation Appointment Confirmed',
    auditHash: '0x7f2a...8c91',
  },
  {
    unit: 'UNIT-204',
    vin: '1FT8W1Y85PKA54321',
    makeModel: '2022 FORD TRANSIT 350',
    terminal: 'Chicago Terminal (IL)',
    status: 'SCHEDULED',
    recallSummary: 'Campaign #24V-012: Driveshaft Flex Coupling — Parts Queued WO-FLT-772910',
    nhtsaStatus: 'Remediation Appointment Confirmed',
    auditHash: '0x3b1c...90e4',
  },
  {
    unit: 'UNIT-309',
    vin: '5YJ3E1EA7MF987654',
    makeModel: '2023 VOLVO VNL 860',
    terminal: 'Atlanta Logistics (GA)',
    status: 'CLEARED',
    recallSummary: 'Campaign #23V-838: Air Brake Actuator — Remediated & Dealer Certified',
    nhtsaStatus: 'NHTSA Defect-Free Certified',
    auditHash: '0x99e8...11a2',
  },
  {
    unit: 'UNIT-412',
    vin: '3AKJHHDR8NS112233',
    makeModel: '2024 PETERBILT 579',
    terminal: 'Dallas Hub (TX)',
    status: 'CLEARED',
    recallSummary: 'Zero Open Safety Recalls Detected',
    nhtsaStatus: 'NHTSA Defect-Free Certified',
    auditHash: '0x14d0...44f8',
  },
];

export const UnderwriterEvidenceLocker: React.FC<UnderwriterEvidenceLockerProps> = ({
  fleetName = 'Dennis Enterprise Fleet',
  carrierName = 'Travelers Commercial Auto',
  brokerName = 'Apex Risk Brokers',
  carrierLogoUrl,
  riskOfficerName = 'Dennis Vance, VP Safety & Risk',
  riskOfficerEmail = 'safety@dennisfleet.com',
  riskOfficerPhone = '(214) 555-0144',
  token = 'rl_live_RGVubmlzIEVudGVycA',
  onClosePreview,
}) => {
  const [filterTerminal, setFilterTerminal] = useState<string>('ALL');

  const filtered = SAMPLE_EVIDENCE.filter(
    (item) => filterTerminal === 'ALL' || item.terminal.includes(filterTerminal)
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Floating Control Bar */}
        <div className="flex items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3 shadow-lg">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">
              Cryptographically Verified Underwriter Bearer Token
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-cyan-400 hidden sm:inline">
              Token ID: {token.slice(0, 18)}...
            </span>
            {onClosePreview && (
              <button
                type="button"
                onClick={onClosePreview}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded border border-slate-700 transition cursor-pointer"
              >
                Close Preview ✕
              </button>
            )}
          </div>
        </div>

        {/* White-Label Co-Branded Certificate Header */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* Co-Branded Partners Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
            {/* Left: Fleet & Broker */}
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-1">
                <span>Insured Fleet Entity</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-bold">Placed by {brokerName}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
                {fleetName}
              </h1>
            </div>

            {/* Right: Lead Carrier Co-Branding */}
            <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl">
              {carrierLogoUrl ? (
                <img
                  src={carrierLogoUrl}
                  alt={carrierName}
                  className="h-9 w-auto object-contain rounded"
                />
              ) : (
                <div className="w-9 h-9 rounded bg-cyan-950 border border-cyan-800/80 flex items-center justify-center font-bold font-mono text-cyan-400 text-sm">
                  🛡️
                </div>
              )}
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">
                  Audited Underwriting Carrier
                </div>
                <div className="text-sm font-bold text-slate-200">{carrierName}</div>
              </div>
            </div>
          </div>

          {/* Certificate Title & Status */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800/90 uppercase tracking-wider mb-2">
                ✓ Loss Control Standard Compliant
              </div>
              <h2 className="text-xl font-bold text-white">
                Certificate of Verified Safety Recall Remediation & Loss Control
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl">
                Continuous telematics verification via RecallLogic. Proves active loss control protocol to defeat plaintiff negligent maintenance claims and defend underwriter rate credits.
              </p>
            </div>

            {/* Underwriter Rate Credit Pill */}
            <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 text-right flex-shrink-0">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase">
                Underwriter Status
              </div>
              <div className="text-2xl font-extrabold font-mono text-white mt-0.5">
                15% Optimal Credit
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                Punitive Liability Defended: $0
              </div>
            </div>
          </div>

          {/* Designated Risk Officer & Safety Contact */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-500 uppercase">Designated Risk Contact</span>
              <div className="text-slate-200 font-bold mt-0.5">{riskOfficerName}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase">Audit Contact Email</span>
              <div className="text-cyan-400 mt-0.5">{riskOfficerEmail}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase">Direct Safety Line</span>
              <div className="text-slate-200 mt-0.5">{riskOfficerPhone}</div>
            </div>
          </div>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-base font-bold text-white font-mono tracking-wide">
            Power Unit Compliance Ledger ({filtered.length} Units Audited)
          </h3>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Operating Yard:</span>
            <select
              value={filterTerminal}
              onChange={(e) => setFilterTerminal(e.target.value)}
              className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-950 text-slate-200">All Locations</option>
              <option value="Dallas" className="bg-slate-950 text-slate-200">Dallas Hub (TX)</option>
              <option value="Chicago" className="bg-slate-950 text-slate-200">Chicago Terminal (IL)</option>
              <option value="Atlanta" className="bg-slate-950 text-slate-200">Atlanta Logistics (GA)</option>
            </select>
          </div>
        </div>

        {/* Roster Evidence Ledger Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400">
                <th className="py-3.5 px-4 font-bold">Unit / VIN</th>
                <th className="py-3.5 px-4 font-bold">Power Unit</th>
                <th className="py-3.5 px-4 font-bold">Operating Yard</th>
                <th className="py-3.5 px-4 font-bold">NHTSA Defect Campaign Details</th>
                <th className="py-3.5 px-4 font-bold">Audit Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Verification Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((item) => (
                <tr key={item.vin} className="hover:bg-slate-800/40 transition">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-white font-mono">{item.unit}</div>
                    <div className="text-[10px] text-slate-400 font-mono">{item.vin}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-200 font-medium">
                    {item.makeModel}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-cyan-300 font-mono text-[11px]">
                    📍 {item.terminal}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="text-slate-300 font-mono text-[11px]">{item.recallSummary}</div>
                    <div className="text-[10px] text-emerald-400/90 mt-0.5">{item.nhtsaStatus}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.status === 'CLEARED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        ✓ DEFECT CLEAN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800">
                        ⏱ WORK ORDER QUEUED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-[10px] text-slate-500">
                    {item.auditHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Audit Seal */}
        <div className="text-center pt-4 pb-8 text-xs font-mono text-slate-500 space-y-1">
          <div>
            RECALLLOGIC™ CONTINUOUS RISK DEFENSE PLATFORM • IMMUTABLE UNDERWRITING AUDIT LOG
          </div>
          <div>
            Data sourced live via NHTSA API, OEM direct telemetry, and integrated Fleetio work order logs.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderwriterEvidenceLocker;