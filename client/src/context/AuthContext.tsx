import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, ModulePermission } from '../types';
import { api } from '../services/api';
import { signInWithGooglePopup } from '../services/firebase';

export interface ActiveRoleOption {
  code: string;
  name: string;
  category: 'SYSTEM' | 'OPERATIONAL' | 'TECHNICAL';
  icon: string;
  description: string;
}

export const ALL_FUNCTIONAL_ROLES: ActiveRoleOption[] = [
  {
    code: 'SUPER_ADMIN',
    name: 'Super Admin (Statewide)',
    category: 'SYSTEM',
    icon: '👑',
    description: 'Statewide governance, global masters, office administration, and security oversight',
  },
  {
    code: 'OFFICE_SUPER_ADMIN',
    name: 'Office Super Admin',
    category: 'SYSTEM',
    icon: '🏛️',
    description: 'District office staff management, section administration, and office workload tracking',
  },
  {
    code: 'GROUP_HEAD',
    name: 'Section/Group Head',
    category: 'SYSTEM',
    icon: '🏢',
    description: 'Section backlog oversight, project leadership, task delegation, and transfer reviews',
  },
  {
    code: 'ADMIN',
    name: 'Project Admin',
    category: 'SYSTEM',
    icon: '⚡',
    description: 'Project configuration, member role mapping, and work stream administration',
  },
  {
    code: 'TO_DO_LISTING_OPERATOR',
    name: 'To-Do Listing Operator (Dak Registrar)',
    category: 'OPERATIONAL',
    icon: '📝',
    description: 'Official letter registration, grievance intake, RajKaj dak file indexing',
  },
  {
    code: 'RESOLVING_EMPLOYEE',
    name: 'Resolving Employee (Task Execution)',
    category: 'OPERATIONAL',
    icon: '🛠️',
    description: 'Task turnaround, draft resolution replies, handover notes, and issue disposal',
  },
  {
    code: 'REVIEW_OFFICER',
    name: 'Review Officer (Audit & Scrutiny)',
    category: 'OPERATIONAL',
    icon: '🔍',
    description: 'Scrutinize drafted replies, compliance audit, verify transfer justifications',
  },
  {
    code: 'DEVELOPER',
    name: 'Developer / Technical Lead',
    category: 'TECHNICAL',
    icon: '💻',
    description: 'Technical issue resolution, API integrations, software bug fixing, and infra maintenance',
  },
  {
    code: 'QA',
    name: 'QA / Verification Officer',
    category: 'TECHNICAL',
    icon: '🧪',
    description: 'Quality verification, test checks, bug sign-offs, and pre-release audits',
  },
  {
    code: 'REPORTS',
    name: 'Reports & Analytics Viewer',
    category: 'OPERATIONAL',
    icon: '📊',
    description: 'Reports and analytics view, interactive distribution charts, and CSV/PDF export',
  },
  {
    code: 'EMPLOYEE',
    name: 'Standard Employee',
    category: 'OPERATIONAL',
    icon: '👥',
    description: 'Standard departmental execution and project collaboration',
  },
];

