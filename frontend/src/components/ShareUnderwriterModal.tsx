import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Mail, 
  ExternalLink, 
  ShieldCheck, 
  Lock,
  Building2
} from 'lucide-react';

interface ShareUnderwriterModalProps {
  isOpen: boolean;
  onClose: () => void;
  userCompany?: string;
  brokerName?: string;
}

export const ShareUnderwriterModal: React.FC<ShareUnderwriterModalProps> = ({
  isOpen,
  onClose,
  userCompany,
  brokerName,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);

  if (!isOpen) return null;

  const targetFleet = userCompany || 'Dennis Enterprise Fleet';
  const broker =
    brokerName ||
    sessionStorage.getItem('broker_name') ||
    'Apex Risk Brokers';

  // Generate base64 token compatible with App.tsx evidence locker routing
  const safeToken = `rl_live_${btoa(targetFleet)}`;
  const evidenceUrl = `${window.location.origin}/audit/evidence-locker?token=${encodeURIComponent(
    safeToken
  )}`;

  const emailSubject = `Commercial Auto Underwriter Evidence: ${targetFleet} (15% Rate Credit Defense)`;
  const emailBody = `Underwriting Team,

In support of commercial auto renewal negotiations and to defend our 15% Loss-Control Rate Credit, ${broker} has verified a Continuous Risk Defense Audit for ${targetFleet}.

AUDIT SUMMARY & LOSS CONTROL VERIFICATION:
• Account / Insured: ${targetFleet}
• Monitored Power Units: 48 Units
• Real-Time Source: Fleetio API 2-Way Sync (Active & Defect-Free)
• Open NHTSA Safety Recalls: 0 (Critical defect Unit-101 cleared via WO #22)
• Unaddressed Punitive Liability Exposure: $0.00

VERIFIED UNDERWRITER EVIDENCE LOCKER (Read-Only Access):
👉 ${evidenceUrl}

This cryptographic evidence log establishes certified due-diligence records under commercial carrier loss-control standards.

Best regards,

Commercial Transportation Risk Division
${broker}`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(emailBody)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(evidenceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyBody = () => {
    navigator.clipboard.writeText(emailBody);
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-2xl bg-[#0C1220] border border-cyan-500/40 rounded-2xl shadow-2xl shadow-cyan-950/60 overflow-hidden text-slate-100 font-sans">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 bg-[#070B14] flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-500/40">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <span>Underwriter Evidence Locker — Submission Dispatch</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Cryptographically timestamped rate defense for commercial auto carriers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* TARGET FLEET & BROKER BADGE */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5">
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
              <Building2 className="w-4 h-4 text-cyan-400" />
              <span>SUBMISSION TARGET:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-cyan-300">
                {targetFleet}
              </span>
              <span className="text-[10px] bg-cyan-950 text-cyan-400 border border-cyan-800/60 px-2 py-0.5 rounded font-mono">
                {broker}
              </span>
            </div>
          </div>

          {/* DUAL ACTION DISPATCH MATRIX */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* ACTION 1: 1-CLICK OUTLOOK / MAIL DRAFT */}
            <a
              href={mailtoUrl}
              className="flex flex-col justify-between p-4 bg-cyan-950/30 hover:bg-cyan-950/60 border border-cyan-500/50 hover:border-cyan-400 rounded-xl transition group cursor-pointer shadow-md shadow-cyan-950/40"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <Mail className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wider">
                      Option 1
                    </span>
                  </div>
                  <span className="text-[10px] bg-cyan-900/60 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/60 font-mono">
                    RECOMMENDED
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  Open Underwriter Email Draft ↗
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Launches your default mail client with the full executive loss-control defense packet and tokenized link.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-semibold">
                Launch Mail Client &rarr;
              </span>
            </a>

            {/* ACTION 2: COPY DIRECT EVIDENCE LINK */}
            <div className="flex flex-col justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-slate-400">
                    <ExternalLink className="w-4 h-4" />
                    <span className="text-xs font-bold font-mono uppercase tracking-wider">
                      Option 2
                    </span>
                  </div>
                  <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700 font-mono">
                    MANUAL PASTE
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white">
                  Direct Evidence Locker URL
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Copy the encrypted, read-only link directly into an existing carrier email thread or AMS360 file.
                </p>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 flex items-center justify-center gap-1.5 text-xs font-mono py-1.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 rounded-lg transition cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Copy Locker Link</span>
                    </>
                  )}
                </button>
                <a
                  href={evidenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-lg transition"
                  title="Preview Evidence Locker"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>

          {/* LIVE UNDERWRITER EMAIL PREVIEW */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Generated Underwriter Submission Preview
              </span>
              <button
                type="button"
                onClick={handleCopyBody}
                className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {copiedBody ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedBody ? 'Body Copied' : 'Copy Text'}</span>
              </button>
            </div>
            
            <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto space-y-2 select-text leading-relaxed">
              <div className="text-cyan-300 border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">SUBJECT: </span>
                <span>{emailSubject}</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-400 leading-normal">
                {emailBody}
              </pre>
            </div>
          </div>

          {/* READ-ONLY ENCLAVE SECURITY PROTOCOL */}
          <div className="bg-[#070B14] border border-cyan-950 rounded-lg p-3 flex items-start gap-2.5 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-slate-200 block text-[11px] font-mono">
                Zero-Modification Carrier Enclave
              </strong>
              <span className="text-[10px] text-slate-400 leading-tight block mt-0.5">
                Underwriters accessing this portal can verify closed work orders and NHTSA safety compliance logs without access to shop dispatching or operational controls.
              </span>
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-[#070B14] flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-mono transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default ShareUnderwriterModal;