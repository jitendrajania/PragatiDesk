import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { sendOtpEmail, sendProfileUpdatedEmail } from '../services/mail.service';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'pragatidesk_doitc_secret_key_2026_jwt_token_secure';

// Helper to format user payload with permissions
function formatUserResponse(user: any) {
  let permissions = [];
  if (user.customRole?.permissionsJson) {
    try {
      permissions = JSON.parse(user.customRole.permissionsJson);
    } catch (e) {
      permissions = [];
    }
  } else {
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

  return {
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
}

// 1. Standard Login
router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: cleanEmail }, { ssoId: email.trim() }],
      },
      include: {
        customRole: true,
        office: true,
        section: true,
        projectMemberships: true,
      },
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid credentials or account is deactivated.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, systemRole: user.systemRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// 2. Google / Gmail Sign-In
router.post('/google-login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { googleEmail } = req.body;
    if (!googleEmail) {
      res.status(400).json({ error: 'Google email is required.' });
      return;
    }

    const cleanEmail = googleEmail.toLowerCase().trim();

    // Match by registered gmailId or email
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { gmailId: cleanEmail },
          { email: cleanEmail },
        ],
      },
      include: {
        customRole: true,
        office: true,
        section: true,
        projectMemberships: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: `No registered account found associated with Google ID '${cleanEmail}'. Please contact your Administrator.`,
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({ error: 'Your account is deactivated. Please contact your Administrator.' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, systemRole: user.systemRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    console.error('Google login error:', error);
    res.status(500).json({ error: 'Failed to authenticate with Google account.' });
  }
});

// 3. Send Email OTP for Password Update / Reset
router.post('/send-otp', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    if (!email) {
      res.status(400).json({ error: 'Registered Email address is required.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      res.status(404).json({ error: 'No user registered with this email address.' });
      return;
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // Invalidate previous unused OTPs for this email
    await prisma.otpRecord.updateMany({
      where: { email: cleanEmail, used: false },
      data: { used: true },
    });

    await prisma.otpRecord.create({
      data: {
        email: cleanEmail,
        otp,
        expiresAt,
        used: false,
      },
    });

    console.log(`📧 [EMAIL OTP DISPATCH] Sent OTP '${otp}' to ${cleanEmail}`);

    // Trigger Automated Email Dispatch (delivers to registered email and personal gmail if available)
    sendOtpEmail(cleanEmail, otp, user.name, user.gmailId).catch((err) => console.error('⚠️ Failed to dispatch OTP email:', err));

    // Mask email for security display (e.g. vi****@doitc.gov.in)
    const maskedEmail = cleanEmail.replace(
      /^(.)(.*)(@.*)$/,
      (_m: string, first: string, middle: string, domain: string) => first + '*'.repeat(Math.max(middle.length, 3)) + domain
    );

    res.json({
      success: true,
      message: `A 6-digit OTP verification code has been dispatched to your registered email address (${maskedEmail}). Please check your inbox or spam folder.`,
    });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to generate and dispatch OTP.' });
  }
});

// 4. Verify OTP & Reset / Set New Password
router.post('/verify-otp-and-reset-password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
      res.status(400).json({ error: 'Email, OTP code, and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // Check valid OTP
    const validOtpRecord = await prisma.otpRecord.findFirst({
      where: {
        email: cleanEmail,
        otp: otp.trim(),
        used: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!validOtpRecord) {
      res.status(400).json({ error: 'Invalid or expired OTP code. Please request a new code.' });
      return;
    }

    // Mark OTP as used
    await prisma.otpRecord.update({
      where: { id: validOtpRecord.id },
      data: { used: true },
    });

    // Update user password and clear mustChangePassword
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    const updatedUser = await prisma.user.update({
      where: { email: cleanEmail },
      data: {
        passwordHash: newPasswordHash,
        mustChangePassword: false,
      },
      include: {
        customRole: true,
        office: true,
        section: true,
      },
    });

    const token = jwt.sign(
      { id: updatedUser.id, email: updatedUser.email, systemRole: updatedUser.systemRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Password successfully updated!',
      token,
      user: formatUserResponse(updatedUser),
    });
  } catch (error) {
    console.error('Error resetting password with OTP:', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// 5. Force Change Password on First-Time Login (Authenticated)
router.post('/force-change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: req.user!.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      include: {
        customRole: true,
        office: true,
        section: true,
      },
    });

    res.json({
      success: true,
      message: 'Password successfully changed on first login.',
      user: formatUserResponse(updated),
    });
  } catch (error) {
    console.error('Error forcing password change:', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// 5B. Self-Service Password Change (Authenticated User)
router.post('/change-password', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: { customRole: true, office: true, section: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password is incorrect. Please check your existing password.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        mustChangePassword: false,
      },
      include: {
        customRole: true,
        office: true,
        section: true,
      },
    });

    console.log(`🔒 [PASSWORD UPDATED] User ${user.name} (${user.ssoId}) changed their own password.`);

    // Trigger security notification email
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
          field: 'password',
          label: 'Account Password',
          oldValue: '••••••••',
          newValue: 'Updated Securely by User',
        },
      ],
      { name: updated.name, designation: updated.designation, systemRole: updated.systemRole }
    ).catch((err) => console.error('⚠️ Failed to dispatch password update notification:', err));

    res.json({
      success: true,
      message: 'Your password has been changed successfully.',
      user: formatUserResponse(updated),
    });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to update password.' });
  }
});

// 6. Current User Profile
router.get('/me', authenticate, async (req: AuthRequest, res: Response): Promise<void> => {
  res.json({ user: req.user });
});

// 7. Personas list for 1-click evaluation
router.get('/personas', async (req: Request, res: Response): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        customRole: true,
        office: true,
        section: true,
        projectMemberships: true,
      },
      orderBy: [{ systemRole: 'asc' }, { name: 'asc' }],
    });

    res.json(users.map(formatUserResponse));
  } catch (error: any) {
    console.error('Error fetching personas:', error);
    res.status(500).json({ error: 'Failed to fetch persona list', details: error?.message || String(error) });
  }
});

// 8. Switch Persona Endpoint
router.post('/switch-persona', async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.body;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        customRole: true,
        office: true,
        section: true,
        projectMemberships: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, systemRole: user.systemRole },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: formatUserResponse(user),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch persona' });
  }
});

export default router;
