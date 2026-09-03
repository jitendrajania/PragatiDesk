import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { sendWelcomeEmail, sendProfileUpdatedEmail } from '../services/mail.service';

const router = Router();

// Validation Regex Helpers
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(?:(?:\+|0{0,2})91(\s*[\-]\s*)?|[0]?)?[6789]\d{9}$/;
const SSO_REGEX = /^[A-Za-z0-9_\-\.]{3,30}$/;

function validateUserFields(data: { email?: string; phone?: string; ssoId?: string; gmailId?: string }) {
  if (data.email && !EMAIL_REGEX.test(data.email.trim())) {
    return 'Invalid Email Address format.';
  }
  if (data.gmailId && !EMAIL_REGEX.test(data.gmailId.trim())) {
    return 'Invalid Gmail ID format.';
  }
  if (data.phone && !PHONE_REGEX.test(data.phone.trim().replace(/[\s\-]/g, ''))) {
    return 'Invalid Mobile Number format (must be a valid 10-digit mobile number).';
  }
  if (data.ssoId && !SSO_REGEX.test(data.ssoId.trim())) {
    return 'Invalid SSO ID format (alphanumeric, 3-30 characters).';
  }
  return null;
}

// 1. Get Assignees Scoped by Project or Group Head Section Isolation
router.get('/assignees', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { projectId, officeId } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    if (projectId) {
      const members = await prisma.projectMember.findMany({
        where: { projectId: String(projectId) },
        include: {
          user: {
            include: { office: true, section: true },
          },
        },
      });

      const formatted = members.map((m) => {
        let roles = [];
        try {
          roles = JSON.parse(m.rolesJson);
        } catch (e) {
          roles = [];
        }
        return {
          id: m.user.id,
          name: m.user.name,
          designation: m.user.designation,
          displayName: `${m.user.name} — ${m.user.designation} (${m.user.ssoId})`,
          email: m.user.email,
          ssoId: m.user.ssoId,
          phone: m.user.phone,
          officeName: m.user.office?.name || m.user.officeName,
          sectionName: m.user.section?.name || m.user.sectionName,
          systemRole: m.user.systemRole,
          roles: roles,
        };
      });

      res.json(formatted);
      return;
    }

    // Role-based assignee scoping (Strict Section Isolation)
    let whereClause: any = { isActive: true };

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        // Office Super Admin sees all active staff in their office (excluding Super Admin)
        whereClause = {
          isActive: true,
          officeId: req.user?.officeId,
          systemRole: { not: 'SUPER_ADMIN' },
        };
      } else if (isGroupHead) {
        // Group Head strictly sees employees in their assigned section + self
        whereClause = {
          isActive: true,
          OR: [
            { id: req.user?.id },
            { sectionId: req.user?.sectionId, systemRole: 'EMPLOYEE' },
          ],
        };
      } else {
        // Employee sees members of their same section or self
        whereClause = {
          isActive: true,
          OR: [
            { id: req.user?.id },
            { sectionId: req.user?.sectionId },
          ],
        };
      }
    } else if (officeId) {
      whereClause.officeId = String(officeId);
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: { office: true, section: true },
      orderBy: { name: 'asc' },
    });

    const formatted = users.map((u) => ({
      id: u.id,
      name: u.name,
      designation: u.designation,
      displayName: `${u.name} — ${u.designation} (${u.ssoId})`,
      email: u.email,
      ssoId: u.ssoId,
      phone: u.phone,
      officeName: u.office?.name || u.officeName,
      sectionName: u.section?.name || u.sectionName,
      systemRole: u.systemRole,
    }));

    res.json(formatted);
  } catch (error) {
    console.error('Error fetching assignees:', error);
    res.status(500).json({ error: 'Failed to fetch assignees' });
  }
});

