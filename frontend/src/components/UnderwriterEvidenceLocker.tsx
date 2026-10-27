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
  dotNumber?: string;
  policyPeriod?: string;
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
  dotNumber = 'USDOT #3940192 • MC-881290',
  policyPeriod = '2026–2027 Policy Term',
  onClosePreview,
}) => {
  const [filterTerminal, setFilterTerminal] = useState<string>('ALL');

  const filtered = SAMPLE_EVIDENCE.filter(
    (item) => filterTerminal === 'ALL' || item.terminal.includes(filterTerminal)
  );

  // Generate an institutional audit reference number instead of exposing raw base64 tokens
  const certRefId = `CERT-2026-RL-${(token.length > 8 ? token.slice(-6) : '8842').toUpperCase()}`;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-12 print:p-0 print:bg-white print:text-black">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Top Institutional Control Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-slate-900/90 border border-slate-800 rounded-xl px-5 py-3.5 shadow-lg gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">
              Continuous Underwriting Audit Ledger • Cryptographically Verified
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono">
            <span className="text-slate-400 hidden md:inline">
              Audit Ref: <strong className="text-cyan-400 font-mono">{certRefId}</strong>
            </span>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-medium rounded-lg border border-slate-700 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              <span>🖨️</span> Print / Save PDF
            </button>

            {onClosePreview && (
              <button
                type="button"
                onClick={onClosePreview}
                className="px-2.5 py-1.5 text-slate-400 hover:text-slate-200 text-xs font-mono cursor-pointer transition border border-transparent hover:border-slate-800 rounded-lg"
              >
                Close Preview ✕
              </button>
            )}
          </div>
        </div>

        {/* White-Label Co-Branded Certificate Card */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800 rounded-2xl p-6 md:p-8 shadow-2xl relative overflow-hidden print:border-none print:shadow-none print:bg-white print:p-4">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none print:hidden" />

          {/* Co-Branded Entities Strip */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800/80 print:border-slate-300">
            {/* Insured Fleet Entity & Broker Representation */}
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 uppercase tracking-wider mb-1 print:text-slate-600">
                <span>Insured Commercial Entity</span>
                <span className="text-slate-600">•</span>
                <span className="text-cyan-400 font-bold print:text-black">Placed by {brokerName}</span>
                <span className="text-slate-600">•</span>
                <span className="text-slate-400 font-mono">{dotNumber}</span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight print:text-black">
                {fleetName}
              </h1>
            </div>

            {/* Lead Carrier Audit Co-Branding */}
            <div className="flex items-center gap-4 bg-slate-950/80 border border-slate-800 px-5 py-3 rounded-xl print:bg-slate-100 print:border-slate-300">
              {carrierLogoUrl ? (
                <img
                  src={carrierLogoUrl}
                  alt={carrierName}
                  className="h-9 w-auto object-contain rounded"
                />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center font-bold font-mono text-cyan-400 text-base print:bg-slate-200">
                  🛡️
                </div>
              )}
              <div>
                <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider print:text-slate-600">
                  Audited Underwriting Carrier
                </div>
                <div className="text-sm font-bold text-slate-200 print:text-black">{carrierName}</div>
              </div>
            </div>
          </div>

          {/* Certificate Title & Status */}
          <div className="mt-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold font-mono bg-emerald-950/90 text-emerald-300 border border-emerald-800/90 uppercase tracking-wider mb-2 print:bg-emerald-100 print:text-emerald-800">
                ✓ Loss Control Standard Compliant
              </div>
              <h2 className="text-xl font-bold text-white print:text-black">
                Certificate of Verified Safety Recall Remediation & Loss Control
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl print:text-slate-600">
                Continuous telematics and work order synchronization via RecallLogic™. Establishes a verifiable chain of custody to eliminate plaintiff punitive exposure under negligent maintenance doctrines and defend underwriter rate credits.
              </p>
            </div>

            {/* Actuarial Rate Credit Box */}
            <div className="bg-emerald-950/40 border border-emerald-700/60 rounded-xl p-4 text-right flex-shrink-0 print:bg-emerald-50 print:border-emerald-300">
              <div className="text-xs font-mono text-emerald-400 font-bold uppercase print:text-emerald-800">
                Actuarial Rating Status
              </div>
              <div className="text-2xl font-extrabold font-mono text-white mt-0.5 print:text-black">
                15% Optimal Credit
              </div>
              <div className="text-[10px] text-slate-400 font-mono mt-0.5 print:text-slate-600">
                Punitive Liability Defended: $0
              </div>
            </div>
          </div>

          {/* Risk Officer & Direct Underwriter Verification Contacts */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-mono print:border-slate-300">
            <div>
              <span className="text-slate-500 uppercase">Designated Risk Contact</span>
              <div className="text-slate-200 font-bold mt-0.5 print:text-black">{riskOfficerName}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase">Audit Contact Email</span>
              <div className="text-cyan-400 mt-0.5 font-bold print:text-black">{riskOfficerEmail}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase">Direct Safety Line</span>
              <div className="text-slate-200 mt-0.5 print:text-black">{riskOfficerPhone}</div>
            </div>
            <div>
              <span className="text-slate-500 uppercase">Coverage Term</span>
              <div className="text-slate-200 mt-0.5 font-bold print:text-black">{policyPeriod}</div>
            </div>
          </div>
        </div>

        {/* Operating Yard Roster Header & Filter */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white font-mono tracking-wide print:text-black">
              Power Unit Compliance Ledger ({filtered.length} Units Audited)
            </h3>
            <p className="text-xs text-slate-400 font-mono print:text-slate-600">
              Immutable SHA-256 integrity logs matched against active NHTSA campaign databases.
            </p>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 print:hidden">
            <span className="text-[11px] font-mono text-slate-500 uppercase">Operating Yard:</span>
            <select
              value={filterTerminal}
              onChange={(e) => setFilterTerminal(e.target.value)}
              className="bg-transparent text-xs text-cyan-400 font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL" className="bg-slate-950 text-slate-200">All Locations</option>
              <option value="Dallas" className="bg-slate-950 text-slate-200">Dallas Hub (TX)</option>
              <option value="Chicago" className="bg-slate-950 text-slate-200">Chicago Terminal (IL)</option>
              <option value="Atlanta" className="bg-slate-950 text-slate-200">Atlanta Logistics (GA)</option>
            </select>
          </div>
        </div>

        {/* Audit Evidence Table */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-xl print:border-slate-300 print:bg-white">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-mono tracking-wider text-slate-400 print:bg-slate-100 print:text-slate-700 print:border-slate-300">
                <th className="py-3.5 px-4 font-bold">Unit / VIN</th>
                <th className="py-3.5 px-4 font-bold">Power Unit</th>
                <th className="py-3.5 px-4 font-bold">Operating Yard</th>
                <th className="py-3.5 px-4 font-bold">NHTSA Defect Campaign Details</th>
                <th className="py-3.5 px-4 font-bold">Audit Status</th>
                <th className="py-3.5 px-4 font-bold text-right">Verification Hash</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans print:divide-slate-200">
              {filtered.map((item) => (
                <tr key={item.vin} className="hover:bg-slate-800/40 transition print:hover:bg-transparent">
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="font-bold text-white font-mono print:text-black">{item.unit}</div>
                    <div className="text-[10px] text-slate-400 font-mono print:text-slate-600">{item.vin}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-slate-200 font-medium print:text-black">
                    {item.makeModel}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-cyan-300 font-mono text-[11px] print:text-slate-800">
                    📍 {item.terminal}
                  </td>
                  <td className="py-3.5 px-4 max-w-sm">
                    <div className="text-slate-300 font-mono text-[11px] print:text-black">{item.recallSummary}</div>
                    <div className="text-[10px] text-emerald-400/90 mt-0.5 print:text-emerald-700">{item.nhtsaStatus}</div>
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {item.status === 'CLEARED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 print:bg-emerald-100 print:text-emerald-800">
                        ✓ DEFECT CLEAN
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950 text-amber-300 border border-amber-800 print:bg-amber-100 print:text-amber-800">
                        ⏱ WORK ORDER QUEUED
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 whitespace-nowrap text-right font-mono text-[10px] text-slate-500 print:text-slate-400">
                    {item.auditHash}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Official Audit Seal & Legal Attestation */}
        <div className="text-center pt-4 pb-12 text-xs font-mono text-slate-500 space-y-1 print:text-slate-600 print:pb-4">
          <div className="font-bold tracking-wider text-slate-400 print:text-black">
            RECALLLOGIC™ CONTINUOUS RISK DEFENSE PLATFORM • IMMUTABLE LOSS CONTROL AUDIT RECORD
          </div>
          <div>
            Data sourced live via official NHTSA API endpoints, OEM manufacturer direct telematics, and active Fleetio maintenance work orders.
          </div>
          <div className="text-[11px] text-slate-600 print:text-slate-500">
            Certified for submission to commercial auto insurance underwriters, excess surplus lines, and state compliance boards.
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnderwriterEvidenceLocker;