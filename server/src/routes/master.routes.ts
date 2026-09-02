import { Router, Response } from 'express';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';

const router = Router();

// ==========================================
// 1. OFFICE MASTERS
// ==========================================

// Get all offices (accessible to authenticated users for dropdowns and masters view)
router.get('/offices', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const offices = await prisma.officeMaster.findMany({
      include: {
        sections: true,
        _count: {
          select: {
            users: true,
            projects: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
    res.json(offices);
  } catch (error) {
    console.error('Error fetching offices:', error);
    res.status(500).json({ error: 'Failed to fetch offices.' });
  }
});

// Create Office (Super Admin only)
router.post('/offices', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, district, address } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Office Name and Office Code are required.' });
      return;
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

    const existingName = await prisma.officeMaster.findUnique({ where: { name: name.trim() } });
    if (existingName) {
      res.status(400).json({ error: `An office named '${name}' already exists.` });
      return;
    }

    const existingCode = await prisma.officeMaster.findUnique({ where: { code: cleanCode } });
    if (existingCode) {
      res.status(400).json({ error: `Office Code '${cleanCode}' is already in use.` });
      return;
    }

    const office = await prisma.officeMaster.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        district: district ? district.trim() : null,
        address: address ? address.trim() : null,
        isActive: true,
      },
    });

    res.status(201).json(office);
  } catch (error: any) {
    console.error('Error creating office:', error);
    res.status(500).json({ error: error.message || 'Failed to create office.' });
  }
});

// Update Office (Super Admin only)
router.put('/offices/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, district, address, isActive } = req.body;

    const existing = await prisma.officeMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Office not found.' });
      return;
    }

    const updated = await prisma.officeMaster.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.toUpperCase().trim() }),
        ...(district !== undefined && { district: district ? district.trim() : null }),
        ...(address !== undefined && { address: address ? address.trim() : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating office:', error);
    res.status(500).json({ error: error.message || 'Failed to update office.' });
  }
});

