import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { SystemRoleBadge } from '../common/Badge';
import {
  Plus,
  Search,
  ChevronDown,
  Sparkles,
  Layers,
  LogOut,
  Building2,
  ShieldCheck,
  UserCog,
} from 'lucide-react';
import { Project } from '../../types';

interface NavbarProps {
  projects: Project[];
  selectedProjectId: string;
  onSelectProject: (id: string) => void;
  onOpenCreateTask: () => void;
  onOpenProfile?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  projects,
  selectedProjectId,
  onSelectProject,
  onOpenCreateTask,
  onOpenProfile,
  searchQuery,
  onSearchChange,
}) => {
  const {
    user,
    personas,
    switchPersona,
    logout,
    hasPermission,
    effectiveRole,
    availableRoles,
    switchActiveRole,
  } = useAuth();
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const canCreateTask = hasPermission('TASKS', 'EDIT');
  const currentActiveRoleObj = availableRoles.find((r) => r.code === effectiveRole) || {
    code: effectiveRole,
    name: effectiveRole,
    icon: '👤',
    description: '',
  };

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Left Brand & Government Insignia */}
          <div className="flex items-center gap-3 min-w-max">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-brand-700 to-indigo-900 text-white shadow-md font-bold text-xl tracking-tight">
              P
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold text-slate-900 tracking-tight">PragatiDesk</span>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                  DoIT&C
                </span>
              </div>
              <p className="text-[10px] text-slate-500 hidden sm:block">
                Task Intake & Workflow Engine • Govt. of Rajasthan
              </p>
            </div>
          </div>

          {/* Center Search and Project Filter */}
          <div className="flex-1 max-w-xl mx-4 hidden md:flex items-center gap-3">
            {/* Global Search */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search tasks, letters, SSO ID, rajkaj file #..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* Project Filter */}
            {projects.length > 0 && (
              <div className="relative min-w-[200px]">
                <select
                  value={selectedProjectId}
                  onChange={(e) => onSelectProject(e.target.value)}
                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50 hover:bg-slate-100/80 focus:bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 appearance-none cursor-pointer"
                >
                  <option value="">All Projects / State Registry</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.projectCode})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            )}
          </div>

          {/* Right Action & User Profile Section */}
          <div className="flex items-center gap-2.5">
            {/* Seamless Active Role Switcher */}
            {availableRoles.length > 1 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowRoleMenu(!showRoleMenu);
                    setShowPersonaMenu(false);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-slate-50 to-indigo-50/60 hover:from-slate-100 hover:to-indigo-100 border border-indigo-200/80 rounded-xl text-left transition-all shadow-2xs cursor-pointer group"
                  title="Switch your active operational role"
                >
                  <span className="text-sm">{currentActiveRoleObj.icon}</span>
                  <div className="hidden sm:block text-left">
                    <div className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-700 leading-none">
                      Active Role
                    </div>
                    <div className="text-xs font-bold text-slate-800 flex items-center gap-1 leading-tight">
                      <span className="truncate max-w-[130px]">{currentActiveRoleObj.name}</span>
                      <ChevronDown className="w-3 h-3 text-indigo-500 group-hover:translate-y-0.5 transition-transform" />
                    </div>
                  </div>
                </button>

                {/* Role Switcher Menu */}
                {showRoleMenu && (
                  <div
                    className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                    onClick={() => setShowRoleMenu(false)}
                  >
                    <div className="px-4 py-2 border-b border-slate-100">
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                        Switch Active Role
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">
                        Display the dashboard, workflows, and tools tailored to your selected active role.
                      </p>
                    </div>

                    <div className="max-h-80 overflow-y-auto py-1 divide-y divide-slate-50">
                      {availableRoles.map((r) => {
                        const isSelected = r.code === effectiveRole;
                        return (
                          <button
                            key={r.code}
                            onClick={() => {
                              switchActiveRole(r.code);
                              setShowRoleMenu(false);
                            }}
                            className={`w-full text-left px-3.5 py-2.5 hover:bg-slate-50 flex items-start gap-2.5 transition-colors cursor-pointer ${
                              isSelected ? 'bg-indigo-50/70 border-l-4 border-indigo-600' : ''
                            }`}
                          >
                            <span className="text-lg flex-shrink-0 mt-0.5">{r.icon}</span>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${isSelected ? 'text-indigo-950' : 'text-slate-900'}`}>
                                  {r.name}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.2 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 leading-snug mt-0.5 line-clamp-2">
                                {r.description}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Create Task Button (Frictionless Intake) */}
            {canCreateTask && (
              <button
                onClick={onOpenCreateTask}
                className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm transition-all hover:shadow focus:outline-none focus:ring-2 focus:ring-brand-500 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Task (To-Do)</span>
              </button>
            )}

            {/* Persona & User Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowPersonaMenu(!showPersonaMenu);
                  setShowRoleMenu(false);
                }}
                className="flex items-center gap-2.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg text-left transition-colors cursor-pointer"
                title="Account Settings & Persona Menu"
              >
                <div className="w-7 h-7 rounded-full bg-brand-700 text-white flex items-center justify-center font-bold text-xs">
                  {user?.name ? user.name.charAt(0) : 'U'}
                </div>
                <div className="hidden lg:block text-left">
                  <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    {user?.name}
                    <ChevronDown className="w-3 h-3 text-slate-500" />
                  </div>
                  <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[140px]">
                    {user?.designation}
                  </div>
                </div>
              </button>

              {/* Persona Switch Dropdown Menu */}
              {showPersonaMenu && (
                <div
                  className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100"
                  onClick={() => setShowPersonaMenu(false)}
                >
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
                      <span>{user?.name}</span>
                      <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                        {user?.ssoId}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 mt-0.5 truncate">{user?.email}</div>
                    <div className="mt-1.5 flex items-center justify-between gap-1 flex-wrap">
                      <SystemRoleBadge role={user?.systemRole || 'EMPLOYEE'} />
                      <span className="text-[10px] text-slate-500 truncate max-w-[150px]">
                        {user?.officeName}
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowPersonaMenu(false);
                        onOpenProfile?.();
                      }}
                      className="w-full mt-2 flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-bold text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors cursor-pointer"
                    >
                      <UserCog className="w-3.5 h-3.5" />
                      My Profile & Password Settings
                    </button>
                  </div>

                  {/* Active Operational Roles Section */}
                  {availableRoles.length > 1 && (
                    <div className="py-2 border-b border-slate-100 bg-indigo-50/30">
                      <div className="px-3.5 pb-1 text-[10px] font-bold text-indigo-700 uppercase tracking-wider flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-indigo-500" /> Switch Active Role
                        </span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded font-mono font-bold">
                          {availableRoles.length} Assigned
                        </span>
                      </div>
                      <div className="max-h-52 overflow-y-auto divide-y divide-slate-100 px-1">
                        {availableRoles.map((r) => {
                          const isSelected = r.code === effectiveRole;
                          return (
                            <button
                              key={r.code}
                              onClick={(e) => {
                                e.stopPropagation();
                                switchActiveRole(r.code);
                                setShowPersonaMenu(false);
                              }}
                              className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center gap-2 transition-colors cursor-pointer ${
                                isSelected ? 'bg-indigo-100/70 text-indigo-950 font-bold border-l-3 border-indigo-600' : 'hover:bg-slate-100 text-slate-700'
                              }`}
                            >
                              <span className="text-base">{r.icon}</span>
                              <span className="flex-1 truncate text-xs">{r.name}</span>
                              {isSelected && (
                                <span className="text-[9px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded">
                                  Active
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Persona Switch (Dev Mode Only) */}
                  {import.meta.env.DEV && personas.length > 0 && (
                    <>
                      <div className="px-3.5 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-500" />
                        Quick Switch Persona (Dev Only)
                      </div>

                      <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                        {personas.map((p) => (
                          <button
                            key={p.id}
                            onClick={() => switchPersona(p.id)}
                            className={`w-full text-left px-3.5 py-2 text-xs hover:bg-slate-50 flex items-start gap-2.5 transition-colors ${
                              user?.id === p.id ? 'bg-brand-50/70 border-l-4 border-brand-600' : ''
                            }`}
                          >
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] mt-0.5 flex-shrink-0">
                              {p.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-slate-800 flex items-center justify-between">
                                <span className="truncate">{p.name}</span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded font-medium ${
                                    p.systemRole === 'SUPER_ADMIN'
                                      ? 'bg-red-100 text-red-700'
                                      : p.systemRole === 'OFFICE_SUPER_ADMIN'
                                      ? 'bg-purple-100 text-purple-700'
                                      : p.systemRole === 'GROUP_HEAD'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-blue-50 text-blue-700'
                                  }`}
                                >
                                  {p.systemRole === 'SUPER_ADMIN'
                                    ? 'Super Admin'
                                    : p.systemRole === 'OFFICE_SUPER_ADMIN'
                                    ? 'Office Admin'
                                    : p.systemRole === 'GROUP_HEAD'
                                    ? 'Group Head'
                                    : 'Employee'}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 truncate">
                                {p.designation} • {p.ssoId}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                {p.officeName}
                              </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="pt-2 px-2 border-t border-slate-100 mt-1">
                    <button
                      onClick={logout}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
