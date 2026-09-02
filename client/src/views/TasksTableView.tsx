import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Task, Project } from '../types';
import { useAuth } from '../context/AuthContext';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/common/Badge';
import {
  ListTodo,
  Filter,
  Plus,
  Download,
  Eye,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { format } from 'date-fns';

interface TasksTableViewProps {
  selectedProjectId: string;
  projects: Project[];
  searchQuery: string;
  onSelectTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
  refreshTrigger?: number;
}

export const TasksTableView: React.FC<TasksTableViewProps> = ({
  selectedProjectId,
  searchQuery,
  onSelectTask,
  onOpenCreateTask,
  refreshTrigger,
}) => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const data = await api.getTasks({
        ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(categoryFilter ? { category: categoryFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks table:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTask = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = `Are you sure you want to permanently delete task [${task.taskNumber}]?\n\n"${task.subject}"\n\nThis will remove all associated attachments, activity history, and tracking notes. This action cannot be undone.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      await api.deleteTask(task.id);
      fetchTasks();
    } catch (err: any) {
      console.error('Failed to delete task:', err);
      alert(err.message || 'Failed to delete task');
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [selectedProjectId, statusFilter, priorityFilter, categoryFilter, searchQuery, refreshTrigger]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Task Number', 'Reference #', 'Subject', 'Category', 'Status', 'Priority', 'Assignee', 'Designation', 'Project', 'Allocated Duration', 'Created At'];
    const rows = tasks.map((t) => [
      t.taskNumber,
      t.referenceNumber || '',
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      t.category,
      t.status,
      t.priority,
      t.currentAssignee?.name || 'Unassigned',
      t.currentAssignee?.designation || '',
      t.project?.projectCode || '',
      `${t.allocatedDurationValue || ''} ${t.allocatedDurationUnit || ''}`,
      t.createdAt,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PragatiDesk_Tasks_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
            <ListTodo className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 tracking-tight">
              All Tasks & Workflows Registry
            </h1>
            <p className="text-xs text-slate-500">
              Complete department-wide inventory with live statuses, assignees, and actions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchTasks()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
            title="Reload live tasks list"
          >
            <RotateCcw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            <span>{isLoading ? 'Fetching...' : 'Refresh'}</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={onOpenCreateTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + New Task (To-Do)
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 text-xs font-bold text-slate-500">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">Open (To-Do)</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="TRANSFERRED">Transferred</option>
            <option value="REVERTED">Reverted</option>
            <option value="DISPOSED">Disposed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Priorities</option>
            <option value="CRITICAL">🔥 Critical</option>
            <option value="HIGH">🔺 High</option>
            <option value="MEDIUM">🔹 Medium</option>
            <option value="LOW">▫️ Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500"
          >
            <option value="">All Categories</option>
            <option value="TECHNICAL_ISSUE">⚙️ Technical Issue</option>
            <option value="OFFICIAL_LETTER">✉️ Office Letters</option>
          </select>
        </div>

        <div className="text-xs font-semibold text-slate-500">
          Showing <strong>{tasks.length}</strong> tasks
        </div>
      </div>

      {/* Tasks Table */}
      <div className="border border-slate-200 rounded-xl bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Task ID & Ref</th>
                <th className="px-4 py-3">Subject & Category</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Assignee (Name & Designation)</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Allocated / Due</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    Loading tasks table...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    No tasks match the active filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr
                    key={task.id}
                    onClick={() => onSelectTask(task.id)}
                    className="hover:bg-brand-50/30 transition-colors cursor-pointer group"
                  >
                    {/* Task ID & Ref */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="font-mono font-bold text-brand-700">{task.taskNumber}</div>
                      <div className="flex flex-col gap-0.5 mt-0.5">
                        {task.rajKajNumber && (
                          <span className="text-[10px] font-mono font-bold text-brand-700 bg-brand-50 px-1.5 py-0.2 rounded border border-brand-200 inline-block w-fit">
                            🏛️ {task.rajKajNumber}
                          </span>
                        )}
                        {task.issueNumber && (
                          <span className="text-[10px] font-mono font-bold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 inline-block w-fit">
                            🎫 {task.issueNumber}
                          </span>
                        )}
                        {task.referenceNumber && !task.rajKajNumber && !task.issueNumber && (
                          <div className="text-[10px] font-mono text-slate-400 truncate max-w-[140px]">
                            Ref: {task.referenceNumber}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Subject & Category */}
                    <td className="px-4 py-3.5 max-w-sm">
                      <div className="font-bold text-slate-900 group-hover:text-brand-700 truncate">
                        {task.subject}
                      </div>
                      <div className="mt-1">
                        <CategoryBadge category={task.category} />
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <StatusBadge status={task.status} />
                    </td>

                    {/* Priority */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <PriorityBadge priority={task.priority} />
                    </td>

                    {/* Current Assignee (Name & Designation) */}
                    <td className="px-4 py-3.5">
                      <div className="font-bold text-slate-800">
                        {task.currentAssignee?.name || 'Unassigned'}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate max-w-[160px]">
                        {task.currentAssignee?.designation || 'N/A'}
                      </div>
                    </td>

                    {/* Project */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {task.project?.projectCode}
                      </span>
                    </td>

                    {/* Allocated / Due */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-[11px] text-slate-500">
                      {task.allocatedDurationValue && (
                        <div className="font-semibold text-slate-700">
                          {task.allocatedDurationValue} {task.allocatedDurationUnit?.toLowerCase()}
                        </div>
                      )}
                      {task.estimatedCompletionAt && (
                        <div className="text-[10px] text-slate-400">
                          Due: {format(new Date(task.estimatedCompletionAt), 'dd MMM yyyy')}
                        </div>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectTask(task.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                          title="View Full Task Details & Timeline"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {(user?.id === task.createdById ||
                          user?.systemRole === 'GROUP_HEAD' ||
                          user?.systemRole === 'SUPER_ADMIN' ||
                          user?.systemRole === 'OFFICE_SUPER_ADMIN') && (
                          <button
                            onClick={(e) => handleDeleteTask(task, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Task (Authorized for Creator & Section/Group Head)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
