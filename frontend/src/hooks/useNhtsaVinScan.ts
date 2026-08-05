import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const CURRENT_PROFILE_ID = '07136e5d-0b6e-4ccf-b774-c2f3f01154bf';

export interface SingleVinRecall {
  campaignNumber: string;
  component: string;
  summary: string;
  remedy: string;
}

export interface SingleVinScanResult {
  vin: string;
  make?: string;
  model?: string;
  year?: number;
  recallsCount: number;
  recalls: SingleVinRecall[];
}

export interface UseNhtsaVinScanProps {
  currentFleetCount: number;
  vehicleLimit: number;
  onSuccess?: () => void;
  onTriggerUpgrade?: (reason: string) => void;
  onIncrementVinChecks?: () => void;
}

export function useNhtsaVinScan({
  currentFleetCount,
  vehicleLimit,
  onSuccess,
  onTriggerUpgrade,
  onIncrementVinChecks,
}: UseNhtsaVinScanProps) {
  const [singleVinInput, setSingleVinInput] = useState<string>('');
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<SingleVinScanResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [addingToFleet, setAddingToFleet] = useState<boolean>(false);

  // EXECUTE LIVE NHTSA RECALL API SCAN
  const runSingleVinScan = useCallback(async () => {
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

      const mappedRecalls: SingleVinRecall[] = rawResults.map((r: any) => ({
        campaignNumber: r.NHTSACampaignNumber || 'N/A',
        component: r.Component || 'Safety System',
        summary: r.Summary || 'No defect summary available.',
        remedy: r.Remedy || 'Contact dealer for remedy details.',
      }));

      if (onIncrementVinChecks) {
        onIncrementVinChecks();
      }

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
  }, [singleVinInput, onIncrementVinChecks]);

  // PERSIST SCANNED ASSET & RECALL TASKS TO SUPABASE
  const addScannedVinToFleet = useCallback(async () => {
    if (!scanResult) return;

    if (currentFleetCount >= vehicleLimit) {
      if (onTriggerUpgrade) {
        onTriggerUpgrade(`You have reached your tier capacity of ${vehicleLimit} vehicles.`);
      }
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
      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error('Add to Fleet Error:', err);
      setScanError(`Failed to save asset: ${err.message || 'Database error'}`);
    } finally {
      setAddingToFleet(false);
    }
  }, [scanResult, currentFleetCount, vehicleLimit, onTriggerUpgrade, onSuccess]);

  const resetScanState = useCallback(() => {
    setSingleVinInput('');
    setScanResult(null);
    setScanError(null);
  }, []);

  return {
    singleVinInput,
    setSingleVinInput,
    scanning,
    scanResult,
    scanError,
    addingToFleet,
    runSingleVinScan,
    addScannedVinToFleet,
    resetScanState,
  };
}