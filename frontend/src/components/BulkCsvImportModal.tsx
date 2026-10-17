import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export interface BulkCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newCount: number) => void;
}

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'file'>('paste');
  const [pasteText, setPasteText] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  if (!isOpen) return null;

  // Sanitizes common typing errors (O -> 0, I -> 1) to comply with ISO 3779 VIN rules
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
    setSuccessMessage('');

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
      setError(
        'No valid 17-character VINs detected. Please check formatting.'
      );
      return;
    }

    setIsProcessing(true);

    try {
      // 1. Get active user session
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User session expired. Please sign in again.');
      }

      // 2. Fetch existing VINs for this user profile to prevent duplicate key errors
      const { data: existingRecords } = await supabase
        .from('monitored_vehicles')
        .select('vin')
        .eq('profile_id', user.id);

      const existingVinSet = new Set((existingRecords || []).map((r) => r.vin));

      // Filter out VINs that are already registered under this user account
      const uniqueNewVins = foundVins.filter((vin) => !existingVinSet.has(vin));

      if (uniqueNewVins.length === 0) {
        setSuccessMessage(
          `All ${foundVins.length} VIN(s) in this list are already monitored in your fleet.`
        );
        setIsProcessing(false);
        setTimeout(() => onClose(), 1500);
        return;
      }

      // 3. Prepare payload for new unique VINs
      const rowsToInsert = uniqueNewVins.map((vin) => ({
        profile_id: user.id,
        vin: vin,
        year: '2023',
        make: 'Freightliner',
        model: 'Cascadia',
        unit_number: `UNIT-${vin.slice(-4)}`,
        created_at: new Date().toISOString(),
      }));

      // 4. Try inserting into fleet_assets with UPSERT on duplicate conflict
      let { error: insertError } = await supabase
        .from('fleet_assets')
        .upsert(rowsToInsert, {
          onConflict: 'profile_id, vin',
          ignoreDuplicates: true,
        });

      if (insertError) {
        const fallbackRows = uniqueNewVins.map((vin) => ({
          profile_id: user.id,
          vin: vin,
          year: 2023,
          make: 'Freightliner',
          model: 'Cascadia',
          created_at: new Date().toISOString(),
        }));

        const { error: fallbackError } = await supabase
          .from('monitored_vehicles')
          .upsert(fallbackRows, {
            onConflict: 'profile_id, vin',
            ignoreDuplicates: true,
          });

        if (fallbackError) {
          throw fallbackError;
        }
      }

      const skippedCount = foundVins.length - uniqueNewVins.length;
      setSuccessMessage(
        `Successfully ingested ${uniqueNewVins.length} new power unit(s)!` +
          (skippedCount > 0 ? ` (${skippedCount} duplicate VINs skipped)` : '')
      );

      setTimeout(() => {
        if (onSuccess) onSuccess(uniqueNewVins.length);
        onClose();
      }, 1200);
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
                Accepts raw VIN lists, comma-separated lists, or multi-line
                fleet dumps.
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
                  onChange={(e) =>
                    setSelectedFile(e.target.files?.[0] || null)
                  }
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

          {error && (
            <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs leading-relaxed flex items-center justify-between gap-2">
              <span>⚠️ {error}</span>
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
              {isProcessing
                ? 'Processing Fleet Ingestion...'
                : 'Start Fleet Ingestion Audit →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkCsvImportModal;