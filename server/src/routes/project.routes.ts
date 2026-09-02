import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// 1. List Projects with Multi-Tenancy Scoping & Incoming Transfer Indicators
router.get('/', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    let whereClause: any = {};

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        // Office Super Admin sees all projects in their office
        whereClause = { officeId: req.user?.officeId };
      } else if (isGroupHead) {
        // Group Head sees projects they manage OR projects with incoming pending transfer to them OR projects where they are a member
        whereClause = {
          OR: [
            { groupHeadId: req.user?.id },
            { transferToGroupHeadId: req.user?.id, transferStatus: 'PENDING_TRANSFER' },
            { members: { some: { userId: req.user?.id } } },
          ],
        };
      } else {
        // Employee sees projects they are mapped to
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
            officeName: true,
            sectionName: true,
          },
        },
        transferToGroupHead: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            ssoId: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                designation: true,
                email: true,
                ssoId: true,
                phone: true,
                officeName: true,
                sectionName: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(
      projects.map(async (project) => {
        const pendingCount = await prisma.task.count({
          where: {
            projectId: project.id,
            status: { in: ['OPEN', 'IN_PROGRESS', 'TRANSFERRED', 'REVERTED'] },
          },
        });

        const disposedCount = await prisma.task.count({
          where: {
            projectId: project.id,
            status: { in: ['DISPOSED', 'CLOSED'] },
          },
        });

        return {
          ...project,
          pendingTasksCount: pendingCount,
          disposedTasksCount: disposedCount,
          members: project.members.map((m) => {
            let roles = [];
            try {
              roles = JSON.parse(m.rolesJson);
            } catch (e) {
              roles = [];
            }
            return {
              id: m.id,
              userId: m.user.id,
              name: m.user.name,
              designation: m.user.designation,
              email: m.user.email,
              ssoId: m.user.ssoId,
              phone: m.user.phone,
              officeName: m.user.officeName,
              sectionName: m.user.sectionName,
              roles: roles,
              joinedAt: m.joinedAt,
            };
          }),
        };
      })
    );

    res.json(enriched);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// 2. Create Project (Group Head, Office Super Admin, Super Admin)
router.post('/', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, projectCode, description, officeId } = req.body;

    if (!name || !projectCode) {
      res.status(400).json({ error: 'Project name and project code are required.' });
      return;
    }

    const cleanCode = projectCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

    const existing = await prisma.project.findUnique({
      where: { projectCode: cleanCode },
    });

    if (existing) {
      res.status(400).json({ error: `Project code '${cleanCode}' is already taken.` });
      return;
    }

    const resolvedOfficeId = officeId || req.user?.officeId;
    let resolvedOfficeName = req.user?.officeName;
    if (resolvedOfficeId && resolvedOfficeId !== req.user?.officeId) {
      const off = await prisma.officeMaster.findUnique({ where: { id: resolvedOfficeId } });
      if (off) resolvedOfficeName = off.name;
    }

    const project = await prisma.project.create({
      data: {
        name: name.trim(),
        projectCode: cleanCode,
        description: description ? description.trim() : null,
        groupHeadId: req.user!.id,
        officeId: resolvedOfficeId || null,
        officeName: resolvedOfficeName || 'DoIT&C Secretariat, Jaipur (HQ)',
        status: 'ACTIVE',
      },
    });

    // Add Group Head as initial Admin / Review Officer member in project
    await prisma.projectMember.create({
      data: {
        projectId: project.id,
        userId: req.user!.id,
        rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']),
      },
    });

    res.status(201).json(project);
  } catch (error: any) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message || 'Failed to create project.' });
  }
});

// 3. Initiate Project Transfer to another Group Head / Section in Same Office
router.post('/:id/transfer/initiate', authenticate, requireRole('GROUP_HEAD', 'SUPER_ADMIN', 'OFFICE_SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetGroupHeadId, remark } = req.body;

    if (!targetGroupHeadId || !remark || !remark.trim()) {
      res.status(400).json({ error: 'Target Group Head / Section and Transfer Remarks are strictly mandatory.' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    // Permission check: only current Group Head or Super Admin can initiate
    if (req.user?.systemRole !== 'SUPER_ADMIN' && project.groupHeadId !== req.user?.id) {
      res.status(403).json({ error: 'Only the concerned Group Head / Section can initiate project transfer.' });
      return;
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetGroupHeadId },
      include: { office: true, section: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'Target Group Head / Section not found.' });
      return;
    }

    if (targetUser.id === project.groupHeadId) {
      res.status(400).json({ error: 'Cannot transfer project to the existing Group Head.' });
      return;
    }

    // Must be under the same office (unless Super Admin)
    if (req.user?.systemRole !== 'SUPER_ADMIN') {
      if (project.officeId && targetUser.officeId && project.officeId !== targetUser.officeId) {
        res.status(400).json({ error: 'Project can only be transferred to another Group Head / Section under the same Office.' });
        return;
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        transferStatus: 'PENDING_TRANSFER',
        transferToGroupHeadId: targetUser.id,
        transferRemark: remark.trim(),
        transferInitiatedAt: new Date(),
      },
      include: {
        groupHead: true,
        transferToGroupHead: true,
      },
    });

    res.json({
      success: true,
      message: `Project transfer to '${targetUser.name}' initiated successfully.`,
      project: updated,
    });
  } catch (error: any) {
    console.error('Error initiating project transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate project transfer.' });
  }
});

// 4. Accept Project Transfer (by Target Group Head / Section)
router.post('/:id/transfer/accept', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: { groupHead: true, transferToGroupHead: true },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    if (project.transferStatus !== 'PENDING_TRANSFER' || !project.transferToGroupHeadId) {
      res.status(400).json({ error: 'No pending transfer request exists for this project.' });
      return;
    }

    // Only target Group Head or Super Admin can accept
    if (req.user?.systemRole !== 'SUPER_ADMIN' && project.transferToGroupHeadId !== req.user?.id) {
      res.status(403).json({ error: 'Only the target Group Head / Section can accept this project transfer.' });
      return;
    }

    const newGroupHeadId = project.transferToGroupHeadId;

    // Update project groupHeadId and clear transfer status
    const updated = await prisma.project.update({
      where: { id },
      data: {
        groupHeadId: newGroupHeadId,
        transferStatus: 'NONE',
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
      },
      include: {
        groupHead: true,
        members: true,
      },
    });

    // Ensure new Group Head is in project members as ADMIN / REVIEW_OFFICER
    const existingMember = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId: project.id,
          userId: newGroupHeadId,
        },
      },
    });

    if (!existingMember) {
      await prisma.projectMember.create({
        data: {
          projectId: project.id,
          userId: newGroupHeadId,
          rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']),
        },
      });
    }

    res.json({
      success: true,
      message: `Project '${project.name}' successfully transferred to ${updated.groupHead.name}. All tasks and mapped employees are now active in your workspace.`,
      project: updated,
    });
  } catch (error: any) {
    console.error('Error accepting project transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to accept project transfer.' });
  }
});

// 5. Reject Project Transfer
router.post('/:id/transfer/reject', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionRemark } = req.body;

    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    if (req.user?.systemRole !== 'SUPER_ADMIN' && project.transferToGroupHeadId !== req.user?.id && project.groupHeadId !== req.user?.id) {
      res.status(403).json({ error: 'Unauthorized to reject transfer.' });
      return;
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        transferStatus: 'NONE',
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
      },
    });

    res.json({
      success: true,
      message: 'Project transfer request has been cancelled/rejected.',
      project: updated,
    });
  } catch (error: any) {
    console.error('Error rejecting project transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to reject project transfer.' });
  }
});

// 6. Get Single Project Details
router.get('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    const project = await prisma.project.findUnique({
      where: { id },
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
        transferToGroupHead: {
          select: {
            id: true,
            name: true,
            designation: true,
            email: true,
            ssoId: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                designation: true,
                email: true,
                ssoId: true,
                officeName: true,
                sectionName: true,
              },
            },
          },
        },
        _count: {
          select: {
            tasks: true,
            members: true,
          },
        },
      },
    });

    if (!project) {
      res.status(404).json({ error: 'Project not found' });
      return;
    }

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin && project.officeId !== req.user?.officeId) {
        res.status(403).json({ error: 'Access denied. Project does not belong to your office.' });
        return;
      }
      if (isGroupHead && project.groupHeadId !== req.user?.id && project.transferToGroupHeadId !== req.user?.id) {
        res.status(403).json({ error: 'Access denied. You do not manage this project.' });
        return;
      }
      if (!isGroupHead && !isOfficeSuperAdmin && !project.members.some((m) => m.userId === req.user?.id)) {
        res.status(403).json({ error: 'Access denied. You are not a member of this project.' });
        return;
      }
    }

    const formattedMembers = project.members.map((m) => {
      let roles = [];
      try {
        roles = JSON.parse(m.rolesJson);
      } catch (e) {
        roles = [];
      }
      return {
        id: m.id,
        userId: m.user.id,
        name: m.user.name,
        designation: m.user.designation,
        email: m.user.email,
        ssoId: m.user.ssoId,
        officeName: m.user.officeName,
        sectionName: m.user.sectionName,
        roles: roles,
        joinedAt: m.joinedAt,
      };
    });

    res.json({
      ...project,
      members: formattedMembers,
    });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project details' });
  }
});

