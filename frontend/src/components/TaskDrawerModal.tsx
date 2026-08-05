import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type UserRole = 'admin' | 'mechanic' | 'viewer';

export interface TaskboardRecallItem {
  id: string;
  unit_number: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  nhtsa_campaign_number: string;
  component: string;
  severity: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  status: 'Open' | 'Scheduled' | 'In Progress' | 'Cleared' | string;
  summary?: string;
  consequence?: string;
  remedy?: string;
  created_at: string;
  scheduled_date?: string;
  repair_notes?: string;
  receipt_url?: string;
  closed_by_user_email?: string;
  closed_at?: string;
}

export interface TaskDrawerModalProps {
  isOpen: boolean;
  selectedRecall: TaskboardRecallItem | null;
  userRole: UserRole;
  userEmail: string;
  permissions: {
    canUpdateTaskStatus: boolean;
    canUploadReceipts: boolean;
  };
  onClose: () => void;
  onTaskUpdated: (updatedItem: TaskboardRecallItem) => void;
}

export const TaskDrawerModal: React.FC<TaskDrawerModalProps> = ({
  isOpen,
  selectedRecall,
  userRole,
  userEmail,
  permissions,
  onClose,
  onTaskUpdated,
}) => {
  const [scheduledDateInput, setScheduledDateInput] = useState<string>('');
  const [notesInput, setNotesInput] = useState<string>('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState<boolean>(false);
  const [uploadingReceipt, setUploadingReceipt] = useState<boolean>(false);

  useEffect(() => {
    if (selectedRecall) {
      setScheduledDateInput(selectedRecall.scheduled_date || '');
      setNotesInput(selectedRecall.repair_notes || '');
      setReceiptFile(null);
    }
  }, [selectedRecall]);

  if (!isOpen || !selectedRecall) return null;

  const uploadReceiptToStorage = async (file: File, taskId: string): Promise<string | null> => {
    try {
      setUploadingReceipt(true);
      const fileExt = file.name.split('.').pop();
      const fileName = `${taskId}_${Date.now()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('repair-receipts')
        .upload(filePath, file, { upsert: true });

      if (uploadError) return null;

      const { data: publicUrlData } = supabase.storage
        .from('repair-receipts')
        .getPublicUrl(filePath);

      return publicUrlData.publicUrl || null;
    } catch (err) {
      console.error('Failed to upload receipt file:', err);
      return null;
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!permissions.canUpdateTaskStatus) return;
    try {
      setUpdatingStatus(true);
      let uploadedUrl = selectedRecall.receipt_url || '';

      if (receiptFile) {
        const publicUrl = await uploadReceiptToStorage(receiptFile, selectedRecall.id);
        if (publicUrl) uploadedUrl = publicUrl;
      }

      let dbStatus = 'pending';
      if (newStatus === 'Scheduled' || newStatus === 'In Progress') dbStatus = 'scheduled';
      if (newStatus === 'Cleared') dbStatus = 'completed';

      const { data: { user } } = await supabase.auth.getUser();

      const updatePayload: any = {
        status: dbStatus,
        scheduled_repair_date: scheduledDateInput || null,
        repair_notes: notesInput || null,
        proof_of_remedy_url: uploadedUrl || null,
      };

      if (newStatus === 'Cleared') {
        updatePayload.closed_by_user_email = user?.email || userEmail || 'System Operator';
        updatePayload.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('recall_tasks')
        .update(updatePayload)
        .eq('id', selectedRecall.id);

      if (error) throw error;

      const updatedItem: TaskboardRecallItem = {
        ...selectedRecall,
        status: newStatus,
        scheduled_date: scheduledDateInput,
        repair_notes: notesInput,
        receipt_url: uploadedUrl,
        closed_by_user_email: updatePayload.closed_by_user_email || selectedRecall.closed_by_user_email,
        closed_at: updatePayload.closed_at || selectedRecall.closed_at,
      };

      onTaskUpdated(updatedItem);
      setReceiptFile(null);
    } catch (err) {
      console.error('Failed to update status in Supabase:', err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-gray-900/40 backdrop-blur-sm flex justify-end text-gray-900 font-sans">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b pb-4">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Manage Unit #{selectedRecall.unit_number}</h2>
              <p className="text-xs text-gray-500">
                {selectedRecall.year} {selectedRecall.make} {selectedRecall.model} (VIN: {selectedRecall.vin})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 text-lg font-bold rounded-lg hover:bg-gray-100 cursor-pointer"
            >
              ✕
            </button>
          </div>

          <div className="space-y-3 bg-gray-50 p-4 rounded-xl border border-gray-200/80">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-blue-600 font-mono">
                NHTSA #{selectedRecall.nhtsa_campaign_number}
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">
                {selectedRecall.severity} Severity
              </span>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase text-gray-500">Defective Component</h4>
              <p className="text-sm font-medium text-gray-800">{selectedRecall.component}</p>
            </div>
            {selectedRecall.summary && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-gray-500">Defect Summary</h4>
                <p className="text-xs text-gray-600 mt-0.5">{selectedRecall.summary}</p>
              </div>
            )}
            {selectedRecall.remedy && (
              <div>
                <h4 className="text-xs font-semibold uppercase text-gray-500">Manufacturer Remedy</h4>
                <p className="text-xs text-gray-600 mt-0.5">{selectedRecall.remedy}</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Update Remedy Status</h3>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Appointment / Repair Date</label>
              <input
                type="date"
                disabled={!permissions.canUpdateTaskStatus}
                value={scheduledDateInput}
                onChange={(e) => setScheduledDateInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fleet Notes / Repair Invoice #</label>
              <textarea
                rows={3}
                disabled={!permissions.canUpdateTaskStatus}
                placeholder="Add dealership invoice numbers, technician notes, or service location details..."
                value={notesInput}
                onChange={(e) => setNotesInput(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
            </div>

            <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2">
              <label className="block text-xs font-bold text-gray-800">
                Proof of Remedy / Repair Invoice (PDF or Image)
              </label>

              {selectedRecall.receipt_url ? (
                <div className="flex items-center justify-between p-2.5 bg-white border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700">
                    <span>✅</span> Attached Repair Proof
                  </div>
                  <a
                    href={selectedRecall.receipt_url}
                    target="_blank"
                    rel="noreferrer"
                    className="px-2.5 py-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded border border-emerald-200 transition"
                  >
                    View Document ↗
                  </a>
                </div>
              ) : (
                <p className="text-xs text-gray-500">
                  Upload the dealership repair order or receipt to establish an unshakeable audit trail before clearing this recall.
                </p>
              )}

              {permissions.canUploadReceipts && (
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setReceiptFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                />
              )}
              {receiptFile && (
                <p className="text-xs text-blue-600 font-medium">Selected: {receiptFile.name}</p>
              )}
            </div>
          </div>
        </div>

        <div className="border-t pt-4 space-y-2">
          {permissions.canUpdateTaskStatus ? (
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus('Scheduled')}
                disabled={updatingStatus || uploadingReceipt}
                className="py-2.5 px-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                Mark Scheduled
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('In Progress')}
                disabled={updatingStatus || uploadingReceipt}
                className="py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                In Progress
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus('Cleared')}
                disabled={updatingStatus || uploadingReceipt}
                className="py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition disabled:opacity-50 cursor-pointer"
              >
                {uploadingReceipt ? 'Uploading...' : 'Mark Cleared'}
              </button>
            </div>
          ) : (
            <div className="p-3 bg-gray-100 text-gray-600 text-center rounded-lg text-xs font-mono font-bold">
              🔒 Read-Only Access (Role: {userRole.toUpperCase()})
            </div>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition cursor-pointer"
          >
            Close Drawer
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskDrawerModal;