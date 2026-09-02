import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar, ActiveTab } from './components/layout/Sidebar';
import { DashboardView } from './views/DashboardView';
import { KanbanBoardView } from './views/KanbanBoardView';
import { TasksTableView } from './views/TasksTableView';
import { ProjectsView } from './views/ProjectsView';
import { FollowUpView } from './views/FollowUpView';
import { EmployeesView } from './views/EmployeesView';
import { ReportsDashboardView } from './views/ReportsDashboardView';
import { SuperAdminView } from './views/SuperAdminView';
import { CreateTaskModal } from './components/tasks/CreateTaskModal';
import { TaskDetailModal } from './components/tasks/TaskDetailModal';
import { UserProfileModal } from './components/layout/UserProfileModal';
import { api } from './services/api';
import { Project } from './types';
import {
  ShieldAlert,
  Sparkles,
  Layers,
  Lock,
  Mail,
  ArrowRight,
  Building2,
  CheckCircle2,
  KeyRound,
  AlertTriangle,
} from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    user,
    personas,
    switchPersona,
    login,
    googleLogin,
    googleSignInWithFirebase,
    sendOtp,
    verifyOtpAndResetPassword,
    forceChangePassword,
    isLoading,
    hasPermission,
  } = useAuth();

  const { showSuccess, showError } = useToast();

  // Navigation & Filtering State
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modals
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState<boolean>(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Quick stats for badges
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [followUpCount, setFollowUpCount] = useState<number>(0);

  // Login Form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isGoogleLoggingIn, setIsGoogleLoggingIn] = useState(false);

  // Forgot Password / OTP Modal
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [otpNewPassword, setOtpNewPassword] = useState('');
  const [otpSentMessage, setOtpSentMessage] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  // First-Time Login Mandatory Password Change State
  const [firstTimeNewPassword, setFirstTimeNewPassword] = useState('');
  const [firstTimeConfirmPassword, setFirstTimeConfirmPassword] = useState('');
  const [firstTimeError, setFirstTimeError] = useState<string | null>(null);
  const [isChangingFirstTimePass, setIsChangingFirstTimePass] = useState(false);

  const fetchGlobalMetadata = async () => {
    try {
      const [projectsData, statsData, followUpsData] = await Promise.all([
        api.getProjects(),
        api.getDashboardStats(selectedProjectId || undefined),
        api.getFollowUps(),
      ]);

      setProjects(projectsData);
      setPendingCount(statsData.summary?.pending || 0);
      setFollowUpCount(followUpsData.length || 0);
    } catch (err) {
      console.error('Failed to load global metadata:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchGlobalMetadata();
    }
  }, [user, selectedProjectId]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      await login(loginEmail, loginPass);
    } catch (err: any) {
      setLoginError(err.message || 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoginError(null);
    setIsGoogleLoggingIn(true);
    try {
      await googleSignInWithFirebase();
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        return;
      }
      if (err.code === 'auth/configuration-not-found') {
        setLoginError(
          'Google Sign-In is not enabled in your Firebase Project Console yet. Please enable "Google" provider in Firebase Console > Authentication > Sign-in method.'
        );
        return;
      }
      if (err.code === 'auth/unauthorized-domain') {
        setLoginError(
          `Domain '${window.location.hostname}' is not authorized. Please add it in Firebase Console > Authentication > Settings > Authorized domains.`
        );
        return;
      }
      setLoginError(err.message || 'Google authentication failed');
    } finally {
      setIsGoogleLoggingIn(false);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setIsSendingOtp(true);
    try {
      const res = await sendOtp(otpEmail);
      setOtpSentMessage(res.message);
      setOtpCode('');
      showSuccess(res.message, 'OTP Code Dispatched');
    } catch (err: any) {
      const msg = err.message || 'Failed to dispatch verification code';
      setOtpError(msg);
      showError(msg);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleResetPasswordWithOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setIsResettingPassword(true);
    try {
      await verifyOtpAndResetPassword(otpEmail, otpCode, otpNewPassword);
      showSuccess('Your password has been reset successfully! Please log in with your new password.', 'Password Reset Success');
      setShowForgotPasswordModal(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to reset password';
      setOtpError(msg);
      showError(msg);
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleFirstTimePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setFirstTimeError(null);
    if (firstTimeNewPassword.length < 6) {
      setFirstTimeError('New password must be at least 6 characters.');
      return;
    }
    if (firstTimeNewPassword !== firstTimeConfirmPassword) {
      setFirstTimeError('Passwords do not match.');
      return;
    }

    setIsChangingFirstTimePass(true);
    try {
      await forceChangePassword(firstTimeNewPassword);
      showSuccess('Your permanent password has been set successfully!', 'Welcome to PragatiDesk');
    } catch (err: any) {
      const msg = err.message || 'Failed to update password';
      setFirstTimeError(msg);
      showError(msg);
    } finally {
      setIsChangingFirstTimePass(false);
    }
  };

  // 1. Loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="font-extrabold text-base tracking-tight">PragatiDesk</div>
          <p className="text-xs text-slate-400">Loading Departmental Workspace...</p>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated Login Screen with One-Click Persona Switcher
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        {/* Background decorative glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-3xl bg-gradient-to-tr from-brand-600 to-indigo-700 text-white font-black text-3xl shadow-2xl border border-white/20 mb-3">
            P
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Pragati<span className="text-brand-400">Desk</span>
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Department of Information Technology & Communication (DoIT&C)
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[11px] font-bold">
            <Building2 className="w-3.5 h-3.5" />
            Agile Project & Task Workflow Tracking System
          </div>
        </div>

        <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg relative z-10">
          <div className="bg-slate-900/90 backdrop-blur-md py-8 px-6 sm:px-10 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
            {loginError && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
                {loginError}
              </div>
            )}

            {/* Standard Login Form */}
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Official Email Address or SSO ID
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="name@doitc.gov.in or SSO ID"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-300">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      setOtpEmail(loginEmail.includes('@') ? loginEmail : '');
                      setOtpSentMessage(null);
                      setOtpError(null);
                      setShowForgotPasswordModal(true);
                    }}
                    className="text-[11px] text-brand-400 hover:text-brand-300 font-semibold"
                  >
                    Forgot Password? Reset with OTP
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={loginPass}
                    onChange={(e) => setLoginPass(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow-md transition-all disabled:opacity-50"
              >
                {isLoggingIn ? 'Authenticating...' : 'Sign In to Workspace'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Google / Gmail Sign In Option */}
            {/* Google / Gmail Sign In Option */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoggingIn}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-slate-200 bg-slate-950 hover:bg-slate-800 border border-slate-700 rounded-xl shadow transition-all cursor-pointer disabled:opacity-50"
              >
                <span className="w-4 h-4 rounded-full bg-red-600 text-white font-bold flex items-center justify-center text-[10px]">
                  G
                </span>
                {isGoogleLoggingIn ? 'Verifying Google Account...' : 'Sign In with Google Account'}
              </button>
            </div>

            {/* Fast 1-Click Persona Login (For Development / Evaluation Only) */}
            {import.meta.env.DEV && personas.length > 0 && (
              <div className="pt-4 border-t border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-slate-400 text-xs">
                  <span className="font-bold flex items-center gap-1.5 text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    One-Click Demo Personas (Dev Only):
                  </span>
                  <span className="text-[10px] text-slate-500">Instant Hierarchy Testing</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {personas.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => switchPersona(p.id)}
                      className="p-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-brand-500 rounded-xl text-left transition-all group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white group-hover:text-brand-400 truncate">
                          {p.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
                            p.systemRole === 'SUPER_ADMIN'
                              ? 'bg-red-950 text-red-300 border border-red-800'
                              : p.systemRole === 'OFFICE_SUPER_ADMIN'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : p.systemRole === 'GROUP_HEAD'
                              ? 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-blue-950 text-blue-300 border border-blue-800'
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
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {p.designation} • {p.ssoId}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate mt-0.5">
                        {p.officeName}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Forgot Password / OTP Modal */}
        {showForgotPasswordModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 space-y-4 text-white shadow-2xl animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">Reset Password with Email OTP</h3>
                </div>
                <button onClick={() => setShowForgotPasswordModal(false)} className="text-slate-400 hover:text-white">✕</button>
              </div>

              {otpError && (
                <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
                  {otpError}
                </div>
              )}

              {otpSentMessage && (
                <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-300">
                  {otpSentMessage}
                </div>
              )}

              <div className="space-y-4">
                {/* Step 1: Send OTP */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Registered Official Email</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      placeholder="name@doitc.gov.in"
                      className="flex-1 px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-brand-500"
                      required
                    />
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={isSendingOtp || !otpEmail}
                      className="px-3.5 py-2 text-xs font-bold text-slate-900 bg-amber-400 hover:bg-amber-300 rounded-xl shadow disabled:opacity-50"
                    >
                      {isSendingOtp ? 'Sending...' : 'Send OTP'}
                    </button>
                  </div>
                </div>

                {/* Step 2: Enter OTP & New Password */}
                <form onSubmit={handleResetPasswordWithOtp} className="space-y-3 pt-2 border-t border-slate-800">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">6-Digit Verification Code (OTP)</label>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value)}
                      placeholder="e.g. 842109"
                      className="w-full px-3 py-2 text-xs font-mono text-center tracking-widest bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">New Password (min 6 chars)</label>
                    <input
                      type="password"
                      value={otpNewPassword}
                      onChange={(e) => setOtpNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-brand-500"
                      required
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotPasswordModal(false)}
                      className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isResettingPassword || !otpCode || !otpNewPassword}
                      className="px-5 py-2 text-xs font-bold text-white bg-brand-600 hover:bg-brand-500 rounded-xl shadow disabled:opacity-50"
                    >
                      {isResettingPassword ? 'Updating...' : 'Verify OTP & Login'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. First-Time Login Mandatory Password Change Modal
  if (user.mustChangePassword) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
          <div className="bg-slate-900 border border-amber-500/40 py-8 px-6 sm:px-10 rounded-3xl shadow-2xl space-y-6 text-white">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-black tracking-tight">First-Time Login Security Setup</h2>
              <p className="text-xs text-slate-400">
                Welcome, <strong>{user.name}</strong> ({user.ssoId}). You are required to update your system-generated default password before proceeding.
              </p>
            </div>

            {firstTimeError && (
              <div className="p-3 bg-red-500/20 border border-red-500/40 rounded-xl text-xs text-red-300">
                {firstTimeError}
              </div>
            )}

            <form onSubmit={handleFirstTimePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Set New Password *</label>
                <input
                  type="password"
                  placeholder="Min 6 characters"
                  value={firstTimeNewPassword}
                  onChange={(e) => setFirstTimeNewPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  placeholder="Re-enter password"
                  value={firstTimeConfirmPassword}
                  onChange={(e) => setFirstTimeConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:ring-2 focus:ring-brand-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={isChangingFirstTimePass}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-500 rounded-xl text-xs font-bold text-white shadow-md transition-all disabled:opacity-50"
              >
                {isChangingFirstTimePass ? 'Updating Security Credentials...' : 'Save & Enter Workspace'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // 4. Authenticated App Layout with Dynamic Module Scoping
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navbar */}
      <Navbar
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={(id) => setSelectedProjectId(id)}
        onOpenCreateTask={() => setIsCreateTaskOpen(true)}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
      />

      {/* Main View Layout with Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          onOpenProfile={() => setIsProfileModalOpen(true)}
          pendingCount={pendingCount}
          followUpCount={followUpCount}
        />

        {/* Dynamic Content View Area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50">
          {activeTab === 'dashboard' && hasPermission('DASHBOARD', 'VIEW') && (
            <DashboardView
              selectedProjectId={selectedProjectId}
              projects={projects}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
              onNavigateToTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'kanban' && hasPermission('KANBAN', 'VIEW') && (
            <KanbanBoardView
              selectedProjectId={selectedProjectId}
              projects={projects}
              searchQuery={searchQuery}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            />
          )}

          {activeTab === 'tasks' && hasPermission('TASKS', 'VIEW') && (
            <TasksTableView
              selectedProjectId={selectedProjectId}
              projects={projects}
              searchQuery={searchQuery}
              onSelectTask={(id) => setSelectedTaskId(id)}
              onOpenCreateTask={() => setIsCreateTaskOpen(true)}
            />
          )}

          {activeTab === 'projects' && hasPermission('PROJECTS', 'VIEW') && (
            <ProjectsView
              onSelectProject={(id) => setSelectedProjectId(id)}
              onNavigateToBoard={(id) => {
                setSelectedProjectId(id);
                setActiveTab('kanban');
              }}
            />
          )}

          {activeTab === 'followup' && hasPermission('FOLLOWUP', 'VIEW') && (
            <FollowUpView onSelectTask={(id) => setSelectedTaskId(id)} />
          )}

          {activeTab === 'employees' && hasPermission('EMPLOYEES', 'VIEW') && <EmployeesView />}

          {activeTab === 'reports' && hasPermission('REPORTS', 'VIEW') && (
            <ReportsDashboardView onSelectTask={(id) => setSelectedTaskId(id)} />
          )}

          {activeTab === 'superadmin' && (
            <SuperAdminView />
          )}
        </main>
      </div>

      {/* User Self-Service Profile & Password Modal */}
      {isProfileModalOpen && (
        <UserProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

      {/* Global Frictionless Create Task Modal */}
      {isCreateTaskOpen && (
        <CreateTaskModal
          isOpen={isCreateTaskOpen}
          onClose={() => setIsCreateTaskOpen(false)}
          onTaskCreated={() => {
            fetchGlobalMetadata();
          }}
          projects={projects}
          defaultProjectId={selectedProjectId || undefined}
        />
      )}

      {/* Global Task Details & Workflow Modal */}
      {selectedTaskId && (
        <TaskDetailModal
          isOpen={!!selectedTaskId}
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onTaskUpdated={() => {
            fetchGlobalMetadata();
          }}
        />
      )}
    </div>
  );
};

export function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
