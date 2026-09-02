import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Project, TaskStatus } from '../types';
import { PriorityBadge, CategoryBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import {
  KanbanSquare,
  Plus,
  User as UserIcon,
  Paperclip,
} from 'lucide-react';

interface KanbanBoardViewProps {
  selectedProjectId: string;
  projects: Project[];
  searchQuery: string;
  onSelectTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
}

const COLUMNS: { id: TaskStatus; label: string; bg: string; border: string; countBg: string }[] = [
  {
    id: 'OPEN',
    label: 'To-Do / Open Intake',
    bg: 'bg-slate-100/70',
    border: 'border-slate-300',
    countBg: 'bg-slate-200 text-slate-700',
  },
  {
    id: 'IN_PROGRESS',
    label: 'In Progress / Resolving',
    bg: 'bg-blue-50/50',
    border: 'border-blue-200',
    countBg: 'bg-blue-100 text-blue-800',
  },
  {
    id: 'TRANSFERRED',
    label: 'Transferred Handover',
    bg: 'bg-amber-50/50',
    border: 'border-amber-200',
    countBg: 'bg-amber-100 text-amber-900',
  },
  {
    id: 'REVERTED',
    label: 'Reverted Back',
    bg: 'bg-rose-50/50',
    border: 'border-rose-200',
    countBg: 'bg-rose-100 text-rose-800',
  },
  {
    id: 'DISPOSED',
    label: 'Disposed (Resolved)',
    bg: 'bg-emerald-50/50',
    border: 'border-emerald-200',
    countBg: 'bg-emerald-100 text-emerald-800',
  },
];

export const KanbanBoardView: React.FC<KanbanBoardViewProps> = ({
  selectedProjectId,
  searchQuery,
  onSelectTask,
  onOpenCreateTask,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filterMyTasks, setFilterMyTasks] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');

  const fetchTasks = async () => {
    try {
      const data = await api.getTasks({
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        ...(filterCategory ? { category: filterCategory } : {}),
        ...(filterPriority ? { priority: filterPriority } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks for Kanban:', err);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId, filterCategory, filterPriority, searchQuery]);

  // Client side "My Tasks" filter for instant feedback
  const displayedTasks = filterMyTasks
    ? tasks.filter((t) => t.currentAssigneeId === user?.id)
    : tasks;

  return (
    <div className="p-6 space-y-5 flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Board Header & Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <KanbanSquare className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              Agile Task & Workflow Board
            </h1>
            <p className="text-xs text-slate-500">
              Jira-style lifecycle tracking with Transfer, Revert, and Disposal states
            </p>
          </div>
        </div>

        {/* Quick Filters */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* My Tasks Toggle */}
          <button
            onClick={() => setFilterMyTasks(!filterMyTasks)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              filterMyTasks
                ? 'bg-brand-600 text-white border-brand-600 shadow-sm'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            My Assigned Tasks
          </button>

          {/* Category Filter */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            <option value="TECHNICAL_ISSUE">⚙️ Technical Issue</option>
            <option value="OFFICIAL_LETTER">✉️ Office Letters</option>
          </select>

          {/* Priority Filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">🔥 Critical</option>
            <option value="HIGH">🔺 High</option>
            <option value="MEDIUM">🔹 Medium</option>
            <option value="LOW">▫️ Low</option>
          </select>

          {/* New Task Button */}
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + New Task (To-Do)
          </button>
        </div>
      </div>

      {/* Kanban Board Columns Container */}
      <div className="flex-1 flex gap-4 overflow-x-auto pb-4 items-start select-none">
        {COLUMNS.map((col) => {
          const colTasks = displayedTasks.filter((t) => t.status === col.id);

          return (
            <div
              key={col.id}
              className={`flex-1 min-w-[280px] max-w-[320px] rounded-2xl border ${col.border} ${col.bg} flex flex-col max-h-full overflow-hidden shadow-2xs`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-slate-200/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-black text-slate-800 tracking-tight">
                    {col.label}
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${col.countBg}`}>
                    {colTasks.length}
                  </span>
                </div>
              </div>

              {/* Column Tasks Scroll Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {colTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                    No tasks in {col.label}
                  </div>
                ) : (
                  colTasks.map((task) => (
                    <div
                      key={task.id}
                      onClick={() => onSelectTask(task.id)}
                      className="p-3.5 bg-white hover:bg-slate-50/90 rounded-xl border border-slate-200 hover:border-brand-400 shadow-xs hover:shadow transition-all cursor-pointer space-y-2 group"
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                          {task.taskNumber}
                        </span>
                        <PriorityBadge priority={task.priority} />
                      </div>

                      {/* Subject */}
                      <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-700 leading-snug line-clamp-2">
                        {task.subject}
                      </h4>

                      {/* Reference & Identifiers (RajKaj No, Issue No, Email Date) */}
                      <div className="flex flex-wrap gap-1">
                        {task.rajKajNumber && (
                          <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.5 rounded border border-brand-200">
                            🏛️ {task.rajKajNumber}
                          </span>
                        )}
                        {task.issueNumber && (
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            🎫 {task.issueNumber}
                          </span>
                        )}
                        {task.referenceNumber && !task.rajKajNumber && !task.issueNumber && (
                          <span className="text-[10px] font-mono font-medium text-slate-500 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 truncate max-w-full">
                            Ref: {task.referenceNumber}
                          </span>
                        )}
                      </div>

                      {/* Category & Project */}
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <CategoryBadge category={task.category} />
                        <span className="font-semibold text-slate-600">
                          {task.project?.projectCode}
                        </span>
                      </div>

                      {/* Assignee & Deadline Footer */}
                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                        {/* Current Assignee (Name & Designation) */}
                        <div
                          className="flex items-center gap-1 text-slate-700 font-semibold truncate max-w-[170px]"
                          title={`${task.currentAssignee?.name} (${task.currentAssignee?.designation})`}
                        >
                          <UserIcon className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate">{task.currentAssignee?.name || 'Unassigned'}</span>
                        </div>

                        {/* Attachments / Due */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {task.attachments && task.attachments.length > 0 && (
                            <span className="flex items-center gap-0.5 text-slate-400">
                              <Paperclip className="w-3 h-3" />
                              <span className="text-[10px]">{task.attachments.length}</span>
                            </span>
                          )}
                          {task.allocatedDurationValue && (
                            <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded">
                              {task.allocatedDurationValue} {task.allocatedDurationUnit === 'HOURS' ? 'h' : 'd'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
