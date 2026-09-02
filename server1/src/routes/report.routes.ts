import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

const STATUS_COLORS: Record<string, string> = {
  OPEN: '#64748b', // Slate
  IN_PROGRESS: '#2563eb', // Blue
  TRANSFERRED: '#d97706', // Amber
  REVERTED: '#e11d48', // Rose
  DISPOSED: '#059669', // Emerald
  CLOSED: '#10b981', // Green
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626', // Red
  HIGH: '#ea580c', // Orange
  MEDIUM: '#f59e0b', // Amber
  LOW: '#10b981', // Emerald
};

const CATEGORY_COLORS: Record<string, string> = {
  OFFICIAL_LETTER: '#4f46e5', // Indigo
  TECHNICAL_ISSUE: '#0284c7', // Sky
  SERVICE_REQUEST: '#0d9488', // Teal
  GENERAL_TASK: '#64748b', // Slate
  BUG: '#e11d48', // Rose
  FEATURE: '#7c3aed', // Purple
};

const AGING_COLORS: Record<string, string> = {
  '0-3 Days': '#10b981', // Green
  '4-7 Days': '#3b82f6', // Blue
  '8-15 Days': '#f59e0b', // Amber
  '16-30 Days': '#f97316', // Orange
  '30+ Days': '#ef4444', // Red
};