// Delete Office (Super Admin only)
router.delete('/offices/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.officeMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Office not found.' });
      return;
    }

    // Unbind users mapped to this office
    await prisma.user.updateMany({
      where: { officeId: id },
      data: { officeId: null, officeName: null, sectionId: null, sectionName: null },
    });

    // Delete sections belonging to this office
    await prisma.sectionMaster.deleteMany({
      where: { officeId: id },
    });

    await prisma.officeMaster.delete({ where: { id } });
    console.log(`🗑️ [OFFICE DELETED] Office '${existing.name}' (${existing.code}) deleted by Super Admin ${req.user?.name}`);

    res.json({ success: true, message: `Office '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    console.error('Error deleting office:', error);
    res.status(500).json({ error: error.message || 'Failed to delete office.' });
  }
});

// ==========================================
// 2. SECTION MASTERS
// ==========================================

// Get Sections (Optional filter by officeId)
router.get('/sections', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { officeId } = req.query;
    let whereClause: any = {};

    if (officeId) {
      whereClause.officeId = String(officeId);
    } else if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      whereClause.officeId = req.user.officeId;
    }

    const sections = await prisma.sectionMaster.findMany({
      where: whereClause,
      include: {
        office: {
          select: { id: true, name: true, code: true, district: true },
        },
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(sections);
  } catch (error) {
    console.error('Error fetching sections:', error);
    res.status(500).json({ error: 'Failed to fetch sections.' });
  }
});

// Create Section (Super Admin or Office Super Admin)
router.post('/sections', authenticate, requireRole('SUPER_ADMIN', 'OFFICE_SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { name, code, officeId } = req.body;

    if (!name || !code) {
      res.status(400).json({ error: 'Section Name and Section Code are required.' });
      return;
    }

    if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      officeId = req.user.officeId;
    }

    if (!officeId) {
      res.status(400).json({ error: 'Assigned Office is required.' });
      return;
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

    const existingName = await prisma.sectionMaster.findFirst({
      where: { officeId, name: name.trim() },
    });
    if (existingName) {
      res.status(400).json({ error: `A section named '${name}' already exists in this office.` });
      return;
    }

    const existingCode = await prisma.sectionMaster.findFirst({
      where: { officeId, code: cleanCode },
    });
    if (existingCode) {
      res.status(400).json({ error: `Section Code '${cleanCode}' is already registered in this office.` });
      return;
    }

    const section = await prisma.sectionMaster.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        officeId,
        isActive: true,
      },
      include: {
        office: { select: { id: true, name: true, code: true } },
      },
    });

    res.status(201).json(section);
  } catch (error: any) {
    console.error('Error creating section:', error);
    res.status(500).json({ error: error.message || 'Failed to create section.' });
  }
});

// Update Section (Super Admin only)
router.put('/sections/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, isActive } = req.body;

    const existing = await prisma.sectionMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Section not found.' });
      return;
    }

    const updated = await prisma.sectionMaster.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(code && { code: code.toUpperCase().trim() }),
        ...(isActive !== undefined && { isActive }),
      },
      include: { office: { select: { id: true, name: true, code: true } } },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating section:', error);
    res.status(500).json({ error: error.message || 'Failed to update section.' });
  }
});

// Delete Section (Super Admin only)
router.delete('/sections/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.sectionMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Section not found.' });
      return;
    }

    // Unbind users mapped to this section so foreign keys don't block deletion
    await prisma.user.updateMany({
      where: { sectionId: id },
      data: { sectionId: null, sectionName: null },
    });

    // Unbind any pending employee transfer requests pointing to this section
    await prisma.user.updateMany({
      where: { transferToSectionId: id },
      data: { transferToSectionId: null },
    });

    await prisma.sectionMaster.delete({ where: { id } });
    console.log(`🗑️ [SECTION DELETED] Section '${existing.name}' (${existing.code}) deleted by Super Admin ${req.user?.name}`);

    res.json({ success: true, message: `Section '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    console.error('Error deleting section:', error);
    res.status(500).json({ error: error.message || 'Failed to delete section.' });
  }
});

// ==========================================
// 3. DESIGNATION MASTERS
// ==========================================

// Get Designations
router.get('/designations', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const designations = await prisma.designationMaster.findMany({
      orderBy: { title: 'asc' },
    });
    res.json(designations);
  } catch (error) {
    console.error('Error fetching designations:', error);
    res.status(500).json({ error: 'Failed to fetch designations.' });
  }
});

// Create Designation (Super Admin only)
router.post('/designations', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { title, cadre } = req.body;
    if (!title) {
      res.status(400).json({ error: 'Designation Title is required.' });
      return;
    }

    const existing = await prisma.designationMaster.findUnique({ where: { title: title.trim() } });
    if (existing) {
      res.status(400).json({ error: `Designation '${title}' already exists.` });
      return;
    }

    const designation = await prisma.designationMaster.create({
      data: {
        title: title.trim(),
        cadre: cadre ? cadre.trim() : null,
        isActive: true,
      },
    });

    res.status(201).json(designation);
  } catch (error: any) {
    console.error('Error creating designation:', error);
    res.status(500).json({ error: error.message || 'Failed to create designation.' });
  }
});

// Update Designation
router.put('/designations/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, cadre, isActive } = req.body;

    const updated = await prisma.designationMaster.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(cadre !== undefined && { cadre: cadre ? cadre.trim() : null }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating designation:', error);
    res.status(500).json({ error: error.message || 'Failed to update designation.' });
  }
});

// Delete Designation
router.delete('/designations/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    await prisma.designationMaster.delete({ where: { id } });
    res.json({ success: true, message: 'Designation deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting designation:', error);
    res.status(500).json({ error: error.message || 'Failed to delete designation.' });
  }
});

// ==========================================
// 4. ROLES & MODULE PERMISSIONS
// ==========================================

