import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Task, AssigneeOption } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  X,
  ArrowRightLeft,
  Paperclip,
  UploadCloud,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface TransferTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  onTaskUpdated: () => void;
}

export const TransferTaskModal: React.FC<TransferTaskModalProps> = ({
  isOpen,
  onClose,
  task,
  onTaskUpdated,
}) => {
  const { showSuccess, showError } = useToast();
  const [targetUserId, setTargetUserId] = useState('');
  const [remark, setRemark] = useState('');
  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (task.projectId) {
      api.getAssignees(task.projectId).then((data) => {
        // Filter out current assignee from list
        const filtered = data.filter((a) => a.id !== task.currentAssigneeId);
        setAssignees(filtered);
        if (filtered.length > 0) {
          setTargetUserId(filtered[0].id);
        }
      });
    }
  }, [task]);

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

    if (!targetUserId) {
      setError('Please select an eligible member to transfer this task.');
      return;
    }

    if (!remark.trim()) {
      setError('A Remark or Message is required when transferring a task.');
      return;
    }

    setIsSubmitting(true);

    try {
      let uploadedAttachments: any[] = [];
      if (selectedFiles.length > 0) {
        const uploadRes = await api.uploadFiles(selectedFiles);
        uploadedAttachments = uploadRes.files;
      }

      await api.transferTask(task.id, {
        targetUserId,
        remark: remark.trim(),
        attachments: uploadedAttachments,
      });

      const successText = `Task [${task.taskNumber}] transferred successfully!`;
      setSuccessMessage(successText);
      showSuccess(successText, 'Task Transferred');

      onTaskUpdated();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      const msg = err.message || 'Failed to transfer task';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-amber-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Transfer Task Assignment</h2>
              <p className="text-xs text-slate-500">[{task.taskNumber}] {task.subject}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-bold animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Assignee Info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
            <span className="text-slate-500 font-medium">Current Assignee: </span>
            <span className="font-bold text-slate-800">
              {task.currentAssignee?.name || 'Unassigned'} ({task.currentAssignee?.designation || 'N/A'})
            </span>
          </div>

          {/* Target Assignee Dropdown (Name & Designation) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Transfer To <span className="text-brand-600">* (Name & Designation)</span>
            </label>
            <select
              value={targetUserId}
              onChange={(e) => setTargetUserId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} — {a.designation} ({a.ssoId}) {a.roles ? `[${a.roles.join(', ')}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mandatory Remark / Message */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Transfer Remark / Instructions <span className="text-red-500">* (Mandatory)</span></span>
              <span className="text-[11px] text-slate-400 font-normal">Visible to entire team</span>
            </label>
            <textarea
              rows={3}
              placeholder="Enter context, next actions required, testing instructions, or notes for the new assignee..."
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-amber-500 focus:border-amber-500 placeholder:text-slate-400 resize-none"
              required
            />
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attach Files <span className="text-slate-400 font-normal">(PDF, Excel, JPG, etc.)</span>
            </label>
            <div className="border border-dashed border-slate-300 hover:border-amber-500 rounded-xl p-3 text-center bg-slate-50/50 cursor-pointer relative">
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx,.csv,.txt"
                onChange={handleFileChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <UploadCloud className="w-5 h-5 text-amber-600 mx-auto mb-0.5" />
              <span className="text-xs font-medium text-slate-700">Attach verification notes or files</span>
            </div>

            {selectedFiles.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="inline-flex items-center gap-1 px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-700 shadow-sm"
                  >
                    <Paperclip className="w-3 h-3 text-amber-600" />
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
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Transferring...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Confirm Transfer
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
