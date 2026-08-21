import React, { useState, useEffect } from 'react';

interface RecallItem {
  campaign_number: string;
  component: string;
  summary: string;
}

interface AuditResult {
  vin: string;
  has_open_recall: boolean;
  recall_count: number;
  recalls: RecallItem[];
  status_label: string;
}

export function FleetVinScanner() {
  const [ingestMode, setIngestMode] = useState<'paste' | 'upload'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [scansLeft, setScansLeft] = useState<number>(10);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState<boolean>(false);
  const [scanError, setScanError] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // Sync 10 free scans counter across session
  useEffect(() => {
    const storedScans = sessionStorage.getItem('recalllogic_demo_scans');
    if (storedScans !== null) {
      setScansLeft(parseInt(storedScans, 10));
    } else {
      sessionStorage.setItem('recalllogic_demo_scans', '10');
    }
  }, []);

  const executeVinCheck = async (targetVin: string) => {
    setIsAuditing(true);
    setAuditResult(null);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
      const response = await fetch(`${apiBaseUrl}/api/audit/verify-vin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vin: targetVin,
          broker: 'RecallLogic Direct',
          fleet: 'Inspected Fleet Unit',
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Failed to audit VIN.');

      setAuditResult(data);
      const nextScans = Math.max(0, scansLeft - 1);
      setScansLeft(nextScans);
      sessionStorage.setItem('recalllogic_demo_scans', nextScans.toString());

    } catch (err: any) {
      setScanError(err.message || 'Error connecting to NHTSA recall engine.');
    } finally {
      setIsAuditing(false);
    }
  };

  const extractAndAuditVins = async (rawInput: string) => {
    setScanError('');
    if (scansLeft <= 0) {
      setScanError('You have used all 10 free trial VIN checks. Upgrade to Pro Tier for unlimited monitoring.');
      return;
    }

    const rawTokens = rawInput.toUpperCase().split(/[^A-Z0-9]+/);
    const uniqueVins = Array.from(new Set(rawTokens.filter(token => 
      token.length === 17 && !/[IOQ]/.test(token)
    )));

    if (uniqueVins.length === 0) {
      setScanError('No valid 17-character VINs found. Please check your formatting.');
      return;
    }

    await executeVinCheck(uniqueVins[0]);
  };

  const handlePasteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) {
      setScanError('Please enter at least one Make / Model / VIN line.');
      return;
    }
    extractAndAuditVins(pastedText);
  };

  const processVinFile = async (file: File) => {
    try {
      const text = await file.text();
      await extractAndAuditVins(text);
    } catch (err) {
      setScanError('Failed to parse file. Please upload a valid .csv or .txt file.');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processVinFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto rounded-2xl bg-[#0B101D] border border-slate-800/80 p-6 shadow-2xl space-y-4">
      {/* HEADER BAR */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#06B6D4] animate-pulse" />
          <span className="text-xs font-bold text-cyan-300 font-mono uppercase tracking-wider">
            Real-Time VIN Safety Sync Active
          </span>
        </div>
        <div className="px-3 py-1 rounded-full bg-slate-950/80 border border-slate-800 text-xs font-mono text-emerald-400 font-bold">
          {scansLeft} FREE VIN LOOKUPS REMAINING
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-white font-mono">
          Instant Fleet VIN Safety &amp; Recall Control
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Paste your VINs directly or drop a fleet file to test our Real-Time Safety Sync engine with 10 free lookups.
        </p>
      </div>

      {/* TAB SELECTOR */}
      <div className="flex border-b border-slate-800/80 font-mono text-xs gap-4 pt-2">
        <button
          type="button"
          onClick={() => setIngestMode('paste')}
          className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
            ingestMode === 'paste'
              ? 'border-[#06B6D4] text-[#06B6D4]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Direct VIN Input / Paste
        </button>
        <button
          type="button"
          onClick={() => setIngestMode('upload')}
          className={`pb-2 font-bold transition-all border-b-2 cursor-pointer ${
            ingestMode === 'upload'
              ? 'border-[#06B6D4] text-[#06B6D4]'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Upload .CSV / .TXT File
        </button>
      </div>

      {/* TAB 1: PASTE INPUT */}
      {ingestMode === 'paste' ? (
        <form onSubmit={handlePasteSubmit} className="space-y-3">
          <textarea
            rows={3}
            placeholder={`FREIGHTLINER / CASCADIA / 1FUJGLDR5MLKE1234\nFORD / TRANSIT / 1FTBW1Y85PKA54321\nTESLA / MODEL 3 / 5YJ3E1EA7MF987654`}
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value.toUpperCase())}
            disabled={scansLeft <= 0 || isAuditing}
            className="w-full bg-[#070B14] border border-slate-800 rounded-xl p-3 font-mono text-xs uppercase text-white placeholder-slate-600 focus:outline-none focus:border-[#06B6D4] transition"
          />
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
            <span className="text-[10px] text-slate-400 font-mono">
              Accepted Format: <strong className="text-cyan-300">Make / Model / VIN</strong> or <strong className="text-cyan-300">Make, Model, VIN</strong> (up to 10 entries).
            </span>
            <button
              type="submit"
              disabled={scansLeft <= 0 || isAuditing}
              className="px-6 py-2.5 bg-[#06B6D4] hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs font-mono rounded-xl transition cursor-pointer whitespace-nowrap"
            >
              {isAuditing ? 'AUDITING...' : 'RUN VIN AUDIT'}
            </button>
          </div>
        </form>
      ) : (
        /* TAB 2: FILE UPLOAD */
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
            isDragging 
              ? 'border-[#06B6D4] bg-[#06B6D4]/10' 
              : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
          }`}
        >
          <input
            type="file"
            id="landing-file-upload"
            accept=".csv,.txt"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && processVinFile(e.target.files[0])}
          />
          <label htmlFor="landing-file-upload" className="cursor-pointer space-y-2 block">
            <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-[#06B6D4]">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-white">
              Drop your fleet list here or <span className="text-[#06B6D4] underline">browse files</span>
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              Supported formats: <strong className="text-slate-400">.csv</strong> or <strong className="text-slate-400">.txt</strong>
            </p>
          </label>
        </div>
      )}

      {scanError && <p className="text-red-400 text-xs font-mono">{scanError}</p>}

      {/* RESULTS DISPLAY */}
      {auditResult && (
        <div className={`p-4 rounded-xl border text-xs font-mono space-y-2 ${
          auditResult.has_open_recall
            ? 'bg-red-950/20 border-red-800/80 text-red-200'
            : 'bg-emerald-950/20 border-emerald-800/80 text-emerald-200'
        }`}>
          <div className="flex justify-between items-center font-bold">
            <span>VIN: {auditResult.vin}</span>
            <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px]">
              {auditResult.status_label}
            </span>
          </div>
          {auditResult.has_open_recall ? (
            <div className="space-y-2 pt-1">
              <p className="text-[11px] text-red-300">Found {auditResult.recall_count} active safety recall(s):</p>
              {auditResult.recalls.map((r, idx) => (
                <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-red-900/50 text-slate-300">
                  <strong className="text-white">Campaign #{r.campaign_number}</strong> — {r.component}
                  <p className="text-slate-400 text-[11px] mt-1">{r.summary}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-[11px] text-emerald-300">
              Zero active safety recalls detected on NHTSA records for this VIN.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default FleetVinScanner;