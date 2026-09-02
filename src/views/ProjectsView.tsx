import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Project, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { RoleBadge } from '../components/common/Badge';
import { ManageMembersModal } from '../components/projects/ManageMembersModal';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import {
  FolderKanban,
  Plus,
  Users,
  Building,
  ArrowRight,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Send,
  XCircle,
  ShieldCheck,
  Edit2,
  FolderEdit,
  X,
  Trash2,
} from 'lucide-react';

interface ProjectsViewProps {
  onSelectProject: (projectId: string) => void;
  onNavigateToBoard: (projectId: string) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  onSelectProject,
  onNavigateToBoard,
}) => {
  const { user, hasPermission } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [groupHeadsList, setGroupHeadsList] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState<Project | null>(null);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [editingProject, setEditingProject] = useState<{
    id: string;
    name: string;
    projectCode: string;
    description: string;
    status: 'ACTIVE' | 'ON_HOLD' | 'COMPLETED' | 'ARCHIVED';
  } | null>(null);
  const [isUpdatingProject, setIsUpdatingProject] = useState(false);

  // Project Transfer Modal State
  const [transferProjectTarget, setTransferProjectTarget] = useState<Project | null>(null);
  const [selectedTargetGroupHeadId, setSelectedTargetGroupHeadId] = useState('');
  const [transferRemark, setTransferRemark] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const canEdit = hasPermission('PROJECTS', 'EDIT');
  const isGroupHeadOrAdmin =
    user?.systemRole === 'GROUP_HEAD' ||
    user?.systemRole === 'SUPER_ADMIN' ||
    user?.systemRole === 'OFFICE_SUPER_ADMIN';

  const fetchProjects = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [projectsData, groupHeadsData] = await Promise.all([
        api.getProjects(),
        api.getGroupHeads(user?.officeId || undefined),
      ]);
      setProjects(projectsData);
      setGroupHeadsList(groupHeadsData);
    } catch (err: any) {
      console.error('Failed to load projects:', err);
      setErrorMessage(err.message || 'Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // 1. Initiate Project Transfer Submit
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferProjectTarget || !selectedTargetGroupHeadId || !transferRemark.trim()) {
      setErrorMessage('Target Group Head and Transfer Remarks are strictly mandatory.');
      return;
    }

    setIsTransferring(true);
    setErrorMessage(null);
    try {
      await api.initiateProjectTransfer(transferProjectTarget.id, {
        targetGroupHeadId: selectedTargetGroupHeadId,
        remark: transferRemark.trim(),
      });

      setSuccessMessage(`Project transfer initiated for [${transferProjectTarget.projectCode}]. Pending recipient acceptance.`);
      setTransferProjectTarget(null);
      setSelectedTargetGroupHeadId('');
      setTransferRemark('');
      await fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate project transfer');
    } finally {
      setIsTransferring(false);
    }
  };

  // 2. Accept Incoming Project Transfer
  const handleAcceptTransfer = async (projectId: string, projectCode: string) => {
    try {
      const res = await api.acceptProjectTransfer(projectId);
      setSuccessMessage(res.message || `Project [${projectCode}] successfully received and transferred to your section.`);
      await fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept project transfer');
    }
  };

  // 3. Reject or Cancel Project Transfer (Sender cancel or Recipient decline)
  const handleCancelOrRejectTransfer = async (projectId: string, isSender: boolean = false) => {
    const confirmMsg = isSender
      ? 'Are you sure you want to cancel this pending project transfer request?'
      : 'Are you sure you want to decline this incoming project transfer request?';
    if (!window.confirm(confirmMsg)) return;
    try {
      await api.rejectProjectTransfer(
        projectId,
        isSender ? 'Transfer cancelled by sender.' : 'Transfer declined by recipient.'
      );
      setSuccessMessage(
        isSender
          ? 'Project transfer request cancelled successfully.'
          : 'Project transfer request declined.'
      );
      await fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel project transfer');
    }
  };

  // 4. Update Project Details
  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    setIsUpdatingProject(true);
    setErrorMessage(null);
    try {
      await api.updateProject(editingProject.id, {
        name: editingProject.name.trim(),
        projectCode: editingProject.projectCode.toUpperCase().trim(),
        description: editingProject.description.trim() || undefined,
        status: editingProject.status,
      });

      setSuccessMessage(`Section / Project [${editingProject.projectCode}] updated successfully.`);
      setEditingProject(null);
      await fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update project');
    } finally {
      setIsUpdatingProject(false);
    }
  };

  // 5. Delete Project (Super Admin exclusive)
  const handleDeleteProject = async (projectId: string, projectName: string, projectCode: string) => {
    if (
      !window.confirm(
        `Are you sure you want to permanently delete Project '${projectName}' (${projectCode}) and all its associated tasks and activities? This action cannot be undone.`
      )
    )
      return;

    try {
      await api.deleteProject(projectId);
      setSuccessMessage(`Project '${projectName}' (${projectCode}) deleted successfully.`);
      await fetchProjects();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete project.');
    }
  };

  // Incoming pending transfers where current user is the target
  const incomingTransfers = projects.filter(
    (p) => p.transferStatus === 'PENDING_TRANSFER' && p.transferToGroupHeadId === user?.id
  );

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold shadow-inner">
            <FolderKanban className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Projects & Multi-Role Governance Matrix
            </h1>
            <p className="text-xs text-slate-500">
              Each Group Head / Section oversees section projects, coordinates role assignments, and manages section work transfers
            </p>
          </div>
        </div>

        {(isGroupHeadOrAdmin || canEdit) && (
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            + Create New Section/Group Head / Project
          </button>
        )}
      </div>

      {/* Alerts */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-500 hover:text-red-800 font-bold">✕</button>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INCOMING PROJECT TRANSFERS BANNER */}
      {/* ========================================================================= */}
      {incomingTransfers.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            Incoming Project Transfers Requiring Your Acceptance:
          </div>

          <div className="grid grid-cols-1 gap-3">
            {incomingTransfers.map((p) => (
              <div
                key={p.id}
                className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-300 rounded-2xl shadow-sm flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      [{p.projectCode}] {p.name}
                    </span>
                    <span className="text-[10px] bg-amber-500 text-white font-bold px-2 py-0.5 rounded-full">
                      Transfer Requested
                    </span>
                  </div>
                  <p className="text-xs text-slate-700">
                    Initiated by Section/Group Head: <strong>{p.groupHead?.name}</strong> ({p.groupHead?.designation})
                  </p>
                  {p.transferRemark && (
                    <p className="text-xs text-amber-900 italic bg-white/70 p-2 rounded-xl border border-amber-200 max-w-xl">
                      "{p.transferRemark}"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCancelOrRejectTransfer(p.id, false)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all"
                  >
                    <XCircle className="w-4 h-4 text-rose-600" />
                    Decline
                  </button>
                  <button
                    onClick={() => handleAcceptTransfer(p.id, p.projectCode)}
                    className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow transition-all"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Accept Project Transfer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {isLoading ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-400">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="col-span-2 p-12 text-center text-xs text-slate-500 space-y-3 bg-white rounded-3xl border border-slate-200 shadow-xs flex flex-col items-center justify-center">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold">
              <FolderKanban className="w-6 h-6" />
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">No Projects Registered Yet</p>
              <p className="text-slate-400 text-xs mt-0.5">Create your section's project to start tracking departmental workflows and tasks.</p>
            </div>
            {(isGroupHeadOrAdmin || canEdit) && (
              <button
                onClick={() => setShowCreateProject(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow cursor-pointer transition-all mt-1"
              >
                <Plus className="w-4 h-4" />
                + Create Section / Project
              </button>
            )}
          </div>
        ) : (
          projects.map((project) => {
            const isMyProject = project.groupHeadId === user?.id;
            const isPendingTransfer = project.transferStatus === 'PENDING_TRANSFER';

            return (
              <div
                key={project.id}
                className={`p-6 bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between ${
                  isPendingTransfer ? 'border-amber-300 bg-amber-50/20' : 'border-slate-200'
                }`}
              >
                {/* Card Top */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-brand-700 bg-brand-50 px-2.5 py-1 rounded-xl border border-brand-200">
                        {project.projectCode}
                      </span>
                      {user?.systemRole === 'SUPER_ADMIN' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setEditingProject({
                              id: project.id,
                              name: project.name,
                              projectCode: project.projectCode,
                              description: project.description || '',
                              status: (project.status as any) || 'ACTIVE',
                            })}
                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-brand-700 bg-brand-50/80 hover:bg-brand-100 border border-brand-200 rounded-lg transition-colors cursor-pointer"
                            title="Edit Project Details (Super Admin only)"
                          >
                            <Edit2 className="w-3 h-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name, project.projectCode)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors cursor-pointer"
                            title="Delete Project (Super Admin only)"
                          >
                            <Trash2 className="w-3 h-3 text-red-600" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {isPendingTransfer && (
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                          Transfer Pending
                        </span>
                      )}
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        project.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : project.status === 'COMPLETED'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : project.status === 'ON_HOLD'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-snug">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {project.description}
                      </p>
                    )}
                  </div>

                  {/* Office & Group Head / Section In-Charge */}
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 text-[11px] font-semibold">Section/Group Head:</span>
                      <span className="font-bold text-slate-900">
                        {project.groupHead?.name} ({project.groupHead?.designation})
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                      <span className="text-slate-500">Office Name:</span>
                      <span className="font-medium text-slate-700 truncate max-w-[220px]">
                        {project.officeName || 'DoIT&C Secretariat (HQ)'}
                      </span>
                    </div>
                  </div>

                  {/* Pending Transfer Notice Bar for Sender / Admin */}
                  {isPendingTransfer && (
                    <div className="p-3 bg-amber-50/90 rounded-2xl border border-amber-200 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <div className="truncate">
                          <span className="font-bold text-amber-900">Transfer in Progress:</span>{' '}
                          <span className="text-amber-800">
                            {project.transferToGroupHead
                              ? `Pending response from ${project.transferToGroupHead.name}`
                              : 'Pending recipient response'}
                          </span>
                        </div>
                      </div>
                      {(isMyProject || user?.systemRole === 'SUPER_ADMIN' || user?.systemRole === 'OFFICE_SUPER_ADMIN') && (
                        <button
                          onClick={() => handleCancelOrRejectTransfer(project.id, true)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-white hover:bg-red-50 border border-red-200 rounded-lg shadow-xs flex-shrink-0 flex items-center gap-1 transition-colors"
                          title="Cancel transfer request"
                        >
                          <XCircle className="w-3.5 h-3.5 text-red-600" />
                          Cancel
                        </button>
                      )}
                    </div>
                  )}

                  {/* Tasks & SLA Quick Metrics */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="p-2.5 bg-blue-50/60 rounded-2xl border border-blue-100 text-center">
                      <div className="text-[11px] font-bold text-blue-700">Active Work Items</div>
                      <div className="text-xl font-black text-blue-950 mt-0.5">
                        {project.pendingTasksCount || 0}
                      </div>
                    </div>
                    <div className="p-2.5 bg-emerald-50/60 rounded-2xl border border-emerald-100 text-center">
                      <div className="text-[11px] font-bold text-emerald-700">Disposed & Follow-Up</div>
                      <div className="text-xl font-black text-emerald-950 mt-0.5">
                        {project.disposedTasksCount || 0}
                      </div>
                    </div>
                  </div>

                  {/* Team Members & Dynamic Multi-Roles Preview */}
                  <div className="space-y-2 pt-2">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-bold text-slate-700 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        Mapped Project Staff ({project.members?.length || 0}):
                      </span>
                      {canEdit && (isMyProject || user?.systemRole === 'SUPER_ADMIN' || user?.systemRole === 'OFFICE_SUPER_ADMIN') && (
                        <button
                          onClick={() => setSelectedProjectForMembers(project)}
                          className="text-brand-600 hover:text-brand-800 font-bold hover:underline cursor-pointer"
                        >
                          Manage Roles
                        </button>
                      )}
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {project.members && project.members.length > 0 ? (
                        project.members.map((member) => (
                          <div
                            key={member.id}
                            className="p-2 bg-slate-50 rounded-xl text-xs flex items-center justify-between border border-slate-100"
                          >
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-800">{member.name}</span>
                              <span className="text-slate-400 text-[10px] ml-1 font-mono">({member.ssoId})</span>
                            </div>
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                              {member.roles.map((r) => (
                                <RoleBadge key={r} role={r} />
                              ))}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-slate-400 italic">No staff assigned yet.</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onNavigateToBoard(project.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Kanban Board
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => onSelectProject(project.id)}
                      className="px-3 py-1.5 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-xl transition-colors"
                    >
                      Filter Tasks
                    </button>
                  </div>

                  {/* Transfer Project / Cancel Transfer Action Buttons */}
                  {canEdit && (isMyProject || user?.systemRole === 'SUPER_ADMIN' || user?.systemRole === 'OFFICE_SUPER_ADMIN') && (
                    !isPendingTransfer ? (
                      <button
                        onClick={() => {
                          setTransferProjectTarget(project);
                          setSelectedTargetGroupHeadId('');
                          setTransferRemark('');
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-all"
                        title="Transfer project to another Section/Group Head in same office"
                      >
                        <ArrowRightLeft className="w-3.5 h-3.5" />
                        Transfer Project
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCancelOrRejectTransfer(project.id, true)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all shadow-xs"
                        title="Cancel transfer request"
                      >
                        <XCircle className="w-3.5 h-3.5 text-red-600" />
                        Cancel Request
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: PROJECT TRANSFER MODAL */}
      {/* ========================================================================= */}
      {transferProjectTarget && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Transfer Project to Section/Group Head
                </h3>
                <p className="text-xs text-slate-500">
                  Transfer project, historical tasks, and mapped employees to another Section/Group Head in your Office
                </p>
              </div>
              <button onClick={() => setTransferProjectTarget(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 text-xs space-y-1">
                <div className="font-bold text-slate-900">
                  [{transferProjectTarget.projectCode}] {transferProjectTarget.name}
                </div>
                <div className="text-slate-500">
                  Office: {transferProjectTarget.officeName || user?.officeName}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Target Section/Group Head *
                </label>
                <select
                  value={selectedTargetGroupHeadId}
                  onChange={(e) => setSelectedTargetGroupHeadId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                  required
                >
                  <option value="">Select Target Section/Group Head...</option>
                  {groupHeadsList
                    .filter((gh) => gh.id !== user?.id && gh.id !== transferProjectTarget.groupHeadId)
                    .map((gh) => (
                      <option key={gh.id} value={gh.id}>
                        {gh.name} — {gh.designation} ({gh.section?.name || gh.officeName || 'Section/Group Head'})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Transfer Justification & Handover Remarks *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this project is being transferred and provide any crucial context..."
                  value={transferRemark}
                  onChange={(e) => setTransferRemark(e.target.value)}
                  className="w-full text-xs p-3 bg-slate-50 border rounded-xl"
                  required
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-[11px] text-amber-800">
                ⚠️ Once initiated, the project will enter a pending state until the target Section/Group Head accepts. Upon acceptance, ownership shifts completely.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setTransferProjectTarget(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isTransferring}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow"
                >
                  {isTransferring ? 'Initiating...' : 'Initiate Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Manage Project Members & Dynamic Roles */}
      {selectedProjectForMembers && (
        <ManageMembersModal
          isOpen={!!selectedProjectForMembers}
          onClose={() => setSelectedProjectForMembers(null)}
          project={selectedProjectForMembers}
          onMembersUpdated={() => fetchProjects()}
        />
      )}

      {/* Modal 3: Create Project */}
      {showCreateProject && (
        <CreateProjectModal
          isOpen={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onProjectCreated={() => fetchProjects()}
        />
      )}

      {/* Modal 4: Edit Section/Group Head / Project Details */}
      {editingProject && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
                  <FolderEdit className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Edit Section/Group Head / Project Details</h3>
                  <p className="text-xs text-slate-500">Update project name, key code, description, and status</p>
                </div>
              </div>
              <button
                onClick={() => setEditingProject(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProject} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Project Identifier Code *
                  </label>
                  <input
                    type="text"
                    value={editingProject.projectCode}
                    onChange={(e) => setEditingProject({ ...editingProject, projectCode: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Lifecycle Status *
                  </label>
                  <select
                    value={editingProject.status}
                    onChange={(e) => setEditingProject({ ...editingProject, status: e.target.value as any })}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl cursor-pointer focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="ON_HOLD">ON_HOLD</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="ARCHIVED">ARCHIVED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Section/Group Head / Project Name *
                </label>
                <input
                  type="text"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Description / Functional Scope
                </label>
                <textarea
                  rows={3}
                  value={editingProject.description}
                  onChange={(e) => setEditingProject({ ...editingProject, description: e.target.value })}
                  placeholder="Enter project scope, target outcomes, or departments involved..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingProject}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isUpdatingProject ? 'Saving...' : 'Save Project Details'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
