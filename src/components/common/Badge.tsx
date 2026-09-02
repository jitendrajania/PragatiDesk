import React from 'react';
import { Priority, TaskStatus, TaskCategory, ProjectRole, SystemRole } from '../../types';

interface BadgeProps {
  children?: React.ReactNode;
  className?: string;
  variant?: 'default' | 'outline' | 'dot';
}

export const StatusBadge: React.FC<{ status: TaskStatus | string; className?: string }> = ({
  status,
  className = '',
}) => {
  const normalized = status?.toUpperCase();

  const configs: Record<string, { label: string; bg: string; text: string; border: string; dot: string }> = {
    OPEN: {
      label: 'Open',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      dot: 'bg-slate-500',
    },
    IN_PROGRESS: {
      label: 'In Progress',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      dot: 'bg-blue-600',
    },
    TRANSFERRED: {
      label: 'Transferred',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      dot: 'bg-amber-500',
    },
    REVERTED: {
      label: 'Reverted',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      dot: 'bg-rose-600',
    },
    DISPOSED: {
      label: 'Disposed',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      dot: 'bg-emerald-600',
    },
    CLOSED: {
      label: 'Closed',
      bg: 'bg-purple-50',
      text: 'text-purple-700',
      border: 'border-purple-200',
      dot: 'bg-purple-600',
    },
  };

  const config = configs[normalized] || {
    label: status,
    bg: 'bg-gray-100',
    text: 'text-gray-700',
    border: 'border-gray-300',
    dot: 'bg-gray-500',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority | string; className?: string }> = ({
  priority,
  className = '',
}) => {
  const normalized = priority?.toUpperCase();

  const configs: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    CRITICAL: {
      label: 'Critical',
      bg: 'bg-red-100 text-red-800 border-red-300',
      text: 'text-red-700',
      icon: '🔥',
    },
    HIGH: {
      label: 'High',
      bg: 'bg-orange-100 text-orange-800 border-orange-300',
      text: 'text-orange-700',
      icon: '🔺',
    },
    MEDIUM: {
      label: 'Medium',
      bg: 'bg-yellow-50 text-yellow-800 border-yellow-300',
      text: 'text-yellow-700',
      icon: '🔹',
    },
    LOW: {
      label: 'Low',
      bg: 'bg-gray-100 text-gray-700 border-gray-300',
      text: 'text-gray-600',
      icon: '▫️',
    },
  };

  const config = configs[normalized] || {
    label: priority,
    bg: 'bg-gray-100 text-gray-700 border-gray-300',
    text: 'text-gray-600',
    icon: '•',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${className}`}
    >
      <span className="text-[10px]">{config.icon}</span>
      {config.label}
    </span>
  );
};

export const CategoryBadge: React.FC<{ category: TaskCategory | string; className?: string }> = ({
  category,
  className = '',
}) => {
  const normalized = category?.toUpperCase();

  const configs: Record<string, { label: string; bg: string; text: string; icon: string }> = {
    OFFICIAL_LETTER: {
      label: 'Office Letters',
      bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      text: 'text-indigo-700',
      icon: '✉️',
    },
    TECHNICAL_ISSUE: {
      label: 'Technical Issue',
      bg: 'bg-rose-50 text-rose-700 border-rose-200',
      text: 'text-rose-700',
      icon: '⚙️',
    },
    SERVICE_REQUEST: {
      label: 'Service Request',
      bg: 'bg-cyan-50 text-cyan-700 border-cyan-200',
      text: 'text-cyan-700',
      icon: '📋',
    },
    GENERAL_TASK: {
      label: 'General Task',
      bg: 'bg-slate-100 text-slate-700 border-slate-200',
      text: 'text-slate-700',
      icon: '📌',
    },
    BUG: {
      label: 'Bug Fix',
      bg: 'bg-red-50 text-red-700 border-red-200',
      text: 'text-red-700',
      icon: '🐞',
    },
    FEATURE: {
      label: 'Feature / Enhancement',
      bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'text-emerald-700',
      icon: '✨',
    },
  };

  const config = configs[normalized] || {
    label: category?.replace(/_/g, ' '),
    bg: 'bg-gray-100 text-gray-700 border-gray-200',
    text: 'text-gray-700',
    icon: '📄',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium border ${config.bg} ${className}`}
    >
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
};

export const RoleBadge: React.FC<{ role: ProjectRole | string; className?: string }> = ({
  role,
  className = '',
}) => {
  const roleNames: Record<string, string> = {
    TO_DO_LISTING_OPERATOR: 'To-Do Listing Operator',
    RESOLVING_EMPLOYEE: 'Resolving Employee',
    REVIEW_OFFICER: 'Review Officer',
    ADMIN: 'Project Admin',
    DEVELOPER: 'Developer',
    QA: 'QA / Verification',
    REPORTS: 'Reports & Analytics',
    reports: 'reports',
    REVIEW_AUDITOR: 'Compliance & Review Auditor',
  };

  const roleColors: Record<string, string> = {
    TO_DO_LISTING_OPERATOR: 'bg-teal-50 text-teal-700 border-teal-200',
    RESOLVING_EMPLOYEE: 'bg-blue-50 text-blue-700 border-blue-200',
    REVIEW_OFFICER: 'bg-purple-50 text-purple-700 border-purple-200',
    ADMIN: 'bg-amber-50 text-amber-800 border-amber-200',
    DEVELOPER: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    QA: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    REPORTS: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    reports: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    REVIEW_AUDITOR: 'bg-cyan-50 text-cyan-800 border-cyan-200',
  };

  const formattedName = roleNames[role] || role.replace(/_/g, ' ');

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
        roleColors[role] || 'bg-slate-100 text-slate-700 border-slate-200'
      } ${className}`}
    >
      {formattedName}
    </span>
  );
};

export const SystemRoleBadge: React.FC<{ role: SystemRole | string; className?: string }> = ({
  role,
  className = '',
}) => {
  if (role === 'SUPER_ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 ${className}`}
      >
        👑 Super Admin
      </span>
    );
  }
  if (role === 'OFFICE_SUPER_ADMIN') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 ${className}`}
      >
        🏛️ Office Super Admin
      </span>
    );
  }
  if (role === 'GROUP_HEAD') {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 ${className}`}
      >
        🏢 Section/Group Head
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 ${className}`}
    >
      👤 {role === 'EMPLOYEE' ? 'Employee' : role?.replace(/_/g, ' ')}
    </span>
  );
};
