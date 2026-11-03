import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  Check, 
  Mail, 
  ExternalLink, 
  ShieldCheck, 
  Lock,
  Building2,
  FileCheck
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
  const [copiedRich, setCopiedRich] = useState(false);

  if (!isOpen) return null;

  const targetFleet = userCompany || 'Dennis Enterprise Fleet';
  const broker =
    brokerName ||
    sessionStorage.getItem('broker_name') ||
    'Apex Risk Brokers';

  // Generate unpadded, clean URL-safe token (eliminates %3D from URL)
  const cleanBase64 = btoa(targetFleet).replace(/=+$/, '');
  const safeToken = `rl_live_${cleanBase64}`;
  const evidenceUrl = `${window.location.origin}/audit/evidence-locker?token=${safeToken}`;

  const emailSubject = `Commercial Auto Underwriter Evidence: ${targetFleet} (15% Rate Credit Defense)`;

  // Plain text email body with URL isolated on its own line (no emoji prefix)
  const plainEmailBody = `Underwriting Team,

In support of commercial auto renewal negotiations and to defend our 15% Loss-Control Rate Credit, ${broker} has verified a Continuous Risk Defense Audit for ${targetFleet}.

AUDIT SUMMARY & LOSS CONTROL VERIFICATION:
• Account / Insured: ${targetFleet}
• Monitored Power Units: 48 Units
• Real-Time Source: Fleetio API 2-Way Sync (Active & Defect-Free)
• Open NHTSA Safety Recalls: 0 (Critical defect Unit-101 cleared via WO #22)
• Unaddressed Punitive Liability Exposure: $0.00

VERIFIED UNDERWRITER EVIDENCE LOCKER (Read-Only Access):
${evidenceUrl}

This cryptographic evidence log establishes certified due-diligence records under commercial carrier loss-control standards.

Best regards,

Commercial Transportation Risk Division
${broker}`;

  // Rich HTML template for direct paste into Outlook / Gmail with live <a> hyperlink
  const richHtmlBody = `<div style="font-family: Arial, sans-serif; font-size: 14px; color: #1e293b; line-height: 1.6;">
  <p><strong>Underwriting Team,</strong></p>
  <p>In support of commercial auto renewal negotiations and to defend our 15% Loss-Control Rate Credit, <strong>${broker}</strong> has verified a Continuous Risk Defense Audit for <strong>${targetFleet}</strong>.</p>
  
  <p><strong>AUDIT SUMMARY &amp; LOSS CONTROL VERIFICATION:</strong></p>
  <ul>
    <li><strong>Account / Insured:</strong> ${targetFleet}</li>
    <li><strong>Monitored Power Units:</strong> 48 Units</li>
    <li><strong>Real-Time Source:</strong> Fleetio API 2-Way Sync (Active &amp; Defect-Free)</li>
    <li><strong>Open NHTSA Safety Recalls:</strong> 0 (Critical defect Unit-101 cleared via WO #22)</li>
    <li><strong>Unaddressed Punitive Liability Exposure:</strong> $0.00</li>
  </ul>

  <p><strong>VERIFIED UNDERWRITER EVIDENCE LOCKER (Read-Only Access):</strong><br />
    👉 <a href="${evidenceUrl}" style="color: #0284c7; text-decoration: underline; font-weight: bold;">${evidenceUrl}</a>
  </p>

  <p style="color: #64748b; font-size: 13px;"><em>This cryptographic evidence log establishes certified due-diligence records under commercial carrier loss-control standards.</em></p>

  <p>Best regards,<br /><br />
  <strong>Commercial Transportation Risk Division</strong><br />
  ${broker}</p>
</div>`;

  const mailtoUrl = `mailto:?subject=${encodeURIComponent(
    emailSubject
  )}&body=${encodeURIComponent(plainEmailBody)}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(evidenceUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyRichEmail = async () => {
    try {
      const blobHtml = new Blob([richHtmlBody], { type: 'text/html' });
      const blobText = new Blob([plainEmailBody], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blobHtml,
          'text/plain': blobText,
        }),
      ]);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2500);
    } catch {
      navigator.clipboard.writeText(plainEmailBody);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2500);
    }
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
                    DEFAULT APP
                  </span>
                </div>
                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition">
                  Open Underwriter Email Draft ↗
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Opens Outlook or your default mail app with the formatted underwriter packet and clean isolated URL.
                </p>
              </div>
              <span className="mt-3 inline-flex items-center gap-1.5 text-xs text-cyan-400 font-mono font-semibold">
                Launch Mail Client &rarr;
              </span>
            </a>

            {/* ACTION 2: DIRECT LINK & RICH TEXT ACTIONS */}
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
                  Evidence URL &amp; Rich Format
                </h3>
                <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                  Copy the encrypted locker link or copy pre-formatted HTML directly into an existing carrier thread.
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
                      <span>Copy Link</span>
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
                onClick={handleCopyRichEmail}
                className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1.5 bg-cyan-950/60 border border-cyan-800/80 px-2.5 py-1 rounded cursor-pointer transition"
              >
                {copiedRich ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-300 font-bold">Copied Rich HTML!</span>
                  </>
                ) : (
                  <>
                    <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Copy Formatted Email (Ctrl+V into Outlook)</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-[#070B14] border border-slate-800/80 rounded-xl p-3.5 text-[11px] font-mono text-slate-300 max-h-44 overflow-y-auto space-y-2 select-text leading-relaxed">
              <div className="text-cyan-300 border-b border-slate-800 pb-1.5">
                <span className="text-slate-500">SUBJECT: </span>
                <span>{emailSubject}</span>
              </div>
              <pre className="whitespace-pre-wrap font-mono text-[11px] text-slate-400 leading-normal">
                {plainEmailBody}
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