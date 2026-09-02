import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Helper to generate task sequential number like PRG-1042
async function generateNextTaskNumber(projectId?: string): Promise<string> {
  let prefix = 'PRG';
  if (projectId) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (project && project.projectCode) {
      prefix = project.projectCode;
    }
  }

  const count = await prisma.task.count();
  return `${prefix}-${1000 + count + 1}`;
}

// Get tasks with comprehensive filters and strict multi-tenancy scoping
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      projectId,
      status,
      priority,
      category,
      assigneeId,
      createdById,
      disposedById,
      search,
      view, // 'my_tasks', 'all', 'pending', 'disposed', 'follow_up'
    } = req.query;

    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const andConditions: any[] = [];

    // Strict Task Visibility Scoping
    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        andConditions.push({ project: { officeId: req.user?.officeId } });
      } else if (isGroupHead) {
        // Group Head only sees tasks belonging to their projects
        andConditions.push({ project: { groupHeadId: req.user?.id } });
      } else {
        // Regular Employee must ONLY see their own tasks (assigned to them, created by them, or disposed by them)
        andConditions.push({
          OR: [
            { currentAssigneeId: req.user?.id },
            { createdById: req.user?.id },
            { disposedById: req.user?.id },
          ],
        });
      }
    }

    if (projectId) {
      andConditions.push({ projectId: String(projectId) });
    }

    if (status) {
      if (status === 'PENDING') {
        andConditions.push({ status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] } });
      } else {
        andConditions.push({ status: String(status) });
      }
    }

    if (priority) {
      andConditions.push({ priority: String(priority) });
    }

    if (category) {
      andConditions.push({ category: String(category) });
    }

    if (assigneeId) {
      andConditions.push({ currentAssigneeId: String(assigneeId) });
    }

    if (createdById) {
      andConditions.push({ createdById: String(createdById) });
    }

    if (disposedById) {
      andConditions.push({ disposedById: String(disposedById) });
    }

    if (view === 'my_tasks') {
      andConditions.push({ currentAssigneeId: req.user?.id });
    } else if (view === 'pending') {
      andConditions.push({ status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] } });
    } else if (view === 'disposed') {
      andConditions.push({ status: { in: ['DISPOSED', 'CLOSED'] } });
    } else if (view === 'my_disposed') {
      andConditions.push({ disposedById: req.user?.id });
    }

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
          { letterEmailContent: { contains: q } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};

    const tasks = await prisma.task.findMany({
      where,
      include: {
        project: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            groupHeadId: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
          },
        },
        currentAssignee: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
          },
        },
        disposedBy: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
          },
        },
        attachments: true,
        _count: {
          select: {
            activities: true,
            attachments: true,
            followUpReports: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });

    res.json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create task (Frictionless / zero-mandatory intake with RajKaj No, Issue No, Email Date)
