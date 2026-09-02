import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

export interface ModulePermission {
  module: string;
  canView: boolean;
  canEdit: boolean;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    designation: string;
    ssoId: string;
    phone?: string | null;
    gmailId?: string | null;
    officeId?: string | null;
    officeName?: string | null;
    sectionId?: string | null;
    sectionName?: string | null;
    systemRole: string;
    roleId?: string | null;
    isActive: boolean;
    mustChangePassword: boolean;
    permissions?: ModulePermission[];
    assignedProjectRoles?: string[];
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'pragatidesk_doitc_secret_key_2026_jwt_token_secure';

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required. Token missing.' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; email: string; systemRole: string };

    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        customRole: true,
        office: true,
        section: true,
        projectMemberships: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'User not found or account is deactivated.' });
      return;
    }

    let assignedProjectRoles: string[] = [];
    if (user.projectMemberships && Array.isArray(user.projectMemberships)) {
      user.projectMemberships.forEach((pm: any) => {
        try {
          const parsed = JSON.parse(pm.rolesJson);
          if (Array.isArray(parsed)) {
            assignedProjectRoles.push(...parsed);
          }
        } catch (e) {}
      });
    }
    assignedProjectRoles = Array.from(new Set(assignedProjectRoles));

    let permissions: ModulePermission[] = [];
    if (user.customRole?.permissionsJson) {
      try {
        permissions = JSON.parse(user.customRole.permissionsJson);
      } catch (e) {
        permissions = [];
      }
    } else {
      // Default permissions based on systemRole
      if (user.systemRole === 'SUPER_ADMIN') {
        permissions = [
          { module: 'DASHBOARD', canView: true, canEdit: true },
          { module: 'KANBAN', canView: true, canEdit: true },
          { module: 'TASKS', canView: true, canEdit: true },
          { module: 'PROJECTS', canView: true, canEdit: true },
          { module: 'FOLLOWUP', canView: true, canEdit: true },
          { module: 'EMPLOYEES', canView: true, canEdit: true },
          { module: 'REPORTS', canView: true, canEdit: true },
          { module: 'MASTERS', canView: true, canEdit: true },
          { module: 'ROLES_MANAGEMENT', canView: true, canEdit: true },
          { module: 'ADMIN_PORTAL', canView: true, canEdit: true },
        ];
      } else if (user.systemRole === 'OFFICE_SUPER_ADMIN') {
        permissions = [
          { module: 'DASHBOARD', canView: true, canEdit: true },
          { module: 'KANBAN', canView: true, canEdit: true },
          { module: 'TASKS', canView: true, canEdit: true },
          { module: 'PROJECTS', canView: true, canEdit: true },
          { module: 'FOLLOWUP', canView: true, canEdit: true },
          { module: 'EMPLOYEES', canView: true, canEdit: true },
          { module: 'REPORTS', canView: true, canEdit: true },
          { module: 'MASTERS', canView: true, canEdit: false },
          { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
          { module: 'ADMIN_PORTAL', canView: true, canEdit: true },
        ];
      } else if (user.systemRole === 'GROUP_HEAD') {
        permissions = [
          { module: 'DASHBOARD', canView: true, canEdit: true },
          { module: 'KANBAN', canView: true, canEdit: true },
          { module: 'TASKS', canView: true, canEdit: true },
          { module: 'PROJECTS', canView: true, canEdit: true },
          { module: 'FOLLOWUP', canView: true, canEdit: true },
          { module: 'EMPLOYEES', canView: true, canEdit: true },
          { module: 'REPORTS', canView: true, canEdit: true },
          { module: 'MASTERS', canView: false, canEdit: false },
          { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
          { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
        ];
      } else {
        permissions = [
          { module: 'DASHBOARD', canView: true, canEdit: true },
          { module: 'KANBAN', canView: true, canEdit: true },
          { module: 'TASKS', canView: true, canEdit: true },
          { module: 'PROJECTS', canView: true, canEdit: false },
          { module: 'FOLLOWUP', canView: true, canEdit: true },
          { module: 'EMPLOYEES', canView: true, canEdit: false },
          { module: 'REPORTS', canView: true, canEdit: false },
          { module: 'MASTERS', canView: false, canEdit: false },
          { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
          { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
        ];
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      designation: user.designation,
      ssoId: user.ssoId,
      phone: user.phone,
      gmailId: user.gmailId,
      officeId: user.officeId,
      officeName: user.office?.name || user.officeName,
      sectionId: user.sectionId,
      sectionName: user.section?.name || user.sectionName,
      systemRole: user.systemRole,
      roleId: user.roleId,
      isActive: user.isActive,
      mustChangePassword: user.mustChangePassword,
      permissions,
      assignedProjectRoles,
    };

    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (!allowedRoles.includes(req.user.systemRole) && req.user.systemRole !== 'SUPER_ADMIN') {
      res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.systemRole}`,
      });
      return;
    }

    next();
  };
};

export const requirePermission = (moduleName: string, action: 'VIEW' | 'EDIT' = 'VIEW') => {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized.' });
      return;
    }

    if (req.user.systemRole === 'SUPER_ADMIN') {
      return next();
    }

    const perm = req.user.permissions?.find((p) => p.module === moduleName);
    if (!perm) {
      res.status(403).json({ error: `Access denied. No permission for module '${moduleName}'.` });
      return;
    }

    if (action === 'VIEW' && !perm.canView) {
      res.status(403).json({ error: `Access denied. View permission required for '${moduleName}'.` });
      return;
    }

    if (action === 'EDIT' && !perm.canEdit) {
      res.status(403).json({ error: `Access denied. Edit permission required for '${moduleName}'.` });
      return;
    }

    next();
  };
};
