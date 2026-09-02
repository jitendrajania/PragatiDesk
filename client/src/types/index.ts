export type SystemRole = 'SUPER_ADMIN' | 'OFFICE_SUPER_ADMIN' | 'GROUP_HEAD' | 'EMPLOYEE' | string;

export type ProjectRole =
  | 'TO_DO_LISTING_OPERATOR'
  | 'RESOLVING_EMPLOYEE'
  | 'REVIEW_OFFICER'
  | 'ADMIN'
  | 'DEVELOPER'
  | 'QA'
  | string;

export type TaskCategory =
  | 'OFFICIAL_LETTER'
  | 'TECHNICAL_ISSUE'
  | 'SERVICE_REQUEST'
  | 'GENERAL_TASK'
  | 'BUG'
  | 'FEATURE';

export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type TaskStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'TRANSFERRED'
  | 'REVERTED'
  | 'DISPOSED'
  | 'CLOSED';

export type ActionType =
  | 'CREATED'
  | 'TRANSFERRED'
  | 'REVERTED'
  | 'DISPOSED'
  | 'REOPENED'
  | 'UPDATED'
  | 'COMMENTED'
  | 'PRIORITY_CHANGED';

export interface ModulePermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

export interface OfficeMaster {
  id: string;
  name: string;
  code: string;
  district?: string | null;
  address?: string | null;
  isActive: boolean;
  sections?: SectionMaster[];
  _count?: {
    users: number;
    projects: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SectionMaster {
  id: string;
  name: string;
  code: string;
  officeId: string;
  office?: {
    id: string;
    name: string;
    code: string;
  };
  isActive: boolean;
  _count?: {
    users: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface DesignationMaster {
  id: string;
  title: string;
  cadre?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleMaster {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isSystem: boolean;
  isActive: boolean;
  permissions: ModulePermission[];
  _count?: {
    users: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  designation: string;
  ssoId: string;
  phone?: string | null;
  gmailId?: string | null;
  officeId?: string | null;
  officeName?: string | null;
  sectionId?: string | null;
  sectionName?: string | null;
  systemRole: SystemRole;
  roleId?: string | null;
  customRole?: RoleMaster | null;
  isActive?: boolean;
  mustChangePassword?: boolean;
  permissions?: ModulePermission[];
  assignedProjectRoles?: string[];

  // Transfer Handshake
  transferStatus?: string; // NONE, PENDING_TRANSFER, TRANSFERRED
  transferToSectionId?: string | null;
  transferToSection?: {
    id: string;
    name: string;
    code: string;
    officeId?: string;
    office?: {
      id: string;
      name: string;
    };
  } | null;
  transferToGroupHeadId?: string | null;
  transferToGroupHead?: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
  } | null;
  transferRemark?: string | null;
  transferInitiatedAt?: string | null;
  transferInitiatedById?: string | null;
  transferInitiatedBy?: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
  } | null;
}

export interface AssigneeOption {
  id: string;
  name: string;
  designation: string;
  displayName: string;
  email: string;
  ssoId: string;
  phone?: string | null;
  officeName?: string | null;
  sectionName?: string | null;
  systemRole: SystemRole;
  roles?: ProjectRole[];
}

export interface ProjectMember {
  id: string;
  userId: string;
  name: string;
  designation: string;
  email: string;
  ssoId: string;
  phone?: string | null;
  officeName?: string | null;
  sectionName?: string | null;
  roles: ProjectRole[];
  joinedAt: string;
}

export interface Project {
  id: string;
  projectCode: string;
  name: string;
  description?: string | null;
  officeId?: string | null;
  officeName?: string | null;
  groupHeadId: string;
  groupHead?: {
    id: string;
    name: string;
    designation: string;
    email: string;
    ssoId?: string;
  };
  transferStatus: 'NONE' | 'PENDING_TRANSFER' | string;
  transferToGroupHeadId?: string | null;
  transferToGroupHead?: {
    id: string;
    name: string;
    designation: string;
    email: string;
    ssoId?: string;
  } | null;
  transferRemark?: string | null;
  transferInitiatedAt?: string | null;
  status: string;
  members?: ProjectMember[];
  pendingTasksCount?: number;
  disposedTasksCount?: number;
  _count?: {
    tasks: number;
    members: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface TaskAttachment {
  id: string;
  taskId: string;
  activityId?: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
}

export interface TaskActivity {
  id: string;
  taskId: string;
  task?: {
    id: string;
    taskNumber: string;
    subject: string;
    referenceNumber?: string | null;
    rajKajNumber?: string | null;
    issueNumber?: string | null;
    referenceDate?: string | null;
    status: TaskStatus;
    project?: {
      id: string;
      projectCode: string;
      name: string;
    };
  };
  actionType: ActionType;
  actorId: string;
  actor: {
    id: string;
    name: string;
    designation: string;
    email?: string;
    ssoId?: string;
  };
  targetUserId?: string;
  remark: string;
  attachments?: TaskAttachment[];
  createdAt: string;
}

export interface FollowUpReport {
  id: string;
  taskId: string;
  task?: {
    id: string;
    taskNumber: string;
    subject: string;
    referenceNumber?: string;
    rajKajNumber?: string;
    issueNumber?: string;
    referenceDate?: string;
    status: TaskStatus;
    disposedAt?: string;
    project?: {
      id: string;
      name: string;
      projectCode: string;
    };
  };
  reportedById: string;
  reportedBy?: {
    id: string;
    name: string;
    designation: string;
    email?: string;
    ssoId?: string;
  };
  status: string;
  remarks: string;
  nextFollowUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: string;
  taskNumber: string;
  referenceNumber?: string | null;
  rajKajNumber?: string | null;
  issueNumber?: string | null;
  referenceDate?: string | null;
  subject: string;
  description?: string | null;
  letterEmailContent?: string | null;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  projectId: string;
  project?: {
    id: string;
    projectCode: string;
    name: string;
    officeName?: string;
    groupHead?: {
      id: string;
      name: string;
      designation: string;
      ssoId?: string;
    };
    members?: {
      user: {
        id: string;
        name: string;
        designation: string;
        ssoId?: string;
      };
    }[];
  };
  createdById: string;
  createdBy?: {
    id: string;
    name: string;
    designation: string;
    email?: string;
    ssoId?: string;
  };
  currentAssigneeId?: string | null;
  currentAssignee?: {
    id: string;
    name: string;
    designation: string;
    email?: string;
    ssoId?: string;
  } | null;
  disposedById?: string | null;
  disposedBy?: {
    id: string;
    name: string;
    designation: string;
    email?: string;
    ssoId?: string;
  } | null;
  disposedAt?: string | null;
  allocatedDurationValue?: number | null;
  allocatedDurationUnit?: 'HOURS' | 'DAYS' | null;
  estimatedCompletionAt?: string | null;
  activities?: TaskActivity[];
  attachments?: TaskAttachment[];
  followUpReports?: FollowUpReport[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  total: number;
  pending: number;
  open: number;
  inProgress: number;
  transferred: number;
  reverted: number;
  disposed: number;
  overdue: number;
  critical: number;
  myPending: number;
}

export interface EmployeeWorkload {
  employee: User & { displayName: string };
  pendingCount: number;
  criticalCount: number;
  highCount: number;
  disposedCount: number;
  activeTasks: {
    id: string;
    taskNumber: string;
    subject: string;
    referenceNumber?: string | null;
    rajKajNumber?: string | null;
    issueNumber?: string | null;
    referenceDate?: string | null;
    priority: Priority;
    status: TaskStatus;
    category: TaskCategory;
    estimatedCompletionAt?: string;
    project?: {
      projectCode: string;
      name: string;
    };
  }[];
}

export interface ProjectHealth {
  id: string;
  projectCode: string;
  name: string;
  status: string;
  officeName?: string;
  groupHead: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
  };
  memberCount: number;
  totalTasks: number;
  pendingTasks: number;
  disposedTasks: number;
  overdueTasks: number;
  completionRate: number;
}

export interface ReportFilterParams {
  startDate?: string;
  endDate?: string;
  projectId?: string;
  status?: string;
  assigneeId?: string;
  pendingDaysBucket?: string;
  category?: string;
  priority?: string;
  officeId?: string;
  search?: string;
}

export interface ReportSummaryKPIs {
  totalTasks: number;
  activeTasks: number;
  openTasks: number;
  inProgressTasks: number;
  disposedTasks: number;
  criticalAgingTasks: number;
  avgResolutionDays: number;
  slaComplianceRate: number;
}

export interface ReportChartItem {
  name: string;
  key?: string;
  value: number;
  percentage?: number;
  color?: string;
}

export interface ReportAssigneeWorkload {
  name: string;
  ssoId: string;
  designation: string;
  active: number;
  disposed: number;
  total: number;
}

export interface ReportProjectDistribution {
  projectCode: string;
  name: string;
  active: number;
  disposed: number;
  total: number;
}

export interface ReportTaskRow {
  id: string;
  taskNumber: string;
  referenceNumber?: string | null;
  rajKajNumber?: string | null;
  issueNumber?: string | null;
  referenceDate?: string | null;
  subject: string;
  description?: string | null;
  category: TaskCategory;
  priority: Priority;
  status: TaskStatus;
  createdAt: string;
  disposedAt?: string | null;
  pendingDays: number;
  agingBucket: string;
  isOverdue: boolean;
  project?: {
    id: string;
    projectCode: string;
    name: string;
    officeName?: string | null;
    groupHead?: {
      id: string;
      name: string;
      designation: string;
      ssoId?: string;
    };
  };
  currentAssignee?: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
    email?: string;
    sectionName?: string | null;
    officeName?: string | null;
  };
  createdBy?: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
  };
  disposedBy?: {
    id: string;
    name: string;
    designation: string;
    ssoId?: string;
  };
}

export interface ReportAnalyticsData {
  summary: ReportSummaryKPIs;
  charts: {
    statusPie: ReportChartItem[];
    priorityPie: ReportChartItem[];
    categoryPie: ReportChartItem[];
    pendingDaysPie: ReportChartItem[];
    assigneeWorkload: ReportAssigneeWorkload[];
    projectDistribution: ReportProjectDistribution[];
  };
  tasks: ReportTaskRow[];
}

