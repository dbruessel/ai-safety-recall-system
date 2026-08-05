import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CURRENT_PROFILE_ID = '07136e5d-0b6e-4ccf-b774-c2f3f01154bf';

export interface BulkCsvImportModalProps {
  isOpen: boolean;
  vehicleLimit: number;
  currentFleetCount: number;
  subscriptionTier: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const BulkCsvImportModal: React.FC<BulkCsvImportModalProps> = ({
  isOpen,
  vehicleLimit,
  currentFleetCount,
  subscriptionTier,
  onClose,
  onSuccess,
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importing, setImporting] = useState<boolean>(false);
  const [importFeedback, setImportFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleProcessCsvImport = async () => {
    if (!csvFile) return;

    try {
      setImporting(true);
      setImportFeedback('Reading CSV payload...');

      const text = await csvFile.text();
      const lines = text.split(/\r\n|\n/).filter((line) => line.trim().length > 0);

      if (lines.length < 2) {
        setImportFeedback('Error: CSV file is empty or missing headers.');
        return;
      }

      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase().replace(/["']/g, ''));
      const vinIndex = headers.findIndex((h) => h.includes('vin'));
      const makeIndex = headers.findIndex((h) => h.includes('make'));
      const modelIndex = headers.findIndex((h) => h.includes('model'));
      const yearIndex = headers.findIndex((h) => h.includes('year'));

      if (vinIndex === -1) {
        setImportFeedback('Error: CSV must contain a "VIN" column.');
        return;
      }

      const vehiclesToInsert: any[] = [];

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(',').map((cell) => cell.trim().replace(/["']/g, ''));
        const vin = row[vinIndex];

        if (vin && vin.length >= 11) {
          vehiclesToInsert.push({
            profile_id: CURRENT_PROFILE_ID,
            vin: vin.toUpperCase(),
            make: makeIndex !== -1 ? row[makeIndex] || 'Unknown' : 'Unknown',
            model: modelIndex !== -1 ? row[modelIndex] || 'Asset' : 'Asset',
            year: yearIndex !== -1 ? parseInt(row[yearIndex], 10) || 2022 : 2022,
          });
        }
      }

      if (currentFleetCount + vehiclesToInsert.length > vehicleLimit) {
        setImportFeedback(
          `Error: Importing ${vehiclesToInsert.length} vehicles exceeds your ${subscriptionTier.toUpperCase()} limit of ${vehicleLimit} vehicles.`
        );
        return;
      }

      setImportFeedback(`Uploading ${vehiclesToInsert.length} vehicle(s) to Supabase...`);

      const { error } = await supabase
        .from('monitored_vehicles')
        .upsert(vehiclesToInsert, { onConflict: 'profile_id,vin' });

      if (error) throw error;

      setImportFeedback(`Success! ${vehiclesToInsert.length} vehicles added/updated.`);
      setTimeout(() => {
        setCsvFile(null);
        setImportFeedback(null);
        onSuccess();
        onClose();
      }, 1200);
    } catch (err: any) {
      console.error('CSV Import Error:', err);
      setImportFeedback(`Import Failed: ${err.message || 'Unknown database error'}`);
    } font-sans finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-5">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-bold text-gray-900">Bulk Import Fleet VINs</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-gray-500 leading-relaxed">
          Upload a CSV file containing your fleet assets. Make sure your file includes a{' '}
          <code className="bg-gray-100 px-1 rounded font-bold text-gray-800">vin</code> column.
        </p>

        <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center bg-gray-50 hover:bg-blue-50/50 transition cursor-pointer">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => setCsvFile(e.target.files ? e.target.files[0] : null)}
            className="w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
          />
          {csvFile && (
            <p className="text-xs text-emerald-600 font-bold mt-2">Ready: {csvFile.name}</p>
          )}
        </div>

        {importFeedback && (
          <p
            className={`text-xs font-semibold p-3 rounded-lg ${
              importFeedback.startsWith('Error')
                ? 'bg-red-50 text-red-600'
                : importFeedback.startsWith('Success')
                ? 'bg-emerald-50 text-emerald-600'
                : 'bg-blue-50 text-blue-600'
            }`}
          >
            {importFeedback}
          </p>
        )}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleProcessCsvImport}
            disabled={!csvFile || importing}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            {importing ? 'Processing...' : 'Upload & Sync Fleet'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BulkCsvImportModal;