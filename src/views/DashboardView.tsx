import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  DashboardSummary,
  EmployeeWorkload,
  ProjectHealth,
  TaskActivity,
  User,
  Project,
} from '../types';
import { WorkloadModal } from '../components/dashboard/WorkloadModal';
import {
  Layers,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  RotateCcw,
  Users,
  Activity,
  FolderKanban,
  ChevronRight,
  Sparkles,
  ShieldAlert,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';

interface DashboardViewProps {
  selectedProjectId: string;
  projects: Project[];
  onSelectTask: (taskId: string) => void;
  onOpenCreateTask: () => void;
  onNavigateToTab: (tab: any) => void;
}

const ROLE_CONFIGS: Record<
  string,
  {
    badge: string;
    title: string;
    description: string;
    icon: string;
    gradient: string;
    focusHighlight: string;
    quickActions: { label: string; tab?: string; action?: string; icon: any; color: string }[];
  }
> = {
  SUPER_ADMIN: {
    badge: '👑 Statewide Governance Scope',
    title: 'Secretariat Super Admin Command Center',
    description: 'Centralized oversight of all district offices, global masters, user provisioning, and state SLA compliance.',
    icon: '👑',
    gradient: 'from-purple-950 via-slate-900 to-indigo-950',
    focusHighlight: 'Statewide governance & master directory administration active.',
    quickActions: [
      { label: '+ Provision Super Admin', tab: 'superadmin', icon: Sparkles, color: 'bg-purple-600 hover:bg-purple-700 text-white' },
      { label: '+ Add Departmental User', tab: 'superadmin', icon: Users, color: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
      { label: 'Global Masters Directory', tab: 'masters', icon: FolderKanban, color: 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-600' },
    ],
  },
  OFFICE_SUPER_ADMIN: {
    badge: '🏛️ District Office Administration',
    title: 'District Office Command Center',
    description: 'Managing staff directory, section heads, project assignments, and district task throughput.',
    icon: '🏛️',
    gradient: 'from-slate-900 via-indigo-950 to-blue-950',
    focusHighlight: 'District office staff & section administration active.',
    quickActions: [
      { label: '+ Add Section/Group Head', tab: 'superadmin', icon: Sparkles, color: 'bg-indigo-600 hover:bg-indigo-700 text-white' },
      { label: '+ Register Staff / User', tab: 'superadmin', icon: Users, color: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
      { label: 'Staff Workload Matrix', tab: 'employees', icon: Users, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
  GROUP_HEAD: {
    badge: '🏢 Section/Group Head Governance',
    title: 'Section Delivery & Project Management Dashboard',
    description: 'Supervising section task queue, approving transfers, prioritizing technical & official correspondence.',
    icon: '🏢',
    gradient: 'from-slate-900 via-blue-950 to-indigo-900',
    focusHighlight: 'Section backlog oversight & transfer audit active.',
    quickActions: [
      { label: '+ New Task / Intake', action: 'create_task', icon: Sparkles, color: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
      { label: 'Kanban Workflow Board', tab: 'kanban', icon: FolderKanban, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { label: 'Follow-Up Tracker', tab: 'followup', icon: Clock, color: 'bg-emerald-600 hover:bg-emerald-700 text-white' },
    ],
  },
  TO_DO_LISTING_OPERATOR: {
    badge: '📝 Dak & Letter Registrar',
    title: 'Official Letter & Dak Intake Dashboard',
    description: 'Rapid intake of government letters, grievance to-dos, indexing RajKaj dak files, and initial assignment.',
    icon: '📝',
    gradient: 'from-slate-900 via-emerald-950 to-slate-900',
    focusHighlight: 'Official letter indexing & dak registration mode active.',
    quickActions: [
      { label: '+ Register New Official Letter', action: 'create_task', icon: Sparkles, color: 'bg-emerald-500 hover:bg-emerald-600 text-white' },
      { label: 'All Tasks & Workflows', tab: 'tasks', icon: Layers, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
      { label: 'Kanban Work Board', tab: 'kanban', icon: FolderKanban, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
    ],
  },
  RESOLVING_EMPLOYEE: {
    badge: '🛠️ Task Execution & Turnaround',
    title: 'My Work Queue & Task Execution Dashboard',
    description: 'Focus on assigned pending tasks, SLA aging countdown, drafting resolution notes, and disposing items.',
    icon: '🛠️',
    gradient: 'from-slate-900 via-blue-950 to-slate-900',
    focusHighlight: 'Active task turnaround & resolution mode.',
    quickActions: [
      { label: 'Kanban Work Board', tab: 'kanban', icon: FolderKanban, color: 'bg-blue-600 hover:bg-blue-700 text-white' },
      { label: 'My Assigned Tasks', tab: 'tasks', icon: Layers, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
  REVIEW_OFFICER: {
    badge: '🔍 Quality & Audit Review Officer',
    title: 'Audit, Scrutiny & Compliance Dashboard',
    description: 'Scrutinizing drafted replies, verifying transfer justifications, ensuring high-quality resolution compliance.',
    icon: '🔍',
    gradient: 'from-slate-900 via-amber-950 to-slate-900',
    focusHighlight: 'Scrutiny & compliance review mode active.',
    quickActions: [
      { label: 'Scrutiny & Tasks Table', tab: 'tasks', icon: Layers, color: 'bg-amber-500 hover:bg-amber-600 text-slate-950' },
      { label: 'Follow-Up Quality Audits', tab: 'followup', icon: Clock, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
  DEVELOPER: {
    badge: '💻 Technical Implementation',
    title: 'Technical Issues & Sprint Dashboard',
    description: 'Resolving technical bug tickets, API issues, software maintenance, and platform infrastructure.',
    icon: '💻',
    gradient: 'from-slate-900 via-cyan-950 to-slate-900',
    focusHighlight: 'Technical issue resolution & bug triage active.',
    quickActions: [
      { label: '+ Log Technical Issue', action: 'create_task', icon: Sparkles, color: 'bg-cyan-500 hover:bg-cyan-600 text-slate-950' },
      { label: 'Kanban Board', tab: 'kanban', icon: FolderKanban, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
  QA: {
    badge: '🧪 Quality Verification',
    title: 'QA & Verification Testing Dashboard',
    description: 'Testing resolved issues, verifying bug fixes, validating disposals before sign-off.',
    icon: '🧪',
    gradient: 'from-slate-900 via-teal-950 to-slate-900',
    focusHighlight: 'Quality verification & disposal audit active.',
    quickActions: [
      { label: 'Kanban Verification', tab: 'kanban', icon: FolderKanban, color: 'bg-teal-500 hover:bg-teal-600 text-white' },
      { label: 'All Tasks Table', tab: 'tasks', icon: Layers, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
  EMPLOYEE: {
    badge: '👥 Departmental Member',
    title: 'Executive Task & Workflow Dashboard',
    description: 'Real-time monitoring of departmental letter intake, technical issues, employee pending workloads, and post-disposal follow-ups.',
    icon: '👥',
    gradient: 'from-slate-900 via-doit-navy to-brand-900',
    focusHighlight: 'Collaborative task execution active.',
    quickActions: [
      { label: '+ New Task / Intake', action: 'create_task', icon: Sparkles, color: 'bg-amber-400 hover:bg-amber-300 text-slate-950' },
      { label: 'Kanban Board', tab: 'kanban', icon: FolderKanban, color: 'bg-slate-800 hover:bg-slate-700 text-white' },
    ],
  },
};

export const DashboardView: React.FC<DashboardViewProps> = ({
  selectedProjectId,
  projects,
  onSelectTask,
  onOpenCreateTask,
  onNavigateToTab,
}) => {
  const { user, effectiveRole, availableRoles, switchActiveRole } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [workloads, setWorkloads] = useState<EmployeeWorkload[]>([]);
  const [projectsHealth, setProjectsHealth] = useState<ProjectHealth[]>([]);
  const [activities, setActivities] = useState<TaskActivity[]>([]);

  // Selected employee for workload drill-down modal
  const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);

  const currentRoleConfig = ROLE_CONFIGS[effectiveRole] || ROLE_CONFIGS.EMPLOYEE;

  const fetchDashboardData = async () => {
    try {
      const [statsRes, workloadRes, healthRes, activityRes] = await Promise.all([
        api.getDashboardStats(selectedProjectId || undefined),
        api.getEmployeeWorkload(selectedProjectId || undefined),
        api.getProjectsHealth(),
        api.getActivityStream(15, selectedProjectId || undefined),
      ]);

      setSummary(statsRes.summary);
      setWorkloads(workloadRes);
      setProjectsHealth(healthRes);
      setActivities(activityRes);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedProjectId]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Banner / Role-Tailored Operational Command */}
      <div className={`bg-gradient-to-r ${currentRoleConfig.gradient} text-white p-6 rounded-3xl shadow-xl border border-slate-800 space-y-4`}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-full text-[11px] font-bold uppercase tracking-wider flex items-center gap-1">
                <span>{currentRoleConfig.icon}</span>
                {currentRoleConfig.badge}
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {selectedProjectId
                  ? `Project: ${projects.find((p) => p.id === selectedProjectId)?.name}`
                  : user?.officeName || 'All State Projects'}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1">
              {currentRoleConfig.title}
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              {currentRoleConfig.description}
            </p>
          </div>

          {/* Quick Action Buttons Tailored to Active Role */}
          <div className="flex items-center gap-2 flex-wrap">
            {currentRoleConfig.quickActions.map((qa, i) => {
              const IconComp = qa.icon;
              return (
                <button
                  key={i}
                  onClick={() => {
                    if (qa.action === 'create_task') {
                      onOpenCreateTask();
                    } else if (qa.tab) {
                      onNavigateToTab(qa.tab);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl shadow-sm transition-all cursor-pointer ${qa.color}`}
                >
                  <IconComp className="w-3.5 h-3.5" />
                  {qa.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Seamless Role Switcher Bar inside Banner */}
        {availableRoles.length > 1 && (
          <div className="pt-3 border-t border-white/10 flex items-center justify-between flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold text-[11px]">
              <span>🎭 Role Perspective:</span>
              <span className="text-amber-300 font-bold">{currentRoleConfig.focusHighlight}</span>
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto py-0.5">
              {availableRoles.map((r) => {
                const isActive = r.code === effectiveRole;
                return (
                  <button
                    key={r.code}
                    onClick={() => switchActiveRole(r.code)}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-amber-400 text-slate-950 shadow'
                        : 'bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white'
                    }`}
                  >
                    <span>{r.icon}</span>
                    <span className="truncate max-w-[120px]">{r.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* KPI Stat Cards (Interactive & Clickable) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {/* Total Tasks */}
        <div
          onClick={() => onNavigateToTab('tasks')}
          className="p-4 bg-white rounded-xl border border-slate-200 hover:border-brand-500 shadow-xs hover:shadow transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-bold">Total Work Items</span>
            <Layers className="w-4 h-4 text-brand-600 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {summary?.total || 0}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>All recorded items</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Overall Pending */}
        <div
          onClick={() => onNavigateToTab('kanban')}
          className="p-4 bg-white rounded-xl border border-blue-200 hover:border-blue-500 shadow-xs hover:shadow transition-all cursor-pointer group bg-gradient-to-b from-blue-50/30 to-white"
        >
          <div className="flex items-center justify-between text-blue-700">
            <span className="text-xs font-bold">Pending Workload</span>
            <Clock className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-blue-700 mt-2">
            {summary?.pending || 0}
          </div>
          <div className="text-[11px] text-blue-600 mt-1 flex items-center justify-between">
            <span>In-flight tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Transferred */}
        <div
          onClick={() => onNavigateToTab('tasks')}
          className="p-4 bg-white rounded-xl border border-amber-200 hover:border-amber-500 shadow-xs hover:shadow transition-all cursor-pointer group bg-gradient-to-b from-amber-50/30 to-white"
        >
          <div className="flex items-center justify-between text-amber-700">
            <span className="text-xs font-bold">Transferred</span>
            <ArrowRightLeft className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-amber-700 mt-2">
            {summary?.transferred || 0}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 flex items-center justify-between">
            <span>Under handover</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Reverted */}
        <div
          onClick={() => onNavigateToTab('tasks')}
          className="p-4 bg-white rounded-xl border border-rose-200 hover:border-rose-500 shadow-xs hover:shadow transition-all cursor-pointer group bg-gradient-to-b from-rose-50/30 to-white"
        >
          <div className="flex items-center justify-between text-rose-700">
            <span className="text-xs font-bold">Reverted Back</span>
            <RotateCcw className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-rose-700 mt-2">
            {summary?.reverted || 0}
          </div>
          <div className="text-[11px] text-rose-600 mt-1 flex items-center justify-between">
            <span>Clarifications needed</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Disposed */}
        <div
          onClick={() => onNavigateToTab('followup')}
          className="p-4 bg-white rounded-xl border border-emerald-200 hover:border-emerald-500 shadow-xs hover:shadow transition-all cursor-pointer group bg-gradient-to-b from-emerald-50/30 to-white"
        >
          <div className="flex items-center justify-between text-emerald-700">
            <span className="text-xs font-bold">Disposed (Resolved)</span>
            <CheckCircle2 className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-emerald-700 mt-2">
            {summary?.disposed || 0}
          </div>
          <div className="text-[11px] text-emerald-600 mt-1 flex items-center justify-between">
            <span>Follow-up tracking</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Critical Priority */}
        <div
          onClick={() => onNavigateToTab('tasks')}
          className="p-4 bg-white rounded-xl border border-red-200 hover:border-red-500 shadow-xs hover:shadow transition-all cursor-pointer group bg-gradient-to-b from-red-50/30 to-white"
        >
          <div className="flex items-center justify-between text-red-700">
            <span className="text-xs font-bold">Critical SLA</span>
            <AlertTriangle className="w-4 h-4 group-hover:scale-110 transition-transform" />
          </div>
          <div className="text-2xl font-black text-red-700 mt-2">
            {summary?.critical || 0}
          </div>
          <div className="text-[11px] text-red-600 mt-1 flex items-center justify-between">
            <span>High escalation items</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Employee Workload Matrix & Project Progress */}
        <div className="lg:col-span-2 space-y-6">
          {/* Employee Workload Matrix (Clickable drill-down per employee) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-brand-600" />
                  Employee Workload Matrix & Pending Task Load
                </h2>
                <p className="text-xs text-slate-500">
                  Click any employee row to drill down into their specific pending tasks & turnaround status.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('employees')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                View Roles Matrix →
              </button>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
              {workloads.map((item) => (
                <div
                  key={item.employee.id}
                  onClick={() => setSelectedEmployee(item.employee)}
                  className="p-3.5 hover:bg-brand-50/40 transition-colors cursor-pointer flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-slate-100 group-hover:bg-brand-600 group-hover:text-white text-slate-700 flex items-center justify-center font-bold text-xs flex-shrink-0 transition-colors">
                      {item.employee.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-brand-700">
                        {item.employee.name}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {item.employee.designation} • {item.employee.officeName || 'DoIT&C'}
                      </div>
                    </div>
                  </div>

                  {/* Workload Stats & Badges */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {item.criticalCount > 0 && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
                        {item.criticalCount} Critical
                      </span>
                    )}

                    <div className="text-right">
                      <div className="text-xs font-extrabold text-slate-800">
                        <span className={item.pendingCount > 0 ? 'text-blue-700' : 'text-slate-500'}>
                          {item.pendingCount}
                        </span>{' '}
                        <span className="text-[11px] font-normal text-slate-400">pending</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {item.disposedCount} disposed
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Project Progress & Health */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <FolderKanban className="w-4 h-4 text-indigo-600" />
                  Project-Wise Operational Progress
                </h2>
                <p className="text-xs text-slate-500">
                  Track delivery progress, team sizes, and pending backlog per project.
                </p>
              </div>
              <button
                onClick={() => onNavigateToTab('projects')}
                className="text-xs font-bold text-brand-600 hover:text-brand-700"
              >
                Manage Projects →
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {projectsHealth.map((prj) => (
                <div
                  key={prj.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-brand-300 transition-all shadow-xs space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded border border-brand-200">
                      {prj.projectCode}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {prj.completionRate}% Done
                    </span>
                  </div>

                  <div className="text-xs font-bold text-slate-900">{prj.name}</div>

                  {/* Progress Bar */}
                  <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${prj.completionRate}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>
                      <strong>{prj.pendingTasks}</strong> Pending / <strong>{prj.totalTasks}</strong> Total
                    </span>
                    <span>
                      <strong>{prj.memberCount}</strong> Members
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Real-Time Activity Timeline Stream */}
        <div className="space-y-6">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-brand-600" />
                Live Operational Activity Stream
              </h2>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="text-[11px] text-slate-500">
              Real-time audit log of task creations, transfers, reversions, and remarks across DoIT&C.
            </p>

            <div className="space-y-3 max-h-[620px] overflow-y-auto pr-1">
              {activities.map((act) => (
                <div
                  key={act.id}
                  onClick={() => act.task?.id && onSelectTask(act.task.id)}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-brand-50/40 hover:border-brand-300 transition-all cursor-pointer text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">{act.actor?.name}</span>
                      <span className="text-[10px] text-slate-400">({act.actor?.designation})</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      {format(new Date(act.createdAt), 'dd MMM, HH:mm')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                        act.actionType === 'TRANSFERRED'
                          ? 'bg-amber-100 text-amber-800'
                          : act.actionType === 'REVERTED'
                          ? 'bg-rose-100 text-rose-700'
                          : act.actionType === 'DISPOSED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {act.actionType}
                    </span>
                    <span className="font-mono text-[10px] text-brand-700 font-bold">
                      [{act.task?.taskNumber}]
                    </span>
                    <span className="text-slate-700 truncate max-w-[150px] font-medium">
                      {act.task?.subject}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 line-clamp-2 italic bg-white/80 p-1.5 rounded border border-slate-100">
                    "{act.remark}"
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Employee Workload Drill-Down Modal */}
      {selectedEmployee && (
        <WorkloadModal
          isOpen={!!selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
          employee={selectedEmployee}
          onSelectTask={onSelectTask}
          projectId={selectedProjectId || undefined}
        />
      )}
    </div>
  );
};
