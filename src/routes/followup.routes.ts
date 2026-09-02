import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get follow-up reports list with filtering and scoping
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId, reportedById, overdueOnly } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const where: any = {};

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        where.task = { project: { officeId: req.user?.officeId } };
      } else if (isGroupHead) {
        where.task = { project: { groupHeadId: req.user?.id } };
      } else {
        where.OR = [
          { reportedById: req.user?.id },
          { task: { disposedById: req.user?.id } },
          { task: { currentAssigneeId: req.user?.id } },
        ];
      }
    }

    if (taskId) {
      where.taskId = String(taskId);
    }
    if (reportedById) {
      where.reportedById = String(reportedById);
    }
    if (overdueOnly === 'true') {
      where.nextFollowUpDate = {
        lt: new Date(),
      };
    }

    const reports = await prisma.followUpReport.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            taskNumber: true,
            subject: true,
            referenceNumber: true,
            rajKajNumber: true,
            issueNumber: true,
            status: true,
            disposedAt: true,
            project: {
              select: {
                id: true,
                name: true,
                projectCode: true,
              },
            },
          },
        },
        reportedBy: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(reports);
  } catch (error) {
    console.error('Error fetching follow-up reports:', error);
    res.status(500).json({ error: 'Failed to fetch follow-up reports' });
  }
});

// Add follow-up report for a disposed task
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { taskId, status, remarks, nextFollowUpDate } = req.body;

    if (!taskId || !status || !remarks) {
      res.status(400).json({ error: 'Task ID, follow-up status, and remarks are required.' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) {
      res.status(404).json({ error: 'Task not found.' });
      return;
    }

    const report = await prisma.followUpReport.create({
      data: {
        taskId,
        reportedById: req.user!.id,
        status: status.trim(),
        remarks: remarks.trim(),
        nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      },
      include: {
        reportedBy: {
          select: {
            id: true,
            name: true,
            designation: true,
          },
        },
      },
    });

    // Also record an entry in the TaskActivity timeline for complete transparency
    await prisma.taskActivity.create({
      data: {
        taskId,
        actionType: 'COMMENTED',
        actorId: req.user!.id,
        remark: `[Follow-Up Update: ${status}] ${remarks}`,
      },
    });

    res.status(201).json(report);
  } catch (error: any) {
    console.error('Error creating follow-up report:', error);
    res.status(500).json({ error: error.message || 'Failed to create follow-up report' });
  }
});

export default router;
