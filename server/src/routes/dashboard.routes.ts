import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Main interactive dashboard stats & metrics (Scoped per Group Head / Role)
router.get('/stats', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const where: any = {};

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        where.project = { officeId: req.user?.officeId };
      } else if (isGroupHead) {
        where.project = { groupHeadId: req.user?.id };
      } else {
        where.OR = [
          { currentAssigneeId: req.user?.id },
          { createdById: req.user?.id },
          { disposedById: req.user?.id },
        ];
      }
    }

    if (projectId) {
      where.projectId = String(projectId);
    }

    const now = new Date();

    const [
      totalTasks,
      openTasks,
      inProgressTasks,
      transferredTasks,
      revertedTasks,
      disposedTasks,
      criticalTasks,
      myPendingTasks,
      allPendingTasks,
    ] = await Promise.all([
      prisma.task.count({ where }),
      prisma.task.count({ where: { ...where, status: 'OPEN' } }),
      prisma.task.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      prisma.task.count({ where: { ...where, status: 'TRANSFERRED' } }),
      prisma.task.count({ where: { ...where, status: 'REVERTED' } }),
      prisma.task.count({ where: { ...where, status: 'DISPOSED' } }),
      prisma.task.count({
        where: {
          ...where,
          priority: 'CRITICAL',
          status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          currentAssigneeId: req.user?.id,
          status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
        },
      }),
      prisma.task.count({
        where: {
          ...where,
          status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
        },
      }),
    ]);

    // Overdue tasks count
    const overdueTasks = await prisma.task.count({
      where: {
        ...where,
        status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
        estimatedCompletionAt: { lt: now },
      },
    });

    // Breakdown by Category
    const categories = ['OFFICIAL_LETTER', 'TECHNICAL_ISSUE', 'SERVICE_REQUEST', 'GENERAL_TASK', 'BUG', 'FEATURE'];
    const categoryCounts = await Promise.all(
      categories.map(async (cat) => {
        const count = await prisma.task.count({ where: { ...where, category: cat } });
        return { category: cat, count };
      })
    );

    // Breakdown by Priority
    const priorities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
    const priorityCounts = await Promise.all(
      priorities.map(async (p) => {
        const count = await prisma.task.count({
          where: {
            ...where,
            priority: p,
            status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
          },
        });
        return { priority: p, count };
      })
    );

    res.json({
      summary: {
        total: totalTasks,
        open: openTasks,
        inProgress: inProgressTasks,
        transferred: transferredTasks,
        reverted: revertedTasks,
        disposed: disposedTasks,
        pending: allPendingTasks,
        myPending: myPendingTasks,
        critical: criticalTasks,
        overdue: overdueTasks,
      },
      byCategory: categoryCounts,
      byPriority: priorityCounts,
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard stats' });
  }
});

// Interactive Employee Workload Matrix
router.get('/employee-workload', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    let userWhereClause: any = { isActive: true };

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        userWhereClause = {
          isActive: true,
          officeId: req.user?.officeId,
        };
      } else if (isGroupHead) {
        // STRICT SECTION ISOLATION: Group Heads must only see and access employees mapped to their own group/section
        userWhereClause = {
          isActive: true,
          sectionId: req.user?.sectionId,
          systemRole: 'EMPLOYEE',
        };
      } else {
        userWhereClause = {
          isActive: true,
          OR: [
            { id: req.user?.id },
            { sectionId: req.user?.sectionId },
            {
              projectMemberships: {
                some: {
                  project: {
                    members: {
                      some: {
                        userId: req.user?.id,
                      },
                    },
                  },
                },
              },
            },
          ],
        };
      }
    }

    const employees = await prisma.user.findMany({
      where: userWhereClause,
      include: { office: true, section: true },
      orderBy: { name: 'asc' },
    });

    const workloadMatrix = await Promise.all(
      employees.map(async (emp) => {
        const baseWhere: any = { currentAssigneeId: emp.id };

        if (!isSuperAdmin) {
          if (isOfficeSuperAdmin) {
            baseWhere.project = { officeId: req.user?.officeId };
          } else if (isGroupHead) {
            baseWhere.project = { groupHeadId: req.user?.id };
          } else {
            baseWhere.project = { members: { some: { userId: req.user?.id } } };
          }
        }

        if (projectId) {
          baseWhere.projectId = String(projectId);
        }

        const [pendingCount, criticalCount, highCount, disposedCount, activeTasks] = await Promise.all([
          prisma.task.count({
            where: {
              ...baseWhere,
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
            },
          }),
          prisma.task.count({
            where: {
              ...baseWhere,
              priority: 'CRITICAL',
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
            },
          }),
          prisma.task.count({
            where: {
              ...baseWhere,
              priority: 'HIGH',
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
            },
          }),
          prisma.task.count({
            where: {
              disposedById: emp.id,
              ...(!isSuperAdmin && isGroupHead ? { project: { groupHeadId: req.user?.id } } : {}),
              ...(projectId ? { projectId: String(projectId) } : {}),
            },
          }),
          prisma.task.findMany({
            where: {
              ...baseWhere,
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
            },
            select: {
              id: true,
              taskNumber: true,
              subject: true,
              referenceNumber: true,
              rajKajNumber: true,
              issueNumber: true,
              referenceDate: true,
              priority: true,
              status: true,
              category: true,
              estimatedCompletionAt: true,
              project: { select: { projectCode: true, name: true } },
            },
            take: 5,
          }),
        ]);

        return {
          employee: {
            id: emp.id,
            name: emp.name,
            designation: emp.designation,
            displayName: `${emp.name} — ${emp.designation}`,
            email: emp.email,
            ssoId: emp.ssoId,
            phone: emp.phone,
            officeName: emp.office?.name || emp.officeName,
            sectionName: emp.section?.name || emp.sectionName,
            systemRole: emp.systemRole,
          },
          pendingCount,
          criticalCount,
          highCount,
          disposedCount,
          activeTasks,
        };
      })
    );

    const sorted = workloadMatrix.sort((a, b) => b.pendingCount - a.pendingCount);

    res.json(sorted);
  } catch (error) {
    console.error('Error fetching employee workload:', error);
    res.status(500).json({ error: 'Failed to fetch employee workload' });
  }
});