// GET /api/reports/analytics — Advanced multi-criteria reporting and analytics
router.get('/analytics', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      projectId,
      status,
      assigneeId,
      pendingDaysBucket,
      category,
      priority,
      officeId,
      search,
    } = req.query;

    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const andConditions: any[] = [];

    // 1. Role-based scoping
    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        andConditions.push({ project: { officeId: req.user?.officeId } });
      } else if (isGroupHead) {
        andConditions.push({ project: { groupHeadId: req.user?.id } });
      } else {
        andConditions.push({
          OR: [
            { currentAssigneeId: req.user?.id },
            { createdById: req.user?.id },
            { disposedById: req.user?.id },
          ],
        });
      }
    }

    // 2. Office Filter (Super Admin)
    if (officeId && isSuperAdmin) {
      andConditions.push({ project: { officeId: String(officeId) } });
    }

    // 3. Project Filter
    if (projectId) {
      andConditions.push({ projectId: String(projectId) });
    }

    // 4. Status Filter
    if (status && status !== 'ALL') {
      if (status === 'PENDING') {
        andConditions.push({ status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] } });
      } else if (status === 'DISPOSED_ALL') {
        andConditions.push({ status: { in: ['DISPOSED', 'CLOSED'] } });
      } else {
        andConditions.push({ status: String(status) });
      }
    }

    // 5. Assignee Filter
    if (assigneeId) {
      if (assigneeId === 'UNASSIGNED') {
        andConditions.push({ currentAssigneeId: null });
      } else {
        andConditions.push({ currentAssigneeId: String(assigneeId) });
      }
    }

    // 6. Category & Priority
    if (category) {
      andConditions.push({ category: String(category) });
    }
    if (priority) {
      andConditions.push({ priority: String(priority) });
    }

    // 7. Date Range Filter (CreatedAt or ReferenceDate)
    if (startDate) {
      const start = new Date(String(startDate));
      start.setHours(0, 0, 0, 0);
      andConditions.push({ createdAt: { gte: start } });
    }
    if (endDate) {
      const end = new Date(String(endDate));
      end.setHours(23, 59, 59, 999);
      andConditions.push({ createdAt: { lte: end } });
    }

    // 8. Search
    if (search) {
      const q = String(search).toLowerCase();
      andConditions.push({
        OR: [
          { taskNumber: { contains: q } },
          { subject: { contains: q } },
          { referenceNumber: { contains: q } },
          { rajKajNumber: { contains: q } },
          { issueNumber: { contains: q } },
          { description: { contains: q } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    // Fetch all matching tasks
    const allTasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            officeName: true,
            groupHead: {
              select: {
                id: true,
                name: true,
                designation: true,
                ssoId: true,
              },
            },
          },
        },
        currentAssignee: {
          select: {
            id: true,
            name: true,
            designation: true,
            ssoId: true,
            email: true,
            sectionName: true,
            officeName: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            designation: true,
            ssoId: true,
          },
        },
        disposedBy: {
          select: {
            id: true,
            name: true,
            designation: true,
            ssoId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    // Map tasks with calculated aging / pending days
    let processedTasks = allTasks.map((t) => {
      const isDisposed = t.status === 'DISPOSED' || t.status === 'CLOSED';
      let pendingDays = 0;

      if (isDisposed && t.disposedAt) {
        pendingDays = Math.max(0, Math.floor((t.disposedAt.getTime() - t.createdAt.getTime()) / (1000 * 3600 * 24)));
      } else {
        pendingDays = Math.max(0, Math.floor((now.getTime() - t.createdAt.getTime()) / (1000 * 3600 * 24)));
      }

      let agingBucket = '0-3 Days';
      if (pendingDays >= 30) agingBucket = '30+ Days';
      else if (pendingDays >= 16) agingBucket = '16-30 Days';
      else if (pendingDays >= 8) agingBucket = '8-15 Days';
      else if (pendingDays >= 4) agingBucket = '4-7 Days';

      return {
        ...t,
        pendingDays,
        agingBucket,
        isOverdue: !isDisposed && pendingDays >= 8,
      };
    });

    // Apply Pending Days Bucket Filter if specified
    if (pendingDaysBucket && pendingDaysBucket !== 'ALL') {
      processedTasks = processedTasks.filter((t) => t.agingBucket === pendingDaysBucket);
    }

    // -------------------------------------------------------------------------
    // CALCULATE KPI SUMMARY
    // -------------------------------------------------------------------------
    const totalTasks = processedTasks.length;
    const openTasks = processedTasks.filter((t) => t.status === 'OPEN').length;
    const inProgressTasks = processedTasks.filter((t) => ['IN_PROGRESS', 'TRANSFERRED', 'REVERTED'].includes(t.status)).length;
    const activeTasks = openTasks + inProgressTasks;
    const disposedTasks = processedTasks.filter((t) => ['DISPOSED', 'CLOSED'].includes(t.status)).length;
    const criticalAgingTasks = processedTasks.filter((t) => t.isOverdue).length;

    // Average resolution time for disposed tasks
    const resolvedTasksWithTime = processedTasks.filter((t) => ['DISPOSED', 'CLOSED'].includes(t.status) && t.disposedAt);
    const avgResolutionDays = resolvedTasksWithTime.length > 0
      ? Number((resolvedTasksWithTime.reduce((acc, curr) => acc + curr.pendingDays, 0) / resolvedTasksWithTime.length).toFixed(1))
      : 0;

    const slaComplianceRate = resolvedTasksWithTime.length > 0
      ? Math.round((resolvedTasksWithTime.filter((t) => t.pendingDays <= 7).length / resolvedTasksWithTime.length) * 100)
      : 100;

    // -------------------------------------------------------------------------
    // CALCULATE INTERACTIVE PIE CHART DISTRIBUTIONS
    // -------------------------------------------------------------------------

    // 1. Status Pie Distribution
    const statusCounts: Record<string, number> = {};
    processedTasks.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });

    const statusPie = Object.entries(statusCounts).map(([statusKey, count]) => ({
      name: statusKey.replace('_', ' '),
      key: statusKey,
      value: count,
      percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
      color: STATUS_COLORS[statusKey] || '#64748b',
    }));

    // 2. Priority Pie Distribution
    const priorityCounts: Record<string, number> = {};
    processedTasks.forEach((t) => {
      priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
    });

    const priorityPie = Object.entries(priorityCounts).map(([priKey, count]) => ({
      name: priKey,
      key: priKey,
      value: count,
      percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
      color: PRIORITY_COLORS[priKey] || '#64748b',
    }));

    // 3. Category Pie Distribution
    const categoryCounts: Record<string, number> = {};
    processedTasks.forEach((t) => {
      categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1;
    });

    const categoryPie = Object.entries(categoryCounts).map(([catKey, count]) => ({
      name: catKey.replace('_', ' '),
      key: catKey,
      value: count,
      percentage: totalTasks > 0 ? Math.round((count / totalTasks) * 100) : 0,
      color: CATEGORY_COLORS[catKey] || '#4f46e5',
    }));

    // 4. Pending Days Aging Distribution (Pie / Bar)
    const agingBucketsOrder = ['0-3 Days', '4-7 Days', '8-15 Days', '16-30 Days', '30+ Days'];
    const agingCounts: Record<string, number> = {
      '0-3 Days': 0,
      '4-7 Days': 0,
      '8-15 Days': 0,
      '16-30 Days': 0,
      '30+ Days': 0,
    };

    processedTasks.forEach((t) => {
      if (agingCounts[t.agingBucket] !== undefined) {
        agingCounts[t.agingBucket]++;
      }
    });

    const pendingDaysPie = agingBucketsOrder.map((bucket) => ({
      name: bucket,
      key: bucket,
      value: agingCounts[bucket] || 0,
      percentage: totalTasks > 0 ? Math.round(((agingCounts[bucket] || 0) / totalTasks) * 100) : 0,
      color: AGING_COLORS[bucket] || '#3b82f6',
    }));

    // 5. Staff / Assignee Workload Breakdown (Top 10)
    const assigneeMap: Record<string, { name: string; ssoId: string; designation: string; active: number; disposed: number; total: number }> = {};
    processedTasks.forEach((t) => {
      const assigneeName = t.currentAssignee?.name || 'Unassigned';
      const ssoId = t.currentAssignee?.ssoId || 'N/A';
      const designation = t.currentAssignee?.designation || '';
      const key = t.currentAssigneeId || 'UNASSIGNED';

      if (!assigneeMap[key]) {
        assigneeMap[key] = { name: assigneeName, ssoId, designation, active: 0, disposed: 0, total: 0 };
      }

      assigneeMap[key].total++;
      if (['DISPOSED', 'CLOSED'].includes(t.status)) {
        assigneeMap[key].disposed++;
      } else {
        assigneeMap[key].active++;
      }
    });

    const assigneeWorkload = Object.values(assigneeMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    // 6. Project Workload Breakdown
    const projectMap: Record<string, { projectCode: string; name: string; active: number; disposed: number; total: number }> = {};
    processedTasks.forEach((t) => {
      const code = t.project?.projectCode || 'PROJECT';
      const pName = t.project?.name || 'General Project';
      const key = t.projectId;

      if (!projectMap[key]) {
        projectMap[key] = { projectCode: code, name: pName, active: 0, disposed: 0, total: 0 };
      }

      projectMap[key].total++;
      if (['DISPOSED', 'CLOSED'].includes(t.status)) {
        projectMap[key].disposed++;
      } else {
        projectMap[key].active++;
      }
    });

    const projectDistribution = Object.values(projectMap).sort((a, b) => b.total - a.total);

    res.json({
      summary: {
        totalTasks,
        activeTasks,
        openTasks,
        inProgressTasks,
        disposedTasks,
        criticalAgingTasks,
        avgResolutionDays,
        slaComplianceRate,
      },
      charts: {
        statusPie,
        priorityPie,
        categoryPie,
        pendingDaysPie,
        assigneeWorkload,
        projectDistribution,
      },
      tasks: processedTasks,
    });
  } catch (error: any) {
    console.error('Error generating report analytics:', error);
    res.status(500).json({ error: error.message || 'Failed to generate report analytics.' });
  }
});

export default router;