interface AuthContextType {
  user: User | null;
  token: string | null;
  personas: User[];
  isLoading: boolean;
  activeRole: string;
  effectiveRole: string;
  availableRoles: ActiveRoleOption[];
  switchActiveRole: (roleCode: string) => void;
  login: (email: string, pass: string) => Promise<void>;
  googleLogin: (googleEmail: string) => Promise<void>;
  googleSignInWithFirebase: () => Promise<void>;
  sendOtp: (email: string) => Promise<{ success: boolean; message: string; simulatedOtp?: string }>;
  verifyOtpAndResetPassword: (email: string, otp: string, newPass: string) => Promise<void>;
  forceChangePassword: (newPass: string) => Promise<void>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  updateProfile: (data: any) => Promise<User>;
  logout: () => void;
  switchPersona: (userId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  hasPermission: (moduleName: string, action?: 'VIEW' | 'EDIT') => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('pragatidesk_token'));
  const [personas, setPersonas] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRoleOverride, setActiveRoleOverride] = useState<string | null>(
    localStorage.getItem('pragatidesk_active_role')
  );

  const fetchPersonas = async () => {
    try {
      const data = await api.getPersonas();
      setPersonas(data);
    } catch (err) {
      console.error('Failed to load personas:', err);
    }
  };

  const refreshUser = async () => {
    const savedToken = localStorage.getItem('pragatidesk_token');
    if (!savedToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const { user: profile } = await api.getMe();
      setUser(profile);
    } catch (err) {
      console.warn('Session expired or invalid token');
      localStorage.removeItem('pragatidesk_token');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonas();
    refreshUser();

    const onFocus = () => refreshUser();
    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);

  const login = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const { token: authToken, user: loggedUser } = await api.login(email, pass);
      localStorage.setItem('pragatidesk_token', authToken);
      setToken(authToken);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const googleLogin = async (googleEmail: string) => {
    setIsLoading(true);
    try {
      const { token: authToken, user: loggedUser } = await api.googleLogin(googleEmail);
      localStorage.setItem('pragatidesk_token', authToken);
      setToken(authToken);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const googleSignInWithFirebase = async () => {
    setIsLoading(true);
    try {
      const cred = await signInWithGooglePopup();
      const googleEmail = cred.user.email;
      if (!googleEmail) {
        throw new Error('No email found in Google account.');
      }
      const { token: authToken, user: loggedUser } = await api.googleLogin(googleEmail);
      localStorage.setItem('pragatidesk_token', authToken);
      setToken(authToken);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const sendOtp = async (email: string) => {
    return api.sendOtp(email);
  };

  const verifyOtpAndResetPassword = async (email: string, otp: string, newPass: string) => {
    setIsLoading(true);
    try {
      const { token: authToken, user: loggedUser } = await api.verifyOtpAndResetPassword(email, otp, newPass);
      localStorage.setItem('pragatidesk_token', authToken);
      setToken(authToken);
      setUser(loggedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const forceChangePassword = async (newPass: string) => {
    setIsLoading(true);
    try {
      const { user: updatedUser } = await api.forceChangePassword(newPass);
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const changePassword = async (currentPass: string, newPass: string) => {
    setIsLoading(true);
    try {
      const { user: updatedUser } = await api.changePassword({
        currentPassword: currentPass,
        newPassword: newPass,
      });
      setUser(updatedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (data: any): Promise<User> => {
    if (!user) throw new Error('Not authenticated');
    setIsLoading(true);
    try {
      const updatedUser = await api.updateUser(user.id, data);
      setUser(updatedUser);
      return updatedUser;
    } finally {
      setIsLoading(false);
    }
  };

  const switchPersona = async (userId: string) => {
    setIsLoading(true);
    try {
      const { token: newToken, user: switchedUser } = await api.switchPersona(userId);
      localStorage.setItem('pragatidesk_token', newToken);
      setToken(newToken);
      setUser(switchedUser);
    } finally {
      setIsLoading(false);
    }
  };

  const effectiveRole = activeRoleOverride || user?.systemRole || 'EMPLOYEE';

  const availableRoles: ActiveRoleOption[] = React.useMemo(() => {
    if (!user) return [];
    if (user.systemRole === 'SUPER_ADMIN') {
      return ALL_FUNCTIONAL_ROLES;
    }
    const myRoleCodes = new Set<string>();
    if (user.systemRole) myRoleCodes.add(user.systemRole);
    if (user.customRole?.code) myRoleCodes.add(user.customRole.code);
    if (user.assignedProjectRoles && Array.isArray(user.assignedProjectRoles)) {
      user.assignedProjectRoles.forEach((r) => myRoleCodes.add(r));
    }
    // Return strictly the roles this user actually possesses
    const matched = ALL_FUNCTIONAL_ROLES.filter((r) => myRoleCodes.has(r.code));
    if (matched.length === 0 && user.systemRole) {
      const def = ALL_FUNCTIONAL_ROLES.find((r) => r.code === user.systemRole);
      if (def) matched.push(def);
    }
    return matched;
  }, [user]);

  const switchActiveRole = (roleCode: string) => {
    if (!roleCode || roleCode === user?.systemRole) {
      setActiveRoleOverride(null);
      localStorage.removeItem('pragatidesk_active_role');
    } else {
      setActiveRoleOverride(roleCode);
      localStorage.setItem('pragatidesk_active_role', roleCode);
    }
  };

  const logout = () => {
    localStorage.removeItem('pragatidesk_token');
    localStorage.removeItem('pragatidesk_active_role');
    setToken(null);
    setUser(null);
    setActiveRoleOverride(null);
  };

  const hasPermission = (moduleName: string, action: 'VIEW' | 'EDIT' = 'VIEW'): boolean => {
    if (!user) return false;
    const roleToEval = effectiveRole || user.systemRole;
    if (roleToEval === 'SUPER_ADMIN') return true;

    if (roleToEval === 'OFFICE_SUPER_ADMIN') {
      const viewModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP', 'EMPLOYEES', 'REPORTS', 'ADMIN_PORTAL', 'MASTERS'];
      const editModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP', 'EMPLOYEES', 'REPORTS', 'ADMIN_PORTAL'];
      if (action === 'EDIT') return editModules.includes(moduleName);
      return viewModules.includes(moduleName);
    }

    if (roleToEval === 'GROUP_HEAD' || roleToEval === 'ADMIN') {
      const ghViewModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP', 'EMPLOYEES', 'REPORTS'];
      const ghEditModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP', 'EMPLOYEES', 'REPORTS'];
      if (action === 'EDIT') return ghEditModules.includes(moduleName);
      return ghViewModules.includes(moduleName);
    }

    if (roleToEval === 'REVIEW_OFFICER') {
      const roModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP', 'REPORTS'];
      if (action === 'EDIT') return ['DASHBOARD', 'KANBAN', 'TASKS', 'FOLLOWUP'].includes(moduleName);
      return roModules.includes(moduleName);
    }

    if (roleToEval === 'REPORTS') {
      const repModules = ['DASHBOARD', 'REPORTS'];
      if (action === 'EDIT') return false;
      return repModules.includes(moduleName);
    }

    if (roleToEval === 'TO_DO_LISTING_OPERATOR' || roleToEval === 'RESOLVING_EMPLOYEE' || roleToEval === 'DEVELOPER' || roleToEval === 'QA' || roleToEval === 'EMPLOYEE') {
      const empViewModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'PROJECTS', 'FOLLOWUP'];
      const empEditModules = ['DASHBOARD', 'KANBAN', 'TASKS', 'FOLLOWUP'];
      if (action === 'EDIT') return empEditModules.includes(moduleName);
      return empViewModules.includes(moduleName);
    }

    const perm = user.permissions?.find((p: ModulePermission) => p.module === moduleName);
    if (!perm) return false;

    return action === 'EDIT' ? perm.canEdit : perm.canView;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        personas,
        isLoading,
        activeRole: effectiveRole,
        effectiveRole,
        availableRoles,
        switchActiveRole,
        login,
        googleLogin,
        googleSignInWithFirebase,
        sendOtp,
        verifyOtpAndResetPassword,
        forceChangePassword,
        changePassword,
        updateProfile,
        logout,
        switchPersona,
        refreshUser,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