// 2. List Group Heads / Sections
router.get('/group-heads', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { officeId } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';

    let whereClause: any = {
      systemRole: 'GROUP_HEAD',
      isActive: true,
    };

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        whereClause.officeId = req.user?.officeId;
      } else {
        whereClause.officeId = req.user?.officeId;
      }
    } else if (officeId) {
      whereClause.officeId = String(officeId);
    }

    const groupHeads = await prisma.user.findMany({
      where: whereClause,
      include: {
        office: true,
        section: true,
        managedProjects: {
          select: {
            id: true,
            projectCode: true,
            name: true,
            status: true,
            _count: {
              select: {
                members: true,
                tasks: true,
              },
            },
          },
        },
        _count: {
          select: {
            subordinates: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(groupHeads);
  } catch (error) {
    console.error('Error fetching group heads:', error);
    res.status(500).json({ error: 'Failed to fetch group heads' });
  }
});

// 3. List All Users (for Super Admin & Office Super Admin Portals)
router.get('/', authenticate, requireRole('SUPER_ADMIN', 'OFFICE_SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { officeId, role, search } = req.query;
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';

    const where: any = {};

    if (!isSuperAdmin) {
      where.officeId = req.user?.officeId;
      where.systemRole = { not: 'SUPER_ADMIN' };
    } else if (officeId) {
      where.officeId = String(officeId);
    }

    if (role) {
      where.systemRole = String(role);
    }

    if (search) {
      const q = String(search).toLowerCase();
      where.OR = [
        { name: { contains: q } },
        { email: { contains: q } },
        { ssoId: { contains: q } },
        { designation: { contains: q } },
        { phone: { contains: q } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      include: {
        office: true,
        section: true,
        customRole: true,
        managedProjects: {
          select: { id: true, projectCode: true, name: true },
        },
        _count: {
          select: {
            assignedTasks: true,
            disposedTasks: true,
            projectMemberships: true,
          },
        },
      },
      orderBy: [{ systemRole: 'asc' }, { name: 'asc' }],
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users list.' });
  }
});

// 4. Create User (Super Admin / Office Super Admin)
router.post('/', authenticate, requireRole('SUPER_ADMIN', 'OFFICE_SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let {
      name,
      email,
      password,
      designation,
      ssoId,
      phone,
      gmailId,
      officeId,
      sectionId,
      systemRole,
      roleId,
    } = req.body;

    if (!name || !email || !designation || !ssoId) {
      res.status(400).json({ error: 'Full Name, Official Email, Designation, and SSO ID are required.' });
      return;
    }

    const valErr = validateUserFields({ email, phone, ssoId, gmailId });
    if (valErr) {
      res.status(400).json({ error: valErr });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanSsoId = ssoId.toUpperCase().trim();
    const cleanPhone = phone ? phone.trim().replace(/[\s\-]/g, '') : null;
    const cleanGmail = gmailId ? gmailId.toLowerCase().trim() : null;

    // Office Super Admin restriction: strictly forced to their own office
    if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      officeId = req.user.officeId;
      if (systemRole === 'SUPER_ADMIN' || systemRole === 'OFFICE_SUPER_ADMIN') {
        res.status(403).json({ error: 'Office Super Admins cannot create Super Admin or Office Super Admin accounts.' });
        return;
      }
      if (roleId) {
        const targetRole = await prisma.roleMaster.findUnique({ where: { id: roleId } });
        if (targetRole && targetRole.code === 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Office Super Admins cannot assign the Super Admin role.' });
          return;
        }
      }
    }

    // Uniqueness checks
    const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingEmail) {
      res.status(400).json({ error: `A user with email '${cleanEmail}' already exists.` });
      return;
    }

    const existingSso = await prisma.user.findUnique({ where: { ssoId: cleanSsoId } });
    if (existingSso) {
      res.status(400).json({ error: `SSO ID '${cleanSsoId}' is already registered.` });
      return;
    }

    if (cleanPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (existingPhone) {
        res.status(400).json({ error: `Mobile Number '${cleanPhone}' is already registered with another user.` });
        return;
      }
    }

    if (cleanGmail) {
      const existingGmail = await prisma.user.findUnique({ where: { gmailId: cleanGmail } });
      if (existingGmail) {
        res.status(400).json({ error: `Gmail ID '${cleanGmail}' is already registered with another user.` });
        return;
      }
    }

    // Lookup office and section names
    let officeName = null;
    let finalOfficeId = officeId || null;
    let finalSectionId = sectionId || null;
    let sectionName = null;

    if (systemRole === 'SUPER_ADMIN') {
      finalOfficeId = null;
      officeName = 'Statewide Secretariat HQ (Global Governance)';
      finalSectionId = null;
      sectionName = null;
    } else if (systemRole === 'OFFICE_SUPER_ADMIN') {
      if (finalOfficeId) {
        const off = await prisma.officeMaster.findUnique({ where: { id: finalOfficeId } });
        if (off) officeName = off.name;
      }
      finalSectionId = null;
      sectionName = null;
    } else {
      if (finalOfficeId) {
        const off = await prisma.officeMaster.findUnique({ where: { id: finalOfficeId } });
        if (off) officeName = off.name;
      }
      if (!finalSectionId) {
        res.status(400).json({ error: 'Section/Group Head Name is mandatory.' });
        return;
      }
      const sec = await prisma.sectionMaster.findUnique({ where: { id: finalSectionId } });
      if (sec) sectionName = sec.name;
    }

    // Default password generation & first-time login enforcement
    const defaultPassword = password || `DoITC@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        designation: designation.trim(),
        ssoId: cleanSsoId,
        phone: cleanPhone,
        gmailId: cleanGmail,
        officeId: finalOfficeId,
        officeName,
        sectionId: finalSectionId,
        sectionName,
        systemRole: systemRole || 'EMPLOYEE',
        roleId: roleId || null,
        createdById: req.user?.id,
        isActive: true,
        mustChangePassword: true, // Forces first-time password update
      },
      include: {
        office: true,
        section: true,
        customRole: true,
      },
    });

    console.log(`👤 [USER ONBOARDED] Created ${user.name} (${user.ssoId}) with default password: ${defaultPassword}`);

    // Trigger Automated Welcome Email with Default Password
    try {
      await sendWelcomeEmail(
        {
          name: user.name,
          email: user.email,
          gmailId: user.gmailId,
          designation: user.designation,
          ssoId: user.ssoId,
          officeName: user.office?.name || user.officeName,
          sectionName: user.section?.name || user.sectionName,
          systemRole: user.systemRole,
        },
        defaultPassword
      );
    } catch (err) {
      console.error('⚠️ Failed to dispatch welcome email:', err);
    }

    res.status(201).json({
      ...user,
      generatedDefaultPassword: defaultPassword,
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user account.' });
  }
});

// 5. List Employees with Strict Section Isolation
router.get('/employees', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    let whereClause: any = {};

    if (!isSuperAdmin) {
      if (isOfficeSuperAdmin) {
        // Office Super Admin sees all staff in their office (excluding Super Admin)
        whereClause = {
          officeId: req.user?.officeId,
          systemRole: { not: 'SUPER_ADMIN' },
        };
      } else if (isGroupHead) {
        // STRICT SECTION ISOLATION: Group Heads see employees mapped to their section OR incoming pending transfers directed to them
        whereClause = {
          OR: [
            { sectionId: req.user?.sectionId, systemRole: 'EMPLOYEE' },
            { transferToGroupHeadId: req.user?.id, transferStatus: 'PENDING_TRANSFER' },
            { transferToSectionId: req.user?.sectionId, transferStatus: 'PENDING_TRANSFER' },
          ],
        };
      } else {
        // Regular employee sees active employees in their same section
        whereClause = {
          isActive: true,
          sectionId: req.user?.sectionId,
        };
      }
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      include: {
        office: true,
        section: true,
        transferToSection: {
          include: { office: true },
        },
        transferToGroupHead: {
          select: { id: true, name: true, designation: true, ssoId: true },
        },
        transferInitiatedBy: {
          select: { id: true, name: true, designation: true, ssoId: true },
        },
        projectMemberships: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                projectCode: true,
              },
            },
          },
        },
        _count: {
          select: {
            assignedTasks: true,
            disposedTasks: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json(users);
  } catch (error) {
    console.error('Error fetching employees:', error);
    res.status(500).json({ error: 'Failed to fetch employees.' });
  }
});

// 6. Register New Employee by Group Head / Section (Strict Auto-Fill Section Context)
router.post('/employees', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let {
      name,
      email,
      designation,
      ssoId,
      phone,
      gmailId,
      officeId,
      sectionId,
      password,
    } = req.body;

    if (!name || !email || !designation || !ssoId) {
      res.status(400).json({ error: 'Name, Official Email, Designation, and SSO ID are required.' });
      return;
    }

    // Auto-fill context and force role to EMPLOYEE for Group Head
    if (req.user?.systemRole === 'GROUP_HEAD') {
      officeId = req.user.officeId;
      sectionId = req.user.sectionId;
    } else if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      officeId = req.user.officeId;
    }

    if (!sectionId) {
      res.status(400).json({ error: 'Section/Group Head Name is mandatory.' });
      return;
    }

    const valErr = validateUserFields({ email, phone, ssoId, gmailId });
    if (valErr) {
      res.status(400).json({ error: valErr });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanSsoId = ssoId.toUpperCase().trim();
    const cleanPhone = phone ? phone.trim().replace(/[\s\-]/g, '') : null;
    const cleanGmail = gmailId ? gmailId.toLowerCase().trim() : null;

    // Check uniqueness
    const existingEmail = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existingEmail) {
      res.status(400).json({ error: `A user with email '${cleanEmail}' already exists.` });
      return;
    }

    const existingSso = await prisma.user.findUnique({ where: { ssoId: cleanSsoId } });
    if (existingSso) {
      res.status(400).json({ error: `SSO ID '${cleanSsoId}' is already registered.` });
      return;
    }

    if (cleanPhone) {
      const existingPhone = await prisma.user.findUnique({ where: { phone: cleanPhone } });
      if (existingPhone) {
        res.status(400).json({ error: `Mobile Number '${cleanPhone}' is already in use.` });
        return;
      }
    }

    if (cleanGmail) {
      const existingGmail = await prisma.user.findUnique({ where: { gmailId: cleanGmail } });
      if (existingGmail) {
        res.status(400).json({ error: `Gmail ID '${cleanGmail}' is already registered.` });
        return;
      }
    }

    // Resolve Office & Section names
    let officeName = req.user?.officeName;
    if (officeId) {
      const off = await prisma.officeMaster.findUnique({ where: { id: officeId } });
      if (off) officeName = off.name;
    }

    let sectionName = req.user?.sectionName;
    if (sectionId) {
      const sec = await prisma.sectionMaster.findUnique({ where: { id: sectionId } });
      if (sec) sectionName = sec.name;
    }

    const defaultPassword = password || `DoITC@${Math.floor(1000 + Math.random() * 9000)}`;
    const passwordHash = await bcrypt.hash(defaultPassword, 10);

    const employee = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        designation: designation.trim(),
        ssoId: cleanSsoId,
        phone: cleanPhone,
        gmailId: cleanGmail,
        officeId: officeId || null,
        officeName,
        sectionId: sectionId || null,
        sectionName,
        systemRole: 'EMPLOYEE',
        createdById: req.user?.id,
        isActive: true,
        mustChangePassword: true,
      },
      include: {
        office: true,
        section: true,
      },
    });

    // Trigger Automated Welcome Email with Default Password
    try {
      await sendWelcomeEmail(
        {
          name: employee.name,
          email: employee.email,
          gmailId: employee.gmailId,
          designation: employee.designation,
          ssoId: employee.ssoId,
          officeName: employee.office?.name || employee.officeName,
          sectionName: employee.section?.name || employee.sectionName,
          systemRole: employee.systemRole,
        },
        defaultPassword
      );
    } catch (err) {
      console.error('⚠️ Failed to dispatch welcome email:', err);
    }

    res.status(201).json({
      ...employee,
      generatedDefaultPassword: defaultPassword,
    });
  } catch (error: any) {
    console.error('Error creating employee:', error);
    res.status(500).json({ error: error.message || 'Failed to create employee.' });
  }
});

// 7. Update User Profile with Strict Deactivation & Access Hierarchy
router.put('/:id', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      name,
      designation,
      ssoId,
      email,
      phone,
      gmailId,
      officeId,
      sectionId,
      systemRole,
      roleId,
      isActive,
    } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    // -------------------------------------------------------------------------
    // HIERARCHY RULE 1: Self-Deactivation Restriction
    // "A Group Head / Section In-Charge (or any user) cannot deactivate their own account."
    // -------------------------------------------------------------------------
    if (req.user?.id === id && isActive === false) {
      res.status(400).json({ error: 'Self-deactivation restriction: You cannot deactivate your own account.' });
      return;
    }

    // -------------------------------------------------------------------------
    // HIERARCHY RULE 2: Privilege Scope for Group Head activation/deactivation
    // "Only the Super Admin or Office Super Admin has the authority to activate or deactivate a Group Head."
    // -------------------------------------------------------------------------
    if (existing.systemRole === 'GROUP_HEAD' && isActive !== undefined && isActive !== existing.isActive) {
      if (!isSuperAdmin && !isOfficeSuperAdmin) {
        res.status(403).json({ error: 'Privilege scope: Only Super Admin or Office Super Admin has the authority to activate or deactivate a Group Head.' });
        return;
      }
      if (isOfficeSuperAdmin && existing.officeId !== req.user?.officeId) {
        res.status(403).json({ error: 'Access denied: You can only activate or deactivate Group Heads in your assigned office.' });
        return;
      }
    }

    // -------------------------------------------------------------------------
    // HIERARCHY RULE 3: Role Limitation for Group Head
    // "A Group Head / Section In-Charge can only perform user management actions (add, edit, transfer, activate/deactivate) for employees mapped directly under their section."
    // -------------------------------------------------------------------------
    if (isGroupHead) {
      if (existing.id === req.user?.id) {
        // Editing own profile info: cannot change office, section, systemRole, or active status
        if (systemRole || officeId || sectionId || (isActive !== undefined && isActive !== existing.isActive)) {
          res.status(403).json({ error: 'Group Heads cannot modify their own assigned office, section, role, or active status.' });
          return;
        }
      } else {
        // Managing other users: Must strictly be an EMPLOYEE directly mapped under their section!
        if (existing.sectionId !== req.user?.sectionId || existing.systemRole !== 'EMPLOYEE') {
          res.status(403).json({ error: 'Role limitation: A Group Head can only perform user management actions for employees mapped directly under their section.' });
          return;
        }
      }
    } else if (isOfficeSuperAdmin) {
      if (existing.officeId !== req.user?.officeId) {
        res.status(403).json({ error: 'Access denied: You can only edit users in your assigned office.' });
        return;
      }
      if (existing.systemRole === 'SUPER_ADMIN' || systemRole === 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Office Super Admins cannot modify Super Admin accounts or promote to Super Admin.' });
        return;
      }
      if (roleId) {
        const targetRole = await prisma.roleMaster.findUnique({ where: { id: roleId } });
        if (targetRole && targetRole.code === 'SUPER_ADMIN') {
          res.status(403).json({ error: 'Office Super Admins cannot assign the Super Admin role.' });
          return;
        }
      }
    } else if (!isSuperAdmin) {
      if (existing.id !== req.user?.id) {
        res.status(403).json({ error: 'Access denied: You can only edit your own profile.' });
        return;
      }
    }

    const valErr = validateUserFields({ email, phone, ssoId, gmailId });
    if (valErr) {
      res.status(400).json({ error: valErr });
      return;
    }

    // Check unique constraints on changes
    if (email && email.toLowerCase().trim() !== existing.email) {
      const duplicate = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
      if (duplicate) {
        res.status(400).json({ error: `Email '${email}' is already in use.` });
        return;
      }
    }

    if (ssoId && ssoId.toUpperCase().trim() !== existing.ssoId) {
      const duplicate = await prisma.user.findUnique({ where: { ssoId: ssoId.toUpperCase().trim() } });
      if (duplicate) {
        res.status(400).json({ error: `SSO ID '${ssoId}' is already registered.` });
        return;
      }
    }

    if (phone && phone.trim().replace(/[\s\-]/g, '') !== existing.phone) {
      const duplicate = await prisma.user.findUnique({ where: { phone: phone.trim().replace(/[\s\-]/g, '') } });
      if (duplicate) {
        res.status(400).json({ error: `Mobile number '${phone}' is already in use.` });
        return;
      }
    }

    if (gmailId && gmailId.toLowerCase().trim() !== existing.gmailId) {
      const duplicate = await prisma.user.findUnique({ where: { gmailId: gmailId.toLowerCase().trim() } });
      if (duplicate) {
        res.status(400).json({ error: `Gmail ID '${gmailId}' is already registered.` });
        return;
      }
    }

    const effectiveRole = systemRole || existing.systemRole;

    // Resolve Office & Section names if IDs change
    let officeName = undefined;
    let finalOfficeId = officeId;
    let finalSectionId = sectionId;
    let sectionName = undefined;

    if (effectiveRole === 'SUPER_ADMIN') {
      finalOfficeId = null;
      officeName = 'Statewide Secretariat HQ (Global Governance)';
      finalSectionId = null;
      sectionName = null;
    } else if (effectiveRole === 'OFFICE_SUPER_ADMIN') {
      finalSectionId = null;
      sectionName = null;
      if (officeId && officeId !== existing.officeId) {
        const off = await prisma.officeMaster.findUnique({ where: { id: officeId } });
        if (off) officeName = off.name;
      }
    } else {
      if (officeId && officeId !== existing.officeId) {
        const off = await prisma.officeMaster.findUnique({ where: { id: officeId } });
        if (off) officeName = off.name;
      }
      if (sectionId && sectionId !== existing.sectionId) {
        const sec = await prisma.sectionMaster.findUnique({ where: { id: sectionId } });
        if (sec) sectionName = sec.name;
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(designation && { designation: designation.trim() }),
        ...(ssoId && { ssoId: ssoId.toUpperCase().trim() }),
        ...(email && { email: email.toLowerCase().trim() }),
        ...(phone !== undefined && { phone: phone ? phone.trim().replace(/[\s\-]/g, '') : null }),
        ...(gmailId !== undefined && { gmailId: gmailId ? gmailId.toLowerCase().trim() : null }),
        ...(finalOfficeId !== undefined && (isSuperAdmin || isOfficeSuperAdmin) && { officeId: finalOfficeId }),
        ...(officeName !== undefined && { officeName }),
        ...(finalSectionId !== undefined && (isSuperAdmin || isOfficeSuperAdmin) && { sectionId: finalSectionId }),
        ...(sectionName !== undefined && { sectionName }),
        ...(systemRole && (isSuperAdmin || isOfficeSuperAdmin) && { systemRole }),
        ...(roleId !== undefined && (isSuperAdmin || isOfficeSuperAdmin) && { roleId: roleId || null }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        office: true,
        section: true,
        customRole: true,
      },
    });

    // Compute profile change delta and trigger automated update notification
    const changes: { field: string; label: string; oldValue: any; newValue: any }[] = [];
    if (name && name.trim() !== existing.name) {
      changes.push({ field: 'name', label: 'Full Name', oldValue: existing.name, newValue: name.trim() });
    }
    if (designation && designation.trim() !== existing.designation) {
      changes.push({ field: 'designation', label: 'Designation', oldValue: existing.designation, newValue: designation.trim() });
    }
    if (ssoId && ssoId.toUpperCase().trim() !== existing.ssoId) {
      changes.push({ field: 'ssoId', label: 'SSO ID', oldValue: existing.ssoId, newValue: ssoId.toUpperCase().trim() });
    }
    if (email && email.toLowerCase().trim() !== existing.email) {
      changes.push({ field: 'email', label: 'Official Email', oldValue: existing.email, newValue: email.toLowerCase().trim() });
    }
    if (phone !== undefined) {
      const p = phone ? phone.trim().replace(/[\s\-]/g, '') : null;
      if (p !== existing.phone) {
        changes.push({ field: 'phone', label: 'Mobile Number', oldValue: existing.phone || 'None', newValue: p || 'None' });
      }
    }
    if (gmailId !== undefined) {
      const g = gmailId ? gmailId.toLowerCase().trim() : null;
      if (g !== existing.gmailId) {
        changes.push({ field: 'gmailId', label: 'Personal Gmail ID', oldValue: existing.gmailId || 'None', newValue: g || 'None' });
      }
    }
    if (officeName !== undefined && officeName !== existing.officeName) {
      changes.push({ field: 'officeName', label: 'Office Name', oldValue: existing.officeName, newValue: officeName });
    }
    if (sectionName !== undefined && sectionName !== existing.sectionName) {
      changes.push({ field: 'sectionName', label: 'Group / Section', oldValue: existing.sectionName, newValue: sectionName });
    }
    if (systemRole && systemRole !== existing.systemRole) {
      changes.push({ field: 'systemRole', label: 'System Role', oldValue: existing.systemRole, newValue: systemRole });
    }
    if (isActive !== undefined && isActive !== existing.isActive) {
      changes.push({ field: 'isActive', label: 'Account Status', oldValue: existing.isActive ? 'Active' : 'Deactivated', newValue: isActive ? 'Active' : 'Deactivated' });
    }

    if (changes.length > 0) {
      sendProfileUpdatedEmail(
        {
          name: updated.name,
          email: updated.email,
          gmailId: updated.gmailId,
          designation: updated.designation,
          ssoId: updated.ssoId,
          officeName: updated.office?.name || updated.officeName,
          sectionName: updated.section?.name || updated.sectionName,
          systemRole: updated.systemRole,
        },
        changes,
        req.user
      ).catch((err) => console.error('⚠️ Failed to dispatch profile update notification email:', err));
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user profile.' });
  }
});

// 8. Delete User (Super Admin & Office Super Admin)
router.delete('/:id', authenticate, requireRole('SUPER_ADMIN', 'OFFICE_SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN' && existing.officeId !== req.user.officeId) {
      res.status(403).json({ error: 'Access denied. You can only delete users in your assigned office.' });
      return;
    }

    if (existing.systemRole === 'SUPER_ADMIN') {
      res.status(400).json({ error: 'Super Admin accounts cannot be deleted.' });
      return;
    }

    if (req.user?.id === id) {
      res.status(400).json({ error: 'You cannot delete your own active account.' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Unlink subordinates
      await tx.user.updateMany({
        where: { createdById: id },
        data: { createdById: null },
      });

      // 2. Unlink user transfer references
      await tx.user.updateMany({
        where: { transferToGroupHeadId: id },
        data: { transferToGroupHeadId: null, transferStatus: 'NONE' },
      });
      await tx.user.updateMany({
        where: { transferInitiatedById: id },
        data: { transferInitiatedById: null },
      });

      // 3. Project memberships
      await tx.projectMember.deleteMany({
        where: { userId: id },
      });

      // 4. Project transfers
      await tx.project.updateMany({
        where: { transferToGroupHeadId: id },
        data: { transferToGroupHeadId: null, transferStatus: 'NONE' },
      });

      // 5. Managed projects (reassign to Super Admin or first available admin)
      const superAdmin = await tx.user.findFirst({ where: { systemRole: 'SUPER_ADMIN' } });
      if (superAdmin) {
        await tx.project.updateMany({
          where: { groupHeadId: id },
          data: { groupHeadId: superAdmin.id },
        });

        await tx.task.updateMany({
          where: { createdById: id },
          data: { createdById: superAdmin.id },
        });

        await tx.taskActivity.updateMany({
          where: { actorId: id },
          data: { actorId: superAdmin.id },
        });

        await tx.followUpReport.updateMany({
          where: { reportedById: id },
          data: { reportedById: superAdmin.id },
        });
      }

      // 6. Tasks assigned to or disposed by this user
      await tx.task.updateMany({
        where: { currentAssigneeId: id },
        data: { currentAssigneeId: null },
      });
      await tx.task.updateMany({
        where: { disposedById: id },
        data: { disposedById: null },
      });

      // 7. Delete the user
      await tx.user.delete({ where: { id } });
    });

    console.log(`🗑️ [USER DELETED] User '${existing.name}' (${existing.email}) deleted by ${req.user?.systemRole} ${req.user?.name}`);
    res.json({ success: true, message: `User '${existing.name}' deleted successfully.` });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user.' });
  }
});

// 9. Initiate Employee Transfer to another Section in the Office with Current Group Exclusion
router.post(['/:id/transfer/initiate', '/:id/transfer-section'], authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { targetSectionId, remark } = req.body;

    if (!targetSectionId) {
      res.status(400).json({ error: 'Target Section is required.' });
      return;
    }

    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    // -------------------------------------------------------------------------
    // TRANSFER VALIDATION RULE: Exclude Current Group
    // "When initiating an employee transfer to another group/section, the employee's current group must be excluded."
    // -------------------------------------------------------------------------
    if (targetSectionId === employee.sectionId) {
      res.status(400).json({ error: 'Validation error: Target section cannot be the employee\'s current section.' });
      return;
    }

    // Role Limitation check for Group Head
    if (req.user?.systemRole === 'GROUP_HEAD') {
      if (employee.sectionId !== req.user.sectionId || employee.systemRole !== 'EMPLOYEE' || employee.id === req.user.id) {
        res.status(403).json({ error: 'Role limitation: You can only transfer employees mapped directly under your section.' });
        return;
      }
    } else if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      if (employee.officeId !== req.user.officeId) {
        res.status(403).json({ error: 'Access denied: You can only transfer employees within your assigned office.' });
        return;
      }
    }

    const targetSection = await prisma.sectionMaster.findUnique({
      where: { id: targetSectionId },
      include: { office: true },
    });

    if (!targetSection) {
      res.status(404).json({ error: 'Target Section not found.' });
      return;
    }

    // If transferred by Group Head, target section must be within the same office
    if (req.user?.systemRole === 'GROUP_HEAD' && targetSection.officeId !== req.user.officeId) {
      res.status(400).json({ error: 'Target section must be within your assigned office.' });
      return;
    }

    // Find the target section Group Head
    const targetGroupHead = await prisma.user.findFirst({
      where: {
        sectionId: targetSection.id,
        systemRole: 'GROUP_HEAD',
        isActive: true,
      },
    });

    const updated = await prisma.user.update({
      where: { id },
      data: {
        transferStatus: 'PENDING_TRANSFER',
        transferToSectionId: targetSection.id,
        transferToGroupHeadId: targetGroupHead?.id || null,
        transferRemark: remark ? String(remark).trim() : `Transfer initiated to ${targetSection.name}`,
        transferInitiatedById: req.user?.id,
        transferInitiatedAt: new Date(),
      },
      include: {
        office: true,
        section: true,
        transferToSection: true,
        transferToGroupHead: true,
        transferInitiatedBy: true,
      },
    });

    res.json({
      success: true,
      message: `Transfer request initiated for '${employee.name}' to '${targetSection.name}'. Pending recipient acceptance.`,
      employee: updated,
    });
  } catch (error: any) {
    console.error('Error initiating employee transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate employee transfer.' });
  }
});

// 10. Accept Employee Transfer (Recipient Group Head / Office Super Admin / Super Admin)
router.post('/:id/transfer/accept', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const employee = await prisma.user.findUnique({
      where: { id },
      include: { transferToSection: { include: { office: true } } },
    });

    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    if (employee.transferStatus !== 'PENDING_TRANSFER' || !employee.transferToSectionId) {
      res.status(400).json({ error: 'This employee does not have a pending transfer request.' });
      return;
    }

    // Authorization check
    if (req.user?.systemRole === 'GROUP_HEAD') {
      const isTargetGroupHead = employee.transferToGroupHeadId === req.user.id || employee.transferToSectionId === req.user.sectionId;
      if (!isTargetGroupHead) {
        res.status(403).json({ error: 'Access denied. Only the receiving Group Head or Super Admin can accept this transfer.' });
        return;
      }
    } else if (req.user?.systemRole === 'OFFICE_SUPER_ADMIN') {
      if (employee.officeId !== req.user.officeId && employee.transferToSection?.officeId !== req.user.officeId) {
        res.status(403).json({ error: 'Access denied. You can only accept transfers within your office.' });
        return;
      }
    }

    const targetSection = employee.transferToSection;
    if (!targetSection) {
      res.status(400).json({ error: 'Target section information is invalid.' });
      return;
    }

    const oldSectionName = employee.sectionName;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        sectionId: targetSection.id,
        sectionName: targetSection.name,
        officeId: targetSection.officeId,
        officeName: targetSection.office.name,
        transferStatus: 'NONE',
        transferToSectionId: null,
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
        transferInitiatedById: null,
      },
      include: {
        office: true,
        section: true,
      },
    });

    // Send profile update notification
    sendProfileUpdatedEmail(
      {
        name: updated.name,
        email: updated.email,
        gmailId: updated.gmailId,
        designation: updated.designation,
        ssoId: updated.ssoId,
        officeName: updated.office?.name || updated.officeName,
        sectionName: updated.section?.name || updated.sectionName,
        systemRole: updated.systemRole,
      },
      [
        {
          field: 'sectionName',
          label: 'Group Head / Section',
          oldValue: oldSectionName || 'Previous Section',
          newValue: targetSection.name,
        },
      ],
      req.user
    ).catch((err) => console.error('Failed to send employee transfer email:', err));

    res.json({
      success: true,
      message: `Employee '${employee.name}' transfer accepted. Successfully mapped to '${targetSection.name}'.`,
      employee: updated,
    });
  } catch (error: any) {
    console.error('Error accepting employee transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to accept employee transfer.' });
  }
});

// 11. Reject or Cancel Employee Transfer (Sender can Cancel, Recipient can Decline)
router.post('/:id/transfer/reject', authenticate, requireRole('GROUP_HEAD', 'OFFICE_SUPER_ADMIN', 'SUPER_ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { rejectionRemark } = req.body;

    const employee = await prisma.user.findUnique({ where: { id } });
    if (!employee) {
      res.status(404).json({ error: 'Employee not found.' });
      return;
    }

    if (employee.transferStatus !== 'PENDING_TRANSFER') {
      res.status(400).json({ error: 'This employee does not have an active pending transfer.' });
      return;
    }

    // Authorization: Super Admin, Office Super Admin, Sender, or Recipient
    const isSender = req.user?.id === employee.transferInitiatedById || (req.user?.systemRole === 'GROUP_HEAD' && req.user.sectionId === employee.sectionId);
    const isRecipient = req.user?.id === employee.transferToGroupHeadId || (req.user?.systemRole === 'GROUP_HEAD' && req.user.sectionId === employee.transferToSectionId);
    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN' && req.user.officeId === employee.officeId;

    if (!isSender && !isRecipient && !isSuperAdmin && !isOfficeSuperAdmin) {
      res.status(403).json({ error: 'Access denied. You are not authorized to cancel or decline this transfer.' });
      return;
    }

    const isCancelledBySender = isSender && !isRecipient;

    const updated = await prisma.user.update({
      where: { id },
      data: {
        transferStatus: 'NONE',
        transferToSectionId: null,
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
        transferInitiatedById: null,
      },
      include: { office: true, section: true },
    });

    res.json({
      success: true,
      message: isCancelledBySender
        ? `Employee transfer request for '${employee.name}' has been cancelled by sender.`
        : `Employee transfer request for '${employee.name}' was declined.`,
      employee: updated,
    });
  } catch (error: any) {
    console.error('Error cancelling/declining employee transfer:', error);
    res.status(500).json({ error: error.message || 'Failed to cancel/decline employee transfer.' });
  }
});

// 12. Reset / Set Default Password for User (Super Admin & Office Super Admin)
router.post('/:id/reset-password', authenticate, requireRole('SUPER_ADMIN', 'OFFICE_SUPER_ADMIN', 'GROUP_HEAD'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { customPassword } = req.body;

    const targetUser = await prisma.user.findUnique({
      where: { id },
      include: { office: true, section: true },
    });

    if (!targetUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isSuperAdmin = req.user?.systemRole === 'SUPER_ADMIN';
    const isOfficeSuperAdmin = req.user?.systemRole === 'OFFICE_SUPER_ADMIN';
    const isGroupHead = req.user?.systemRole === 'GROUP_HEAD';

    // Office Super Admin scoping
    if (isOfficeSuperAdmin) {
      if (targetUser.officeId !== req.user?.officeId) {
        res.status(403).json({ error: 'Access denied: You can only reset passwords for users in your assigned office.' });
        return;
      }
      if (targetUser.systemRole === 'SUPER_ADMIN') {
        res.status(403).json({ error: 'Access denied: Office Super Admins cannot reset passwords for Super Admin accounts.' });
        return;
      }
    }

    // Group Head scoping
    if (isGroupHead) {
      if (targetUser.sectionId !== req.user?.sectionId || targetUser.systemRole !== 'EMPLOYEE') {
        res.status(403).json({ error: 'Access denied: Group Heads can only reset passwords for staff in their own section.' });
        return;
      }
    }

    const newPassword = customPassword && customPassword.trim()
      ? customPassword.trim()
      : `DoITC@${Math.floor(1000 + Math.random() * 9000)}`;

    const passwordHash = await bcrypt.hash(newPassword, 10);

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        mustChangePassword: true,
      },
      include: { office: true, section: true },
    });

    console.log(`🔑 [PASSWORD RESET] Reset password for ${updatedUser.name} (${updatedUser.ssoId}) by ${req.user?.name}. New Password: ${newPassword}`);

    // Trigger Automated Welcome / Credentials Notification Email
    sendWelcomeEmail(
      {
        name: updatedUser.name,
        email: updatedUser.email,
        gmailId: updatedUser.gmailId,
        designation: updatedUser.designation,
        ssoId: updatedUser.ssoId,
        officeName: updatedUser.office?.name || updatedUser.officeName,
        sectionName: updatedUser.section?.name || updatedUser.sectionName,
        systemRole: updatedUser.systemRole,
      },
      newPassword
    ).catch((err) => console.error('⚠️ Failed to dispatch reset password notification email:', err));

    res.json({
      success: true,
      message: `Password for ${updatedUser.name} (${updatedUser.ssoId}) has been reset successfully.`,
      generatedDefaultPassword: newPassword,
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        ssoId: updatedUser.ssoId,
        email: updatedUser.email,
        designation: updatedUser.designation,
        officeName: updatedUser.office?.name || updatedUser.officeName,
        sectionName: updatedUser.section?.name || updatedUser.sectionName,
      },
    });
  } catch (error: any) {
    console.error('Error resetting user password:', error);
    res.status(500).json({ error: error.message || 'Failed to reset user password.' });
  }
});

export default router;
