import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { Task, User } from '../../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../common/Badge';
import { X, User as UserIcon, Clock, ArrowUpRight, FolderKanban } from 'lucide-react';
import { format } from 'date-fns';

interface WorkloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: User | null;
  onSelectTask: (taskId: string) => void;
  projectId?: string;
}

export const WorkloadModal: React.FC<WorkloadModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSelectTask,
  projectId,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isOpen && employee) {
      setIsLoading(true);
      api
        .getTasks({
          assigneeId: employee.id,
          status: 'PENDING',
          ...(projectId ? { projectId } : {}),
        })
        .then((data) => setTasks(data))
        .catch((err) => console.error(err))
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, employee, projectId]);

  if (!isOpen || !employee) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-sm">
              {employee.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                {employee.name}
                <span className="text-xs font-normal text-slate-500">
                  ({employee.designation})
                </span>
              </h2>
              <p className="text-xs text-brand-600 font-semibold">
                Pending Workload: {tasks.length} active tasks assigned
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-500">Loading pending tasks...</div>
          ) : tasks.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No pending tasks assigned to {employee.name} at this time.
            </div>
          ) : (
            tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => {
                  onSelectTask(task.id);
                  onClose();
                }}
                className="p-4 bg-white hover:bg-slate-50 border border-slate-200 hover:border-brand-400 rounded-xl transition-all cursor-pointer shadow-xs group"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {task.taskNumber}
                    </span>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                    <CategoryBadge category={task.category} />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 group-hover:text-brand-600">
                    <span>View Details</span>
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                </div>

                <div className="text-xs font-bold text-slate-900 group-hover:text-brand-700">
                  {task.subject}
                </div>

                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1">
                    <FolderKanban className="w-3 h-3 text-slate-400" />
                    <span>[{task.project?.projectCode}] {task.project?.name}</span>
                  </div>
                  {task.estimatedCompletionAt && (
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Due: {format(new Date(task.estimatedCompletionAt), 'dd MMM yyyy')}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