router.post('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      projectId,
      referenceNumber,
      rajKajNumber,
      issueNumber,
      referenceDate,
      subject,
      description,
      letterEmailContent,
      category,
      priority,
      currentAssigneeId,
      allocatedDurationValue,
      allocatedDurationUnit,
      estimatedCompletionAt,
      attachments,
      initialRemark,
    } = req.body;

    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    // Resolve project: if not provided, pick first project belonging to the user
    let targetProjectId = projectId;
    if (!targetProjectId) {
      const projectWhere = isGroupHead ? { groupHeadId: req.user?.id } : {};
      const firstProject = await prisma.project.findFirst({ where: projectWhere });
      if (!firstProject) {
        res.status(400).json({ error: 'Please create at least one project under your group first.' });
        return;
      }
      targetProjectId = firstProject.id;
    }

    // Subject is strictly mandatory
    if (!subject || !subject.trim()) {
      res.status(400).json({ error: 'Task Subject / Title is mandatory.' });
      return;
    }

    const taskNumber = await generateNextTaskNumber(targetProjectId);

    const task = await prisma.task.create({
      data: {
        taskNumber,
        referenceNumber: referenceNumber ? referenceNumber.trim() : null,
        rajKajNumber: rajKajNumber ? rajKajNumber.trim() : null,
        issueNumber: issueNumber ? issueNumber.trim() : null,
        referenceDate: referenceDate ? new Date(referenceDate) : null,
        subject: subject.trim(),
        description: description ? description.trim() : null,
        letterEmailContent: letterEmailContent ? letterEmailContent.trim() : null,
        category: category || 'TECHNICAL_ISSUE',
        priority: priority || 'MEDIUM',
        status: currentAssigneeId ? 'IN_PROGRESS' : 'OPEN',
        projectId: targetProjectId,
        createdById: req.user!.id,
        currentAssigneeId: currentAssigneeId || req.user!.id,
        allocatedDurationValue: allocatedDurationValue ? parseInt(allocatedDurationValue, 10) : null,
        allocatedDurationUnit: allocatedDurationUnit || 'DAYS',
        estimatedCompletionAt: estimatedCompletionAt ? new Date(estimatedCompletionAt) : null,
      },
    });

    // Create Initial TaskActivity record
    const refParts = [
      rajKajNumber ? `RajKaj: ${rajKajNumber.trim()}` : null,
      issueNumber ? `Issue: ${issueNumber.trim()}` : null,
      referenceNumber ? `Ref: ${referenceNumber.trim()}` : null,
    ].filter(Boolean);

    const refSummary = refParts.length > 0 ? ` (${refParts.join(', ')})` : '';
    const remarkText =
      initialRemark ||
      `Task created and added to queue${refSummary}.`;

    const activity = await prisma.taskActivity.create({
      data: {
        taskId: task.id,
        actionType: 'CREATED',
        actorId: req.user!.id,
        targetUserId: currentAssigneeId || req.user!.id,
        remark: remarkText,
      },
    });

    // Attach initial files if any
    if (Array.isArray(attachments) && attachments.length > 0) {
      await Promise.all(
        attachments.map((file) =>
          prisma.taskAttachment.create({
            data: {
              taskId: task.id,
              activityId: activity.id,
              fileName: file.fileName,
              filePath: file.filePath,
              fileType: file.fileType || 'application/octet-stream',
              fileSize: file.fileSize || 0,
            },
          })
        )
      );
    }

    const fullTask = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        project: true,
        createdBy: {
          select: { id: true, name: true, designation: true, email: true },
        },
        currentAssignee: {
          select: { id: true, name: true, designation: true, email: true },
        },
        attachments: true,
        activities: {
          include: {
            actor: { select: { id: true, name: true, designation: true } },
            attachments: true,
          },
        },
      },
    });

    res.status(201).json(fullTask);
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message || 'Failed to create task' });
  }
});

