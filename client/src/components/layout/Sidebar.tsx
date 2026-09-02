import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  KanbanSquare,
  ListTodo,
  FolderKanban,
  CheckCircle2,
  Users2,
  ShieldAlert,
  Building,
  Briefcase,
  PieChart,
  UserCog,
  Sparkles,
} from 'lucide-react';

export type ActiveTab =
  | 'dashboard'
  | 'kanban'
  | 'tasks'
  | 'projects'
  | 'followup'
  | 'employees'
  | 'reports'
  | 'superadmin';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onOpenProfile?: () => void;
  pendingCount?: number;
  followUpCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  onOpenProfile,
  pendingCount = 0,
  followUpCount = 0,
}) => {
  const { user, hasPermission, effectiveRole, availableRoles, switchActiveRole } = useAuth();
  const isSuperAdmin = user?.systemRole === 'SUPER_ADMIN';
  const isOfficeSuperAdmin = user?.systemRole === 'OFFICE_SUPER_ADMIN';

  const currentRoleObj = availableRoles.find((r) => r.code === effectiveRole) || {
    name:
      effectiveRole === 'SUPER_ADMIN'
        ? 'Super Admin'
        : effectiveRole === 'OFFICE_SUPER_ADMIN'
        ? 'Office Super Admin'
        : effectiveRole === 'GROUP_HEAD'
        ? 'Section/Group Head'
        : 'Employee',
    icon: '👤',
  };

  const allNavItems = [
    {
      id: 'dashboard' as ActiveTab,
      module: 'DASHBOARD',
      label: 'Operational Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'kanban' as ActiveTab,
      module: 'KANBAN',
      label: 'Kanban Board',
      icon: KanbanSquare,
      badge: pendingCount > 0 ? `${pendingCount}` : null,
      badgeColor: 'bg-brand-100 text-brand-700',
    },
    {
      id: 'tasks' as ActiveTab,
      module: 'TASKS',
      label: 'All Tasks & Workflows',
      icon: ListTodo,
      badge: null,
    },
    {
      id: 'projects' as ActiveTab,
      module: 'PROJECTS',
      label: 'Projects & Roles',
      icon: FolderKanban,
      badge: null,
    },
    {
      id: 'followup' as ActiveTab,
      module: 'FOLLOWUP',
      label: 'Follow-Up Tracker',
      icon: CheckCircle2,
      badge: followUpCount > 0 ? `${followUpCount}` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800',
    },
    {
      id: 'employees' as ActiveTab,
      module: 'EMPLOYEES',
      label: 'Employees & Roles Matrix',
      icon: Users2,
      badge: null,
    },
    {
      id: 'reports' as ActiveTab,
      module: 'REPORTS',
      label: 'Reports & Analytics',
      icon: PieChart,
      badge: null,
    },
  ];

  // Dynamic Module Visibility Rule: Only render navigation tabs explicitly permitted for user
  const visibleNavItems = allNavItems.filter((item) => hasPermission(item.module, 'VIEW'));
  const canAccessAdminPortal = hasPermission('ADMIN_PORTAL', 'VIEW') || isSuperAdmin || isOfficeSuperAdmin;

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col flex-shrink-0 min-h-[calc(100vh-4rem)] border-r border-slate-800">
      {/* User Context Card */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-inner">
            {user?.name?.charAt(0) || 'U'}
          </div>
          <div className="overflow-hidden">
            <div className="font-bold text-sm text-white truncate">{user?.name}</div>
            <div className="text-xs text-brand-400 font-medium truncate">{user?.designation}</div>
          </div>
        </div>

        {/* Active Operational Role Selector / Badge */}
        {availableRoles.length > 1 ? (
          <div className="mt-2.5 space-y-1">
            <label className="text-[10px] font-bold text-indigo-300 flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-indigo-400" /> Active Role Switcher
              </span>
              <span className="text-[9px] bg-indigo-900/80 text-indigo-300 px-1.5 py-0.5 rounded border border-indigo-700/60 font-mono font-bold">
                {availableRoles.length} Roles
              </span>
            </label>
            <select
              value={effectiveRole}
              onChange={(e) => switchActiveRole(e.target.value)}
              className="w-full text-xs font-bold px-2 py-1.5 bg-slate-900 border border-indigo-500/60 rounded-lg text-indigo-200 cursor-pointer focus:outline-none focus:ring-1 focus:ring-indigo-400"
            >
              {availableRoles.map((r) => (
                <option key={r.code} value={r.code} className="bg-slate-900 text-white">
                  {r.icon} {r.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900 px-2.5 py-1 rounded border border-slate-800">
            <span className="flex items-center gap-1 font-semibold text-slate-300">
              <Briefcase className="w-3 h-3 text-brand-400" />
              {currentRoleObj.name}
            </span>
            <span className="font-mono text-amber-400 font-bold">{user?.ssoId || 'SSO-NA'}</span>
          </div>
        )}

        <div className="mt-1.5 flex items-center gap-1 text-[10px] text-slate-400 truncate">
          <Building className="w-3 h-3 text-slate-500 flex-shrink-0" />
          <span className="truncate">{user?.officeName || 'DoIT&C Office'}</span>
        </div>

        {onOpenProfile && (
          <button
            onClick={onOpenProfile}
            className="w-full mt-2.5 flex items-center justify-center gap-1.5 py-1.5 px-2 bg-slate-800 hover:bg-slate-700/80 text-brand-300 hover:text-brand-200 border border-slate-700/80 rounded-lg text-[11px] font-bold transition-colors cursor-pointer"
          >
            <UserCog className="w-3.5 h-3.5" />
            My Profile & Password
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Workspace Navigation
        </div>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-brand-600 text-white shadow-md'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-white/20 text-white' : item.badgeColor || 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Administration Section */}
        {canAccessAdminPortal && (
          <>
            <div className="pt-5 pb-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Governance & Administration
            </div>

            <button
              onClick={() => onTabChange('superadmin')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'superadmin'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'text-amber-300/90 hover:bg-slate-800/80 hover:text-amber-200'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>
                  {isSuperAdmin ? 'Super Admin Portal' : 'Office Admin Console'}
                </span>
              </div>
              <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">
                {isSuperAdmin ? 'Global' : 'Office'}
              </span>
            </button>
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
        <div className="flex items-center justify-between">
          <span>PragatiDesk v2.0</span>
          <span className="text-emerald-400 font-semibold">Active Node</span>
        </div>
        <div className="truncate text-[10px]">DoIT&C Task & Workflow Engine</div>
      </div>
    </aside>
  );
};
