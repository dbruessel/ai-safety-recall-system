import React, { useState } from 'react';

export interface BulkCsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (file: File) => void;
}

export function BulkCsvImportModal({ isOpen, onClose, onSuccess }: BulkCsvImportModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'csv' | 'txt'>('csv');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const extension = file.name.split('.').pop()?.toLowerCase();

      if (extension !== 'csv' && extension !== 'txt') {
        setErrorMsg('Invalid file format! Please upload a strictly formatted .csv or .txt file.');
        setSelectedFile(null);
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleDownloadTemplate = () => {
    const csvHeader = 'vin,unit_number,make,model,year\n';
    const sampleRows = [
      '1HGCR2F83HA000000,UNIT-101,Honda,Accord,2017',
      '1FTFW1ED4MFC00000,UNIT-102,Ford,F-150,2021',
      '3GCPCREC0LG000000,UNIT-103,Chevrolet,Silverado,2020'
    ].join('\n');

    const blob = new Blob([csvHeader + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'RecallLogic_Fleet_Import_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleStartIngestion = () => {
    if (!selectedFile) return;

    setIsProcessing(true);

    setTimeout(() => {
      setIsProcessing(false);
      if (onSuccess) {
        onSuccess(selectedFile);
      }
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-xl rounded-2xl bg-[#0F172A] border border-slate-800 p-6 shadow-2xl space-y-6">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#06B6D4]/10 border border-[#06B6D4]/30 flex items-center justify-center text-[#06B6D4]">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">Bulk Fleet Ingestion</h3>
              <p className="text-[11px] text-slate-400 font-mono">Real-Time Safety Audit &amp; Inventory Parser</p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Format Specification Instructions */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 font-mono uppercase tracking-wider">
              Required File Format
            </span>
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="text-xs text-[#06B6D4] hover:underline font-mono font-semibold flex items-center gap-1 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>Download Sample CSV</span>
            </button>
          </div>

          {/* Format Tabs */}
          <div className="flex items-center gap-2 border-b border-slate-800 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('csv')}
              className={`pb-2 px-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                activeTab === 'csv'
                  ? 'border-[#06B6D4] text-[#06B6D4]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              .CSV Specification
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('txt')}
              className={`pb-2 px-1 border-b-2 font-semibold transition-colors cursor-pointer ${
                activeTab === 'txt'
                  ? 'border-[#06B6D4] text-[#06B6D4]'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              .TXT Specification
            </button>
          </div>

          {/* Code Specification Box */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1.5 overflow-x-auto">
            {activeTab === 'csv' ? (
              <>
                <div className="text-slate-500">// Header row with required VIN column:</div>
                <div className="text-emerald-400 font-bold">vin,unit_number,make,model,year</div>
                <div className="text-slate-300">1HGCR2F83HA000000,UNIT-101,Honda,Accord,2017</div>
                <div className="text-slate-300">1FTFW1ED4MFC00000,UNIT-102,Ford,F-150,2021</div>
                <div className="text-slate-300">3GCPCREC0LG000000,UNIT-103,Chevrolet,Silverado,2020</div>
              </>
            ) : (
              <>
                <div className="text-slate-500">// One 17-character VIN string per line:</div>
                <div className="text-slate-300">1HGCR2F83HA000000</div>
                <div className="text-slate-300">1FTFW1ED4MFC00000</div>
                <div className="text-slate-300">3GCPCREC0LG000000</div>
              </>
            )}
          </div>
        </div>

        {/* File Picker Box */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 font-mono uppercase">
            Upload Fleet File (.csv or .txt)
          </label>
          <input
            type="file"
            accept=".csv, .txt"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700 font-mono cursor-pointer bg-slate-950 rounded-xl border border-slate-800"
          />
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 font-mono text-xs flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={!selectedFile || isProcessing}
            onClick={handleStartIngestion}
            className="px-5 py-2.5 rounded-xl bg-[#06B6D4] hover:bg-cyan-400 text-slate-950 font-bold text-xs font-mono transition-all shadow-md shadow-cyan-500/10 disabled:opacity-40 flex items-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                <span>Parsing &amp; Auditing...</span>
              </>
            ) : (
              <span>Start Real-Time Safety Audit</span>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}

export default BulkCsvImportModal;