// Get single task with complete team history, remarks, attachments, and follow-up reports
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          include: {
            groupHead: {
              select: { id: true, name: true, designation: true, email: true },
            },
            members: {
              include: {
                user: {
                  select: { id: true, name: true, designation: true, email: true, ssoId: true },
                },
              },
            },
          },
        },
        createdBy: {
          select: { id: true, name: true, designation: true, email: true },
        },
        currentAssignee: {
          select: { id: true, name: true, designation: true, email: true },
        },
        disposedBy: {
          select: { id: true, name: true, designation: true, email: true },
        },
        attachments: true,
        activities: {
          include: {
            actor: {
              select: { id: true, name: true, designation: true, email: true },
            },
            attachments: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        followUpReports: {
          include: {
            reportedBy: {
              select: { id: true, name: true, designation: true, email: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Strict multi-tenancy verification
    if (!isSuperAdmin) {
      if (isGroupHead && task.project.groupHeadId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied. You can only view tasks belonging to your group.' });
        return;
      }
      if (!isGroupHead && !task.project.members.some((m) => m.userId === req.user?.id) && task.currentAssigneeId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied. You do not have permission to view this task.' });
        return;
      }
    }

    res.json(task);
  } catch (error) {
    console.error('Error fetching task details:', error);
    res.status(500).json({ error: 'Failed to fetch task details' });
  }
});

// ACTION: Transfer task to another member
router.post('/:id/transfer', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetUserId, remark, attachments } = req.body;

    if (!targetUserId) {
      res.status(400).json({ error: 'Please select an eligible member to transfer this task.' });
      return;
    }

    if (!remark || !remark.trim()) {
      res.status(400).json({ error: 'A remark or message is mandatory when transferring a task.' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: { currentAssignee: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, name: true, designation: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Target employee not found' });
      return;
    }

    // Update task assignee and status
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        currentAssigneeId: targetUserId,
        status: 'TRANSFERRED',
      },
    });

    // Create activity timeline record
    const activity = await prisma.taskActivity.create({
      data: {
        taskId: id,
        actionType: 'TRANSFERRED',
        actorId: req.user!.id,
        targetUserId: targetUserId,
        remark: remark.trim(),
      },
    });

    // Attach any files uploaded during this transfer
    if (Array.isArray(attachments) && attachments.length > 0) {
      await Promise.all(
        attachments.map((file) =>
          prisma.taskAttachment.create({
            data: {
              taskId: id,
              activityId: activity.id,
              fileName: file.fileName,
              filePath: file.filePath,
              fileType: file.fileType || 'application/octet-stream',
              fileSize: file.fileSize || 0,
            },
          })
        )
      );
    }

    res.json({
      success: true,
      message: `Task transferred to ${targetUser.name} (${targetUser.designation})`,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error('Error transferring task:', error);
    res.status(500).json({ error: error.message || 'Failed to transfer task' });
  }
});

// ACTION: Revert task back to previous assigner or Group Head
router.post('/:id/revert', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetUserId, remark, attachments } = req.body;

    if (!remark || !remark.trim()) {
      res.status(400).json({ error: 'A remark or explanation is mandatory when reverting a task.' });
      return;
    }

    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        createdBy: true,
        project: {
          include: { groupHead: true },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Determine target user to revert to
    let resolvedTargetId = targetUserId;
    if (!resolvedTargetId) {
      // Revert to task creator or project Group Head
      resolvedTargetId = task.createdById || task.project.groupHeadId;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: resolvedTargetId },
      select: { id: true, name: true, designation: true },
    });

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        currentAssigneeId: resolvedTargetId,
        status: 'REVERTED',
      },
    });

    const activity = await prisma.taskActivity.create({
      data: {
        taskId: id,
        actionType: 'REVERTED',
        actorId: req.user!.id,
        targetUserId: resolvedTargetId,
        remark: remark.trim(),
      },
    });

    if (Array.isArray(attachments) && attachments.length > 0) {
      await Promise.all(
        attachments.map((file) =>
          prisma.taskAttachment.create({
            data: {
              taskId: id,
              activityId: activity.id,
              fileName: file.fileName,
              filePath: file.filePath,
              fileType: file.fileType || 'application/octet-stream',
              fileSize: file.fileSize || 0,
            },
          })
        )
      );
    }

    res.json({
      success: true,
      message: `Task reverted to ${targetUser?.name || 'Assigner'}`,
      task: updatedTask,
    });
  } catch (error: any) {
    console.error('Error reverting task:', error);
    res.status(500).json({ error: error.message || 'Failed to revert task' });
  }
});

// ACTION: Dispose task (Resolved & Disposed)
router.post('/:id/dispose', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { remark, attachments, nextFollowUpDate, initialFollowUpStatus } = req.body;

    if (!remark || !remark.trim()) {
      res.status(400).json({ error: 'Disposal remark and outcome summary are mandatory.' });
      return;
    }

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        status: 'DISPOSED',
        disposedById: req.user!.id,
        disposedAt: new Date(),
      },
    });

    const activity = await prisma.taskActivity.create({
      data: {
        taskId: id,
        actionType: 'DISPOSED',
        actorId: req.user!.id,
        remark: remark.trim(),
      },
    });

    if (Array.isArray(attachments) && attachments.length > 0) {
      await Promise.all(
        attachments.map((file) =>
          prisma.taskAttachment.create({
            data: {
              taskId: id,
              activityId: activity.id,
              fileName: file.fileName,
              filePath: file.filePath,
              fileType: file.fileType || 'application/octet-stream',
              fileSize: file.fileSize || 0,
            },
          })
        )
      );
    }

    // Create initial Follow-up entry if specified
    if (initialFollowUpStatus || nextFollowUpDate) {
      await prisma.followUpReport.create({
        data: {
          taskId: id,
          reportedById: req.user!.id,
          status: initialFollowUpStatus || 'Disposed & Ready for Audit / Verification',
          remarks: `Initial follow-up registered on disposal: ${remark.trim()}`,
          nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
        },
      });
    }

    res.json({
      success: true,
      message: 'Task marked as DISPOSED. You are recorded as the Follow-up Owner.',
      task: updatedTask,
    });
  } catch (error: any) {
    console.error('Error disposing task:', error);
    res.status(500).json({ error: error.message || 'Failed to dispose task' });
  }
});