// Get all roles with parsed permissions (SUPER_ADMIN role only visible to Super Admin)
router.get('/roles', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';

    let whereClause: any = {};
    if (!isSuperAdmin) {
      whereClause = {
        code: { not: 'SUPER_ADMIN' },
      };
    }

    const roles = await prisma.roleMaster.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });

    const formatted = roles.map((r) => {
      let permissions = [];
      try {
        permissions = JSON.parse(r.permissionsJson);
      } catch (e) {
        permissions = [];
      }
      return {
        ...r,
        permissions,
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles.' });
  }
});

// Create new role with module permissions (Super Admin only)
router.post('/roles', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, code, description, permissions } = req.body;

    if (!name || !code || !Array.isArray(permissions)) {
      res.status(400).json({ error: 'Role name, unique role code, and permissions array are required.' });
      return;
    }

    const cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');

    const existingName = await prisma.roleMaster.findUnique({ where: { name: name.trim() } });
    if (existingName) {
      res.status(400).json({ error: `Role name '${name}' is already taken.` });
      return;
    }

    const existingCode = await prisma.roleMaster.findUnique({ where: { code: cleanCode } });
    if (existingCode) {
      res.status(400).json({ error: `Role code '${cleanCode}' is already taken.` });
      return;
    }

    const role = await prisma.roleMaster.create({
      data: {
        name: name.trim(),
        code: cleanCode,
        description: description ? description.trim() : null,
        isSystem: false,
        isActive: true,
        permissionsJson: JSON.stringify(permissions),
      },
    });

    res.status(201).json({
      ...role,
      permissions,
    });
  } catch (error: any) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: error.message || 'Failed to create role.' });
  }
});

// Update role & permissions (Super Admin only)
router.put('/roles/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, code, description, permissions, isActive } = req.body;

    const existing = await prisma.roleMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Role not found.' });
      return;
    }

    if (name && name.trim() !== existing.name) {
      const dupeName = await prisma.roleMaster.findUnique({ where: { name: name.trim() } });
      if (dupeName && dupeName.id !== id) {
        res.status(400).json({ error: `Role name '${name.trim()}' is already taken.` });
        return;
      }
    }

    let cleanCode = undefined;
    if (code && !existing.isSystem) {
      cleanCode = code.toUpperCase().trim().replace(/[^A-Z0-9_-]/g, '');
      if (cleanCode !== existing.code) {
        const dupeCode = await prisma.roleMaster.findUnique({ where: { code: cleanCode } });
        if (dupeCode && dupeCode.id !== id) {
          res.status(400).json({ error: `Role code '${cleanCode}' is already taken.` });
          return;
        }
      }
    }

    const updated = await prisma.roleMaster.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(cleanCode && { code: cleanCode }),
        ...(description !== undefined && { description: description ? description.trim() : null }),
        ...(permissions && { permissionsJson: JSON.stringify(permissions) }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    let parsedPermissions = [];
    try {
      parsedPermissions = JSON.parse(updated.permissionsJson);
    } catch (e) {
      parsedPermissions = [];
    }

    res.json({
      ...updated,
      permissions: parsedPermissions,
    });
  } catch (error: any) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: error.message || 'Failed to update role.' });
  }
});

// Delete role (Super Admin only, cannot delete system role)
router.delete('/roles/:id', authenticate, requireRole('SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.roleMaster.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Role not found.' });
      return;
    }

    if (existing.isSystem) {
      res.status(400).json({ error: 'System roles cannot be deleted.' });
      return;
    }

    const userCount = await prisma.user.count({ where: { roleId: id } });
    if (userCount > 0) {
      res.status(400).json({ error: `Cannot delete role. ${userCount} user(s) are assigned to this role.` });
      return;
    }

    await prisma.roleMaster.delete({ where: { id } });
    res.json({ success: true, message: 'Role deleted successfully.' });
  } catch (error: any) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: error.message || 'Failed to delete role.' });
  }
});

export default router;