// 7. Add or Update Member Roles in Project
router.post('/:id/members', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: projectId } = req.params;
    const { userId, roles } = req.body;

    if (!userId || !Array.isArray(roles) || roles.length === 0) {
      res.status(400).json({ error: 'User ID and at least one role must be provided.' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    if (req.user?.systemRole === 'GROUP_HEAD' && project.groupHeadId !== req.user.id) {
      res.status(403).json({ error: 'Access denied. You can only manage members in your own projects.' });
      return;
    }

    const existing = await prisma.projectMember.findUnique({
      where: {
        projectId_userId: {
          projectId,
          userId,
        },
      },
    });

    let member;
    if (existing) {
      member = await prisma.projectMember.update({
        where: { id: existing.id },
        data: {
          rolesJson: JSON.stringify(roles),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              designation: true,
              email: true,
              ssoId: true,
            },
          },
        },
      });
    } else {
      member = await prisma.projectMember.create({
        data: {
          projectId,
          userId,
          rolesJson: JSON.stringify(roles),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              designation: true,
              email: true,
              ssoId: true,
            },
          },
        },
      });
    }

    let parsedRoles = [];
    try {
      parsedRoles = JSON.parse(member.rolesJson);
    } catch (e) {
      parsedRoles = [];
    }

    res.json({
      id: member.id,
      userId: member.user.id,
      name: member.user.name,
      designation: member.user.designation,
      email: member.user.email,
      ssoId: member.user.ssoId,
      roles: parsedRoles,
      joinedAt: member.joinedAt,
    });
  } catch (error: any) {
    console.error('Error assigning member roles:', error);
    res.status(500).json({ error: error.message || 'Failed to update member roles.' });
  }
});

// 8. Remove Member from Project
router.delete('/:id/members/:userId', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: projectId, userId } = req.params;

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    if (req.user?.systemRole === 'GROUP_HEAD' && project.groupHeadId !== req.user.id) {
      res.status(403).json({ error: 'Access denied. You can only manage members in your own projects.' });
      return;
    }

    await prisma.projectMember.deleteMany({
      where: {
        projectId,
        userId,
      },
    });

    res.json({ success: true, message: 'Member removed from project.' });
  } catch (error: any) {
    console.error('Error removing project member:', error);
    res.status(500).json({ error: error.message || 'Failed to remove member.' });
  }
});

// 9. Update Project Details (Super Admin exclusive)
router.put('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, projectCode, description, status } = req.body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    let cleanCode = undefined;
    if (projectCode) {
      cleanCode = projectCode.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
      if (cleanCode !== existing.projectCode) {
        const dupe = await prisma.project.findUnique({ where: { projectCode: cleanCode } });
        if (dupe && dupe.id !== id) {
          res.status(400).json({ error: `Project code '${cleanCode}' is already in use.` });
          return;
        }
      }
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(cleanCode && { projectCode: cleanCode }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(status && { status }),
      },
      include: {
        office: true,
        groupHead: true,
        members: {
          include: {
            user: true,
          },
        },
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message || 'Failed to update project.' });
  }
});

// 10. Delete Project (Super Admin exclusive)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) {
      res.status(404).json({ error: 'Project not found.' });
      return;
    }

    // Find all task IDs for this project
    const tasks = await prisma.task.findMany({
      where: { projectId: id },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);

    await prisma.$transaction([
      prisma.taskActivity.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.taskAttachment.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.followUpReport.deleteMany({ where: { taskId: { in: taskIds } } }),
      prisma.task.deleteMany({ where: { projectId: id } }),
      prisma.projectMember.deleteMany({ where: { projectId: id } }),
      prisma.project.delete({ where: { id } }),
    ]);

    console.log(`🗑️ [PROJECT DELETED] Project '${project.name}' (${project.projectCode}) deleted by Super Admin ${req.user?.name}`);

    res.json({
      success: true,
      message: `Project '${project.name}' (${project.projectCode}) and all its associated tasks were deleted successfully.`,
    });
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project.' });
  }
});

export default router;
