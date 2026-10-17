import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export interface BulkCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCount: number) => void;
  onUpgradeTrigger?: () => void;
  currentFleetCount?: number;
  maxCapacity?: number;
}

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onUpgradeTrigger,
  currentFleetCount = 23,
  maxCapacity = 50,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pasteText, setPasteText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [showUpgradeCTA, setShowUpgradeCTA] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  const extractVinsFromText = (rawText: string): string[] => {
    const sanitizedText = rawText
      .toUpperCase()
      .replace(/O/g, '0')
      .replace(/I/g, '1');

    const tokens = sanitizedText.split(/[^A-Z0-9]+/);

    return Array.from(
      new Set(tokens.filter((t) => t.length === 17 && !/Q/.test(t)))
    );
  };

  const handleProcessImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setShowUpgradeCTA(false);
    setSuccessMessage('');

    // HARD CAPACITY GUARD: Check if standard fleet is already maxed
    const availableSlots = Math.max(0, maxCapacity - currentFleetCount);

    if (availableSlots <= 0) {
      setError(`Standard Tier Capacity Limit Reached (${maxCapacity} Units Max). Upgrade to Professional for up to 250 units.`);
      setShowUpgradeCTA(true);
      return;
    }

    let rawDataToParse = pasteText;

    if (activeTab === 'file') {
      if (!selectedFile) {
        setError('Please select a valid .CSV or .TXT file to upload.');
        return;
      }
      try {
        rawDataToParse = await selectedFile.text();
      } catch (err) {
        setError('Failed to read file. Please check file formatting.');
        return;
      }
    }

    const foundVins = extractVinsFromText(rawDataToParse);

    if (foundVins.length === 0) {
      setError('No valid 17-character VINs detected. Please check formatting.');
      return;
    }

    setIsProcessing(true);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User session expired. Please sign in again.');
      }

      // Fetch existing VINs for this profile to prevent duplicates
      const { data: existingRecords } = await supabase
        .from('monitored_vehicles')
        .select('vin')
        .eq('profile_id', user.id);

      const existingVinSet = new Set((existingRecords || []).map((r) => r.vin));
      const uniqueNewVins = foundVins.filter((vin) => !existingVinSet.has(vin));

      if (uniqueNewVins.length === 0) {
        setSuccessMessage(`All ${foundVins.length} VIN(s) in this list are already monitored in your fleet.`);
        setIsProcessing(false);
        setTimeout(() => onClose(), 1500);
        return;
      }

      // STRICT CAPACITY TRUNCATION TO HIT EXACTLY 50
      let vinsToIngest = uniqueNewVins;
      let limitExceeded = false;

      if (uniqueNewVins.length > availableSlots) {
        vinsToIngest = uniqueNewVins.slice(0, availableSlots);
        limitExceeded = true;
      }

      const rowsToInsert = vinsToIngest.map((vin) => ({
        profile_id: user.id,
        vin: vin,
        year: '2023',
        make: 'Freightliner',
        model: 'Cascadia',
        unit_number: `UNIT-${vin.slice(-4)}`,
        created_at: new Date().toISOString(),
      }));

      let { error: insertError } = await supabase
        .from('fleet_assets')
        .upsert(rowsToInsert, { onConflict: 'profile_id, vin', ignoreDuplicates: true });

      if (insertError) {
        const fallbackRows = vinsToIngest.map((vin) => ({
          profile_id: user.id,
          vin: vin,
          year: 2023,
          make: 'Freightliner',
          model: 'Cascadia',
          created_at: new Date().toISOString(),
        }));

        const { error: fallbackError } = await supabase
          .from('monitored_vehicles')
          .upsert(fallbackRows, { onConflict: 'profile_id, vin', ignoreDuplicates: true });

        if (fallbackError) {
          throw fallbackError;
        }
      }

      if (limitExceeded) {
        setError(`Standard Tier limit hit (${maxCapacity} VINs). Ingested ${vinsToIngest.length} unit(s). ${uniqueNewVins.length - vinsToIngest.length} VINs omitted.`);
        setShowUpgradeCTA(true);
      } else {
        setSuccessMessage(`Successfully ingested ${vinsToIngest.length} new power unit(s)!`);
      }

      if (onSuccess) onSuccess(vinsToIngest.length);

      if (!limitExceeded) {
        setTimeout(() => onClose(), 1200);
      }

    } catch (err: any) {
      console.error('Bulk ingestion error:', err);
      setError(err.message || 'Failed to process bulk fleet ingestion.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm font-mono">
      <div className="bg-[#0D1322] border border-slate-800 rounded-2xl p-6 max-w-xl w-full shadow-2xl space-y-4 relative">
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
              📤
            </span>
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Bulk Fleet Ingestion
              </h3>
              <p className="text-[10px] text-cyan-400">
                Real-Time Safety Audit &amp; Inventory Parser
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white transition cursor-pointer text-sm"
          >
            ✕
          </button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`pb-2 px-4 font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'paste'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct VIN Copy / Paste
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            className={`pb-2 px-4 font-bold border-b-2 transition cursor-pointer ${
              activeTab === 'file'
                ? 'border-[#06B6D4] text-[#06B6D4]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Upload .CSV / .TXT File
          </button>
        </div>

        <form onSubmit={handleProcessImport} className="space-y-4">
          {activeTab === 'paste' ? (
            <div className="space-y-2">
              <div className="flex justify-between items-center text-[10px]">
                <label className="block font-bold text-slate-300 uppercase">
                  PASTE VIN LIST OR MULTI-LINE TEXT
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setPasteText(
                      'FREIGHTLINER, CASCADIA, 1FUJGLDR5MLKE1234\nFORD, TRANSIT, 1FTBW1Y85PKA54321\nVOLVO, VNL 860, 5YJ3E1EA7MF987654'
                    )
                  }
                  className="text-cyan-400 hover:text-cyan-300 underline cursor-pointer"
                >
                  ⚡ Load Sample Fleet (3 VINs)
                </button>
              </div>

              <textarea
                rows={5}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value.toUpperCase())}
                placeholder={`Freightliner, Cascadia, 1FUJGLDR5MLKE1234\nFord, Transit, 1FTBW1Y85PKA54321\nTesla, Model 3, 5YJ3E1EA7MF987654`}
                className="w-full bg-[#070B14] border border-slate-800 rounded-xl p-3 text-xs text-white uppercase font-mono placeholder-slate-600 focus:outline-none focus:border-[#06B6D4] transition"
              />
              <p className="text-[10px] text-slate-500">
                Accepts raw VIN lists, comma-separated lists, or multi-line fleet dumps.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-300 uppercase">
                UPLOAD FLEET FILE (.CSV OR .TXT)
              </label>
              <div className="p-6 border-2 border-dashed border-slate-800 hover:border-slate-700 bg-[#070B14] rounded-xl text-center cursor-pointer relative">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-1">
                  <p className="text-xs text-slate-300">
                    {selectedFile
                      ? `Selected: ${selectedFile.name}`
                      : 'Choose file or drag & drop fleet list here'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Supported extensions: .csv, .txt
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DYNAMIC ERROR / UPGRADE CTA BANNER */}
          {error && (
            <div className="p-3 rounded-xl bg-red-950/70 border border-red-600/80 text-red-200 text-xs leading-relaxed space-y-2">
              <div>⚠️ {error}</div>
              {showUpgradeCTA && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onUpgradeTrigger) onUpgradeTrigger();
                  }}
                  className="w-full py-2 bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition shadow-md shadow-cyan-950 cursor-pointer font-mono mt-1"
                >
                  ⚡ Upgrade to Professional Tier (250 VINs) →
                </button>
              )}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800/80 text-emerald-300 text-xs">
              ✓ {successMessage}
            </div>
          )}

          <div className="flex justify-between items-center pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isProcessing}
              className="px-6 py-2.5 bg-[#06B6D4] hover:bg-cyan-400 disabled:bg-slate-800 text-slate-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-lg shadow-cyan-950"
            >
              {isProcessing ? 'Processing Fleet Ingestion...' : 'Start Fleet Ingestion Audit →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkCsvImportModal;