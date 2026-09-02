import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../../services/api';
import { Project, ProjectMember, ProjectRole, User, RoleMaster } from '../../types';
import { useToast } from '../../context/ToastContext';
import { RoleBadge } from '../common/Badge';
import {
  X,
  UserPlus,
  Shield,
  Check,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface ManageMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onMembersUpdated?: () => void;
  onUpdated?: () => void;
}

const DEFAULT_ROLES: { id: string; label: string; description: string }[] = [
  {
    id: 'TO_DO_LISTING_OPERATOR',
    label: 'To-Do Listing Operator',
    description: 'Registers incoming official letters, grievances, and creates tasks',
  },
  {
    id: 'RESOLVING_EMPLOYEE',
    label: 'Resolving Employee',
    description: 'Works on assigned issues, drafts replies, fixes bugs',
  },
  {
    id: 'REVIEW_OFFICER',
    label: 'Review Officer',
    description: 'Scrutinizes drafts, performs audits, and approves transfers',
  },
  {
    id: 'ADMIN',
    label: 'Project Admin',
    description: 'Overall project governance and settings management',
  },
  {
    id: 'DEVELOPER',
    label: 'Developer',
    description: 'Technical implementations, API integrations, bug fixing',
  },
  {
    id: 'QA',
    label: 'QA / Verification',
    description: 'Quality checks, testing, verification, and sign-offs',
  },
];

