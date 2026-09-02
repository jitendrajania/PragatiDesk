import React, { useState } from 'react';
import { api } from '../../services/api';
import { Task } from '../../types';
import {
  X,
  CheckCircle2,
  Paperclip,
  UploadCloud,
  AlertCircle,
  Calendar,
  ShieldCheck,
} from 'lucide-react';

interface DisposeTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onTaskUpdated: () => void;
}

export const DisposeTaskModal: React.FC<DisposeTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
}) => {
  const [remark, setRemark] = useState('');
  const [initialFollowUpStatus, setInitialFollowUpStatus] = useState(
    'Disposed & Ready for Audit / Verification'
  );
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!remark.trim()) {
      setError('A Disposal Remark / Resolution Summary is mandatory.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedAttachments: any[] = [];
      if (selectedFiles.length > 0) {
        const uploadRes = await api.uploadFiles(selectedFiles);
        uploadedAttachments = uploadRes.files;
      }

      await api.disposeTask(task.id, {
        remark: remark.trim(),
        attachments: uploadedAttachments,
        nextFollowUpDate: nextFollowUpDate || undefined,
        initialFollowUpStatus: initialFollowUpStatus || undefined,
      });

      onTaskUpdated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to dispose task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-emerald-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Dispose Task (Resolve & Close)</h2>
              <p className="text-xs text-slate-500">[{task.taskNumber}] {task.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Follow-Up Responsibility Notice */}
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
            <ShieldCheck className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="font-bold">Follow-Up Ownership Registered</div>
              <div className="text-[11px] text-emerald-800 mt-0.5 leading-relaxed">
                By disposing of this task, you are recorded as the <strong>Follow-up Owner</strong>.
                You can manage compliance, record external replies, and track follow-up reports directly on your dashboard.
              </div>
            </div>
          </div>

          {/* Mandatory Disposal Remark */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Resolution / Disposal Summary <span className="text-red-500">* (Mandatory)</span></span>
              <span className="text-[11px] text-slate-400 font-normal">Audit Record</span>
            </label>
            <textarea
              rows={3}
              placeholder="State the resolution details, testing outcome, approvals obtained, or reference numbers of outgoing letters..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-slate-400 resize-none"
              required
            />
          </div>

          {/* Post-Disposal Follow-up Settings */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Follow-Up Status
              </label>
              <select
                value={initialFollowUpStatus}
                onChange={(e) => setInitialFollowUpStatus(e.target.value)}
                className="w-full text-xs font-medium px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Disposed & Ready for Audit / Verification">Audit Verification Ready</option>
                <option value="Action Pending at External Dept">Pending External Department</option>
                <option value="Signature Obtained - Dispatched">Signature Obtained - Dispatched</option>
                <option value="Completed & Final Closed">Completed & Fully Closed</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Next Follow-Up Date
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 text-slate-700"
              />
            </div>
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Final Deliverables / Certificates <span className="text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-3 text-center bg-slate-50/50 cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-5 h-5 text-emerald-600 mx-auto mb-0.5" />
              <span className="text-xs font-medium text-slate-700">Attach sign-off, PDF, or report</span>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 shadow-sm"
                  >
                    <Paperclip className="w-3 h-3 text-emerald-600" />
                    <span className="truncate max-w-[130px]">{file.name}</span>
                    <button type="button" onClick={() => removeFile(idx)} className="text-slate-400 hover:text-red-500">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Disposing...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as DISPOSED
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
