import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { SystemRoleBadge } from '../components/common/Badge';
import {
  OfficeMaster,
  SectionMaster,
  DesignationMaster,
  RoleMaster,
  User,
  ModulePermission,
} from '../types';
import {
  ShieldAlert,
  UserPlus,
  Building2,
  Search,
  Mail,
  Phone,
  Layers,
  KeyRound,
  Check,
  X,
  Edit2,
  Trash2,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Briefcase,
  Users,
  Eye,
  Settings,
  Sparkles,
  Copy,
  Key,
} from 'lucide-react';

const MODULES_LIST = [
  { key: 'DASHBOARD', name: 'Operational Dashboard' },
  { key: 'KANBAN', name: 'Kanban Board' },
  { key: 'TASKS', name: 'All Tasks & Workflows' },
  { key: 'PROJECTS', name: 'Projects & Roles' },
  { key: 'FOLLOWUP', name: 'Follow-Up Tracker' },
  { key: 'EMPLOYEES', name: 'Employees & Roles Matrix' },
  { key: 'REPORTS', name: 'Reports & Analytics Dashboard' },
  { key: 'MASTERS', name: 'Global Masters' },
  { key: 'ROLES_MANAGEMENT', name: 'Roles & Permission Matrix' },
  { key: 'ADMIN_PORTAL', name: 'Admin Management Portal' },
];

