import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { FollowUpReport, Task } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  CheckCircle2,
  ShieldCheck,
  PlusCircle,
  FileText,
} from 'lucide-react';
import { format } from 'date-fns';

interface FollowUpViewProps {
  onSelectTask: (taskId: string) => void;
}

export const FollowUpView: React.FC<FollowUpViewProps> = ({ onSelectTask }) => {
  const { user } = useAuth();
  const [reports, setReports] = useState<FollowUpReport[]>([]);
  const [disposedTasks, setDisposedTasks] = useState<Task[]>([]);
  const [filterMyFollowUps, setFilterMyFollowUps] = useState(false);

  // Quick follow-up update modal state
  const [selectedTaskForUpdate, setSelectedTaskForUpdate] = useState<Task | null>(null);
  const [statusInput, setStatusInput] = useState('Awaiting Confirmation');
  const [remarksInput, setRemarksInput] = useState('');
  const [nextDateInput, setNextDateInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchData = async () => {
    try {
      const [reportsData, tasksData] = await Promise.all([
        api.getFollowUps(),
        api.getTasks({ status: 'DISPOSED' }),
      ]);
      setReports(reportsData);
      setDisposedTasks(tasksData);
    } catch (err) {
      console.error('Failed to load follow-up data:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddFollowUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTaskForUpdate || !remarksInput.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createFollowUp({
        taskId: selectedTaskForUpdate.id,
        status: statusInput,
        remarks: remarksInput.trim(),
        nextFollowUpDate: nextDateInput || undefined,
      });

      setSelectedTaskForUpdate(null);
      setRemarksInput('');
      setNextDateInput('');
      await fetchData();
    } catch (err) {
      console.error('Failed to save follow-up update:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedReports = filterMyFollowUps
    ? reports.filter((r) => r.reportedById === user?.id)
    : reports;

  const displayedDisposedTasks = filterMyFollowUps
    ? disposedTasks.filter((t) => t.disposedById === user?.id)
    : disposedTasks;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              Post-Disposal Follow-Up & Compliance Monitoring
            </h1>
            <p className="text-xs text-slate-500">
              The employee who disposes a task is recorded as the Follow-up Owner responsible for subsequent replies & audits
            </p>
          </div>
        </div>

        <button
          onClick={() => setFilterMyFollowUps(!filterMyFollowUps)}
          className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-all ${
            filterMyFollowUps
              ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          {filterMyFollowUps ? 'Showing My Disposed Items' : 'Show Only My Disposed Items'}
        </button>
      </div>

      {/* Disposed Tasks List (Follow-up queue) */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Disposed Tasks Awaiting Follow-Up / Archive ({displayedDisposedTasks.length})
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedDisposedTasks.map((task) => (
            <div
              key={task.id}
              className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/30 hover:bg-white hover:border-emerald-300 transition-all shadow-2xs space-y-2.5 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded border border-emerald-300">
                    {task.taskNumber}
                  </span>
                  {task.disposedAt && (
                    <span className="text-[10px] text-slate-400">
                      Disposed: {format(new Date(task.disposedAt), 'dd MMM yyyy')}
                    </span>
                  )}
                </div>

                <h3
                  onClick={() => onSelectTask(task.id)}
                  className="text-xs font-bold text-slate-900 hover:text-brand-600 cursor-pointer line-clamp-2"
                >
                  {task.subject}
                </h3>

                <div className="text-[11px] text-slate-500">
                  Follow-up Owner:{' '}
                  <strong className="text-slate-800">
                    {task.disposedBy?.name || 'Officer'}
                  </strong>{' '}
                  <span className="text-slate-400">({task.disposedBy?.designation || 'N/A'})</span>
                </div>
              </div>

              <div className="pt-2 border-t border-emerald-100 flex items-center justify-between">
                <button
                  onClick={() => onSelectTask(task.id)}
                  className="text-[11px] font-semibold text-slate-600 hover:text-brand-600"
                >
                  View Details →
                </button>
                <button
                  onClick={() => setSelectedTaskForUpdate(task)}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 rounded border border-emerald-300 transition-colors"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  Add Follow-Up
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Follow-Up Activity Log Table */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-brand-600" />
          Recent Follow-Up Reports & Replies Log ({displayedReports.length})
        </h2>

        <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
          {displayedReports.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No follow-up reports logged yet.
            </div>
          ) : (
            displayedReports.map((report) => (
              <div key={report.id} className="p-4 hover:bg-slate-50/70 transition-colors space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      onClick={() => report.task?.id && onSelectTask(report.task.id)}
                      className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200 cursor-pointer hover:underline"
                    >
                      {report.task?.taskNumber}
                    </span>
                    <span className="text-xs font-bold text-slate-800">
                      {report.task?.subject}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 flex items-center gap-3">
                    {report.nextFollowUpDate && (
                      <span className="text-amber-800 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Next Action: {format(new Date(report.nextFollowUpDate), 'dd MMM yyyy')}
                      </span>
                    )}
                    <span>{format(new Date(report.createdAt), 'dd MMM yyyy, HH:mm')}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg text-xs text-slate-700 border border-slate-100">
                  <div className="font-bold text-emerald-800 mb-1">
                    Status: {report.status}
                  </div>
                  <p className="leading-relaxed whitespace-pre-wrap">{report.remarks}</p>
                </div>

                <div className="text-[11px] text-slate-400">
                  Reported by <strong className="text-slate-700">{report.reportedBy?.name}</strong>{' '}
                  ({report.reportedBy?.designation})
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Follow-Up Modal */}
      {selectedTaskForUpdate && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Record Follow-Up Update</h3>
                <p className="text-xs text-slate-500">[{selectedTaskForUpdate.taskNumber}] {selectedTaskForUpdate.subject}</p>
              </div>
              <button onClick={() => setSelectedTaskForUpdate(null)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFollowUpSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Follow-Up Status
                </label>
                <input
                  type="text"
                  value={statusInput}
                  onChange={(e) => setStatusInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Next Follow-Up Date
                </label>
                <input
                  type="date"
                  value={nextDateInput}
                  onChange={(e) => setNextDateInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Remarks / Compliance Notes
                </label>
                <textarea
                  rows={3}
                  value={remarksInput}
                  onChange={(e) => setRemarksInput(e.target.value)}
                  placeholder="Enter details of reply received, dispatch confirmation, or audit findings..."
                  className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 resize-none"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedTaskForUpdate(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded shadow-sm"
                >
                  {isSubmitting ? 'Saving...' : 'Submit Report'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
