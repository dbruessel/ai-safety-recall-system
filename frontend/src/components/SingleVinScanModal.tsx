import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CURRENT_PROFILE_ID = '07136e5d-0b6e-4ccf-b774-c2f3f01154bf';

export interface SingleVinScanResult {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  recallsCount: number;
  recalls: Array<{
    campaignNumber: string;
    component: string;
    summary: string;
    remedy: string;
  }>;
}

export interface SingleVinScanModalProps {
  isOpen: boolean;
  currentFleetCount: number;
  vehicleLimit: number;
  onClose: () => void;
  onSuccess: () => void;
  onTriggerUpgrade: (reason: string) => void;
  onIncrementVinChecks: () => void;
}

export const SingleVinScanModal: React.FC<SingleVinScanModalProps> = ({
  isOpen,
  currentFleetCount,
  vehicleLimit,
  onClose,
  onSuccess,
  onTriggerUpgrade,
  onIncrementVinChecks,
}) => {
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<SingleVinScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addingToFleet, setAddingToFleet] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleRunSingleVinScan = async () => {
    const cleanVin = singleVinInput.trim().toUpperCase();
    if (!cleanVin || cleanVin.length < 11) {
      setScanError('Please enter a valid 17-digit vehicle VIN.');
      return;
    }

    try {
      setScanning(true);
      setScanError(null);
      setScanResult(null);

      const response = await fetch(`https://api.nhtsa.gov/recalls/recallsByVin?vin=${cleanVin}&format=json`);
      const data = await response.json();
      const rawResults = data.results || [];

      const mappedRecalls = rawResults.map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber || 'N/A',
        component: r.Component || 'Safety System',
        summary: r.Summary || 'No defect summary available.',
        remedy: r.Remedy || 'Contact dealer for remedy details.',
      }));

      onIncrementVinChecks();

      setScanResult({
        vin: cleanVin,
        make: rawResults[0]?.Make || 'Scanned',
        model: rawResults[0]?.Model || 'Vehicle',
        year: rawResults[0]?.ModelYear ? parseInt(rawResults[0].ModelYear, 10) : 2022,
        recallsCount: mappedRecalls.length,
        recalls: mappedRecalls,
      });
    } catch (err) {
      console.error('NHTSA Scan Error:', err);
      setScanError('Failed to query NHTSA database. Check the VIN and try again.');
    } finally {
      setScanning(false);
    }
  };

  const handleAddScannedVinToFleet = async () => {
    if (!scanResult) return;

    if (currentFleetCount >= vehicleLimit) {
      onTriggerUpgrade(`You have reached your tier capacity of ${vehicleLimit} vehicles.`);
      return;
    }

    try {
      setAddingToFleet(true);

      const { data: vehicleData, error: vehicleErr } = await supabase
        .from('monitored_vehicles')
        .upsert(
          {
            profile_id: CURRENT_PROFILE_ID,
            vin: scanResult.vin,
            make: scanResult.make,
            model: scanResult.model,
            year: scanResult.year,
          },
          { onConflict: 'profile_id,vin' }
        )
        .select('id')
        .single();

      if (vehicleErr) throw vehicleErr;

      if (scanResult.recalls.length > 0 && vehicleData?.id) {
        const tasksToInsert = scanResult.recalls.map((r) => ({
          vehicle_id: vehicleData.id,
          campaign_number: r.campaignNumber,
          component: r.component,
          summary: r.summary,
          remedy: r.remedy,
          severity_score: 7.5,
          status: 'pending',
        }));

        await supabase.from('recall_tasks').insert(tasksToInsert);
      }

      setSingleVinInput('');
      setScanResult(null);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Add to Fleet Error:', err);
      setScanError(`Failed to save asset: ${err.message || 'Database error'}`);
    } finally {
      setAddingToFleet(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/50 backdrop-blur-sm flex items-center justify-center p-4 text-gray-900 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 space-y-5">
        <div className="flex justify-between items-center border-b pb-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>⚡</span> Instant Single-VIN Scan Console
            </h3>
            <p className="text-xs text-gray-500">Query live NHTSA safety defect databases on demand.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-gray-800 uppercase tracking-wider">
            Enter 17-Digit Vehicle Identification Number (VIN)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              maxLength={17}
              placeholder="e.g. 1FTFW1ED4MFC12345"
              value={singleVinInput}
              onChange={(e) => setSingleVinInput(e.target.value.toUpperCase())}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-gray-900 focus:ring-2 focus:ring-blue-500 uppercase"
            />
            <button
              type="button"
              onClick={handleRunSingleVinScan}
              disabled={scanning || !singleVinInput}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-sm transition disabled:opacity-50 cursor-pointer"
            >
              {scanning ? 'Scanning...' : 'Scan VIN'}
            </button>
          </div>
          {scanError && (
            <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-100">
              {scanError}
            </p>
          )}
        </div>

        {scanResult && (
          <div className="space-y-4 border-t pt-4">
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded-xl border">
              <div>
                <p className="text-xs font-bold text-gray-900">{scanResult.year} {scanResult.make} {scanResult.model}</p>
                <p className="text-xs font-mono text-gray-500">VIN: {scanResult.vin}</p>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                scanResult.recallsCount > 0 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                {scanResult.recallsCount} Open Recalls Found
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
              {scanResult.recalls.length === 0 ? (
                <p className="text-xs text-emerald-600 font-semibold text-center py-4 bg-emerald-50 rounded-lg border border-emerald-100">
                  ✅ No safety recalls currently registered with NHTSA for this VIN.
                </p>
              ) : (
                scanResult.recalls.map((r, i) => (
                  <div key={i} className="p-3 bg-red-50/60 border border-red-100 rounded-lg text-xs space-y-1">
                    <div className="flex justify-between font-bold text-red-800">
                      <span>{r.component}</span>
                      <span className="font-mono text-red-600">#{r.campaignNumber}</span>
                    </div>
                    <p className="text-gray-700">{r.summary}</p>
                  </div>
                ))
              )}
            </div>

            <button
              type="button"
              onClick={handleAddScannedVinToFleet}
              disabled={addingToFleet}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition cursor-pointer"
            >
              {addingToFleet ? 'Saving Asset...' : '➕ Add Vehicle to Monitored Fleet'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SingleVinScanModal;