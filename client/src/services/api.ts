import {
  OfficeMaster,
  SectionMaster,
  DesignationMaster,
  RoleMaster,
  User,
  AssigneeOption,
  Project,
  Task,
  FollowUpReport,
  DashboardSummary,
  EmployeeWorkload,
  ProjectHealth,
  TaskActivity,
  ReportAnalyticsData,
  ReportFilterParams,
} from '../types';

const getBaseApiUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5050' || window.location.pathname.startsWith('/api')) {
      return `${window.location.origin}/api`;
    }
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5050/api';
};

const getBaseUploadsUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.port === '5050') {
      return window.location.origin;
    }
  }
  return import.meta.env.VITE_UPLOADS_URL || 'http://localhost:5050';
};

const API_BASE_URL = getBaseApiUrl();
export const UPLOADS_BASE_URL = getBaseUploadsUrl();

function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('pragatidesk_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMsg = `Request failed with status ${response.status}`;
    try {
      const data = await response.json();
      errorMsg = data.error || data.message || errorMsg;
    } catch {
      // Ignore parse error
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Auth & Personas
  login: (email: string, password: string) =>
    fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    }).then(handleResponse<{ token: string; user: User }>),

  googleLogin: (googleEmail: string) =>
    fetch(`${API_BASE_URL}/auth/google-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ googleEmail }),
    }).then(handleResponse<{ token: string; user: User }>),

  sendOtp: (email: string) =>
    fetch(`${API_BASE_URL}/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    }).then(handleResponse<{ success: boolean; message: string; simulatedOtp?: string }>),

  verifyOtpAndResetPassword: (email: string, otp: string, newPassword: string) =>
    fetch(`${API_BASE_URL}/auth/verify-otp-and-reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, newPassword }),
    }).then(handleResponse<{ success: boolean; message: string; token: string; user: User }>),

  forceChangePassword: (newPassword: string) =>
    fetch(`${API_BASE_URL}/auth/force-change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ newPassword }),
    }).then(handleResponse<{ success: boolean; message: string; user: User }>),

  changePassword: (data: { currentPassword?: string; newPassword: string }) =>
    fetch(`${API_BASE_URL}/auth/change-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<{ success: boolean; message: string; user: User }>),

  getMe: () =>
    fetch(`${API_BASE_URL}/auth/me`, {
      headers: getAuthHeaders(),
    }).then(handleResponse<{ user: User }>),

  getPersonas: () =>
    fetch(`${API_BASE_URL}/auth/personas`).then(handleResponse<User[]>),

  switchPersona: (userId: string) =>
    fetch(`${API_BASE_URL}/auth/switch-persona`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    }).then(handleResponse<{ token: string; user: User }>),

  // Global Masters - Offices
  getOffices: () =>
    fetch(`${API_BASE_URL}/masters/offices`, { headers: getAuthHeaders() }).then(
      handleResponse<OfficeMaster[]>
    ),

  createOffice: (data: { name: string; code: string; district?: string; address?: string }) =>
    fetch(`${API_BASE_URL}/masters/offices`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<OfficeMaster>),

  updateOffice: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/masters/offices/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<OfficeMaster>),

  deleteOffice: (id: string) =>
    fetch(`${API_BASE_URL}/masters/offices/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  // Global Masters - Sections
  getSections: (officeId?: string) => {
    const url = officeId
      ? `${API_BASE_URL}/masters/sections?officeId=${officeId}`
      : `${API_BASE_URL}/masters/sections`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse<SectionMaster[]>);
  },

  createSection: (data: { name: string; code: string; officeId: string }) =>
    fetch(`${API_BASE_URL}/masters/sections`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<SectionMaster>),

  updateSection: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/masters/sections/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<SectionMaster>),

  deleteSection: (id: string) =>
    fetch(`${API_BASE_URL}/masters/sections/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  // Global Masters - Designations
  getDesignations: () =>
    fetch(`${API_BASE_URL}/masters/designations`, { headers: getAuthHeaders() }).then(
      handleResponse<DesignationMaster[]>
    ),

  createDesignation: (data: { title: string; cadre?: string }) =>
    fetch(`${API_BASE_URL}/masters/designations`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<DesignationMaster>),

  updateDesignation: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/masters/designations/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<DesignationMaster>),

  deleteDesignation: (id: string) =>
    fetch(`${API_BASE_URL}/masters/designations/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  // Global Masters - Roles & Permissions
  getRoles: () =>
    fetch(`${API_BASE_URL}/masters/roles`, { headers: getAuthHeaders() }).then(
      handleResponse<RoleMaster[]>
    ),

  createRole: (data: { name: string; code: string; description?: string; permissions: any[] }) =>
    fetch(`${API_BASE_URL}/masters/roles`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<RoleMaster>),

  updateRole: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/masters/roles/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<RoleMaster>),

  deleteRole: (id: string) =>
    fetch(`${API_BASE_URL}/masters/roles/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  // Users Management
  getUsers: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/users?${query}`, { headers: getAuthHeaders() }).then(
      handleResponse<User[]>
    );
  },

  createUser: (data: any) =>
    fetch(`${API_BASE_URL}/users`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  deleteUser: (id: string) =>
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  initiateEmployeeTransfer: (id: string, data: { targetSectionId: string; remark?: string }) =>
    fetch(`${API_BASE_URL}/users/${id}/transfer/initiate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  acceptEmployeeTransfer: (id: string) =>
    fetch(`${API_BASE_URL}/users/${id}/transfer/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).then(handleResponse<any>),

  rejectEmployeeTransfer: (id: string, remark?: string) =>
    fetch(`${API_BASE_URL}/users/${id}/transfer/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rejectionRemark: remark }),
    }).then(handleResponse<any>),

  transferEmployeeSection: (id: string, targetSectionId: string, remark?: string) =>
    fetch(`${API_BASE_URL}/users/${id}/transfer/initiate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ targetSectionId, remark }),
    }).then(handleResponse<any>),

  getAssignees: (projectId?: string, officeId?: string) => {
    const params = new URLSearchParams();
    if (projectId) params.set('projectId', projectId);
    if (officeId) params.set('officeId', officeId);
    return fetch(`${API_BASE_URL}/users/assignees?${params.toString()}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse<AssigneeOption[]>);
  },

  getEmployees: () =>
    fetch(`${API_BASE_URL}/users/employees`, { headers: getAuthHeaders() }).then(
      handleResponse<User[]>
    ),

  createEmployee: (data: any) =>
    fetch(`${API_BASE_URL}/users/employees`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  updateUser: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/users/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<User>),

  resetUserPassword: (id: string, data?: { customPassword?: string }) =>
    fetch(`${API_BASE_URL}/users/${id}/reset-password`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data || {}),
    }).then(handleResponse<any>),

  getGroupHeads: (officeId?: string) => {
    const url = officeId
      ? `${API_BASE_URL}/users/group-heads?officeId=${officeId}`
      : `${API_BASE_URL}/users/group-heads`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse<any[]>);
  },

  // Projects
  getProjects: () =>
    fetch(`${API_BASE_URL}/projects`, { headers: getAuthHeaders() }).then(
      handleResponse<Project[]>
    ),

  getProject: (id: string) =>
    fetch(`${API_BASE_URL}/projects/${id}`, { headers: getAuthHeaders() }).then(
      handleResponse<Project>
    ),

  createProject: (data: { name: string; projectCode: string; description?: string; officeId?: string }) =>
    fetch(`${API_BASE_URL}/projects`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<Project>),

  updateProject: (id: string, data: { name?: string; projectCode?: string; description?: string; status?: string }) =>
    fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<Project>),

  deleteProject: (id: string) =>
    fetch(`${API_BASE_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string }>),

  initiateProjectTransfer: (id: string, data: { targetGroupHeadId: string; remark: string }) =>
    fetch(`${API_BASE_URL}/projects/${id}/transfer/initiate`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  acceptProjectTransfer: (id: string) =>
    fetch(`${API_BASE_URL}/projects/${id}/transfer/accept`, {
      method: 'POST',
      headers: getAuthHeaders(),
    }).then(handleResponse<any>),

  rejectProjectTransfer: (id: string, rejectionRemark?: string) =>
    fetch(`${API_BASE_URL}/projects/${id}/transfer/reject`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ rejectionRemark }),
    }).then(handleResponse<any>),

  assignProjectMemberRoles: (projectId: string, userId: string, roles: string[]) =>
    fetch(`${API_BASE_URL}/projects/${projectId}/members`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ userId, roles }),
    }).then(handleResponse<any>),

  removeProjectMember: (projectId: string, userId: string) =>
    fetch(`${API_BASE_URL}/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<any>),

  // Tasks
  getTasks: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/tasks?${query}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse<Task[]>);
  },

  getTask: (id: string) =>
    fetch(`${API_BASE_URL}/tasks/${id}`, { headers: getAuthHeaders() }).then(
      handleResponse<Task>
    ),

  createTask: (data: any) =>
    fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<Task>),

  updateTask: (id: string, data: any) =>
    fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<Task>),

  deleteTask: (id: string) =>
    fetch(`${API_BASE_URL}/tasks/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }).then(handleResponse<{ success: boolean; message: string; id: string }>),

  transferTask: (id: string, data: { targetUserId: string; remark: string; attachments?: any[] }) =>
    fetch(`${API_BASE_URL}/tasks/${id}/transfer`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  revertTask: (id: string, data: { targetUserId?: string; remark: string; attachments?: any[] }) =>
    fetch(`${API_BASE_URL}/tasks/${id}/revert`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  disposeTask: (
    id: string,
    data: {
      remark: string;
      attachments?: any[];
      nextFollowUpDate?: string;
      initialFollowUpStatus?: string;
    }
  ) =>
    fetch(`${API_BASE_URL}/tasks/${id}/dispose`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  updateTaskPriority: (
    id: string,
    data: {
      priority?: string;
      allocatedDurationValue?: number;
      allocatedDurationUnit?: string;
      estimatedCompletionAt?: string;
      remark?: string;
    }
  ) =>
    fetch(`${API_BASE_URL}/tasks/${id}/priority`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<any>),

  // Follow-ups
  getFollowUps: (params: Record<string, string> = {}) => {
    const query = new URLSearchParams(params).toString();
    return fetch(`${API_BASE_URL}/followups?${query}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse<FollowUpReport[]>);
  },

  createFollowUp: (data: {
    taskId: string;
    status: string;
    remarks: string;
    nextFollowUpDate?: string;
  }) =>
    fetch(`${API_BASE_URL}/followups`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }).then(handleResponse<FollowUpReport>),

  // Dashboard & Metrics
  getDashboardStats: (projectId?: string) => {
    const url = projectId
      ? `${API_BASE_URL}/dashboard/stats?projectId=${projectId}`
      : `${API_BASE_URL}/dashboard/stats`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse<{ summary: DashboardSummary; byCategory: any[]; byPriority: any[] }>);
  },

  getEmployeeWorkload: (projectId?: string) => {
    const url = projectId
      ? `${API_BASE_URL}/dashboard/employee-workload?projectId=${projectId}`
      : `${API_BASE_URL}/dashboard/employee-workload`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse<EmployeeWorkload[]>);
  },

  getProjectsHealth: () =>
    fetch(`${API_BASE_URL}/dashboard/projects-health`, { headers: getAuthHeaders() }).then(
      handleResponse<ProjectHealth[]>
    ),

  getActivityStream: (limit = 20, projectId?: string) => {
    const url = projectId
      ? `${API_BASE_URL}/dashboard/activity-stream?limit=${limit}&projectId=${projectId}`
      : `${API_BASE_URL}/dashboard/activity-stream?limit=${limit}`;
    return fetch(url, { headers: getAuthHeaders() }).then(handleResponse<TaskActivity[]>);
  },

  // File Upload
  uploadFiles: async (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const token = localStorage.getItem('pragatidesk_token');
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    return handleResponse<{ files: any[] }>(response);
  },

  // Reports & Analytics
  getReportAnalytics: (filters: ReportFilterParams = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        params.set(key, String(val));
      }
    });
    return fetch(`${API_BASE_URL}/reports/analytics?${params.toString()}`, {
      headers: getAuthHeaders(),
    }).then(handleResponse<ReportAnalyticsData>);
  },
};
