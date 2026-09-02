import React, { useState, useEffect } from 'react';
import { api, UPLOADS_BASE_URL } from '../../services/api';
import { Task, TaskActivity, FollowUpReport } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  StatusBadge,
  PriorityBadge,
  CategoryBadge,
  RoleBadge,
} from '../common/Badge';
import { TransferTaskModal } from './TransferTaskModal';
import { RevertTaskModal } from './RevertTaskModal';
import { DisposeTaskModal } from './DisposeTaskModal';
import {
  X,
  Clock,
  Calendar,
  User as UserIcon,
  ArrowRightLeft,
  RotateCcw,
  CheckCircle2,
  Paperclip,
  FileText,
  MessageSquare,
  History,
  ShieldCheck,
  Edit3,
  Save,
  Send,
  PlusCircle,
  ExternalLink,
  Download,
  AlertTriangle,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface TaskDetailModalProps {
  isOpen: boolean;
  taskId: string | null;
  onClose: () => void;
  onTaskUpdated: () => void;
}

export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({
  isOpen,
  taskId,
  onClose,
  onTaskUpdated,
}) => {
  const { user } = useAuth();
  const { showSuccess, showError } = useToast();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'timeline' | 'followup'>('details');

  // Action Modals State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRevertModal, setShowRevertModal] = useState(false);
  const [showDisposeModal, setShowDisposeModal] = useState(false);

  // Group Head Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editRefNumber, setEditRefNumber] = useState('');
  const [editRajKajNumber, setEditRajKajNumber] = useState('');
  const [editIssueNumber, setEditIssueNumber] = useState('');
  const [editReferenceDate, setEditReferenceDate] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLetterContent, setEditLetterContent] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Quick Priority & Duration adjustment state
  const [priority, setPriority] = useState('');
  const [durationVal, setDurationVal] = useState<number | ''>('');
  const [durationUnit, setDurationUnit] = useState<'DAYS' | 'HOURS'>('DAYS');

  // Quick Follow-Up Report Form state
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const [followUpStatus, setFollowUpStatus] = useState('Awaiting External Dept Confirmation');
  const [followUpRemarks, setFollowUpRemarks] = useState('');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmittingFollowUp, setIsSubmittingFollowUp] = useState(false);

  const fetchTask = async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const data = await api.getTask(taskId);
      setTask(data);
      setEditSubject(data.subject || '');
      setEditRefNumber(data.referenceNumber || '');
      setEditRajKajNumber(data.rajKajNumber || '');
      setEditIssueNumber(data.issueNumber || '');
      setEditReferenceDate(data.referenceDate ? format(new Date(data.referenceDate), 'yyyy-MM-dd') : '');
      setEditDescription(data.description || '');
      setEditLetterContent(data.letterEmailContent || '');
      setEditCategory(data.category || 'GENERAL_TASK');
      setPriority(data.priority);
      setDurationVal(data.allocatedDurationValue || '');
      setDurationUnit(data.allocatedDurationUnit || 'DAYS');
    } catch (err) {
      console.error('Failed to load task details:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      fetchTask();
    }
  }, [isOpen, taskId]);

  if (!isOpen || !taskId) return null;

  const isGroupHeadOrAdmin =
    user?.systemRole === 'SUPER_ADMIN' ||
    user?.systemRole === 'GROUP_HEAD' ||
    (task?.project?.groupHead && task.project.groupHead.name === user?.name);

  const isCurrentAssignee = user?.id === task?.currentAssigneeId;
  const isDisposed = task?.status === 'DISPOSED' || task?.status === 'CLOSED';

  // Permission rule: Task creator, Group Head / Section user, or Super Admin can delete
  const canDeleteTask =
    user?.id === task?.createdById ||
    user?.systemRole === 'GROUP_HEAD' ||
    user?.systemRole === 'SUPER_ADMIN' ||
    user?.systemRole === 'OFFICE_SUPER_ADMIN';

  const [isDeletingTask, setIsDeletingTask] = useState(false);

  const handleDeleteTask = async () => {
    if (!task) return;
    const confirmMsg = `Are you sure you want to permanently delete task [${task.taskNumber}]?\n\n"${task.subject}"\n\nThis will remove all associated attachments, activity history, and tracking notes. This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    setIsDeletingTask(true);
    try {
      await api.deleteTask(task.id);
      showSuccess(`Task [${task.taskNumber}] deleted successfully.`, 'Task Deleted');
      onTaskUpdated();
      onClose();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      showError(err.message || 'Failed to delete task', 'Delete Failed');
    } finally {
      setIsDeletingTask(false);
    }
  };

  // Handle Save Core Edits (Group Head Only)
  const handleSaveEdits = async () => {
    if (!task) return;
    setIsSavingEdit(true);
    try {
      await api.updateTask(task.id, {
        subject: editSubject,
        referenceNumber: editRefNumber,
        rajKajNumber: editRajKajNumber || null,
        issueNumber: editIssueNumber || null,
        referenceDate: editReferenceDate || null,
        description: editDescription,
        letterEmailContent: editLetterContent,
        category: editCategory,
      });
      setIsEditing(false);
      showSuccess(`Task [${task.taskNumber}] updated successfully!`, 'Task Updated');
      await fetchTask();
      onTaskUpdated();
    } catch (err: any) {
      console.error('Failed to update task:', err);
      showError(err.message || 'Failed to update task');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Handle Quick Priority / Duration update
  const handleUpdatePriorityDuration = async () => {
    if (!task) return;
    try {
      await api.updateTaskPriority(task.id, {
        priority,
        allocatedDurationValue: durationVal ? Number(durationVal) : undefined,
        allocatedDurationUnit: durationUnit,
      });
      showSuccess(`Task SLA and Priority updated successfully!`, 'SLA Updated');
      await fetchTask();
      onTaskUpdated();
    } catch (err: any) {
      console.error('Failed to update priority:', err);
      showError(err.message || 'Failed to update priority');
    }
  };

  // Handle Add Follow-Up Report
  const handleAddFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!task || !followUpRemarks.trim()) return;
    setIsSubmittingFollowUp(true);
    try {
      await api.createFollowUp({
        taskId: task.id,
        status: followUpStatus,
        remarks: followUpRemarks.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined,
      });
      setFollowUpRemarks('');
      setNextFollowUpDate('');
      setShowAddFollowUp(false);
      showSuccess('Follow-up compliance report logged successfully!', 'Follow-Up Saved');
      await fetchTask();
      onTaskUpdated();
    } catch (err: any) {
      console.error('Failed to add follow-up report:', err);
      showError(err.message || 'Failed to add follow-up report');
    } finally {
      setIsSubmittingFollowUp(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {isLoading || !task ? (
          <div className="p-12 text-center text-slate-500">Loading task details...</div>
        ) : (
          <>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-brand-100 text-brand-800 border border-brand-300">
                  {task.taskNumber}
                </span>
                <StatusBadge status={task.status} />
                <PriorityBadge priority={task.priority} />
                <CategoryBadge category={task.category} />
                {task.rajKajNumber && (
                  <span className="text-xs font-mono font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 flex items-center gap-1">
                    🏛️ RajKaj: {task.rajKajNumber}
                  </span>
                )}
                {task.issueNumber && (
                  <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                    🎫 Issue: {task.issueNumber}
                  </span>
                )}
                {task.referenceDate && (
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                    📅 Date: {format(new Date(task.referenceDate), 'dd MMM yyyy')}
                  </span>
                )}
                {task.referenceNumber && (
                  <span className="text-xs font-mono font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-300">
                    Ref: {task.referenceNumber}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {/* Group Head Edit Toggle */}
                {isGroupHeadOrAdmin && !isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Task
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Workflow Action Bar */}
            <div className="px-6 py-2.5 bg-gradient-to-r from-slate-900 to-doit-navy text-white flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400 font-medium">Assigned To:</span>
                <div className="flex items-center gap-1.5 font-bold text-white bg-white/10 px-2.5 py-1 rounded">
                  <UserIcon className="w-3.5 h-3.5 text-brand-300" />
                  <span>{task.currentAssignee?.name || 'Unassigned'}</span>
                  <span className="text-brand-300 text-[11px] font-normal">
                    ({task.currentAssignee?.designation || 'N/A'})
                  </span>
                </div>
              </div>

              {/* Action Buttons: Transfer, Revert, Dispose */}
              <div className="flex items-center gap-2">
                {!isDisposed && (
                  <>
                    <button
                      onClick={() => setShowTransferModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-lg transition-all shadow-sm"
                      title="Transfer task with mandatory remarks"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                      Transfer Task
                    </button>

                    <button
                      onClick={() => setShowRevertModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 rounded-lg transition-all shadow-sm"
                      title="Revert task back to assigner"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Revert Task
                    </button>

                    <button
                      onClick={() => setShowDisposeModal(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-all shadow-sm"
                      title="Mark task as disposed and claim follow-up ownership"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Dispose Task
                    </button>
                  </>
                )}
                {isDisposed && (
                  <div className="flex items-center gap-1 text-xs text-emerald-300 font-bold bg-emerald-950/60 px-3 py-1 rounded-lg border border-emerald-800">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Disposed by {task.disposedBy?.name || 'Officer'}
                  </div>
                )}

                {/* Delete Task Button: available to task creator, Group Head / Section user, or Super Admin */}
                {canDeleteTask && (
                  <button
                    onClick={handleDeleteTask}
                    disabled={isDeletingTask}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-rose-200 hover:text-white bg-rose-950/70 hover:bg-rose-800/90 border border-rose-700/60 rounded-lg transition-all shadow-sm cursor-pointer disabled:opacity-50"
                    title="Permanently delete this task (Authorized for Task Creator & Section/Group Head)"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    {isDeletingTask ? 'Deleting...' : 'Delete'}
                  </button>
                )}
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 bg-white px-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'details'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileText className="w-4 h-4" />
                Task Details & Letters
              </button>
              <button
                onClick={() => setActiveTab('timeline')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'timeline'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <History className="w-4 h-4" />
                Team Activity Timeline ({task.activities?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('followup')}
                className={`py-3 px-4 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 ${
                  activeTab === 'followup'
                    ? 'border-brand-600 text-brand-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Follow-Up & Compliance ({task.followUpReports?.length || 0})
              </button>
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
              {/* TAB 1: DETAILS */}
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Task Subject / Title */}
                  {isEditing ? (
                    <div className="p-4 bg-white rounded-xl border border-brand-300 shadow-sm space-y-3">
                      <div className="text-xs font-bold text-brand-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Edit3 className="w-3.5 h-3.5" />
                        Editing Task Core Information (Section/Group Head Authorization)
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Subject</label>
                        <input
                          type="text"
                          value={editSubject}
                          onChange={(e) => setEditSubject(e.target.value)}
                          className="w-full text-xs font-bold px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            🏛️ RajKaj Dak / File #
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. RJ-DK/2026/89421"
                            value={editRajKajNumber}
                            onChange={(e) => setEditRajKajNumber(e.target.value)}
                            className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            🎫 Issue / Tracking #
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. ISSUE-7741"
                            value={editIssueNumber}
                            onChange={(e) => setEditIssueNumber(e.target.value)}
                            className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            📅 Email / Letter Date
                          </label>
                          <input
                            type="date"
                            value={editReferenceDate}
                            onChange={(e) => setEditReferenceDate(e.target.value)}
                            className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">
                            Other Reference #
                          </label>
                          <input
                            type="text"
                            value={editRefNumber}
                            onChange={(e) => setEditRefNumber(e.target.value)}
                            className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value)}
                            className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                          >
                            <option value="TECHNICAL_ISSUE">⚙️ Technical Issue</option>
                            <option value="OFFICIAL_LETTER">✉️ Office Letters</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                        <textarea
                          rows={2}
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Official Letter Content
                        </label>
                        <textarea
                          rows={3}
                          value={editLetterContent}
                          onChange={(e) => setEditLetterContent(e.target.value)}
                          className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsEditing(false)}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdits}
                          disabled={isSavingEdit}
                          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                        >
                          <Save className="w-3.5 h-3.5" />
                          {isSavingEdit ? 'Saving...' : 'Save Edits'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h1 className="text-lg font-extrabold text-slate-900 leading-snug">
                        {task.subject}
                      </h1>
                      <div className="mt-1 text-xs text-slate-500 flex items-center gap-3">
                        <span>Project: <strong className="text-slate-800">[{task.project?.projectCode}] {task.project?.name}</strong></span>
                        <span>•</span>
                        <span>Created By: <strong className="text-slate-800">{task.createdBy?.name} ({task.createdBy?.designation})</strong></span>
                      </div>
                    </div>
                  )}

                  {/* Priority & Duration Quick Adjuster Bar */}
                  <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      {/* Priority */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <span className="text-slate-500 font-medium">Priority:</span>
                        <select
                          value={priority}
                          onChange={(e) => {
                            setPriority(e.target.value);
                          }}
                          className="text-xs font-bold px-2 py-1 bg-slate-50 border border-slate-200 rounded focus:ring-2 focus:ring-brand-500"
                        >
                          <option value="CRITICAL">🔥 Critical</option>
                          <option value="HIGH">🔺 High</option>
                          <option value="MEDIUM">🔹 Medium</option>
                          <option value="LOW">▫️ Low</option>
                        </select>
                      </div>

                      {/* Duration */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-500 font-medium">Allocated:</span>
                        <input
                          type="number"
                          min="1"
                          value={durationVal}
                          onChange={(e) => setDurationVal(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="e.g. 3"
                          className="w-14 text-xs font-bold px-1.5 py-1 bg-slate-50 border border-slate-200 rounded text-center"
                        />
                        <select
                          value={durationUnit}
                          onChange={(e) => setDurationUnit(e.target.value as any)}
                          className="text-xs font-semibold px-2 py-1 bg-slate-50 border border-slate-200 rounded"
                        >
                          <option value="DAYS">Days</option>
                          <option value="HOURS">Hours</option>
                        </select>
                      </div>

                      {/* Deadline Countdown */}
                      {task.estimatedCompletionAt && (
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Deadline: {format(new Date(task.estimatedCompletionAt), 'dd MMM yyyy, HH:mm')}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={handleUpdatePriorityDuration}
                      className="px-3 py-1 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors"
                    >
                      Update SLA / Priority
                    </button>
                  </div>

                  {/* Description Box */}
                  {task.description && (
                    <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                      <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-1.5">
                        Technical Scope & Description
                      </div>
                      <p className="text-xs text-slate-800 leading-relaxed whitespace-pre-wrap">
                        {task.description}
                      </p>
                    </div>
                  )}

                  {/* Official Letter / Email Content (Special Government feature) */}
                  {task.letterEmailContent && (
                    <div className="p-4 bg-indigo-50/40 rounded-xl border border-indigo-200 shadow-sm">
                      <div className="text-xs font-bold text-indigo-900 uppercase tracking-wider mb-2 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600" />
                          Official Correspondence / Letter Content
                        </span>
                        {task.referenceNumber && (
                          <span className="font-mono text-[11px] text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">
                            {task.referenceNumber}
                          </span>
                        )}
                      </div>
                      <div className="p-3 bg-white rounded-lg border border-indigo-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">
                        {task.letterEmailContent}
                      </div>
                    </div>
                  )}

                  {/* Task Attachments Section */}
                  <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm">
                    <div className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Paperclip className="w-4 h-4 text-brand-600" />
                      Documents & Artifacts ({task.attachments?.length || 0})
                    </div>
                    {task.attachments && task.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {task.attachments.map((att) => (
                          <a
                            key={att.id}
                            href={`${UPLOADS_BASE_URL}${att.filePath}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-brand-50/60 border border-slate-200 hover:border-brand-300 rounded-lg text-xs transition-all group"
                          >
                            <div className="flex items-center gap-2 overflow-hidden">
                              <FileText className="w-4 h-4 text-brand-600 flex-shrink-0" />
                              <div className="overflow-hidden">
                                <div className="font-semibold text-slate-800 truncate group-hover:text-brand-700">
                                  {att.fileName}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {(att.fileSize / 1024).toFixed(0)} KB • {format(new Date(att.uploadedAt), 'dd MMM yyyy')}
                                </div>
                              </div>
                            </div>
                            <Download className="w-4 h-4 text-slate-400 group-hover:text-brand-600 flex-shrink-0 ml-2" />
                          </a>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">No attachments uploaded for this task.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: FULL TEAM ACTIVITY TIMELINE */}
              {activeTab === 'timeline' && (
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <span>
                      All assignment transfers, reversions, remarks, and attachments are permanently logged and visible to the entire team.
                    </span>
                  </div>

                  <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {task.activities?.map((act, index) => {
                      let badgeBg = 'bg-blue-100 text-blue-700';
                      let icon = '📝';
                      if (act.actionType === 'TRANSFERRED') {
                        badgeBg = 'bg-amber-100 text-amber-800';
                        icon = '🔄';
                      } else if (act.actionType === 'REVERTED') {
                        badgeBg = 'bg-rose-100 text-rose-700';
                        icon = '↩️';
                      } else if (act.actionType === 'DISPOSED') {
                        badgeBg = 'bg-emerald-100 text-emerald-800';
                        icon = '✅';
                      }

                      return (
                        <div key={act.id} className="relative group">
                          {/* Dot on timeline */}
                          <div className="absolute -left-6 top-1.5 w-5 h-5 rounded-full bg-white border-2 border-slate-400 group-hover:border-brand-600 flex items-center justify-center text-[10px]">
                            {icon}
                          </div>

                          <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeBg}`}>
                                  {act.actionType}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {act.actor?.name}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  ({act.actor?.designation})
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400">
                                {format(new Date(act.createdAt), 'dd MMM yyyy, HH:mm')}
                              </span>
                            </div>

                            {/* Remark content */}
                            <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                              {act.remark}
                            </p>

                            {/* Attached files in this action */}
                            {act.attachments && act.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2 pt-1">
                                {act.attachments.map((file) => (
                                  <a
                                    key={file.id}
                                    href={`${UPLOADS_BASE_URL}${file.filePath}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-200 hover:border-brand-400 rounded text-[11px] font-medium text-brand-700 shadow-xs"
                                  >
                                    <Paperclip className="w-3 h-3 text-brand-600" />
                                    <span>{file.fileName}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 3: FOLLOW-UP & COMPLIANCE REPORTS */}
              {activeTab === 'followup' && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-6 h-6 text-emerald-600" />
                      <div>
                        <div className="text-xs font-bold text-emerald-950">
                          Disposal Follow-Up Process
                        </div>
                        <div className="text-[11px] text-emerald-800">
                          The employee who disposed this task is responsible for subsequent follow-up tracking and compliance reports.
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowAddFollowUp(!showAddFollowUp)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-lg transition-colors shadow-sm"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      Log Follow-Up Update
                    </button>
                  </div>

                  {/* Add Follow-Up Form */}
                  {showAddFollowUp && (
                    <form
                      onSubmit={handleAddFollowUp}
                      className="p-4 bg-white rounded-xl border border-emerald-300 shadow-md space-y-3 animate-in fade-in"
                    >
                      <div className="text-xs font-bold text-slate-800">
                        Record New Follow-Up Action / Reply Received
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Follow-Up Status
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Awaiting External Dept Approval / Signature"
                            value={followUpStatus}
                            onChange={(e) => setFollowUpStatus(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Next Follow-Up Date
                          </label>
                          <input
                            type="date"
                            value={nextFollowUpDate}
                            onChange={(e) => setNextFollowUpDate(e.target.value)}
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">
                          Remarks / Details
                        </label>
                        <textarea
                          rows={2}
                          placeholder="Note any dispatch receipt #, telephonic conversation, or verification milestones..."
                          value={followUpRemarks}
                          onChange={(e) => setFollowUpRemarks(e.target.value)}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowAddFollowUp(false)}
                          className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={isSubmittingFollowUp}
                          className="px-3 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                        >
                          {isSubmittingFollowUp ? 'Saving...' : 'Submit Report'}
                        </button>
                      </div>
                    </form>
                  )}

                  {/* List of Follow-up Reports */}
                  <div className="space-y-3">
                    {task.followUpReports && task.followUpReports.length > 0 ? (
                      task.followUpReports.map((report) => (
                        <div
                          key={report.id}
                          className="p-4 bg-white rounded-xl border border-slate-200 shadow-sm space-y-2"
                        >
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <span className="text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              Status: {report.status}
                            </span>
                            <div className="text-[11px] text-slate-500 flex items-center gap-2">
                              {report.nextFollowUpDate && (
                                <span className="text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                  Next Date: {format(new Date(report.nextFollowUpDate), 'dd MMM yyyy')}
                                </span>
                              )}
                              <span>{format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/70 p-2.5 rounded-lg">
                            {report.remarks}
                          </p>
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <span>Logged By:</span>
                            <strong className="text-slate-700">{report.reportedBy?.name}</strong>
                            <span>({report.reportedBy?.designation})</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="p-8 text-center bg-white rounded-xl border border-slate-200 text-xs text-slate-400">
                        No follow-up entries logged yet.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Close */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="text-[11px] text-slate-500 font-mono">
                ID: {task.id}
              </div>
              <button
                onClick={onClose}
                className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>

      {/* Sub Modals */}
      {task && showTransferModal && (
        <TransferTaskModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
          task={task}
          onTaskUpdated={() => {
            fetchTask();
            onTaskUpdated();
          }}
        />
      )}

      {task && showRevertModal && (
        <RevertTaskModal
          isOpen={showRevertModal}
          onClose={() => setShowRevertModal(false)}
          task={task}
          onTaskUpdated={() => {
            fetchTask();
            onTaskUpdated();
          }}
        />
      )}

      {task && showDisposeModal && (
        <DisposeTaskModal
          isOpen={showDisposeModal}
          onClose={() => setShowDisposeModal(false)}
          task={task}
          onTaskUpdated={() => {
            fetchTask();
            onTaskUpdated();
          }}
        />
      )}
    </div>
  );
};