// ACTION: Update Priority, Duration, and Estimated Completion Time
router.post('/:id/priority', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { priority, allocatedDurationValue, allocatedDurationUnit, estimatedCompletionAt, remark } = req.body;

    const task = await prisma.task.findUnique({ where: { id } });
    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(priority && { priority }),
        ...(allocatedDurationValue !== undefined && { allocatedDurationValue: parseInt(allocatedDurationValue, 10) }),
        ...(allocatedDurationUnit && { allocatedDurationUnit }),
        ...(estimatedCompletionAt && { estimatedCompletionAt: new Date(estimatedCompletionAt) }),
      },
    });

    const changeMsg = `Priority set to ${priority || task.priority}${allocatedDurationValue ? `, Duration: ${allocatedDurationValue} ${allocatedDurationUnit || task.allocatedDurationUnit}` : ''}${remark ? `. Note: ${remark}` : ''}`;

    await prisma.taskActivity.create({
      data: {
        taskId: id,
        actionType: 'PRIORITY_CHANGED',
        actorId: req.user!.id,
        remark: changeMsg,
      },
    });

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating priority:', error);
    res.status(500).json({ error: error.message || 'Failed to update priority' });
  }
});

// EDIT TASK: Only Group Head or Officer-in-Charge can edit task core details
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      subject,
      referenceNumber,
      rajKajNumber,
      issueNumber,
      referenceDate,
      description,
      letterEmailContent,
      category,
      priority,
      status,
      currentAssigneeId,
      allocatedDurationValue,
      allocatedDurationUnit,
      estimatedCompletionAt,
    } = req.body;

    const task = await prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    // Permission check: Only Super Admin or Group Head of this project
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isProjectGroupHead = task.project.groupHeadId === req.user?.id;

    if (!isSuperAdmin && !isProjectGroupHead) {
      res.status(403).json({
        error: 'Permission denied. Core task details can only be edited by the Group Head of this project.',
      });
      return;
    }

    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        ...(subject && { subject: subject.trim() }),
        ...(referenceNumber !== undefined && { referenceNumber: referenceNumber ? referenceNumber.trim() : null }),
        ...(rajKajNumber !== undefined && { rajKajNumber: rajKajNumber ? rajKajNumber.trim() : null }),
        ...(issueNumber !== undefined && { issueNumber: issueNumber ? issueNumber.trim() : null }),
        ...(referenceDate !== undefined && { referenceDate: referenceDate ? new Date(referenceDate) : null }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(letterEmailContent !== undefined && { letterEmailContent: letterEmailContent ? letterEmailContent.trim() : null }),
        ...(category && { category }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(currentAssigneeId !== undefined && { currentAssigneeId }),
        ...(allocatedDurationValue !== undefined && { allocatedDurationValue: parseInt(allocatedDurationValue, 10) }),
        ...(allocatedDurationUnit && { allocatedDurationUnit }),
        ...(estimatedCompletionAt && { estimatedCompletionAt: new Date(estimatedCompletionAt) }),
      },
    });

    await prisma.taskActivity.create({
      data: {
        taskId: id,
        actionType: 'UPDATED',
        actorId: req.user!.id,
        remark: `Task core details updated by ${req.user!.name} (${req.user!.designation}).`,
      },
    });

    res.json(updatedTask);
  } catch (error: any) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: error.message || 'Failed to update task' });
  }
});

// DELETE TASK:
// "Only the user who created/listed a task should be able to delete it, while the Group Head / Section User should also have permission to delete any listed task."
router.delete('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const task = await prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: {
            id: true,
            groupHeadId: true,
            officeId: true,
          },
        },
      },
    });

    if (!task) {
      res.status(404).json({ error: 'Task not found' });
      return;
    }

    const isCreator = task.createdById === req.user?.id;
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';
    const isSuperAdmin =
      req.user?.systemRole === 'SUPER_ADMIN' || req.user?.systemRole === 'OFFICE_SUPER_ADMIN';

    // Allow if task creator OR Section/Group Head OR Super Admin
    if (!isCreator && !isGroupHead && !isSuperAdmin) {
      res.status(403).json({
        error: 'Permission denied. Only the task creator or Section/Group Head can delete this task.',
      });
      return;
    }

    // Delete child records and task in transaction
    await prisma.$transaction([
      prisma.taskActivity.deleteMany({ where: { taskId: id } }),
      prisma.taskAttachment.deleteMany({ where: { taskId: id } }),
      prisma.followUpReport.deleteMany({ where: { taskId: id } }),
      prisma.task.delete({ where: { id } }),
    ]);

    res.json({
      success: true,
      message: `Task [${task.taskNumber}] deleted successfully.`,
      id,
    });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    res.status(500).json({ error: error.message || 'Failed to delete task' });
  }
});

export default router;