// Projects Health & Turnaround Analytics
router.get('/projects-health', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    let whereClause: any = {};
    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        whereClause = { officeId: req.user?.officeId };
      } else if (isGroupHead) {
        whereClause = { groupHeadId: req.user?.id };
      } else {
        whereClause = { members: { some: { userId: req.user?.id } } };
      }
    }

    const projects = await prisma.project.findMany({
      where: whereClause,
      include: {
        office: true,
        groupHead: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            ssoId: true,
          },
        },
        _count: {
          select: {
            members: true,
            tasks: true,
          },
        },
      },
    });

    const now = new Date();

    const healthMetrics = await Promise.all(
      projects.map(async (p) => {
        const [pendingTasks, disposedTasks, overdueTasks] = await Promise.all([
          prisma.task.count({
            where: {
              projectId: p.id,
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
            },
          }),
          prisma.task.count({
            where: {
              projectId: p.id,
              status: { in: ['DISPOSED', 'CLOSED'] },
            },
          }),
          prisma.task.count({
            where: {
              projectId: p.id,
              status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
              estimatedCompletionAt: { lt: now },
            },
          }),
        ]);

        const total = pendingTasks + disposedTasks;
        const completionRate = total > 0 ? Math.round((disposedTasks / total) * 100) : 0;

        return {
          id: p.id,
          projectCode: p.projectCode,
          name: p.name,
          status: p.status,
          officeName: p.office?.name || p.officeName,
          groupHead: p.groupHead,
          memberCount: p._count.members,
          totalTasks: total,
          pendingTasks,
          disposedTasks,
          overdueTasks,
          completionRate,
        };
      })
    );

    res.json(healthMetrics);
  } catch (error) {
    console.error('Error fetching projects health:', error);
    res.status(500).json({ error: 'Failed to fetch project health metrics' });
  }
});

// Live Activity Feed across Project / Department
router.get('/activity-stream', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { limit = 20, projectId } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    let taskWhere: any = {};
    if (projectId) {
      taskWhere.projectId = String(projectId);
    } else if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        taskWhere.project = { officeId: req.user?.officeId };
      } else if (isGroupHead) {
        taskWhere.project = { groupHeadId: req.user?.id };
      } else {
        taskWhere.project = { members: { some: { userId: req.user?.id } } };
      }
    }

    const activities = await prisma.taskActivity.findMany({
      where: {
        task: taskWhere,
      },
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            subject: true,
            referenceNumber: true,
            rajKajNumber: true,
            issueNumber: true,
            referenceDate: true,
            status: true,
            project: {
              select: {
                id: true,
                projectCode: true,
                name: true,
              },
            },
          },
        },
        actor: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            ssoId: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
      take: Number(limit),
    });

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activity stream:', error);
    res.status(500).json({ error: 'Failed to fetch activity stream' });
  }
});

export default router;
