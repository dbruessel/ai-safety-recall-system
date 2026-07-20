import React, { useState, useRef } from 'react';

interface IngestionDropzoneProps {
  onProcessManifest: (rawLines: string[]) => void;
  loading: boolean;
}

export default function IngestionDropzone({ onProcessManifest, loading }: IngestionDropzoneProps) {
  const [bulkInput, setBulkInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkInput.trim()) return;
    onProcessManifest(bulkInput.split('\n'));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setBulkInput(text);
        onProcessManifest(text.split('\n'));
      }
    };
    reader.readAsText(files[0]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setBulkInput(text);
          onProcessManifest(text.split('\n'));
        }
      };
      reader.readAsText(files[0]);
    }
  };

  return (
    <section className="bg-slate-900/20 border border-slate-900 rounded-2xl p-6 shadow-inner">
      <div className="flex flex-col lg:flex-row items-stretch gap-6">
        
        {/* TEXT AREA STREAM SUBMISSION */}
        <form onSubmit={handleTextSubmit} className="flex-1 flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-black font-mono uppercase tracking-wider text-slate-300">
              Ingestion Dropzone Stream
            </label>
            <span className="text-[10px] text-slate-600 font-mono font-medium">Format Matrix: Make, Model, Year</span>
          </div>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder="Ford, F-150, 2022&#10;Freightliner, Cascadia, 2021&#10;Volvo, VNL, 2023"
            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-xl p-4 text-slate-300 placeholder-slate-700 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500/30 resize-none transition-all"
          />
          <button
            type="submit"
            disabled={loading || !bulkInput.trim()}
            className="w-full bg-slate-100 hover:bg-white text-slate-950 font-mono font-black uppercase tracking-wider text-xs py-3 rounded-xl transition disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
          >
            {loading ? 'Analyzing Manifest Records...' : 'Analyze Fleet Array Composition'}
          </button>
        </form>

        {/* DRAG-AND-DROP FILE INTERCEPT ZONE */}
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`lg:w-80 border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer group transition ${
            isDragging ? 'border-cyan-500 bg-cyan-950/20' : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept=".csv,.txt" 
          />
          <div className="text-3xl mb-2 text-slate-600 group-hover:scale-105 transition-transform">📡</div>
          <h4 className="text-xs font-bold text-slate-300 uppercase font-mono tracking-wide">Frictionless Bulk Drop</h4>
          <p className="text-[11px] text-slate-500 max-w-[200px] mt-1">Drop spreadsheet vectors directly into processing lines (.csv, .txt)</p>
        </div>

      </div>
    </section>
  );
}