export const ManageMembersModal: React.FC<ManageMembersModalProps> = ({
  isOpen,
  onClose,
  project,
  onMembersUpdated,
  onUpdated,
}) => {
  const { showSuccess, showError } = useToast();
  const [employees, setEmployees] = useState<User[]>([]);
  const [dbRoles, setDbRoles] = useState<RoleMaster[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<ProjectRole[]>(['RESOLVING_EMPLOYEE']);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Edit roles inline state
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingRoles, setEditingRoles] = useState<ProjectRole[]>([]);

  const triggerUpdate = () => {
    if (onMembersUpdated) onMembersUpdated();
    if (onUpdated) onUpdated();
  };

  useEffect(() => {
    if (isOpen) {
      Promise.all([api.getEmployees(), api.getRoles()])
        .then(([empData, rolesData]) => {
          setEmployees(empData);
          setDbRoles(rolesData);
          if (empData.length > 0) {
            setSelectedUserId(empData[0].id);
          }
        })
        .catch((err) => {
          console.error('Failed to load project members data:', err);
        });
    }
  }, [isOpen]);

  // Combine default workflow roles + all custom dynamic roles from RoleMaster
  const availableRolesList = useMemo(() => {
    const map = new Map<string, { id: string; label: string; description: string }>();

    // 1. Add Default Workflow Roles
    DEFAULT_ROLES.forEach((r) => map.set(r.id, r));

    // 2. Add System and Custom Role Masters from Database
    dbRoles
      .filter((r) => r.isActive && r.code !== 'SUPER_ADMIN' && r.code !== 'OFFICE_SUPER_ADMIN')
      .forEach((r) => {
        map.set(r.code, {
          id: r.code,
          label: r.name,
          description: r.description || `${r.name} role`,
        });
      });

    return Array.from(map.values());
  }, [dbRoles]);

  if (!isOpen) return null;

  const handleRoleToggle = (role: ProjectRole) => {
    if (selectedRoles.includes(role)) {
      if (selectedRoles.length > 1) {
        setSelectedRoles(selectedRoles.filter((r) => r !== role));
      }
    } else {
      setSelectedRoles([...selectedRoles, role]);
    }
  };

  const handleEditingRoleToggle = (role: ProjectRole) => {
    if (editingRoles.includes(role)) {
      if (editingRoles.length > 1) {
        setEditingRoles(editingRoles.filter((r) => r !== role));
      }
    } else {
      setEditingRoles([...editingRoles, role]);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!selectedUserId) return;

    setIsAdding(true);
    try {
      await api.assignProjectMemberRoles(project.id, selectedUserId, selectedRoles);
      const successText = 'Member assigned to project with selected roles!';
      setSuccessMessage(successText);
      showSuccess(successText, 'Member Added');
      setTimeout(() => setSuccessMessage(null), 3000);
      triggerUpdate();
    } catch (err: any) {
      const msg = err.message || 'Failed to add member to project';
      setError(msg);
      showError(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSaveEditedRoles = async (userId: string) => {
    try {
      await api.assignProjectMemberRoles(project.id, userId, editingRoles);
      setEditingUserId(null);
      const successText = 'Member roles updated successfully!';
      setSuccessMessage(successText);
      showSuccess(successText, 'Roles Updated');
      setTimeout(() => setSuccessMessage(null), 3000);
      triggerUpdate();
    } catch (err: any) {
      const msg = err.message || 'Failed to update roles';
      setError(msg);
      showError(msg);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Remove this employee from the project?')) return;
    try {
      await api.removeProjectMember(project.id, userId);
      const successText = 'Employee removed from project.';
      setSuccessMessage(successText);
      showSuccess(successText, 'Member Removed');
      setTimeout(() => setSuccessMessage(null), 3000);
      triggerUpdate();
    } catch (err: any) {
      const msg = err.message || 'Failed to remove member';
      setError(msg);
      showError(msg);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Manage Project Members & Multi-Role Assignments
              </h2>
              <p className="text-xs text-slate-500">
                [{project.projectCode}] {project.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* Add Employee Form */}
          <div className="p-4 bg-brand-50/50 rounded-xl border border-brand-200/70 space-y-3">
            <div className="text-xs font-bold text-brand-900 flex items-center gap-1.5">
              <UserPlus className="w-4 h-4 text-brand-600" />
              Add / Assign Employee to Project with Multi-Roles
            </div>

            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Select Employee (Name, Designation & SSO ID)
                </label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-brand-500 cursor-pointer"
                >
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} — {emp.designation} ({emp.ssoId}) • {emp.officeName || 'DoIT&C'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Roles Checkboxes */}
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5">
                  Select Roles to Assign across this Project (Multi-Select):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {availableRolesList.map((role) => {
                    const isChecked = selectedRoles.includes(role.id);
                    return (
                      <label
                        key={role.id}
                        className={`flex items-start gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-brand-50 border-brand-400 text-brand-900 font-semibold'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleRoleToggle(role.id)}
                          className="rounded text-brand-600 focus:ring-brand-500 mt-0.5"
                        />
                        <div>
                          <div className="text-[11px]">{role.label}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={isAdding}
                  className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-sm"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  {isAdding ? 'Assigning...' : 'Assign to Project'}
                </button>
              </div>
            </form>
          </div>

          {/* Current Members List */}
          <div className="space-y-3">
            <div className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Current Project Team ({project.members?.length || 0})</span>
              <span className="text-[11px] text-slate-400 font-normal">
                Group Head can update assigned roles at any time
              </span>
            </div>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-white">
              {project.members?.map((member) => (
                <div key={member.id} className="p-3.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{member.name}</span>
                        <span className="text-[11px] text-slate-500">({member.designation} • {member.ssoId})</span>
                        {member.userId === project.groupHeadId && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-bold border border-amber-300">
                            Group Head / Section
                          </span>
                        )}
                      </div>

                      {/* Display Roles or Role Editor */}
                      {editingUserId === member.userId ? (
                        <div className="mt-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700">
                            Update Assigned Roles:
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                            {availableRolesList.map((role) => (
                              <label
                                key={role.id}
                                className="flex items-center gap-1.5 text-[11px] cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={editingRoles.includes(role.id)}
                                  onChange={() => handleEditingRoleToggle(role.id)}
                                  className="rounded text-brand-600"
                                />
                                <span>{role.label}</span>
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2 justify-end pt-1">
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEditedRoles(member.userId)}
                              className="px-2.5 py-1 text-[11px] font-bold text-white bg-brand-600 hover:bg-brand-700 rounded"
                            >
                              Save Roles
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {member.roles?.map((role) => (
                            <RoleBadge key={role} role={role} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {editingUserId !== member.userId && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            setEditingUserId(member.userId);
                            setEditingRoles([...member.roles]);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:text-brand-600 hover:bg-brand-50 rounded border border-slate-200 transition-colors"
                        >
                          Change Roles
                        </button>
                        {member.userId !== project.groupHeadId && (
                          <button
                            onClick={() => handleRemoveMember(member.userId)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Remove member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