export const SuperAdminView: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.systemRole === 'SUPER_ADMIN';
  const isOfficeSuperAdmin = user?.systemRole === 'OFFICE_SUPER_ADMIN';
  const { showSuccess, showError } = useToast();

  // Active Admin Sub-Tab: 'users' | 'masters' | 'roles'
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'masters' | 'roles'>('users');

  // Master Data State
  const [offices, setOffices] = useState<OfficeMaster[]>([]);
  const [sections, setSections] = useState<SectionMaster[]>([]);
  const [designations, setDesignations] = useState<DesignationMaster[]>([]);
  const [roles, setRoles] = useState<RoleMaster[]>([]);
  const [usersList, setUsersList] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('');

  // Modals
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [createdUserPasswordInfo, setCreatedUserPasswordInfo] = useState<{
    name: string;
    email: string;
    ssoId: string;
    pass: string;
  } | null>(null);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Reset Password Modal
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [resetCustomPassword, setResetCustomPassword] = useState('');
  const [resetResultInfo, setResetResultInfo] = useState<{
    name: string;
    ssoId: string;
    email: string;
    pass: string;
  } | null>(null);
  const [isResettingPass, setIsResettingPass] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  const [showCreateOfficeModal, setShowCreateOfficeModal] = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [showCreateDesignationModal, setShowCreateDesignationModal] = useState(false);
  const [showCreateRoleModal, setShowCreateRoleModal] = useState(false);
  const [showCreateSuperAdminModal, setShowCreateSuperAdminModal] = useState(false);
  const [superAdminForm, setSuperAdminForm] = useState({
    name: '',
    email: '',
    ssoId: '',
    phone: '',
    gmailId: '',
    designation: '',
    customPassword: '',
  });
  const [editingRole, setEditingRole] = useState<{
    id: string;
    name: string;
    code: string;
    description: string;
    isSystem: boolean;
    permissions: Record<string, { canView: boolean; canEdit: boolean }>;
  } | null>(null);

  // Master Editing States (Super Admin only)
  const [editingOffice, setEditingOffice] = useState<{
    id: string;
    name: string;
    code: string;
    district: string;
    address: string;
  } | null>(null);

  const [editingSection, setEditingSection] = useState<{
    id: string;
    name: string;
    code: string;
    officeId: string;
  } | null>(null);

  const [editingDesignation, setEditingDesignation] = useState<{
    id: string;
    title: string;
    cadre: string;
  } | null>(null);

  // Forms State
  const [userForm, setUserForm] = useState({
    name: '',
    email: '',
    ssoId: '',
    phone: '',
    gmailId: '',
    designation: '',
    officeId: '',
    sectionId: '',
    systemRole: 'EMPLOYEE',
    roleId: '',
    customPassword: '',
  });

  const [officeForm, setOfficeForm] = useState({ name: '', code: '', district: '', address: '' });
  const [sectionForm, setSectionForm] = useState({ name: '', code: '', officeId: '' });
  const [designationForm, setDesignationForm] = useState({ title: '', cadre: '' });
  const [roleForm, setRoleForm] = useState<{
    name: string;
    code: string;
    description: string;
    permissions: Record<string, { canView: boolean; canEdit: boolean }>;
  }>({
    name: '',
    code: '',
    description: '',
    permissions: MODULES_LIST.reduce((acc, m) => {
      acc[m.key] = { canView: true, canEdit: false };
      return acc;
    }, {} as Record<string, { canView: boolean; canEdit: boolean }>),
  });

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAllData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [officesData, sectionsData, designationsData, rolesData, usersData] = await Promise.all([
        api.getOffices(),
        api.getSections(),
        api.getDesignations(),
        api.getRoles(),
        api.getUsers(),
      ]);

      setOffices(officesData);
      setSections(sectionsData);
      setDesignations(designationsData);
      setRoles(rolesData);
      setUsersList(usersData);

      // Default office for new forms
      if (officesData.length > 0 && !userForm.officeId) {
        const defaultOffId = isOfficeSuperAdmin && user?.officeId ? user.officeId : officesData[0].id;
        setUserForm((prev) => ({ ...prev, officeId: defaultOffId }));
        setSectionForm((prev) => ({ ...prev, officeId: defaultOffId }));
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load master records.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // 1. Create User Submit
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const payload: any = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        ssoId: userForm.ssoId.trim(),
        designation: userForm.designation,
        phone: userForm.phone ? userForm.phone.trim() : undefined,
        gmailId: userForm.gmailId ? userForm.gmailId.trim() : undefined,
        officeId: isOfficeSuperAdmin ? user?.officeId : userForm.officeId,
        sectionId: userForm.systemRole === 'OFFICE_SUPER_ADMIN' ? undefined : userForm.sectionId || undefined,
        systemRole: userForm.systemRole,
        roleId: userForm.roleId || undefined,
        password: userForm.customPassword ? userForm.customPassword : undefined,
      };

      const res = await api.createUser(payload);

      setCreatedUserPasswordInfo({
        name: res.name,
        email: res.email,
        ssoId: res.ssoId,
        pass: res.generatedDefaultPassword || 'DoITC@2026',
      });

      showSuccess("User '" + res.name + "' registered successfully!", "User Registered");
      setShowCreateUserModal(false);
      setUserForm({
        name: '',
        email: '',
        ssoId: '',
        phone: '',
        gmailId: '',
        designation: designations[0]?.title || '',
        officeId: offices[0]?.id || '',
        sectionId: '',
        systemRole: 'EMPLOYEE',
        roleId: '',
        customPassword: '',
      });

      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1B. Provision State-Level Super Admin (No office required)
  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await api.createUser({
        name: superAdminForm.name.trim(),
        email: superAdminForm.email.toLowerCase().trim(),
        ssoId: superAdminForm.ssoId.toUpperCase().trim(),
        designation: superAdminForm.designation.trim() || 'State Informatics Officer / Super Admin',
        phone: superAdminForm.phone ? superAdminForm.phone.trim() : undefined,
        gmailId: superAdminForm.gmailId ? superAdminForm.gmailId.trim() : undefined,
        systemRole: 'SUPER_ADMIN',
        password: superAdminForm.customPassword.trim() || undefined,
      });

      setCreatedUserPasswordInfo({
        name: res.name,
        email: res.email,
        ssoId: res.ssoId,
        pass: res.generatedDefaultPassword || 'DoITC@2026',
      });

      showSuccess("Super Admin '" + res.name + "' provisioned successfully!", "Super Admin Created");
      setShowCreateSuperAdminModal(false);
      setSuperAdminForm({
        name: '',
        email: '',
        ssoId: '',
        phone: '',
        gmailId: '',
        designation: '',
        customPassword: '',
      });

      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to provision Super Admin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Update User Submit
  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name,
        email: editingUser.email,
        ssoId: editingUser.ssoId,
        designation: editingUser.designation,
        phone: editingUser.phone,
        gmailId: editingUser.gmailId,
        officeId: editingUser.officeId,
        sectionId: editingUser.sectionId,
        systemRole: editingUser.systemRole,
        roleId: editingUser.roleId,
        isActive: editingUser.isActive,
      });

      setSuccessMessage(`User profile for ${editingUser.name} successfully updated.`);
      showSuccess(`User profile for ${editingUser.name} successfully updated.`);
      setEditingUser(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Delete User
  const handleDeleteUser = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to permanently delete user '${name}'?`)) return;
    try {
      await api.deleteUser(id);
      setSuccessMessage(`User '${name}' deleted successfully.`);
      showSuccess(`User '${name}' deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete user.');
    }
  };

  // 4. Toggle User Status
  const handleToggleUserStatus = async (userObj: User) => {
    try {
      await api.updateUser(userObj.id, { isActive: !userObj.isActive });
      setSuccessMessage(`User status changed to ${!userObj.isActive ? 'Active' : 'Deactivated'}.`);
      showSuccess(`User status changed to ${!userObj.isActive ? 'Active' : 'Deactivated'}.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle status.');
    }
  };

  // 4B. Reset Password (Super Admin / Office Super Admin)
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser) return;
    setIsResettingPass(true);
    setErrorMessage(null);
    try {
      const res = await api.resetUserPassword(resettingUser.id, {
        customPassword: resetCustomPassword.trim() || undefined,
      });

      setResetResultInfo({
        name: res.user?.name || resettingUser.name,
        ssoId: res.user?.ssoId || resettingUser.ssoId,
        email: res.user?.email || resettingUser.email,
        pass: res.generatedDefaultPassword,
      });

      setSuccessMessage(`Password for ${resettingUser.name} (${resettingUser.ssoId}) has been reset successfully.`);
      showSuccess(`Password for ${resettingUser.name} (${resettingUser.ssoId}) has been reset successfully.`);
      setResettingUser(null);
      setResetCustomPassword('');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset password.');
    } finally {
      setIsResettingPass(false);
    }
  };

  const copyCredentials = (info: { name: string; ssoId: string; email: string; pass: string }) => {
    const text = `PragatiDesk (DoIT&C) Credentials:\nName: ${info.name}\nSSO ID: ${info.ssoId}\nOfficial Email: ${info.email}\nPassword: ${info.pass}\nLogin URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // 5. Create Office
  const handleCreateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createOffice(officeForm);
      setShowCreateOfficeModal(false);
      setOfficeForm({ name: '', code: '', district: '', address: '' });
      setSuccessMessage('Office registered successfully.');
      showSuccess('Office registered successfully.');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create office.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5B. Delete Office
  const handleDeleteOffice = async (offId: string, offName: string) => {
    if (!window.confirm(`Are you sure you want to delete Office '${offName}' and its sections? All mapped users will have their office assignment cleared.`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.deleteOffice(offId);
      setSuccessMessage(`Office '${offName}' deleted successfully.`);
      showSuccess(`Office '${offName}' deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete office.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 5C. Update Office (Super Admin only)
  const handleUpdateOffice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOffice) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateOffice(editingOffice.id, {
        name: editingOffice.name.trim(),
        code: editingOffice.code.toUpperCase().trim(),
        district: editingOffice.district ? editingOffice.district.trim() : undefined,
        address: editingOffice.address ? editingOffice.address.trim() : undefined,
      });
      setSuccessMessage(`Office '${editingOffice.name}' updated successfully.`);
      showSuccess(`Office '${editingOffice.name}' updated successfully.`);
      setEditingOffice(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update office.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6. Create Section
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createSection({
        name: sectionForm.name,
        code: sectionForm.code,
        officeId: isOfficeSuperAdmin && user?.officeId ? user.officeId : sectionForm.officeId,
      });
      setShowCreateSectionModal(false);
      setSectionForm({ name: '', code: '', officeId: offices[0]?.id || '' });
      setSuccessMessage('Section registered successfully.');
      showSuccess('Section registered successfully.');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6B. Delete Section
  const handleDeleteSection = async (secId: string, secName: string) => {
    if (!window.confirm(`Are you sure you want to delete Section '${secName}'? All mapped users will have their section assignment cleared.`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.deleteSection(secId);
      setSuccessMessage(`Section '${secName}' deleted successfully.`);
      showSuccess(`Section '${secName}' deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 6C. Update Section (Super Admin only)
  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateSection(editingSection.id, {
        name: editingSection.name.trim(),
        code: editingSection.code.toUpperCase().trim(),
        officeId: editingSection.officeId,
      });
      setSuccessMessage(`Section '${editingSection.name}' updated successfully.`);
      showSuccess(`Section '${editingSection.name}' updated successfully.`);
      setEditingSection(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update section.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Create Designation
  const handleCreateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.createDesignation(designationForm);
      setShowCreateDesignationModal(false);
      setDesignationForm({ title: '', cadre: '' });
      setSuccessMessage('Designation registered successfully.');
      showSuccess('Designation registered successfully.');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create designation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7B. Delete Designation
  const handleDeleteDesignation = async (desId: string, desTitle: string) => {
    if (!window.confirm(`Are you sure you want to delete Designation '${desTitle}'?`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.deleteDesignation(desId);
      setSuccessMessage(`Designation '${desTitle}' deleted successfully.`);
      showSuccess(`Designation '${desTitle}' deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete designation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7C. Update Designation (Super Admin only)
  const handleUpdateDesignation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDesignation) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.updateDesignation(editingDesignation.id, {
        title: editingDesignation.title.trim(),
        cadre: editingDesignation.cadre ? editingDesignation.cadre.trim() : undefined,
      });
      setSuccessMessage(`Designation '${editingDesignation.title}' updated successfully.`);
      showSuccess(`Designation '${editingDesignation.title}' updated successfully.`);
      setEditingDesignation(null);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update designation.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Create Role with Checkbox Matrix
  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const permissionsArray = Object.entries(roleForm.permissions).map(([module, perm]) => ({
        module,
        canView: perm.canView,
        canEdit: perm.canEdit,
      }));

      await api.createRole({
        name: roleForm.name,
        code: roleForm.code,
        description: roleForm.description,
        permissions: permissionsArray,
      });

      setShowCreateRoleModal(false);
      setRoleForm({
        name: '',
        code: '',
        description: '',
        permissions: MODULES_LIST.reduce((acc, m) => {
          acc[m.key] = { canView: true, canEdit: false };
          return acc;
        }, {} as Record<string, { canView: boolean; canEdit: boolean }>),
      });

      setSuccessMessage('Custom Role & Module Permissions created successfully.');
      showSuccess('Custom Role & Module Permissions created successfully.');
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 9. Open Edit Role Modal
  const handleOpenEditRole = (r: RoleMaster) => {
    const permMap: Record<string, { canView: boolean; canEdit: boolean }> = {};
    MODULES_LIST.forEach((m) => {
      const existingPerm = r.permissions?.find((p) => p.module === m.key);
      permMap[m.key] = {
        canView: existingPerm ? existingPerm.canView : false,
        canEdit: existingPerm ? existingPerm.canEdit : false,
      };
    });

    setEditingRole({
      id: r.id,
      name: r.name,
      code: r.code,
      description: r.description || '',
      isSystem: r.isSystem,
      permissions: permMap,
    });
  };

  // 10. Update Role & Permissions
  const handleUpdateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRole) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const permissionsArray = Object.entries(editingRole.permissions).map(([module, perm]) => ({
        module,
        canView: perm.canView,
        canEdit: perm.canEdit,
      }));

      await api.updateRole(editingRole.id, {
        name: editingRole.name.trim(),
        code: editingRole.isSystem ? undefined : editingRole.code.trim().toUpperCase(),
        description: editingRole.description.trim() || undefined,
        permissions: permissionsArray,
      });

      setEditingRole(null);
      setSuccessMessage(`Role '${editingRole.name}' and module permissions updated successfully.`);
      showSuccess(`Role '${editingRole.name}' and module permissions updated successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 11. Delete Custom Role
  const handleDeleteRole = async (r: RoleMaster) => {
    if (r.isSystem) {
      setErrorMessage('System default roles cannot be deleted.');
      return;
    }
    if (!window.confirm(`Are you sure you want to delete custom role '${r.name}' (${r.code})?`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.deleteRole(r.id);
      setSuccessMessage(`Role '${r.name}' deleted successfully.`);
      showSuccess(`Role '${r.name}' deleted successfully.`);
      await loadAllData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filtered & Sorted Users (Active staff first, Inactive staff listed at the bottom)
  const filteredUsers = usersList
    .filter((u) => {
      // Hide Super Admin from Office Super Admin
      if (isOfficeSuperAdmin && u.systemRole === 'SUPER_ADMIN') {
        return false;
      }

      const matchesSearch =
        u.name.toLowerCase().includes(search.toLowerCase()) ||
        u.email.toLowerCase().includes(search.toLowerCase()) ||
        u.ssoId.toLowerCase().includes(search.toLowerCase()) ||
        u.designation.toLowerCase().includes(search.toLowerCase()) ||
        (u.officeName && u.officeName.toLowerCase().includes(search.toLowerCase()));

      const matchesOffice = !selectedOfficeFilter || u.officeId === selectedOfficeFilter;
      const matchesRole = !selectedRoleFilter || u.systemRole === selectedRoleFilter;

      return matchesSearch && matchesOffice && matchesRole;
    })
    .sort((a, b) => {
      const aActive = a.isActive !== false ? 1 : 0;
      const bActive = b.isActive !== false ? 1 : 0;
      if (aActive !== bActive) {
        return bActive - aActive; // 1 (Active) comes before 0 (Inactive)
      }
      return a.name.localeCompare(b.name);
    });

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Banner / Header */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white p-6 rounded-3xl shadow-lg border border-slate-800">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[11px] font-bold tracking-wider uppercase flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" />
                {isSuperAdmin ? 'Secretariat Level Governance' : 'Office Administration'}
              </span>
              <span className="text-xs text-slate-400 font-mono">
                {isSuperAdmin ? 'All Offices Scoped' : user?.officeName}
              </span>
            </div>
            <h1 className="text-2xl font-black tracking-tight mt-1.5 flex items-center gap-2.5">
              {isSuperAdmin ? 'Super Admin Portal' : 'Office Admin Console'}
            </h1>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {isSuperAdmin
                ? 'Centralized master data management, dynamic role permission matrix, Office Super Admin provisioning, and statewide user directory.'
                : `Manage staff profiles, section assignments, and projects strictly restricted to ${user?.officeName}.`}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {isSuperAdmin && (
              <>
                <button
                  onClick={() => {
                    setSuperAdminForm({
                      name: '',
                      email: '',
                      ssoId: '',
                      phone: '',
                      gmailId: '',
                      designation: 'Joint Director / State Informatics Officer',
                      customPassword: '',
                    });
                    setShowCreateSuperAdminModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-brand-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg border border-purple-400/30 transition-all cursor-pointer"
                >
                  <ShieldAlert className="w-4 h-4 text-purple-200" />
                  + Provision Super Admin
                </button>
                <button
                  onClick={() => {
                    setUserForm({
                      name: '',
                      email: '',
                      ssoId: '',
                      phone: '',
                      gmailId: '',
                      designation: designations[0]?.title || '',
                      officeId: offices[0]?.id || '',
                      sectionId: '',
                      systemRole: 'GROUP_HEAD',
                      roleId: '',
                      customPassword: '',
                    });
                    setShowCreateUserModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Add Departmental User
                </button>
              </>
            )}

            {isOfficeSuperAdmin && (
              <>
                <button
                  onClick={() => {
                    setSectionForm({
                      name: '',
                      code: '',
                      officeId: user?.officeId || offices[0]?.id || '',
                    });
                    setShowCreateSectionModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <Layers className="w-4 h-4" />
                  + Add Section/Group Head
                </button>
                <button
                  onClick={() => {
                    setUserForm({
                      name: '',
                      email: '',
                      ssoId: '',
                      phone: '',
                      gmailId: '',
                      designation: designations[0]?.title || '',
                      officeId: user?.officeId || '',
                      sectionId: '',
                      systemRole: 'EMPLOYEE',
                      roleId: '',
                      customPassword: '',
                    });
                    setShowCreateUserModal(true);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition-all cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  + Register Staff / Employee
                </button>
              </>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 overflow-x-auto">
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeSubTab === 'users'
                ? 'bg-brand-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Users className="w-4 h-4" />
            Users & Staff Directory ({usersList.filter((u) => isSuperAdmin || u.systemRole !== 'SUPER_ADMIN').length})
          </button>

          {isOfficeSuperAdmin && (
            <button
              onClick={() => setActiveSubTab('masters')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeSubTab === 'masters'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Layers className="w-4 h-4" />
              Section/Group Heads ({sections.filter((s) => !user?.officeId || s.officeId === user.officeId).length})
            </button>
          )}

          {isSuperAdmin && (
            <>
              <button
                onClick={() => setActiveSubTab('masters')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'masters'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Building2 className="w-4 h-4" />
                Global Masters (Offices, Sections, Designations)
              </button>

              <button
                onClick={() => setActiveSubTab('roles')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeSubTab === 'roles'
                    ? 'bg-brand-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Settings className="w-4 h-4" />
                Role Creation & Module Permissions Matrix
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
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
      {/* TAB 1: USERS & HIERARCHY DIRECTORY */}
      {/* ========================================================================= */}
      {activeSubTab === 'users' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, SSO ID, email, designation, or office..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {isSuperAdmin && (
                <select
                  value={selectedOfficeFilter}
                  onChange={(e) => setSelectedOfficeFilter(e.target.value)}
                  className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
                >
                  <option value="">All Offices</option>
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>{off.name}</option>
                  ))}
                </select>
              )}

              <select
                value={selectedRoleFilter}
                onChange={(e) => setSelectedRoleFilter(e.target.value)}
                className="text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
              >
                <option value="">All Roles</option>
                {isSuperAdmin && <option value="SUPER_ADMIN">Super Admin</option>}
                <option value="OFFICE_SUPER_ADMIN">Office Super Admin</option>
                <option value="GROUP_HEAD">Section/Group Head</option>
                <option value="EMPLOYEE">Employee</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">User Details & SSO ID</th>
                    <th className="py-3 px-4">Designation</th>
                    <th className="py-3 px-4">Office & Section/Group Head</th>
                    <th className="py-3 px-4">Role / Permissions</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8 text-slate-400">
                        No users found matching filters.
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-brand-50 text-brand-700 font-bold flex items-center justify-center text-xs flex-shrink-0">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                {u.name}
                                {u.gmailId && (
                                  <span className="text-[10px] bg-red-50 text-red-600 px-1 py-0.2 rounded border border-red-200" title={`Linked Gmail: ${u.gmailId}`}>
                                    G
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2">
                                <span className="font-mono text-amber-700 font-semibold">{u.ssoId}</span>
                                <span>•</span>
                                <span>{u.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-medium text-slate-800">
                          {u.designation}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-800 truncate max-w-[200px]">
                            {u.systemRole === 'SUPER_ADMIN'
                              ? 'Statewide Secretariat HQ (Global Governance)'
                              : (u.officeName || 'DoIT&C Office')}
                          </div>
                          <div className="text-[11px] text-slate-500 truncate max-w-[200px]">
                            {u.systemRole === 'SUPER_ADMIN' || u.systemRole === 'OFFICE_SUPER_ADMIN'
                              ? '—'
                              : (u.sectionName || 'General Section')}
                          </div>
                        </td>

                        <td className="py-3 px-4">
                          <SystemRoleBadge role={u.systemRole} />
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              u.isActive
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {u.isActive ? 'Active' : 'Deactivated'}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => setEditingUser(u)}
                              className="p-1.5 text-slate-500 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                              title="Edit user profile"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                setResettingUser(u);
                                setResetCustomPassword('');
                                setResetResultInfo(null);
                              }}
                              className="p-1.5 text-amber-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              title="Reset Password & Set Default Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {u.id !== user?.id ? (
                              <button
                                onClick={() => handleToggleUserStatus(u)}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  u.isActive
                                    ? 'text-amber-600 hover:bg-amber-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                title={u.isActive ? 'Deactivate account' : 'Reactivate account'}
                              >
                                {u.isActive ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-bold px-1.5 py-0.5 rounded bg-slate-100" title="Cannot deactivate your own account">
                                Self
                              </span>
                            )}

                            {((isSuperAdmin && u.systemRole !== 'SUPER_ADMIN') || (isOfficeSuperAdmin && u.officeId === user?.officeId && u.systemRole !== 'SUPER_ADMIN' && u.id !== user?.id)) && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.name)}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete user"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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
      )}

      {/* ========================================================================= */}
      {/* TAB 2: GLOBAL / OFFICE MASTERS */}
      {/* ========================================================================= */}
      {activeSubTab === 'masters' && (isSuperAdmin || isOfficeSuperAdmin) && (
        <div className="space-y-6">
          {/* 1. Offices Master (Super Admin only) */}
          {isSuperAdmin && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-brand-600" />
                    Office Name Directory
                  </h3>
                  <p className="text-xs text-slate-500">
                    Headquarters, state data centers, and district offices
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateOfficeModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Office
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {offices.map((off) => (
                  <div key={off.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                        {off.code}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-semibold mr-1">{off.district || 'State HQ'}</span>
                        <button
                          onClick={() => setEditingOffice({
                            id: off.id,
                            name: off.name,
                            code: off.code,
                            district: off.district || '',
                            address: off.address || '',
                          })}
                          className="p-1 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Office Directory Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteOffice(off.id, off.name)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete office (Super Admin only)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="font-bold text-xs text-slate-900 leading-snug">{off.name}</div>
                    <div className="text-[11px] text-slate-500 truncate">{off.address}</div>
                    <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                      <span>{off._count?.users || 0} Staff</span>
                      <span>{off._count?.projects || 0} Projects</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 2. Sections Master (Super Admin and Office Super Admin) */}
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  Section/Group Head Master
                </h3>
                <p className="text-xs text-slate-500">
                  {isOfficeSuperAdmin ? `Operational Section/Group Heads registered under ${user?.officeName || 'your office'}` : 'Operational Section/Group Heads mapped to specific Offices'}
                </p>
              </div>
              <button
                onClick={() => {
                  setSectionForm({
                    name: '',
                    code: '',
                    officeId: isOfficeSuperAdmin && user?.officeId ? user.officeId : (offices[0]?.id || ''),
                  });
                  setShowCreateSectionModal(true);
                }}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                + Add Section/Group Head
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {sections
                .filter((sec) => !isOfficeSuperAdmin || !user?.officeId || sec.officeId === user.officeId)
                .map((sec) => (
                <div key={sec.id} className="p-3.5 bg-indigo-50/40 rounded-xl border border-indigo-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-indigo-700">{sec.code}</span>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-indigo-600 font-medium truncate max-w-[100px] mr-1">
                        {sec.office?.name}
                      </span>
                      {isSuperAdmin && (
                        <>
                          <button
                            onClick={() => setEditingSection({
                              id: sec.id,
                              name: sec.name,
                              code: sec.code,
                              officeId: sec.officeId,
                            })}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Section/Group Head Details"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSection(sec.id, sec.name)}
                            className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Section/Group Head (Super Admin only)"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="font-bold text-xs text-slate-900">{sec.name}</div>
                  <div className="text-[10px] text-slate-500">{sec._count?.users || 0} employees mapped</div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Designations Master (Super Admin only) */}
          {isSuperAdmin && (
            <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-amber-600" />
                    Official Designations Master
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadres and official titles selectable in employee onboarding
                  </p>
                </div>
                <button
                  onClick={() => setShowCreateDesignationModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-bold hover:bg-amber-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  + Add Designation
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {designations.map((des) => (
                  <div key={des.id} className="p-3 bg-amber-50/30 rounded-xl border border-amber-200/60 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-xs text-slate-900">{des.title}</div>
                      <div className="text-[10px] text-amber-800 font-medium">{des.cadre || 'General Cadre'}</div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingDesignation({
                          id: des.id,
                          title: des.title,
                          cadre: des.cadre || '',
                        })}
                        className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Designation Title"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteDesignation(des.id, des.title)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete Designation (Super Admin only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: ROLES & MODULE PERMISSIONS MATRIX (Super Admin only) */}
      {/* ========================================================================= */}
      {activeSubTab === 'roles' && isSuperAdmin && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900">
                Dynamic Role Creation & Module Permission Matrix
              </h3>
              <p className="text-xs text-slate-500">
                Define custom roles and configure granular View and Edit permissions per application module
              </p>
            </div>
            <button
              onClick={() => setShowCreateRoleModal(true)}
              className="flex items-center gap-1 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm"
            >
              <Plus className="w-4 h-4" />
              + Create New Role
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {roles.map((r) => (
              <div key={r.id} className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                          {r.name}
                        </h4>
                        {r.isSystem ? (
                          <span className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-bold border border-slate-200">
                            System Default
                          </span>
                        ) : (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold border border-indigo-200">
                            Custom Role
                          </span>
                        )}
                        <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
                          {r.code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{r.description || 'Custom organizational role'}</p>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => handleOpenEditRole(r)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                        title="Edit role name, description, and module permissions matrix"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Edit Role & Permissions
                      </button>
                      {!r.isSystem && (
                        <button
                          onClick={() => handleDeleteRole(r)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete custom role"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Module Matrix List */}
                  <div className="bg-slate-50 rounded-xl p-3 border border-slate-100 space-y-1.5">
                    <div className="text-[11px] font-bold text-slate-700 mb-1">Module Access & Permissions:</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {r.permissions.map((perm) => {
                        const modName = MODULES_LIST.find((m) => m.key === perm.module)?.name || perm.module;
                        return (
                          <div key={perm.module} className="text-[11px] bg-white p-2 rounded-lg border border-slate-200/70 flex items-center justify-between">
                            <span className="font-medium text-slate-800 truncate pr-1">{modName}</span>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold ${perm.canView ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                View
                              </span>
                              <span className={`px-1.5 py-0.2 text-[9px] rounded font-bold ${perm.canEdit ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                                Edit
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 0: PROVISION STATE-LEVEL SUPER ADMIN (NO OFFICE REQUIRED) */}
      {/* ========================================================================= */}
      {showCreateSuperAdminModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold shadow-inner">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    Provision State-Level Super Admin
                  </h3>
                  <p className="text-xs text-slate-500">
                    Statewide Secretariat HQ Authority &bull; Office selection not required
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateSuperAdminModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Secretariat Scope Information Banner */}
            <div className="p-3.5 bg-gradient-to-r from-purple-50 via-indigo-50 to-brand-50 border border-purple-200/80 rounded-2xl text-xs text-purple-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-purple-950">
                <ShieldAlert className="w-3.5 h-3.5 text-purple-700" />
                Global Statewide Governance Scope
              </div>
              <p className="text-[11px] text-purple-800/90 leading-relaxed">
                Super Admin accounts govern all DoIT&C district offices, sections, project registries, and role permissions statewide. Office and section assignment is automatically bypassed.
              </p>
            </div>

            <form onSubmit={handleCreateSuperAdmin} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Dr. Rajeshwar Sharma"
                    value={superAdminForm.name}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSO ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. DOITC-SA-002"
                    value={superAdminForm.ssoId}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, ssoId: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. rajeshwar.sharma@doitc.gov.in"
                    value={superAdminForm.email}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (10 Digits)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9829012345"
                    value={superAdminForm.phone}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, phone: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Personal Gmail ID (For Google Sign-In)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. rajeshwar.work@gmail.com"
                    value={superAdminForm.gmailId}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, gmailId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation *</label>
                  <input
                    type="text"
                    placeholder="e.g. Joint Director / State Informatics Officer"
                    value={superAdminForm.designation}
                    onChange={(e) => setSuperAdminForm({ ...superAdminForm, designation: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Initial Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate default password (e.g. DoITC@7281)"
                  value={superAdminForm.customPassword}
                  onChange={(e) => setSuperAdminForm({ ...superAdminForm, customPassword: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  The generated password will be displayed with a 1-click copy button and emailed to the recipient.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateSuperAdminModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow cursor-pointer transition-all"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Provisioning...' : 'Provision Super Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE DEPARTMENTAL USER / HEAD WITH DEFAULT PASSWORD DISPLAY */}
      {/* ========================================================================= */}
      {showCreateUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {isOfficeSuperAdmin ? 'Register Staff in Office' : 'Onboard Departmental User / Group Head / Office Admin'}
                </h3>
                <p className="text-xs text-slate-500">
                  A system-generated password will be created and displayed on submission
                </p>
              </div>
              <button onClick={() => setShowCreateUserModal(false)} className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Narendra Verma"
                    value={userForm.name}
                    onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSO ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. DOITC-EMP-401"
                    value={userForm.ssoId}
                    onChange={(e) => setUserForm({ ...userForm, ssoId: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. narendra.verma@doitc.gov.in"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number (10 Digits)</label>
                  <input
                    type="text"
                    placeholder="e.g. 9829012345"
                    value={userForm.phone}
                    onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional Gmail ID (For Google Login)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. narendra.work@gmail.com"
                    value={userForm.gmailId}
                    onChange={(e) => setUserForm({ ...userForm, gmailId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Designation *</label>
                  <select
                    value={userForm.designation}
                    onChange={(e) => setUserForm({ ...userForm, designation: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    required
                  >
                    <option value="">Select Designation...</option>
                    {designations.map((d) => (
                      <option key={d.id} value={d.title}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Office & Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isOfficeSuperAdmin ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Assigned District Office *</span>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Frozen
                      </span>
                    </label>
                    <div className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold flex items-center justify-between shadow-xs">
                      <span className="truncate">{user?.officeName || 'Assigned District Office'}</span>
                      <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Office is permanently locked to your assigned district office.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Office Name *</label>
                    <select
                      value={userForm.officeId}
                      onChange={(e) => setUserForm({ ...userForm, officeId: e.target.value, sectionId: '' })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                      required
                    >
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>{off.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {userForm.systemRole === 'OFFICE_SUPER_ADMIN' ? (
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex flex-col justify-center">
                    <label className="block text-[11px] font-bold text-purple-900 mb-0.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-purple-600" /> Section/Group Head Not Required
                    </label>
                    <p className="text-[10px] text-purple-700/90 leading-tight">
                      Office Admins manage all sections within their district office. Section selection is bypassed.
                    </p>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Section/Group Head Name {userForm.systemRole === 'GROUP_HEAD' && <span className="text-indigo-600">(Group to Head)</span>}
                    </label>
                    <select
                      value={userForm.sectionId}
                      onChange={(e) => setUserForm({ ...userForm, sectionId: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    >
                      <option value="">Select Section/Group Head...</option>
                      {sections
                        .filter((s) => s.officeId === (isOfficeSuperAdmin ? user?.officeId : userForm.officeId))
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                        ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">System Role Hierarchy *</label>
                  <select
                    value={userForm.systemRole}
                    onChange={(e) => setUserForm({ ...userForm, systemRole: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    required
                  >
                    <option value="EMPLOYEE">Employee (Project Member)</option>
                    <option value="GROUP_HEAD">Section/Group Head</option>
                    {isSuperAdmin && <option value="OFFICE_SUPER_ADMIN">Office Super Admin</option>}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom Role Mapping</label>
                  <select
                    value={userForm.roleId}
                    onChange={(e) => setUserForm({ ...userForm, roleId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                  >
                    <option value="">Default System Role Permissions</option>
                    {roles
                      .filter((r) => r.code !== 'SUPER_ADMIN')
                      .map((r) => (
                        <option key={r.id} value={r.id}>{r.name} ({r.code})</option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateUserModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow"
                >
                  {isSubmitting ? 'Creating User...' : 'Provision User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: GENERATED PASSWORD DISPLAY BANNER WITH 1-CLICK COPY */}
      {/* ========================================================================= */}
      {createdUserPasswordInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">User Successfully Onboarded!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Official profile created for <strong>{createdUserPasswordInfo.name}</strong>
              </p>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-left space-y-2.5">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                System-Generated Default Password:
              </div>
              <div className="font-mono text-base font-black text-amber-950 bg-white p-3 rounded-xl border border-amber-300 select-all tracking-wider text-center flex items-center justify-between">
                <span className="flex-1 font-black">{createdUserPasswordInfo.pass}</span>
              </div>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-amber-200/60 font-mono">
                <div><strong>SSO ID:</strong> {createdUserPasswordInfo.ssoId}</div>
                <div><strong>Email:</strong> {createdUserPasswordInfo.email}</div>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                * Automated credentials welcome notification has been dispatched to the user.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => copyCredentials(createdUserPasswordInfo)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedNotification ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </button>
              <button
                onClick={() => setCreatedUserPasswordInfo(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET USER PASSWORD (SUPER ADMIN & OFFICE SUPER ADMIN) */}
      {/* ========================================================================= */}
      {resettingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center font-bold">
                  <KeyRound className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">Reset User Password</h3>
                  <p className="text-xs text-slate-500">Generate default credentials or assign custom password</p>
                </div>
              </div>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs text-slate-600">
              <div className="font-black text-slate-900 text-sm">{resettingUser.name}</div>
              <div className="font-mono text-amber-800 text-[11px] font-bold">SSO ID: {resettingUser.ssoId}</div>
              <div className="text-slate-500 text-[11px]">Email: {resettingUser.email}</div>
              <div className="text-slate-500 text-[11px]">Office / Section/Group Head: {resettingUser.officeName} {resettingUser.sectionName ? `• ${resettingUser.sectionName}` : ''}</div>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Password (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to auto-generate (e.g. DoITC@9821)"
                  value={resetCustomPassword}
                  onChange={(e) => setResetCustomPassword(e.target.value)}
                  className="w-full text-xs font-mono px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If left blank, the system generates a secure default password and displays it for you to copy.
                </p>
              </div>

              <div className="p-3 bg-amber-50/80 rounded-xl border border-amber-200 text-[11px] text-amber-900 leading-snug">
                ℹ️ The target user will receive an automated security notification with the new password and will be prompted to update it on their next login.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResettingUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResettingPass}
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow cursor-pointer transition-colors"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {isResettingPass ? 'Resetting...' : 'Reset & Generate Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: RESET PASSWORD SUCCESS NOTIFICATION WITH COPY */}
      {/* ========================================================================= */}
      {resetResultInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Password Reset Successfully!</h3>
              <p className="text-xs text-slate-500 mt-1">
                New login credentials generated for <strong>{resetResultInfo.name}</strong> ({resetResultInfo.ssoId})
              </p>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-left space-y-2.5">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Active New Password:
              </div>
              <div className="font-mono text-base font-black text-amber-950 bg-white p-3 rounded-xl border border-amber-300 select-all tracking-wider text-center">
                {resetResultInfo.pass}
              </div>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-amber-200/60 font-mono">
                <div><strong>SSO ID:</strong> {resetResultInfo.ssoId}</div>
                <div><strong>Official Email:</strong> {resetResultInfo.email}</div>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                * Security update notification email has also been dispatched to the user.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => copyCredentials(resetResultInfo)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedNotification ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </button>
              <button
                onClick={() => setResetResultInfo(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT USER MODAL (ALL FIELDS EDITABLE) */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit User Profile</h3>
                <p className="text-xs text-slate-500">Update profile details, designations, and role assignments</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSO ID</label>
                  <input
                    type="text"
                    value={editingUser.ssoId}
                    onChange={(e) => setEditingUser({ ...editingUser, ssoId: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    value={editingUser.phone || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, phone: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Optional Gmail ID</label>
                  <input
                    type="email"
                    value={editingUser.gmailId || ''}
                    onChange={(e) => setEditingUser({ ...editingUser, gmailId: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation</label>
                  <select
                    value={editingUser.designation}
                    onChange={(e) => setEditingUser({ ...editingUser, designation: e.target.value })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                  >
                    {designations.map((d) => (
                      <option key={d.id} value={d.title}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Office & Section */}
              <div className="grid grid-cols-2 gap-3">
                {editingUser.systemRole === 'SUPER_ADMIN' ? (
                  <div className="col-span-2 p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex flex-col justify-center">
                    <label className="block text-[11px] font-bold text-purple-900 mb-0.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-purple-600" /> Statewide Super Admin Scope
                    </label>
                    <p className="text-[10px] text-purple-700/90 leading-tight">
                      Super Admin has statewide governance across all offices and sections. Office & Section assignment is not required.
                    </p>
                  </div>
                ) : isOfficeSuperAdmin ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Office Name</span>
                      <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300 flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Frozen
                      </span>
                    </label>
                    <div className="w-full text-xs px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 font-bold flex items-center justify-between">
                      <span className="truncate">{editingUser.officeName || user?.officeName || 'Assigned District Office'}</span>
                      <Lock className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Office Name</label>
                    <select
                      value={editingUser.officeId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, officeId: e.target.value, sectionId: '' })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    >
                      {offices.map((off) => (
                        <option key={off.id} value={off.id}>{off.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {editingUser.systemRole === 'OFFICE_SUPER_ADMIN' ? (
                  <div className="p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex flex-col justify-center">
                    <label className="block text-[11px] font-bold text-purple-900 mb-0.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-purple-600" /> Section/Group Head Not Required
                    </label>
                    <p className="text-[10px] text-purple-700/90 leading-tight">
                      Office Admins oversee the entire office. Section assignment is bypassed.
                    </p>
                  </div>
                ) : editingUser.systemRole !== 'SUPER_ADMIN' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Section/Group Head</label>
                    <select
                      value={editingUser.sectionId || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, sectionId: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    >
                      <option value="">None</option>
                      {sections
                        .filter((s) => !editingUser.officeId || s.officeId === editingUser.officeId)
                        .map((s) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                    </select>
                  </div>
                ) : null}
              </div>

              {isSuperAdmin && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">System Role</label>
                    <select
                      value={editingUser.systemRole}
                      onChange={(e) => setEditingUser({ ...editingUser, systemRole: e.target.value })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="GROUP_HEAD">Section/Group Head</option>
                      <option value="OFFICE_SUPER_ADMIN">Office Super Admin</option>
                      <option value="SUPER_ADMIN">Super Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Active Status</label>
                    <select
                      value={editingUser.isActive ? 'true' : 'false'}
                      onChange={(e) => setEditingUser({ ...editingUser, isActive: e.target.value === 'true' })}
                      className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    >
                      <option value="true">Active Account</option>
                      <option value="false">Deactivated Account</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CREATE OFFICE (Super Admin only) */}
      {/* ========================================================================= */}
      {showCreateOfficeModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Add New Office Name</h3>
              <button onClick={() => setShowCreateOfficeModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateOffice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Name *</label>
                <input
                  type="text"
                  placeholder="e.g. DoIT&C District Office, Kota"
                  value={officeForm.name}
                  onChange={(e) => setOfficeForm({ ...officeForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. DO-KTA"
                    value={officeForm.code}
                    onChange={(e) => setOfficeForm({ ...officeForm, code: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border rounded-xl uppercase"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District</label>
                  <input
                    type="text"
                    placeholder="e.g. Kota"
                    value={officeForm.district}
                    onChange={(e) => setOfficeForm({ ...officeForm, district: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Address</label>
                <input
                  type="text"
                  placeholder="e.g. Collectorate Campus, Kota"
                  value={officeForm.address}
                  onChange={(e) => setOfficeForm({ ...officeForm, address: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateOfficeModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-xs font-bold text-white bg-brand-600 rounded-xl">Save Office</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: CREATE SECTION */}
      {/* ========================================================================= */}
      {showCreateSectionModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Add Section/Group Head</h3>
              <button onClick={() => setShowCreateSectionModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateSection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Name *</label>
                <select
                  value={isOfficeSuperAdmin ? user?.officeId : sectionForm.officeId}
                  disabled={isOfficeSuperAdmin}
                  onChange={(e) => setSectionForm({ ...sectionForm, officeId: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                  required
                >
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>{off.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Section/Group Head Name *</label>
                <input
                  type="text"
                  placeholder="e.g. e-Mitra Kiosk Monitoring Wing"
                  value={sectionForm.name}
                  onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Section/Group Head Code *</label>
                <input
                  type="text"
                  placeholder="e.g. SEC-EMITRA"
                  value={sectionForm.code}
                  onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
                  className="w-full text-xs font-mono px-3 py-2 border rounded-xl uppercase"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateSectionModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-xl">Save Section/Group Head</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: CREATE DESIGNATION */}
      {/* ========================================================================= */}
      {showCreateDesignationModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-extrabold text-slate-900">Add Official Designation</h3>
              <button onClick={() => setShowCreateDesignationModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>
            <form onSubmit={handleCreateDesignation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Project Director"
                  value={designationForm.title}
                  onChange={(e) => setDesignationForm({ ...designationForm, title: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Cadre / Stream</label>
                <input
                  type="text"
                  placeholder="e.g. State Information Services"
                  value={designationForm.cadre}
                  onChange={(e) => setDesignationForm({ ...designationForm, cadre: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowCreateDesignationModal(false)} className="px-3 py-1.5 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 rounded-xl">Save Designation</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: CREATE ROLE WITH MODULE CHECKBOXES */}
      {/* ========================================================================= */}
      {showCreateRoleModal && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Create Role & Map Module Permissions
                </h3>
                <p className="text-xs text-slate-500">
                  Check View and Edit permissions for each application module
                </p>
              </div>
              <button onClick={() => setShowCreateRoleModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Audit Inspector"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full text-xs px-3 py-2 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Code *</label>
                  <input
                    type="text"
                    placeholder="e.g. AUDIT_INSPECTOR"
                    value={roleForm.code}
                    onChange={(e) => setRoleForm({ ...roleForm, code: e.target.value })}
                    className="w-full text-xs font-mono px-3 py-2 border rounded-xl uppercase"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Compliance checking officer with read access"
                  value={roleForm.description}
                  onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                  className="w-full text-xs px-3 py-2 border rounded-xl"
                />
              </div>

              {/* Checkbox Matrix Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3.5">Module / Page Name</th>
                      <th className="py-2.5 px-3.5 text-center w-24">View Access</th>
                      <th className="py-2.5 px-3.5 text-center w-24">Edit Access</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {MODULES_LIST.map((m) => {
                      const perm = roleForm.permissions[m.key] || { canView: false, canEdit: false };
                      return (
                        <tr key={m.key} className="hover:bg-slate-50">
                          <td className="py-2 px-3.5 font-medium text-slate-800">{m.name}</td>
                          <td className="py-2 px-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canView}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRoleForm({
                                  ...roleForm,
                                  permissions: {
                                    ...roleForm.permissions,
                                    [m.key]: {
                                      canView: checked,
                                      canEdit: checked ? perm.canEdit : false,
                                    },
                                  },
                                });
                              }}
                              className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                            />
                          </td>
                          <td className="py-2 px-3.5 text-center">
                            <input
                              type="checkbox"
                              checked={perm.canEdit}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setRoleForm({
                                  ...roleForm,
                                  permissions: {
                                    ...roleForm.permissions,
                                    [m.key]: {
                                      canView: checked ? true : perm.canView,
                                      canEdit: checked,
                                    },
                                  },
                                });
                              }}
                              className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setShowCreateRoleModal(false)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-bold text-white bg-brand-600 rounded-xl shadow">Create Role</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: EDIT ROLE & MODULE PERMISSIONS MATRIX (Super Admin only) */}
      {/* ========================================================================= */}
      {editingRole && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  Edit Role & Permissions Matrix
                  {editingRole.isSystem && (
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold border border-amber-300">
                      System Default Role
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-500">
                  Update role name, description, and configure granular View/Edit permissions per module
                </p>
              </div>
              <button onClick={() => setEditingRole(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateRole} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Name *</label>
                  <input
                    type="text"
                    value={editingRole.name}
                    onChange={(e) => setEditingRole({ ...editingRole, name: e.target.value })}
                    className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Role Identifier Code</label>
                  <input
                    type="text"
                    value={editingRole.code}
                    disabled={editingRole.isSystem}
                    onChange={(e) => setEditingRole({ ...editingRole, code: e.target.value.toUpperCase() })}
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl disabled:opacity-60 disabled:cursor-not-allowed focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                  {editingRole.isSystem && (
                    <p className="text-[10px] text-slate-400 mt-0.5">System role codes are immutable.</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Role Description / Scope</label>
                <textarea
                  rows={2}
                  value={editingRole.description}
                  onChange={(e) => setEditingRole({ ...editingRole, description: e.target.value })}
                  placeholder="Describe the functional scope and responsibilities of this role..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              {/* Checkbox Matrix Table with Quick Actions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-slate-800">Module Access & Permissions Matrix ({MODULES_LIST.length} Modules):</span>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        const next: any = {};
                        MODULES_LIST.forEach((m) => {
                          next[m.key] = { canView: true, canEdit: false };
                        });
                        setEditingRole({ ...editingRole, permissions: next });
                      }}
                      className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-bold border border-emerald-200 transition-colors cursor-pointer"
                    >
                      All View
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next: any = {};
                        MODULES_LIST.forEach((m) => {
                          next[m.key] = { canView: true, canEdit: true };
                        });
                        setEditingRole({ ...editingRole, permissions: next });
                      }}
                      className="px-2 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-bold border border-blue-200 transition-colors cursor-pointer"
                    >
                      Full Access (All View & Edit)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next: any = {};
                        MODULES_LIST.forEach((m) => {
                          next[m.key] = { canView: false, canEdit: false };
                        });
                        setEditingRole({ ...editingRole, permissions: next });
                      }}
                      className="px-2 py-1 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg font-bold border border-slate-200 transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 sticky top-0">
                      <tr>
                        <th className="py-2.5 px-3.5">Module / Page Name</th>
                        <th className="py-2.5 px-3.5 text-center w-28">View Access</th>
                        <th className="py-2.5 px-3.5 text-center w-28">Edit Access</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MODULES_LIST.map((m) => {
                        const perm = editingRole.permissions[m.key] || { canView: false, canEdit: false };
                        return (
                          <tr key={m.key} className="hover:bg-slate-50">
                            <td className="py-2 px-3.5 font-medium text-slate-800">{m.name}</td>
                            <td className="py-2 px-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canView}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingRole({
                                    ...editingRole,
                                    permissions: {
                                      ...editingRole.permissions,
                                      [m.key]: {
                                        canView: checked,
                                        canEdit: checked ? perm.canEdit : false,
                                      },
                                    },
                                  });
                                }}
                                className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                              />
                            </td>
                            <td className="py-2 px-3.5 text-center">
                              <input
                                type="checkbox"
                                checked={perm.canEdit}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingRole({
                                    ...editingRole,
                                    permissions: {
                                      ...editingRole.permissions,
                                      [m.key]: {
                                        canView: checked ? true : perm.canView,
                                        canEdit: checked,
                                      },
                                    },
                                  });
                                }}
                                className="w-4 h-4 text-brand-600 rounded cursor-pointer"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRole(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Saving Role...' : 'Save Role & Permissions'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 7: EDIT OFFICE DIRECTORY (Super Admin only) */}
      {/* ========================================================================= */}
      {editingOffice && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-brand-600" />
                  Edit Office Directory Details
                </h3>
                <p className="text-xs text-slate-500">Update official office name, district, or address</p>
              </div>
              <button onClick={() => setEditingOffice(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateOffice} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Office Name *</label>
                <input
                  type="text"
                  value={editingOffice.name}
                  onChange={(e) => setEditingOffice({ ...editingOffice, name: e.target.value })}
                  placeholder="e.g. DoIT&C District Office, Jodhpur"
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Office Code *</label>
                  <input
                    type="text"
                    value={editingOffice.code}
                    onChange={(e) => setEditingOffice({ ...editingOffice, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. DO-JDH"
                    className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">District / Region</label>
                  <input
                    type="text"
                    value={editingOffice.district}
                    onChange={(e) => setEditingOffice({ ...editingOffice, district: e.target.value })}
                    placeholder="e.g. Jodhpur"
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Physical / Postal Address</label>
                <textarea
                  rows={2}
                  value={editingOffice.address}
                  onChange={(e) => setEditingOffice({ ...editingOffice, address: e.target.value })}
                  placeholder="Collectorate Complex, High Court Road..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingOffice(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Updating...' : 'Save Office'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 8: EDIT SECTION / GROUP HEAD (Super Admin only) */}
      {/* ========================================================================= */}
      {editingSection && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-600" />
                  Edit Section/Group Head
                </h3>
                <p className="text-xs text-slate-500">Update section name, identifier code, or assigned office</p>
              </div>
              <button onClick={() => setEditingSection(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateSection} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Section/Group Head Name *</label>
                <input
                  type="text"
                  value={editingSection.name}
                  onChange={(e) => setEditingSection({ ...editingSection, name: e.target.value })}
                  placeholder="e.g. Cloud Infrastructure & SDC Operations"
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Section Code *</label>
                <input
                  type="text"
                  value={editingSection.code}
                  onChange={(e) => setEditingSection({ ...editingSection, code: e.target.value.toUpperCase() })}
                  placeholder="e.g. SEC-SDC-OPS"
                  className="w-full text-xs font-mono font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Office Location *</label>
                <select
                  value={editingSection.officeId}
                  onChange={(e) => setEditingSection({ ...editingSection, officeId: e.target.value })}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  required
                >
                  {offices.map((off) => (
                    <option key={off.id} value={off.id}>
                      {off.name} ({off.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Updating...' : 'Save Section'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 9: EDIT DESIGNATION (Super Admin only) */}
      {/* ========================================================================= */}
      {editingDesignation && isSuperAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  Edit Official Designation
                </h3>
                <p className="text-xs text-slate-500">Update official designation title and service cadre</p>
              </div>
              <button onClick={() => setEditingDesignation(null)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleUpdateDesignation} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Designation Title *</label>
                <input
                  type="text"
                  value={editingDesignation.title}
                  onChange={(e) => setEditingDesignation({ ...editingDesignation, title: e.target.value })}
                  placeholder="e.g. Joint Director / State Informatics Officer"
                  className="w-full text-xs font-bold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Service Cadre / Classification</label>
                <input
                  type="text"
                  value={editingDesignation.cadre}
                  onChange={(e) => setEditingDesignation({ ...editingDesignation, cadre: e.target.value })}
                  placeholder="e.g. State Gazetted Cadre (Pay Matrix L-18)"
                  className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingDesignation(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {isSubmitting ? 'Updating...' : 'Save Designation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
