import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Project, AssigneeOption } from '../../types';
import { useToast } from '../../context/ToastContext';
import {
  X,
  Plus,
  UploadCloud,
  FileText,
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Paperclip,
  Building,
  Hash,
  Mail,
} from 'lucide-react';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTaskCreated: () => void;
  projects: Project[];
  defaultProjectId?: string;
}

export const CreateTaskModal: React.FC<CreateTaskModalProps> = ({
  isOpen,
  onClose,
  onTaskCreated,
  projects,
  defaultProjectId,
}) => {
  const [projectId, setProjectId] = useState<string>(defaultProjectId || '');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [rajKajNumber, setRajKajNumber] = useState('');
  const [issueNumber, setIssueNumber] = useState('');
  const [referenceDate, setReferenceDate] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [letterEmailContent, setLetterEmailContent] = useState('');
  const [category, setCategory] = useState('TECHNICAL_ISSUE');
  const [priority, setPriority] = useState('MEDIUM');
  const [assigneeId, setAssigneeId] = useState('');
  const [durationValue, setDurationValue] = useState<string>('3');
  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'HOURS'>('DAYS');
  const [estimatedDate, setEstimatedDate] = useState('');
  const [initialRemark, setInitialRemark] = useState('');

  const [assignees, setAssignees] = useState<AssigneeOption[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { showSuccess, showError } = useToast();

  // Sync default project and reset assignee when modal opens
  useEffect(() => {
    if (isOpen) {
      setAssigneeId('');
      if (defaultProjectId) {
        setProjectId(defaultProjectId);
      } else if (projects.length > 0 && !projectId) {
        setProjectId(projects[0].id);
      }
    }
  }, [isOpen, defaultProjectId, projects]);

  // Load assignees based on selected project (keep Unassigned / Open Queue as default)
  useEffect(() => {
    if (projectId) {
      api.getAssignees(projectId).then((data) => {
        setAssignees(data);
      });
    } else {
      api.getAssignees().then((data) => setAssignees(data));
    }
  }, [projectId]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const fileList = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...fileList]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    if (!subject.trim()) {
      setError('Task Subject / Title is mandatory.');
      setIsSubmitting(false);
      return;
    }

    try {
      let uploadedAttachments: any[] = [];

      // 1. Upload files if any
      if (selectedFiles.length > 0) {
        setIsUploading(true);
        const uploadRes = await api.uploadFiles(selectedFiles);
        uploadedAttachments = uploadRes.files;
        setIsUploading(false);
      }

      // 2. Submit task (Zero-mandatory fields!)
      const createdTask = await api.createTask({
        projectId: projectId || (projects.length > 0 ? projects[0].id : undefined),
        referenceNumber: referenceNumber || undefined,
        rajKajNumber: rajKajNumber || undefined,
        issueNumber: issueNumber || undefined,
        referenceDate: referenceDate || undefined,
        subject: subject || undefined,
        description: description || undefined,
        letterEmailContent: letterEmailContent || undefined,
        category,
        priority,
        currentAssigneeId: assigneeId || undefined,
        allocatedDurationValue: durationValue ? parseInt(durationValue, 10) : undefined,
        allocatedDurationUnit: durationUnit,
        estimatedCompletionAt: estimatedDate || undefined,
        initialRemark: initialRemark || undefined,
        attachments: uploadedAttachments,
      });

      const taskNumberStr = createdTask?.taskNumber ? ` (${createdTask.taskNumber})` : '';
      const successText = `Task / Issue${taskNumberStr} created successfully!`;
      setSuccessMessage(successText);
      showSuccess(successText, 'Task Created Successfully');

      // Reset form
      setSubject('');
      setReferenceNumber('');
      setRajKajNumber('');
      setIssueNumber('');
      setReferenceDate('');
      setDescription('');
      setLetterEmailContent('');
      setAssigneeId('');
      setSelectedFiles([]);
      setInitialRemark('');

      onTaskCreated();
      setTimeout(() => {
        setSuccessMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      console.error('Task creation error:', err);
      const msg = err.message || 'Failed to create task';
      setError(msg);
      showError(msg);
    } finally {
      setIsSubmitting(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Create Task / Issue (To-Do)</h2>
              <p className="text-xs text-slate-500">
                Frictionless registration — intake with RajKaj No, Issue No, Email Date, & Letter content
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
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

          {/* Project & Category Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.projectCode}] {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Task Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              >
                <option value="TECHNICAL_ISSUE">⚙️ Technical Issue</option>
                <option value="OFFICIAL_LETTER">✉️ Office Letters</option>
              </select>
            </div>
          </div>

          {/* Reference Numbers Section: RajKaj No, Issue No, Email Date */}
          <div className="p-3.5 bg-brand-50/40 rounded-xl border border-brand-100/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-brand-600" />
                Departmental Reference & Tracking Identifiers
              </span>
              <span className="text-[11px] text-slate-400 font-normal">All fields optional</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* RajKaj Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Building className="w-3 h-3 text-brand-600" />
                  RajKaj Dak / File No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. RJ-DK/2026/89421"
                  value={rajKajNumber}
                  onChange={(e) => setRajKajNumber(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 font-mono"
                />
              </div>

              {/* Issue Number */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Hash className="w-3 h-3 text-amber-600" />
                  Issue / Tracking No.
                </label>
                <input
                  type="text"
                  placeholder="e.g. ISSUE-7741 / GRV-202"
                  value={issueNumber}
                  onChange={(e) => setIssueNumber(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 font-mono"
                />
              </div>

              {/* Email / Letter Date */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-emerald-600" />
                  Email / Letter Date
                </label>
                <input
                  type="date"
                  value={referenceDate}
                  onChange={(e) => setReferenceDate(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-slate-700"
                />
              </div>
            </div>

            {/* General Reference fallback */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Other Reference / Dispatch #
              </label>
              <input
                type="text"
                placeholder="e.g. F.12(34)/DoIT/Coord/2026 or Email Subject line reference"
                value={referenceNumber}
                onChange={(e) => setReferenceNumber(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400 font-mono"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Task Subject / Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Enter brief summary of the technical issue or office letter..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 font-medium"
              required
            />
          </div>

          {/* Assignee Selection (Name & Designation) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Assignee <span className="text-brand-600 font-semibold">(Name & Designation)</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Unassigned (Open Queue)</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.displayName} {a.roles && a.roles.length > 0 ? `[${a.roles.join(', ')}]` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Priority, Duration, and Estimated Date */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full text-xs font-bold px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="CRITICAL" className="text-red-700 font-bold">🔴 Critical (Immediate)</option>
                <option value="HIGH" className="text-amber-700 font-bold">🟠 High Priority</option>
                <option value="MEDIUM" className="text-blue-700 font-bold">🔵 Medium Priority</option>
                <option value="LOW" className="text-slate-700 font-bold">⚪ Low Priority</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Allocated Duration
              </label>
              <div className="flex gap-1.5">
                <input
                  type="number"
                  min="1"
                  value={durationValue}
                  onChange={(e) => setDurationValue(e.target.value)}
                  className="w-20 text-xs px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 text-center font-bold"
                />
                <select
                  value={durationUnit}
                  onChange={(e) => setDurationUnit(e.target.value as 'DAYS' | 'HOURS')}
                  className="flex-1 text-xs font-medium px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="DAYS">Days</option>
                  <option value="HOURS">Hours</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Estimated Target Date
              </label>
              <input
                type="datetime-local"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                className="w-full text-xs px-2 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {/* Letter / Email Body Intake */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-500" />
              Official Letter Content / Email Transcript / Note Sheet
            </label>
            <textarea
              rows={3}
              placeholder="Paste official letter body, received email text, or secretariat note sheet transcript..."
              value={letterEmailContent}
              onChange={(e) => setLetterEmailContent(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400 font-mono text-slate-800"
            />
          </div>

          {/* Technical Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Technical Details / Action Instructions
            </label>
            <textarea
              rows={3}
              placeholder="Provide technical descriptions, steps to reproduce, or specific instructions for the resolving employee..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-400"
            />
          </div>

          {/* Initial Remark */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Remark / Forwarding Note
            </label>
            <input
              type="text"
              placeholder="e.g. Received from Finance Dept. Please process and prepare reply."
              value={initialRemark}
              onChange={(e) => setInitialRemark(e.target.value)}
              className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:ring-2 focus:ring-brand-500 placeholder:text-slate-400"
            />
          </div>

          {/* File Attachments Dropzone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Attachments (PDF, Excel, JPG, Word, Scan Documents)
            </label>
            <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 bg-slate-50/50 hover:bg-slate-50 text-center transition-colors">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="cursor-pointer flex flex-col items-center gap-1.5"
              >
                <UploadCloud className="w-7 h-7 text-brand-500" />
                <span className="text-xs font-bold text-brand-600 hover:text-brand-700">
                  Click to browse files or drag and drop
                </span>
                <span className="text-[11px] text-slate-400">
                  Supports PDF, XLSX, DOCX, PNG, JPG, CSV (Up to 25MB each)
                </span>
              </label>
            </div>

            {/* Selected files list */}
            {selectedFiles.length > 0 && (
              <div className="mt-2 space-y-1.5">
                {selectedFiles.map((file, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-slate-100 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Paperclip className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                      <span className="truncate font-medium text-slate-700">{file.name}</span>
                      <span className="text-[10px] text-slate-400">
                        ({(file.size / 1024).toFixed(1)} KB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(idx)}
                      className="text-slate-400 hover:text-red-600 p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-[11px] text-slate-400 italic">
              ✨ No mandatory fields required for quick task creation
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isUploading}
                className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all disabled:opacity-50"
              >
                {isSubmitting || isUploading ? 'Creating Task...' : 'Create Task'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
