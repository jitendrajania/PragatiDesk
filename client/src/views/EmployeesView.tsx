import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { SystemRoleBadge } from '../components/common/Badge';
import { DesignationMaster, SectionMaster, OfficeMaster, User } from '../types';
import {
  Users2,
  UserPlus,
  Edit2,
  Search,
  Mail,
  Phone,
  Building,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ArrowRightLeft,
  X,
  Check,
  Trash2,
  Sparkles,
  RotateCcw,
  XCircle,
  Send,
  Inbox,
  Clock,
  UserCheck,
  UserX,
  ShieldAlert,
  Copy,
  KeyRound,
} from 'lucide-react';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
const SSO_REGEX = /^[A-Za-z0-9_\-\.]{3,30}$/;

export const EmployeesView: React.FC = () => {
  const { user, hasPermission } = useAuth();
  const [employees, setEmployees] = useState<User[]>([]);
  const [designations, setDesignations] = useState<DesignationMaster[]>([]);
  const [sections, setSections] = useState<SectionMaster[]>([]);
  const [offices, setOffices] = useState<OfficeMaster[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Register Employee Modal
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ssoId, setSsoId] = useState('');
  const [designation, setDesignation] = useState('');
  const [phone, setPhone] = useState('');
  const [gmailId, setGmailId] = useState('');
  const [customPassword, setCustomPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Registration Password Display Modal
  const [createdPasswordInfo, setCreatedPasswordInfo] = useState<{
    name: string;
    email: string;
    ssoId: string;
    pass: string;
  } | null>(null);

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

  // Edit Employee Modal
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Transfer Section Modal
  const [transferingUser, setTransferingUser] = useState<User | null>(null);
  const [targetSectionId, setTargetSectionId] = useState('');
  const [transferRemark, setTransferRemark] = useState('');

  const canEdit = hasPermission('EMPLOYEES', 'EDIT');
  const isSuperAdmin = user?.systemRole === 'SUPER_ADMIN';
  const isOfficeSuperAdmin = user?.systemRole === 'OFFICE_SUPER_ADMIN';
  const isGroupHead = user?.systemRole === 'GROUP_HEAD';

  const fetchEmployeesData = async () => {
    setIsLoading(true);
    try {
      const [empData, desData, secData, offData] = await Promise.all([
        api.getEmployees(),
        api.getDesignations(),
        api.getSections(user?.officeId || undefined),
        api.getOffices(),
      ]);

      setEmployees(empData);
      setDesignations(desData);
      setSections(secData);
      setOffices(offData);

      if (desData.length > 0 && !designation) {
        setDesignation(desData[0].title);
      }
    } catch (err: any) {
      console.error('Failed to load employee records:', err);
      setErrorMessage(err.message || 'Failed to load employee directory.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeesData();
  }, []);

  // Handle Employee Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Format Regex Validations
    if (!EMAIL_REGEX.test(email.trim())) {
      setErrorMessage('Invalid Email Address format.');
      return;
    }
    if (!SSO_REGEX.test(ssoId.trim())) {
      setErrorMessage('Invalid SSO ID format (alphanumeric 3-30 characters).');
      return;
    }
    if (phone && !PHONE_REGEX.test(phone.trim().replace(/[\s\-]/g, ''))) {
      setErrorMessage('Invalid Mobile Number format (must be a valid 10-digit number).');
      return;
    }
    if (gmailId && !EMAIL_REGEX.test(gmailId.trim())) {
      setErrorMessage('Invalid Gmail ID format.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload: any = {
        name: name.trim(),
        email: email.toLowerCase().trim(),
        ssoId: ssoId.toUpperCase().trim(),
        designation: designation || designations[0]?.title || 'Analyst-cum-Programmer (ACP)',
        phone: phone ? phone.trim() : undefined,
        gmailId: gmailId ? gmailId.toLowerCase().trim() : undefined,
        officeId: user?.officeId,
        sectionId: user?.sectionId,
        password: customPassword || undefined,
      };

      const res = await api.createEmployee(payload);

      setCreatedPasswordInfo({
        name: res.name,
        email: res.email,
        ssoId: res.ssoId,
        pass: res.generatedDefaultPassword || 'DoITC@2026',
      });

      setName('');
      setEmail('');
      setSsoId('');
      setPhone('');
      setGmailId('');
      setCustomPassword('');
      setShowRegisterModal(false);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to register employee');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Save
  const handleEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setErrorMessage(null);

    if (!EMAIL_REGEX.test(editingUser.email.trim())) {
      setErrorMessage('Invalid Email Address format.');
      return;
    }
    if (!SSO_REGEX.test(editingUser.ssoId.trim())) {
      setErrorMessage('Invalid SSO ID format.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.updateUser(editingUser.id, {
        name: editingUser.name.trim(),
        email: editingUser.email.toLowerCase().trim(),
        ssoId: editingUser.ssoId.toUpperCase().trim(),
        designation: editingUser.designation,
        phone: editingUser.phone ? editingUser.phone.trim() : null,
        gmailId: editingUser.gmailId ? editingUser.gmailId.toLowerCase().trim() : null,
        officeId: editingUser.officeId,
        sectionId: editingUser.sectionId,
        isActive: editingUser.isActive,
      });

      setSuccessMessage(`Employee profile for ${editingUser.name} updated successfully.`);
      setEditingUser(null);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update employee profile.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Initiate Section Transfer
  const handleInitiateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferingUser || !targetSectionId) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.initiateEmployeeTransfer(transferingUser.id, {
        targetSectionId,
        remark: transferRemark.trim() || undefined,
      });
      setSuccessMessage(`Employee transfer initiated for '${transferingUser.name}'. Pending recipient acceptance.`);
      setTransferingUser(null);
      setTargetSectionId('');
      setTransferRemark('');
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to initiate employee transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Accept Transfer
  const handleAcceptTransfer = async (emp: User) => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.acceptEmployeeTransfer(emp.id);
      setSuccessMessage(`Employee '${emp.name}' transfer accepted. Added to your section.`);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to accept employee transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cancel Transfer (By Sender)
  const handleCancelTransfer = async (emp: User) => {
    if (!window.confirm(`Are you sure you want to cancel the transfer request for ${emp.name}?`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.rejectEmployeeTransfer(emp.id);
      setSuccessMessage(`Employee transfer request for '${emp.name}' has been cancelled.`);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to cancel transfer request.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Decline Transfer (By Recipient)
  const handleDeclineTransfer = async (emp: User) => {
    if (!window.confirm(`Are you sure you want to decline the transfer request for ${emp.name}?`)) return;
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await api.rejectEmployeeTransfer(emp.id);
      setSuccessMessage(`Employee transfer request for '${emp.name}' was declined.`);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to decline transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = async (emp: User) => {
    try {
      await api.updateUser(emp.id, { isActive: !emp.isActive });
      setSuccessMessage(`Employee account status changed to ${!emp.isActive ? 'Active' : 'Deactivated'}.`);
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to toggle employee status.');
    }
  };

  // Handle Reset Password (Super Admin, Office Super Admin, Group Head)
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
      setResettingUser(null);
      setResetCustomPassword('');
      await fetchEmployeesData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to reset employee password.');
    } finally {
      setIsResettingPass(false);
    }
  };

  const copyCredentials = (info: { name: string; ssoId: string; email: string; pass: string }) => {
    const text = `PragatiDesk (DoIT&C) Staff Credentials:\nName: ${info.name}\nSSO ID: ${info.ssoId}\nOfficial Email: ${info.email}\nPassword: ${info.pass}\nLogin URL: ${window.location.origin}`;
    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Separate incoming pending transfers for the current user/section
  const incomingTransfers = employees.filter(
    (e) =>
      e.transferStatus === 'PENDING_TRANSFER' &&
      (e.transferToGroupHeadId === user?.id || e.transferToSectionId === user?.sectionId)
  );

  const filteredEmployees = employees.filter(
    (e) =>
      (isSuperAdmin || e.systemRole !== 'SUPER_ADMIN') &&
      (e.name.toLowerCase().includes(search.toLowerCase()) ||
        e.designation.toLowerCase().includes(search.toLowerCase()) ||
        e.email.toLowerCase().includes(search.toLowerCase()) ||
        (e.ssoId && e.ssoId.toLowerCase().includes(search.toLowerCase())) ||
        (e.officeName && e.officeName.toLowerCase().includes(search.toLowerCase())) ||
        (e.sectionName && e.sectionName.toLowerCase().includes(search.toLowerCase())))
  );

  const activeEmployees = filteredEmployees.filter((e) => e.isActive);
  const deactivatedEmployees = filteredEmployees.filter((e) => !e.isActive);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center font-bold shadow-inner">
            <Users2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight">
              Department Employee Directory & Role Distribution
            </h1>
            <p className="text-xs text-slate-500">
              Official staff profiles, SSO IDs, designation records, and project assignments
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchEmployeesData()}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
            title="Refresh employee directory"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-brand-600' : ''}`} />
            Refresh
          </button>

          {canEdit && (
            <button
              type="button"
              onClick={() => {
                setName('');
                setEmail('');
                setSsoId('');
                setPhone('');
                setGmailId('');
                setCustomPassword('');
                setShowRegisterModal(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow-sm transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              Register New Employee
            </button>
          )}
        </div>
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

      {/* Incoming Employee Transfer Requests (For Receiving Section/Group Head) */}
      {incomingTransfers.length > 0 && (
        <div className="p-4 bg-amber-50/90 border-2 border-amber-300 rounded-3xl space-y-3 animate-in fade-in shadow-xs">
          <div className="flex items-center gap-2 text-xs font-black text-amber-900">
            <Inbox className="w-4 h-4 text-amber-600 animate-bounce" />
            <span>Action Required: You Have {incomingTransfers.length} Incoming Employee Transfer Request(s)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {incomingTransfers.map((inEmp) => (
              <div
                key={inEmp.id}
                className="p-3.5 bg-white rounded-2xl border border-amber-200 flex items-center justify-between gap-3 shadow-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{inEmp.name}</span>
                    <span className="text-[11px] text-amber-800 font-mono font-bold bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      {inEmp.ssoId}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    {inEmp.designation} • Origin: <span className="font-semibold text-slate-700">{inEmp.sectionName || 'Previous Section/Group Head'}</span>
                  </div>
                  {inEmp.transferRemark && (
                    <div className="text-[10px] text-amber-700 italic">
                      Remark: "{inEmp.transferRemark}"
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleAcceptTransfer(inEmp)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineTransfer(inEmp)}
                    disabled={isSubmitting}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search & Auto-Fill Context Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SSO ID, designation, official email, or office name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-brand-500 shadow-xs"
          />
        </div>

        <div className="p-2.5 bg-slate-100 rounded-2xl border border-slate-200 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">Your Office Context:</span>
          <span className="font-bold text-slate-900 truncate max-w-[170px]" title={user?.officeName}>
            {user?.officeName || 'DoIT&C Head Office'}
          </span>
        </div>
      </div>

      {/* Active Staff Directory */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
            Active Staff Directory
            <span className="text-[11px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-bold border border-brand-200">
              {activeEmployees.length} Active
            </span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400">
              Loading employees registry...
            </div>
          ) : activeEmployees.length === 0 ? (
            <div className="col-span-3 p-12 text-center text-xs text-slate-400">
              No active employees found matching search query.
            </div>
          ) : (
            activeEmployees.map((emp) => {
              const isPendingTransfer = emp.transferStatus === 'PENDING_TRANSFER';
              const isSender =
                emp.transferInitiatedById === user?.id ||
                emp.sectionId === user?.sectionId ||
                isSuperAdmin ||
                isOfficeSuperAdmin;
              const isRecipient =
                emp.transferToGroupHeadId === user?.id || emp.transferToSectionId === user?.sectionId;

              return (
                <div
                  key={emp.id}
                  className={`p-5 bg-white rounded-3xl border shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between ${
                    isPendingTransfer ? 'border-amber-300 ring-1 ring-amber-200 bg-amber-50/20' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Card Top */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-brand-50 text-brand-700 flex items-center justify-center font-black text-sm shadow-inner flex-shrink-0">
                          {emp.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-xs font-black text-slate-900 leading-snug flex items-center gap-1.5">
                            {emp.name}
                            {emp.gmailId && (
                              <span className="text-[9px] bg-red-50 text-red-600 px-1 py-0.2 rounded border border-red-200" title={`Google ID: ${emp.gmailId}`}>
                                Google
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] text-brand-600 font-bold">{emp.designation}</p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Active
                        </span>
                        {isPendingTransfer && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            Transfer Pending
                          </span>
                        )}
                      </div>
                    </div>

                    {/* SSO ID & Office & Section */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs text-slate-600">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400 font-semibold">SSO ID:</span>
                        <span className="font-mono text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          {emp.ssoId}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate text-[11px]">{emp.email}</span>
                      </div>

                      {emp.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                          <span className="text-[11px]">{emp.phone}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate text-[11px] font-medium text-slate-700">
                          {emp.officeName || 'DoIT&C Office'}
                        </span>
                      </div>

                      {emp.sectionName && (
                        <div className="text-[10px] text-indigo-700 font-semibold truncate pl-5">
                          Section/Group Head: {emp.sectionName}
                        </div>
                      )}
                    </div>

                    {/* Pending Transfer Notice Banner */}
                    {isPendingTransfer && (
                      <div className="p-2.5 bg-amber-50/90 border border-amber-300 rounded-xl space-y-1 text-xs text-amber-950">
                        <div className="flex items-center gap-1.5 font-bold text-amber-900">
                          <ArrowRightLeft className="w-3.5 h-3.5 text-amber-700 flex-shrink-0" />
                          <span>Transfer Pending to: {emp.transferToSection?.name || 'Target Section/Group Head'}</span>
                        </div>
                        {emp.transferRemark && (
                          <div className="text-[10px] text-amber-800 italic">
                            "{emp.transferRemark}"
                          </div>
                        )}
                        {emp.transferInitiatedBy && (
                          <div className="text-[10px] text-amber-700">
                            Initiated by: {emp.transferInitiatedBy.name} ({emp.transferInitiatedBy.designation})
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  {canEdit && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-1.5">
                        {isPendingTransfer ? (
                          isRecipient ? (
                            <>
                              <button
                                onClick={() => handleAcceptTransfer(emp)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-xs"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleDeclineTransfer(emp)}
                                disabled={isSubmitting}
                                className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3 text-red-600" />
                                Decline
                              </button>
                            </>
                          ) : isSender ? (
                            <button
                              onClick={() => handleCancelTransfer(emp)}
                              disabled={isSubmitting}
                              className="px-2.5 py-1 text-[11px] font-bold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg transition-colors flex items-center gap-1"
                              title="Cancel pending employee transfer request"
                            >
                              <RotateCcw className="w-3 h-3 text-red-600" />
                              Cancel Transfer Request
                            </button>
                          ) : null
                        ) : (
                          <>
                            <button
                              onClick={() => setEditingUser(emp)}
                              className="px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </button>

                            <button
                              onClick={() => {
                                setResettingUser(emp);
                                setResetCustomPassword('');
                                setResetResultInfo(null);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reset staff password & generate default credentials"
                            >
                              <KeyRound className="w-3 h-3" />
                              Reset Pass
                            </button>

                            <button
                              onClick={() => {
                                setTransferingUser(emp);
                                setTargetSectionId('');
                                setTransferRemark('');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                              title="Transfer employee to another Section/Group Head"
                            >
                              <ArrowRightLeft className="w-3 h-3" />
                              Transfer Section/Group Head
                            </button>
                          </>
                        )}
                      </div>

                      {emp.id === user?.id ? (
                        <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 rounded bg-slate-100 border border-slate-200" title="You cannot deactivate your own account">
                          You (Current)
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleStatus(emp)}
                          className="text-[10px] font-bold px-2 py-0.5 rounded-lg border text-amber-700 border-amber-200 hover:bg-amber-50 cursor-pointer transition-colors"
                          title="Deactivate employee account"
                        >
                          Deactivate
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DEACTIVATED / INACTIVE STAFF DIRECTORY & RE-ACTIVATION CONTROLS */}
      {/* ========================================================================= */}
      {deactivatedEmployees.length > 0 && (
        <div className="pt-6 border-t-2 border-slate-200/80 space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-bold">
                <UserX className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  Deactivated Staff Records
                  <span className="text-[11px] bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-bold border border-red-200">
                    {deactivatedEmployees.length} Deactivated
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Staff accounts currently deactivated. You can re-activate any account at any time to restore full application access.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {deactivatedEmployees.map((emp) => (
              <div
                key={emp.id}
                className="p-5 bg-slate-50/90 rounded-3xl border border-red-200 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Card Top */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-slate-200 text-slate-500 flex items-center justify-center font-black text-sm shadow-inner flex-shrink-0">
                        {emp.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xs font-black text-slate-700 leading-snug flex items-center gap-1.5">
                          {emp.name}
                        </h3>
                        <p className="text-[11px] text-slate-500 font-semibold">{emp.designation}</p>
                      </div>
                    </div>

                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-red-100 text-red-800 border border-red-300">
                      Deactivated
                    </span>
                  </div>

                  {/* SSO ID & Details */}
                  <div className="p-3 bg-white rounded-2xl border border-slate-200/80 space-y-1 text-xs text-slate-500">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-400 font-semibold">SSO ID:</span>
                      <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {emp.ssoId}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-[11px]">{emp.email}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Building className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                      <span className="truncate text-[11px] text-slate-600">
                        {emp.officeName || 'DoIT&C Office'}
                      </span>
                    </div>

                    {emp.sectionName && (
                      <div className="text-[10px] text-slate-500 truncate pl-5">
                        Section/Group Head: {emp.sectionName}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions Footer */}
                {canEdit && (
                  <div className="pt-3 border-t border-slate-200/80 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setEditingUser(emp)}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-slate-600 hover:text-brand-600 hover:bg-slate-200/60 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </button>

                      <button
                        onClick={() => {
                          setResettingUser(emp);
                          setResetCustomPassword('');
                          setResetResultInfo(null);
                        }}
                        className="px-2.5 py-1.5 text-[11px] font-bold text-amber-700 hover:bg-amber-50 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reset staff password & generate default credentials"
                      >
                        <KeyRound className="w-3 h-3" />
                        Reset Pass
                      </button>
                    </div>

                    <button
                      onClick={() => handleToggleStatus(emp)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Re-activate employee account to restore login access"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Re-activate Account
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: REGISTER EMPLOYEE (WITH AUTO-FILL CONTEXT & DESIGNATION MASTER) */}
      {/* ========================================================================= */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Register Official Staff Member
                </h3>
                <p className="text-xs text-slate-500">
                  Auto-populating context from your Section/Group Head assignment
                </p>
              </div>
              <button onClick={() => setShowRegisterModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleRegister} className="space-y-3.5">
              {/* Context Auto-Fill Badge */}
              <div className="p-3 bg-brand-50/70 rounded-2xl border border-brand-100 text-xs space-y-1">
                <div className="text-[10px] font-bold text-brand-800 uppercase tracking-wider">
                  Auto-Populated Office & Section/Group Head:
                </div>
                <div className="flex items-center justify-between font-bold text-slate-800">
                  <span>{user?.officeName || 'DoIT&C Secretariat, Jaipur (HQ)'}</span>
                  <span className="text-brand-700">{user?.sectionName || 'Assigned Section/Group Head'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    placeholder="e.g. Vikram Aditya"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">SSO ID *</label>
                  <input
                    type="text"
                    placeholder="e.g. DOITC-EMP-2001"
                    value={ssoId}
                    onChange={(e) => setSsoId(e.target.value)}
                    className="w-full text-xs font-mono px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Official Email Address *</label>
                  <input
                    type="email"
                    placeholder="e.g. vikram.aditya@doitc.gov.in"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    placeholder="e.g. 9829011111"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Optional Gmail ID (Google Login)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. vikram.work@gmail.com"
                    value={gmailId}
                    onChange={(e) => setGmailId(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Designation (from Masters) *</label>
                  <select
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                    required
                  >
                    {designations.map((d) => (
                      <option key={d.id} value={d.title}>{d.title}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-xl shadow"
                >
                  {isSubmitting ? 'Registering...' : 'Register Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: CREATED PASSWORD DISPLAY MODAL */}
      {/* ========================================================================= */}
      {createdPasswordInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-slate-900">Employee Successfully Registered</h3>
              <p className="text-xs text-slate-500 mt-1">
                Account created for <strong>{createdPasswordInfo.name}</strong> ({createdPasswordInfo.ssoId})
              </p>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-left space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                System-Generated Initial Password:
              </div>
              <div className="font-mono text-base font-black text-amber-950 bg-white p-2.5 rounded-xl border border-amber-300 select-all tracking-wider text-center">
                {createdPasswordInfo.pass}
              </div>
              <p className="text-[11px] text-amber-800 leading-tight">
                * Sent to <strong>{createdPasswordInfo.email}</strong>. Mandatory password reset will be triggered upon first login.
              </p>
            </div>

            <button
              onClick={() => setCreatedPasswordInfo(null)}
              className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow"
            >
              Done & Close
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: EDIT PROFILE MODAL */}
      {/* ========================================================================= */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-extrabold text-slate-900">Edit Employee Profile</h3>
                <p className="text-xs text-slate-500">Update contact, designation, and status</p>
              </div>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <form onSubmit={handleEditSave} className="space-y-3">
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
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TRANSFER EMPLOYEE SECTION */}
      {/* ========================================================================= */}
      {transferingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Transfer Employee to Section/Group Head</h3>
                <p className="text-xs text-slate-500">Reassign staff member to another Section/Group Head in office</p>
              </div>
              <button onClick={() => setTransferingUser(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <form onSubmit={handleInitiateTransfer} className="space-y-3.5">
              <div className="p-3 bg-slate-50 rounded-2xl text-xs space-y-1">
                <div className="font-bold text-slate-900">{transferingUser.name} ({transferingUser.ssoId})</div>
                <div className="text-slate-500">Current Section/Group Head: {transferingUser.sectionName || 'General Section/Group Head'}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Target Section/Group Head *</label>
                <select
                  value={targetSectionId}
                  onChange={(e) => setTargetSectionId(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl cursor-pointer"
                  required
                >
                  <option value="">Select Target Section/Group Head...</option>
                  {sections
                    .filter((sec) => sec.id !== transferingUser.sectionId && (!transferingUser.officeId || sec.officeId === transferingUser.officeId))
                    .map((sec) => (
                      <option key={sec.id} value={sec.id}>
                        {sec.name} ({sec.code}) — {sec.office?.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Transfer Remarks / Reason (Optional)</label>
                <textarea
                  rows={2}
                  value={transferRemark}
                  onChange={(e) => setTransferRemark(e.target.value)}
                  placeholder="e.g. Workload reallocation, deputation to new citizen portal, or administrative order..."
                  className="w-full text-xs px-3 py-2 bg-slate-50 border rounded-xl resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setTransferingUser(null)} className="px-4 py-2 text-xs text-slate-600">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow flex items-center gap-1.5 cursor-pointer">
                  <Send className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Initiating...' : 'Initiate Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: REGISTRATION CREDENTIALS DISPLAY BANNER WITH 1-CLICK COPY */}
      {/* ========================================================================= */}
      {createdPasswordInfo && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-black text-slate-900">Staff Successfully Registered!</h3>
              <p className="text-xs text-slate-500 mt-1">
                Official profile created for <strong>{createdPasswordInfo.name}</strong>
              </p>
            </div>

            <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 text-left space-y-2.5">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                System-Generated Default Password:
              </div>
              <div className="font-mono text-base font-black text-amber-950 bg-white p-3 rounded-xl border border-amber-300 select-all tracking-wider text-center">
                {createdPasswordInfo.pass}
              </div>
              <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-amber-200/60 font-mono">
                <div><strong>SSO ID:</strong> {createdPasswordInfo.ssoId}</div>
                <div><strong>Official Email:</strong> {createdPasswordInfo.email}</div>
              </div>
              <p className="text-[10px] text-amber-800 leading-tight">
                * Automated credentials welcome notification has been dispatched to the employee.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => copyCredentials(createdPasswordInfo)}
                className="flex-1 py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedNotification ? 'Copied to Clipboard!' : 'Copy Credentials'}
              </button>
              <button
                onClick={() => setCreatedPasswordInfo(null)}
                className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 shadow cursor-pointer transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 6: RESET EMPLOYEE PASSWORD */}
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
                  <h3 className="text-base font-extrabold text-slate-900">Reset Staff Password</h3>
                  <p className="text-xs text-slate-500">Generate default credentials or assign custom password</p>
                </div>
              </div>
              <button onClick={() => setResettingUser(null)} className="text-slate-400 hover:text-slate-600 font-bold">✕</button>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 text-xs text-slate-600">
              <div className="font-black text-slate-900 text-sm">{resettingUser.name}</div>
              <div className="font-mono text-amber-800 text-[11px] font-bold">SSO ID: {resettingUser.ssoId}</div>
              <div className="text-slate-500 text-[11px]">Designation: {resettingUser.designation}</div>
              <div className="text-slate-500 text-[11px]">Official Email: {resettingUser.email}</div>
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
                ℹ️ The employee will receive an automated security notification with the new password and will be prompted to update it on their next login.
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
      {/* MODAL 7: RESET PASSWORD SUCCESS NOTIFICATION WITH COPY */}
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
                * Security update notification email has also been dispatched to the employee.
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
    </div>
  );
};
