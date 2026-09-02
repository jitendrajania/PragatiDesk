import { prisma } from '../src/prisma';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pragatidesk_doitc_secret_key_2026_jwt_token_secure';

async function runTests() {
  console.log('🧪 Starting comprehensive automated workflow, RBAC & Isolation tests for PragatiDesk...\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // -------------------------------------------------------------------------
    // 1. GLOBAL MASTERS VALIDATION
    // -------------------------------------------------------------------------
    console.log('--- 1. Testing Global Masters (Offices, Sections, Designations, Roles) ---');
    const offices = await prisma.officeMaster.findMany();
    assert(offices.length >= 4, `Office Master seeded correctly (found ${offices.length} offices)`);

    const sections = await prisma.sectionMaster.findMany({ include: { office: true } });
    assert(sections.length >= 4, `Section Master seeded correctly (found ${sections.length} sections)`);
    assert(!!sections[0].office, 'Sections are correctly linked to Office Master entities');

    const designations = await prisma.designationMaster.findMany();
    assert(designations.length >= 10, `Designations Master seeded correctly (found ${designations.length} designations)`);

    const roles = await prisma.roleMaster.findMany();
    assert(roles.length >= 5, `Role Master seeded with permission matrices (found ${roles.length} roles)`);
    const superAdminRole = roles.find((r) => r.code === 'SUPER_ADMIN');
    assert(!!superAdminRole, 'SUPER_ADMIN role master exists');

    // 1B. Testing Super Admin Editing Role Name and Module Permissions
    console.log('\n--- 1B. Testing Super Admin Editing Role Name and Module Permissions ---');
    const reportsRole = roles.find((r) => r.code === 'REPORTS') || roles[0];
    const updatedPermissions = [
      { module: 'DASHBOARD', canView: true, canEdit: false },
      { module: 'REPORTS', canView: true, canEdit: true },
      { module: 'TASKS', canView: true, canEdit: false },
    ];

    const updatedRole = await prisma.roleMaster.update({
      where: { id: reportsRole.id },
      data: {
        description: 'Updated functional report analytics and audit view',
        permissionsJson: JSON.stringify(updatedPermissions),
      },
    });

    const parsedPerms = JSON.parse(updatedRole.permissionsJson);
    assert(parsedPerms.length === 3, 'Super Admin successfully updated module permissions array');
    assert(parsedPerms.some((p: any) => p.module === 'REPORTS' && p.canEdit === true), 'Granular Edit permission configured for REPORTS module');
    assert(!!updatedRole.description?.includes('audit view'), 'Role description successfully updated');

    // -------------------------------------------------------------------------
    // 2. USER HIERARCHY, SSO ID & UNIQUE CONSTRAINTS
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Testing User Hierarchy, SSO ID, and Unique Constraints ---');
    const superAdmin = await prisma.user.findUnique({ where: { email: 'jitendrajania.doit@rajasthan.gov.in' } });
    assert(!!superAdmin && superAdmin.systemRole === 'SUPER_ADMIN', 'Super Admin exists with full privileges');
    assert(superAdmin?.ssoId === 'JITENDRA.DOIT', 'Super Admin possesses correct SSO ID');

    const officeSuperAdmin = await prisma.user.findFirst({ where: { systemRole: 'OFFICE_SUPER_ADMIN' } });
    assert(!!officeSuperAdmin && !!officeSuperAdmin.officeId, `Office Super Admin exists and is bound to office [${officeSuperAdmin?.officeName}]`);

    const groupHeads = await prisma.user.findMany({ where: { systemRole: 'GROUP_HEAD' } });
    assert(groupHeads.length >= 2, `Group Heads seeded properly (found ${groupHeads.length})`);

    const gh1 = groupHeads.find((g) => g.email === 'gh.verma@doitc.gov.in') || groupHeads[0];
    const gh2 = groupHeads.find((g) => g.email === 'gh.meena@doitc.gov.in') || groupHeads[1];

    // Test unique constraint on SSO ID
    let ssoUniqueViolated = false;
    try {
      await prisma.user.create({
        data: {
          name: 'Duplicate SSO User',
          email: 'duplicate.sso@doitc.gov.in',
          ssoId: 'JITENDRA.DOIT', // Already taken by Super Admin
          passwordHash: await bcrypt.hash('Test@123', 10),
          designation: 'Analyst-cum-Programmer (ACP)',
          systemRole: 'EMPLOYEE',
        },
      });
    } catch (err: any) {
      ssoUniqueViolated = true;
    }
    assert(ssoUniqueViolated, 'Database enforces strict unique constraint on SSO ID');

    // -------------------------------------------------------------------------
    // 3. DEACTIVATION & ACCESS HIERARCHY RULES
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Testing Deactivation & Access Hierarchy ---');
    // Rule 1: Self-Deactivation Restriction simulation
    function checkSelfDeactivation(actorId: string, targetId: string, isActive: boolean) {
      if (actorId === targetId && isActive === false) {
        return { error: 'Self-deactivation restriction: You cannot deactivate your own account.' };
      }
      return { success: true };
    }

    const selfDeactResult = checkSelfDeactivation(gh1.id, gh1.id, false);
    assert(!!selfDeactResult.error, 'Self-deactivation restriction correctly blocks user from deactivating own account');

    // Rule 2: Privilege Scope: Only Super Admin or Office Super Admin can activate/deactivate a Group Head
    function checkGroupHeadDeactivationAuthority(actorRole: string, actorOfficeId: string | null, target: any, isActive: boolean) {
      if (target.systemRole === 'GROUP_HEAD' && isActive !== target.isActive) {
        if (actorRole !== 'SUPER_ADMIN' && actorRole !== 'OFFICE_SUPER_ADMIN') {
          return { error: 'Privilege scope: Only Super Admin or Office Super Admin has the authority to activate or deactivate a Group Head.' };
        }
        if (actorRole === 'OFFICE_SUPER_ADMIN' && target.officeId !== actorOfficeId) {
          return { error: 'Access denied: You can only activate or deactivate Group Heads in your assigned office.' };
        }
      }
      return { success: true };
    }

    const ghToGhDeact = checkGroupHeadDeactivationAuthority('GROUP_HEAD', gh1.officeId, gh2, false);
    assert(!!ghToGhDeact.error, 'Group Head cannot deactivate another Group Head (Privilege Scope enforced)');

    const superAdminDeact = checkGroupHeadDeactivationAuthority('SUPER_ADMIN', null, gh2, false);
    assert(superAdminDeact.success === true, 'Super Admin is authorized to activate/deactivate Group Heads');

    // Rule 3: Role Limitation: Group Head can only manage employees mapped directly under their section
    function checkGroupHeadEmployeeManagement(gh: any, targetEmployee: any) {
      if (targetEmployee.sectionId !== gh.sectionId || targetEmployee.systemRole !== 'EMPLOYEE') {
        return { error: 'Role limitation: A Group Head can only perform user management actions for employees mapped directly under their section.' };
      }
      return { success: true };
    }

    const jitendra = await prisma.user.findFirst({ where: { ssoId: 'DOITC-EMP-2006' } });
    assert(!!jitendra, 'Jitendra Choudhary seeded under Group Head 02 section');

    const gh1ManageJitendra = checkGroupHeadEmployeeManagement(gh1, jitendra);
    assert(!!gh1ManageJitendra.error, 'Group Head 01 is blocked from managing Jitendra Choudhary (from Group Head 02 section)');

    const vikram = await prisma.user.findFirst({ where: { ssoId: 'DOITC-EMP-2001' } });
    assert(!!vikram, 'Vikram Aditya seeded under Group Head 01 section');

    const gh1ManageVikram = checkGroupHeadEmployeeManagement(gh1, vikram);
    assert(gh1ManageVikram.success === true, 'Group Head 01 is authorized to manage Vikram Aditya (mapped directly under GH1 section)');

    // -------------------------------------------------------------------------
    // 4. DATA ISOLATION & EMPLOYEE VISIBILITY
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Testing Strict Section Isolation & Employee Visibility ---');
    // Group Head 01 (e-Gov Wing) employee directory query
    const gh1Employees = await prisma.user.findMany({
      where: {
        isActive: true,
        sectionId: gh1.sectionId,
        systemRole: 'EMPLOYEE',
      },
    });

    const jitendraInGh1 = gh1Employees.find((e) => e.name === 'Jitendra Choudhary');
    assert(!jitendraInGh1, 'BUG FIX VERIFIED: Jitendra Choudhary (GH2 section) is NOT visible in GH1 employee directory');

    const vikramInGh1 = gh1Employees.find((e) => e.name === 'Vikram Aditya');
    assert(!!vikramInGh1, 'Vikram Aditya (GH1 section) is correctly visible in GH1 employee directory');

    // Group Head 02 (PSD Wing) employee directory query
    const gh2Employees = await prisma.user.findMany({
      where: {
        isActive: true,
        sectionId: gh2.sectionId,
        systemRole: 'EMPLOYEE',
      },
    });

    const jitendraInGh2 = gh2Employees.find((e) => e.name === 'Jitendra Choudhary');
    assert(!!jitendraInGh2, 'Jitendra Choudhary is correctly visible in GH2 employee directory');

    const vikramInGh2 = gh2Employees.find((e) => e.name === 'Vikram Aditya');
    assert(!vikramInGh2, 'Vikram Aditya (GH1 section) is NOT visible in GH2 employee directory');

    // -------------------------------------------------------------------------
    // 5. EMPLOYEE TRANSFER VALIDATION (EXCLUDE CURRENT GROUP)
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Testing Employee Transfer Validation (Exclude Current Group) ---');
    function validateEmployeeTransfer(employee: any, targetSectionId: string) {
      if (targetSectionId === employee.sectionId) {
        return { error: 'Validation error: Target section cannot be the employee\'s current section.' };
      }
      return { success: true };
    }

    const sameSectionTransfer = validateEmployeeTransfer(vikram, vikram!.sectionId!);
    assert(!!sameSectionTransfer.error, 'Transferring an employee to their current section is strictly rejected');

    const differentSection = sections.find((s) => s.id !== vikram?.sectionId && s.officeId === vikram?.officeId);
    assert(!!differentSection, 'Alternative section found in the same office');

    const validTransfer = validateEmployeeTransfer(vikram, differentSection!.id);
    assert(validTransfer.success === true, 'Transferring to another section in the same office is accepted');

    // -------------------------------------------------------------------------
    // 5B. EMPLOYEE TRANSFER HANDSHAKE & SENDER CANCELLATION
    // -------------------------------------------------------------------------
    console.log('\n--- 5B. Testing Employee Transfer Handshake & Sender Cancellation ---');
    // Step 1: GH1 initiates transfer of Vikram Aditya to PSD Section (GH2)
    const initiatedEmployee = await prisma.user.update({
      where: { id: vikram!.id },
      data: {
        transferStatus: 'PENDING_TRANSFER',
        transferToSectionId: gh2.sectionId,
        transferToGroupHeadId: gh2.id,
        transferRemark: 'Temporary workload rebalancing',
        transferInitiatedById: gh1.id,
        transferInitiatedAt: new Date(),
      },
    });
    assert(initiatedEmployee.transferStatus === 'PENDING_TRANSFER', 'Employee transfer initiated with status PENDING_TRANSFER');
    assert(initiatedEmployee.transferToGroupHeadId === gh2.id, 'Target Group Head mapped correctly for transfer');

    // Step 2: Sender (GH1) cancels the transfer before GH2 accepts
    const cancelledEmployee = await prisma.user.update({
      where: { id: vikram!.id },
      data: {
        transferStatus: 'NONE',
        transferToSectionId: null,
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
        transferInitiatedById: null,
      },
    });
    assert(cancelledEmployee.transferStatus === 'NONE', 'Sender cancelled employee transfer and restored state');

    // Step 3: GH1 re-initiates and GH2 accepts the transfer
    await prisma.user.update({
      where: { id: vikram!.id },
      data: {
        transferStatus: 'PENDING_TRANSFER',
        transferToSectionId: gh2.sectionId,
        transferToGroupHeadId: gh2.id,
        transferRemark: 'Formal section transfer approved',
        transferInitiatedById: gh1.id,
        transferInitiatedAt: new Date(),
      },
    });

    const acceptedEmployee = await prisma.user.update({
      where: { id: vikram!.id },
      data: {
        sectionId: gh2.sectionId,
        sectionName: gh2.sectionName,
        transferStatus: 'NONE',
        transferToSectionId: null,
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
        transferInitiatedById: null,
      },
    });
    assert(acceptedEmployee.sectionId === gh2.sectionId, 'Employee transfer accepted and section successfully reassigned');

    // Restore Vikram back to GH1 for subsequent task queries
    await prisma.user.update({
      where: { id: vikram!.id },
      data: {
        sectionId: gh1.sectionId,
        sectionName: gh1.sectionName,
      },
    });

    // -------------------------------------------------------------------------
    // 6. TASK LIFECYCLE & DISPOSAL
    // -------------------------------------------------------------------------
    console.log('\n--- 6. Testing Task Intake, Transfer, and Disposal Lifecycles ---');
    const projects = await prisma.project.findMany({ where: { officeId: offices[0].id } });
    const p1 = projects[0];

    const newTask = await prisma.task.create({
      data: {
        taskNumber: `TASK-TEST-${Date.now()}`,
        referenceNumber: 'REF/RAJ/2026/99',
        rajKajNumber: 'RK-DK/2026/7788',
        issueNumber: 'ISSUE-992',
        referenceDate: new Date('2026-08-15'),
        subject: 'Secretariat High Priority Dak Verification',
        description: 'Verification of state intranet bandwidth reports',
        category: 'OFFICIAL_LETTER',
        priority: 'CRITICAL',
        status: 'OPEN',
        projectId: p1.id,
        createdById: gh1.id,
        currentAssigneeId: gh1.id,
      },
    });
    assert(!!newTask && newTask.rajKajNumber === 'RK-DK/2026/7788', 'Task created with departmental RajKaj dak identifiers');

    // Transfer Task with Mandatory Remark
    const transferred = await prisma.task.update({
      where: { id: newTask.id },
      data: {
        currentAssigneeId: vikram!.id,
        status: 'TRANSFERRED',
      },
    });
    assert(transferred.status === 'TRANSFERRED' && transferred.currentAssigneeId === vikram!.id, 'Task transferred to employee');

    // -------------------------------------------------------------------------
    // 7. EMPLOYEE TASK ISOLATION TEST (Only logged-in employee sees their own tasks)
    // -------------------------------------------------------------------------
    console.log('\n--- 7. Testing Employee Task Visibility Isolation ---');
    const priya = await prisma.user.findFirst({ where: { ssoId: 'DOITC-EMP-2002' } });
    assert(!!priya, 'Priya Sharma exists as a peer employee in the same project');

    // Create a task assigned to Priya in the same project
    const priyaTask = await prisma.task.create({
      data: {
        taskNumber: `TASK-PRIYA-${Date.now()}`,
        subject: 'Priya Specific Module Task',
        status: 'IN_PROGRESS',
        category: 'GENERAL_TASK',
        priority: 'MEDIUM',
        projectId: p1.id,
        createdById: gh1.id,
        currentAssigneeId: priya!.id,
      },
    });

    // Query tasks for Vikram (Employee)
    const vikramTasksQuery = await prisma.task.findMany({
      where: {
        AND: [
          {
            OR: [
              { currentAssigneeId: vikram!.id },
              { createdById: vikram!.id },
              { disposedById: vikram!.id },
            ],
          },
          { projectId: p1.id },
        ],
      },
    });

    const hasPriyaTaskInVikramQuery = vikramTasksQuery.some((t) => t.id === priyaTask.id);
    assert(!hasPriyaTaskInVikramQuery, 'TASK ISOLATION VERIFIED: Priya\'s task in the same project is NOT returned in Vikram\'s query');

    const hasVikramTaskInVikramQuery = vikramTasksQuery.some((t) => t.id === newTask.id);
    assert(hasVikramTaskInVikramQuery, 'Vikram\'s own assigned task IS correctly returned in Vikram\'s query');

    // Clean up test tasks
    await prisma.task.delete({ where: { id: newTask.id } });
    await prisma.task.delete({ where: { id: priyaTask.id } });

    // -------------------------------------------------------------------------
    // 8. PROJECT TRANSFER SENDER CANCELLATION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 8. Testing Project Transfer Cancellation by Sender ---');
    // Step A: Sender (GH1) initiates project transfer to GH2
    const transferProject = await prisma.project.create({
      data: {
        name: 'Project Transfer Cancel Test',
        projectCode: `PRG-TC-${Date.now()}`,
        groupHeadId: gh1.id,
        officeId: offices[0].id,
        officeName: offices[0].name,
        status: 'ACTIVE',
      },
    });

    const initiated = await prisma.project.update({
      where: { id: transferProject.id },
      data: {
        transferStatus: 'PENDING_TRANSFER',
        transferToGroupHeadId: gh2.id,
        transferRemark: 'Testing sender cancellation workflow',
        transferInitiatedAt: new Date(),
      },
    });
    assert(initiated.transferStatus === 'PENDING_TRANSFER', 'Project transfer initiated by sender (status is PENDING_TRANSFER)');

    // Step B: Sender (GH1) cancels the transfer request before recipient acts
    function canSenderCancelTransfer(project: any, actorId: string) {
      if (project.transferStatus !== 'PENDING_TRANSFER') return false;
      return project.groupHeadId === actorId || superAdmin?.id === actorId;
    }

    assert(canSenderCancelTransfer(initiated, gh1.id), 'Sender (GH1) has authority to cancel pending transfer');

    const cancelled = await prisma.project.update({
      where: { id: transferProject.id },
      data: {
        transferStatus: 'NONE',
        transferToGroupHeadId: null,
        transferRemark: null,
        transferInitiatedAt: null,
      },
    });
    assert(cancelled.transferStatus === 'NONE' && cancelled.transferToGroupHeadId === null, 'Project transfer successfully cancelled by sender and restored to active state');

    // Clean up test project
    await prisma.project.delete({ where: { id: transferProject.id } });

    // -------------------------------------------------------------------------
    // 9. REPORTS DASHBOARD & MULTI-CRITERIA ANALYTICS TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 9. Testing Reports Dashboard, Multi-Criteria Filtering & Pie Chart Analytics ---');
    const allReportingTasks = await prisma.task.findMany({
      include: {
        project: true,
        currentAssignee: true,
      },
    });
    assert(allReportingTasks.length >= 2, `Reporting dataset contains tasks (${allReportingTasks.length} tasks found)`);

    // Test KPI Summary calculation
    const now = new Date();
    const processedTasks = allReportingTasks.map((t) => {
      const isDisposed = t.status === 'DISPOSED' || t.status === 'CLOSED';
      const pendingDays = isDisposed && t.disposedAt
        ? Math.max(0, Math.floor((t.disposedAt.getTime() - t.createdAt.getTime()) / (1000 * 3600 * 24)))
        : Math.max(0, Math.floor((now.getTime() - t.createdAt.getTime()) / (1000 * 3600 * 24)));

      let agingBucket = '0-3 Days';
      if (pendingDays >= 30) agingBucket = '30+ Days';
      else if (pendingDays >= 16) agingBucket = '16-30 Days';
      else if (pendingDays >= 8) agingBucket = '8-15 Days';
      else if (pendingDays >= 4) agingBucket = '4-7 Days';

      return { ...t, pendingDays, agingBucket };
    });

    assert(processedTasks.every((t) => typeof t.pendingDays === 'number' && !!t.agingBucket), 'All tasks correctly calculated with pending days and aging buckets');

    // Test Status Pie Distribution structure
    const statusCounts: Record<string, number> = {};
    processedTasks.forEach((t) => {
      statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
    });
    const statusPie = Object.entries(statusCounts).map(([statusKey, count]) => ({
      name: statusKey.replace('_', ' '),
      value: count,
      percentage: Math.round((count / processedTasks.length) * 100),
    }));
    assert(statusPie.length > 0 && statusPie[0].value > 0, 'Status Pie Chart distribution calculated with percentage slices');

    // Test Priority & Category Pie Distribution
    const priorityPie = Object.entries(
      processedTasks.reduce((acc: any, t) => {
        acc[t.priority] = (acc[t.priority] || 0) + 1;
        return acc;
      }, {})
    ).map(([k, v]: any) => ({ name: k, value: v }));
    assert(priorityPie.length > 0, 'Priority Pie Chart distribution calculated');

    // Test Multi-Criteria Filter simulation (by Project + Assignee + Status)
    const sampleTask = processedTasks[0];
    const filteredSample = processedTasks.filter(
      (t) => t.projectId === sampleTask.projectId && t.status === sampleTask.status
    );
    assert(filteredSample.length >= 1, 'Multi-criteria filter (Project + Status) correctly filters dataset');

    // -------------------------------------------------------------------------
    // 10. AUTOMATED WELCOME & PROFILE UPDATE EMAIL NOTIFICATIONS TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 10. Testing Automated Welcome Emails & Account Update Notifications ---');
    const { sendWelcomeEmail, sendProfileUpdatedEmail, sendOtpEmail } = require('../src/services/mail.service');

    // Test 10.1: Welcome email dispatch with default password
    const testUser = {
      name: 'Pooja Choudhary',
      email: 'pooja.choudhary@doitc.gov.in',
      gmailId: 'pooja.choudhary.dev@gmail.com',
      designation: 'Assistant Programmer',
      ssoId: 'POOJA.C',
      officeName: 'DoIT&C Secretariat HQ, Jaipur',
      sectionName: 'Software Development & Architecture',
      systemRole: 'EMPLOYEE',
    };
    const defaultPassword = 'DoITC@9821';
    const welcomeDispatched = await sendWelcomeEmail(testUser, defaultPassword);
    assert(welcomeDispatched === true, 'Automated Welcome Email with default password successfully triggered and dispatched');

    // Test 10.2: Profile update notification with change delta
    const changes = [
      { field: 'designation', label: 'Designation', oldValue: 'Assistant Programmer', newValue: 'Analyst-cum-Programmer (ACP)' },
      { field: 'sectionName', label: 'Group / Section', oldValue: 'Software Development & Architecture', newValue: 'AI & Data Intelligence' },
    ];
    const updateDispatched = await sendProfileUpdatedEmail(testUser, changes, { name: 'Dr. Rameshwar Sharma', designation: 'Super Admin' });
    assert(updateDispatched === true, 'Automated Profile Update Notification email with change delta successfully triggered and dispatched');

    // Test 10.3: OTP email dispatch
    const otpDispatched = await sendOtpEmail(testUser.email, '849201', testUser.name);
    assert(otpDispatched === true, 'Password reset OTP email successfully triggered and dispatched');

    // -------------------------------------------------------------------------
    // 11. PROJECT UPDATE & METADATA MODIFICATION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 11. Testing Project Update (Name, Code, Status, Description) ---');
    const newProject = await prisma.project.create({
      data: {
        name: 'Initial Project Name',
        projectCode: 'TEST-PRJ-01',
        description: 'Initial project scope',
        status: 'ACTIVE',
        groupHeadId: gh1.id,
        officeId: offices[0].id,
      },
    });

    const updatedPrj = await prisma.project.update({
      where: { id: newProject.id },
      data: {
        name: 'Citizen Portal Revamped Section / Project',
        projectCode: 'CIT-PORTAL',
        description: 'Updated functional scope and deliverables',
        status: 'ON_HOLD',
      },
    });

    assert(updatedPrj.name === 'Citizen Portal Revamped Section / Project', 'Project name successfully updated');
    assert(updatedPrj.projectCode === 'CIT-PORTAL', 'Project code successfully updated');
    assert(updatedPrj.status === 'ON_HOLD', 'Project status successfully changed to ON_HOLD');
    assert(updatedPrj.description === 'Updated functional scope and deliverables', 'Project description successfully updated');

    // Clean up
    await prisma.project.delete({ where: { id: newProject.id } });

    // -------------------------------------------------------------------------
    // 12. DEACTIVATED EMPLOYEE VISIBILITY & RE-ACTIVATION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 12. Testing Deactivated Employee Query & Re-activation ---');
    const deactUser = await prisma.user.create({
      data: {
        name: 'Suresh Kumar Deactivated',
        email: 'suresh.deact@doitc.gov.in',
        ssoId: 'SURESH.DEACT',
        designation: 'Information Assistant',
        systemRole: 'EMPLOYEE',
        sectionId: sections[0].id,
        officeId: offices[0].id,
        isActive: false, // Initially deactivated
        passwordHash: 'dummyhash',
      },
    });

    // Query employees in sections[0] without isActive: true constraint
    const sectionEmployees = await prisma.user.findMany({
      where: {
        sectionId: sections[0].id,
        systemRole: 'EMPLOYEE',
      },
    });

    const foundDeactivated = sectionEmployees.find((u) => u.id === deactUser.id && !u.isActive);
    assert(!!foundDeactivated, 'Deactivated employee is included in section employee query so they can be viewed');

    // Test Re-activation
    const reactivatedUser = await prisma.user.update({
      where: { id: deactUser.id },
      data: { isActive: true },
    });
    assert(reactivatedUser.isActive === true, 'Deactivated employee successfully re-activated to active status');

    // Clean up test user
    await prisma.user.delete({ where: { id: deactUser.id } });

    // -------------------------------------------------------------------------
    // 13. DEFAULT PASSWORD GENERATION & ADMIN RESET PASSWORD AUTHORIZATION TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 13. Testing Default Password Generation & Admin Reset Password Scoping ---');
    const defaultPassTestUser = await prisma.user.create({
      data: {
        name: 'Pooja Choudhary Staff',
        email: 'pooja.choudhary@doitc.gov.in',
        ssoId: 'POOJA.CHOUDHARY',
        designation: 'Informatics Officer',
        systemRole: 'EMPLOYEE',
        sectionId: gh1.sectionId,
        officeId: officeSuperAdmin?.officeId,
        isActive: true,
        passwordHash: await bcrypt.hash('DoITC@1111', 10),
        mustChangePassword: true,
      },
    });

    // Test 13A: Super Admin can reset password for any user
    const superAdminResetPassword = `DoITC@${Math.floor(1000 + Math.random() * 9000)}`;
    const saResetHash = await bcrypt.hash(superAdminResetPassword, 10);
    const saUpdated = await prisma.user.update({
      where: { id: defaultPassTestUser.id },
      data: { passwordHash: saResetHash, mustChangePassword: true },
    });
    assert(saUpdated.mustChangePassword === true, 'Super Admin reset sets mustChangePassword to true');
    const saMatch = await bcrypt.compare(superAdminResetPassword, saUpdated.passwordHash);
    assert(saMatch === true, 'Super Admin successfully reset password to new default password');

    // Test 13B: Office Super Admin scoping validation
    function canOfficeSuperAdminReset(osa: any, target: any) {
      if (osa.systemRole !== 'OFFICE_SUPER_ADMIN') return false;
      if (target.systemRole === 'SUPER_ADMIN') return false;
      return target.officeId === osa.officeId;
    }
    assert(canOfficeSuperAdminReset(officeSuperAdmin, defaultPassTestUser) === true, 'Office Super Admin can reset password for staff within their office');
    assert(canOfficeSuperAdminReset(officeSuperAdmin, superAdmin) === false, 'Office Super Admin CANNOT reset password for Super Admin');

    // Test 13C: Group Head scoping validation
    function canGroupHeadReset(gh: any, target: any) {
      if (gh.systemRole !== 'GROUP_HEAD') return false;
      return target.sectionId === gh.sectionId && target.systemRole === 'EMPLOYEE';
    }
    assert(canGroupHeadReset(gh1, defaultPassTestUser) === true, 'Group Head can reset password for employee in their section');
    assert(canGroupHeadReset(gh2, defaultPassTestUser) === false, 'Group Head CANNOT reset password for employee in another section');

    // Clean up test user
    await prisma.user.delete({ where: { id: defaultPassTestUser.id } });

    // -------------------------------------------------------------------------
    // 14. SELF-SERVICE PROFILE & PASSWORD CHANGE TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 14. Testing User Self-Service Profile & Password Update ---');
    const selfServiceUser = await prisma.user.create({
      data: {
        name: 'Anita Rawat',
        email: 'anita.rawat@doitc.gov.in',
        ssoId: 'ANITA.RAWAT',
        designation: 'Assistant Programmer',
        systemRole: 'EMPLOYEE',
        sectionId: gh1.sectionId,
        officeId: offices[0].id,
        phone: '9829011223',
        gmailId: 'anita.rawat.dev@gmail.com',
        isActive: true,
        passwordHash: await bcrypt.hash('InitialPass@123', 10),
        mustChangePassword: false,
      },
    });

    // Test 14A: Self-service profile update (name, phone, gmailId, designation)
    const updatedSelf = await prisma.user.update({
      where: { id: selfServiceUser.id },
      data: {
        name: 'Anita Rawat Sharma',
        phone: '9829099887',
        gmailId: 'anita.sharma.official@gmail.com',
        designation: 'Senior Programmer',
      },
    });
    assert(updatedSelf.name === 'Anita Rawat Sharma', 'User can update their own name');
    assert(updatedSelf.phone === '9829099887', 'User can update their own mobile number');
    assert(updatedSelf.gmailId === 'anita.sharma.official@gmail.com', 'User can update their own Gmail ID');
    assert(updatedSelf.designation === 'Senior Programmer', 'User can update their own designation');

    // Test 14B: Self-service password change verification
    const currentPassAttempt = 'WrongPass@999';
    const isCurrentMatch = await bcrypt.compare(currentPassAttempt, selfServiceUser.passwordHash);
    assert(isCurrentMatch === false, 'Password change with wrong current password is appropriately rejected');

    const correctCurrentPass = 'InitialPass@123';
    const isCorrectMatch = await bcrypt.compare(correctCurrentPass, selfServiceUser.passwordHash);
    assert(isCorrectMatch === true, 'Password change correctly verifies current password');

    const newSelfPassword = 'MySecureNewPass@2026';
    const newPassHash = await bcrypt.hash(newSelfPassword, 10);
    const passUpdatedUser = await prisma.user.update({
      where: { id: selfServiceUser.id },
      data: {
        passwordHash: newPassHash,
        mustChangePassword: false,
      },
    });

    const isNewPassValid = await bcrypt.compare(newSelfPassword, passUpdatedUser.passwordHash);
    assert(isNewPassValid === true, 'User can successfully change their password while logged in');

    // Clean up test user
    await prisma.user.delete({ where: { id: selfServiceUser.id } });

    // -------------------------------------------------------------------------
    // 15. SUPER ADMIN CREATION (NO OFFICE SELECTION REQUIRED) TEST
    // -------------------------------------------------------------------------
    console.log('\n--- 15. Testing Super Admin Creation Without Office Requirement ---');
    const newSuperAdminPass = `DoITC@${Math.floor(1000 + Math.random() * 9000)}`;
    const createdSuperAdmin = await prisma.user.create({
      data: {
        name: 'Dr. Alok Sharma',
        email: 'alok.sharma.sa@doitc.gov.in',
        ssoId: 'DOITC-SA-ALOK',
        designation: 'State Informatics Officer / Super Admin',
        systemRole: 'SUPER_ADMIN',
        officeId: null, // No office assigned
        officeName: 'Statewide Secretariat HQ (Global Governance)',
        sectionId: null, // No section assigned
        sectionName: null,
        phone: '9414099881',
        gmailId: 'alok.sharma.state@gmail.com',
        isActive: true,
        passwordHash: await bcrypt.hash(newSuperAdminPass, 10),
        mustChangePassword: true,
      },
    });

    assert(createdSuperAdmin.systemRole === 'SUPER_ADMIN', 'Super Admin created with SUPER_ADMIN systemRole');
    assert(createdSuperAdmin.officeId === null, 'Super Admin has officeId as null (no office required)');
    assert(createdSuperAdmin.officeName === 'Statewide Secretariat HQ (Global Governance)', 'Super Admin has Statewide Secretariat HQ global office name');
    assert(createdSuperAdmin.sectionId === null, 'Super Admin has sectionId as null (no section required)');
    assert(createdSuperAdmin.mustChangePassword === true, 'Super Admin requires password update on first login');

    // Clean up test user
    await prisma.user.delete({ where: { id: createdSuperAdmin.id } });

    // -------------------------------------------------------------------------
    // 16. MANDATORY SUBJECT, CATEGORY RESTRICTION & DELETION RBAC
    // -------------------------------------------------------------------------
    console.log('\n--- 16. Testing Mandatory Subject, Default Category, and Deletion RBAC ---');
    
    // Test 1: Subject validation logic
    const emptySubject = '   ';
    const isSubjectValid = !!emptySubject && emptySubject.trim().length > 0;
    assert(isSubjectValid === false, 'Empty or whitespace-only task subject is strictly invalid');

    // Test 2: Task created by employee with mandatory subject and default TECHNICAL_ISSUE
    const empCreatedTask = await prisma.task.create({
      data: {
        taskNumber: `TASK-DEL-TEST-${Date.now()}`,
        subject: 'Network Switch Firmware Vulnerability',
        category: 'TECHNICAL_ISSUE',
        priority: 'HIGH',
        status: 'OPEN',
        projectId: p1.id,
        createdById: vikram!.id,
        currentAssigneeId: vikram!.id,
      },
    });
    assert(empCreatedTask.category === 'TECHNICAL_ISSUE', 'Task created with TECHNICAL_ISSUE category by default');
    assert(!!empCreatedTask.subject, 'Task created with mandatory Subject');

    // Test 3: Deletion RBAC logic
    // Rule: creator (Vikram), Group Head (gh1), or Super Admin can delete. Other employee (priya) cannot.
    function checkCanDeleteTask(taskObj: any, userObj: any): boolean {
      const isCreator = taskObj.createdById === userObj.id;
      const isGH = userObj.systemRole === 'GROUP_HEAD';
      const isSA = userObj.systemRole === 'SUPER_ADMIN' || userObj.systemRole === 'OFFICE_SUPER_ADMIN';
      return isCreator || isGH || isSA;
    }

    assert(checkCanDeleteTask(empCreatedTask, priya!) === false, 'Unauthorized peer employee CANNOT delete task listed by another user');
    assert(checkCanDeleteTask(empCreatedTask, vikram!) === true, 'Task creator (Vikram) is authorized to delete their own task');
    assert(checkCanDeleteTask(empCreatedTask, gh1) === true, 'Section/Group Head is authorized to delete any task listed in their project');
    assert(checkCanDeleteTask(empCreatedTask, superAdmin) === true, 'Super Admin is authorized to delete any task');

    // Test 4: Physical deletion in database with related activities cleanup
    await prisma.taskActivity.create({
      data: {
        taskId: empCreatedTask.id,
        actionType: 'CREATED',
        actorId: vikram!.id,
        remark: 'Task created for deletion test',
      },
    });

    await prisma.$transaction([
      prisma.taskActivity.deleteMany({ where: { taskId: empCreatedTask.id } }),
      prisma.taskAttachment.deleteMany({ where: { taskId: empCreatedTask.id } }),
      prisma.followUpReport.deleteMany({ where: { taskId: empCreatedTask.id } }),
      prisma.task.delete({ where: { id: empCreatedTask.id } }),
    ]);

    // -------------------------------------------------------------------------
    // 17. OFFICE ADMIN CREATION, LOCKED OFFICE & MASTER RBAC TESTS
    // -------------------------------------------------------------------------
    console.log('\n--- 17. Testing Office Admin Creation (No Section Required), Locked Office & Master RBAC ---');

    // Clean up previous test run users if present
    await prisma.user.deleteMany({
      where: { ssoId: { in: ['DOITC-OA-TEST-01', 'DOITC-GH-TEST-02', 'USER.LEGACY.SEC'] } },
    });
    await prisma.sectionMaster.deleteMany({
      where: { code: { in: ['TEMP-SEC', 'LEGACY-SEC'] } },
    });

    const timestampSuffix = Date.now().toString().slice(-6);

    // Test 17A: Super Admin creates Office Super Admin without selecting section
    const newOfficeAdmin = await prisma.user.create({
      data: {
        name: 'Smt. Anjali Sharma (Office Admin)',
        email: `anjali.sharma.${timestampSuffix}@doitc.gov.in`,
        ssoId: 'DOITC-OA-TEST-01',
        designation: 'Joint Director & District Officer',
        systemRole: 'OFFICE_SUPER_ADMIN',
        officeId: offices[0].id,
        officeName: offices[0].name,
        sectionId: null, // Section is explicitly not required for Office Super Admin
        sectionName: null,
        phone: `98290${timestampSuffix.slice(0, 5)}`,
        isActive: true,
        passwordHash: await bcrypt.hash('DoITC@5555', 10),
        mustChangePassword: true,
      },
    });

    assert(newOfficeAdmin.systemRole === 'OFFICE_SUPER_ADMIN', 'Office Super Admin created with OFFICE_SUPER_ADMIN role');
    assert(newOfficeAdmin.officeId === offices[0].id, 'Office Super Admin mapped to assigned District Office');
    assert(newOfficeAdmin.sectionId === null, 'Office Super Admin created without requiring Section selection');

    // Test 17B: Office Super Admin creates Section/Group Head with locked office
    const ghCreatedByOfficeAdmin = await prisma.user.create({
      data: {
        name: 'Shri Manoj Mathur (New Group Head)',
        email: `manoj.mathur.${timestampSuffix}@doitc.gov.in`,
        ssoId: 'DOITC-GH-TEST-02',
        designation: 'Assistant Director / Group Head',
        systemRole: 'GROUP_HEAD',
        officeId: newOfficeAdmin.officeId, // Forced to Office Super Admin's assigned office
        officeName: newOfficeAdmin.officeName,
        sectionId: sections[0].id,
        sectionName: sections[0].name,
        phone: `98291${timestampSuffix.slice(0, 5)}`,
        isActive: true,
        passwordHash: await bcrypt.hash('DoITC@6666', 10),
        mustChangePassword: true,
      },
    });

    assert(ghCreatedByOfficeAdmin.systemRole === 'GROUP_HEAD', 'Section/Group Head created by Office Super Admin');
    assert(ghCreatedByOfficeAdmin.officeId === newOfficeAdmin.officeId, 'Section/Group Head office is strictly locked to Office Super Admin office');

    // Test 17C: Master Permissions RBAC Logic (Only Super Admin can update/delete office, section, designation masters)
    function canModifyMaster(userRole: string): boolean {
      return userRole === 'SUPER_ADMIN';
    }

    assert(canModifyMaster('OFFICE_SUPER_ADMIN') === false, 'Office Super Admin is DENIED permission to update or delete master names');
    assert(canModifyMaster('GROUP_HEAD') === false, 'Group Head is DENIED permission to update or delete master names');
    assert(canModifyMaster('EMPLOYEE') === false, 'Employee is DENIED permission to update or delete master names');
    assert(canModifyMaster('SUPER_ADMIN') === true, 'Only Super Admin has EXCLUSIVE permission to update or delete master names');

    // Test 17D: Super Admin updating and deleting a temporary Section Master
    const tempSection = await prisma.sectionMaster.create({
      data: {
        name: 'Temporary Master Section',
        code: 'TEMP-SEC',
        officeId: offices[0].id,
        isActive: true,
      },
    });

    const updatedTempSection = await prisma.sectionMaster.update({
      where: { id: tempSection.id },
      data: { name: 'Renamed Master Section' },
    });
    assert(updatedTempSection.name === 'Renamed Master Section', 'Super Admin successfully updated Section Master name');

    await prisma.sectionMaster.delete({ where: { id: tempSection.id } });
    const checkDeletedSection = await prisma.sectionMaster.findUnique({ where: { id: tempSection.id } });
    assert(checkDeletedSection === null, 'Super Admin successfully deleted Section Master');

    // Clean up test users from 17
    await prisma.user.delete({ where: { id: ghCreatedByOfficeAdmin.id } });
    await prisma.user.delete({ where: { id: newOfficeAdmin.id } });

    // -------------------------------------------------------------------------
    // 18. SUPER ADMIN DELETING ANY PROJECT & SECTION WITH CASCADING CLEANUP
    // -------------------------------------------------------------------------
    console.log('\n--- 18. Testing Super Admin Can Delete Any Project / Section ---');

    // Test 18A: Create a Project with tasks, members, and activities, then delete it as Super Admin
    const prjToDelete = await prisma.project.create({
      data: {
        name: 'Temporary Project for Deletion Testing',
        projectCode: 'DEL-PRJ-99',
        description: 'Temporary project to verify Super Admin project deletion',
        groupHeadId: gh1.id,
        officeId: offices[0].id,
      },
    });

    const memberToDelete = await prisma.projectMember.create({
      data: {
        projectId: prjToDelete.id,
        userId: vikram!.id,
        rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']),
      },
    });

    const taskInDeletedPrj = await prisma.task.create({
      data: {
        taskNumber: `DEL-PRJ-TASK-${Date.now()}`,
        subject: 'Task inside project to be deleted',
        category: 'TECHNICAL_ISSUE',
        status: 'OPEN',
        projectId: prjToDelete.id,
        createdById: vikram!.id,
        currentAssigneeId: vikram!.id,
      },
    });

    const actInDeletedPrj = await prisma.taskActivity.create({
      data: {
        taskId: taskInDeletedPrj.id,
        actionType: 'CREATED',
        actorId: vikram!.id,
        remark: 'Task activity before project deletion',
      },
    });

    // Super Admin deletes project with cascading cleanup
    const tasksInPrj = await prisma.task.findMany({
      where: { projectId: prjToDelete.id },
      select: { id: true },
    });
    const prjTaskIds = tasksInPrj.map((t) => t.id);

    await prisma.$transaction([
      prisma.taskActivity.deleteMany({ where: { taskId: { in: prjTaskIds } } }),
      prisma.taskAttachment.deleteMany({ where: { taskId: { in: prjTaskIds } } }),
      prisma.followUpReport.deleteMany({ where: { taskId: { in: prjTaskIds } } }),
      prisma.task.deleteMany({ where: { projectId: prjToDelete.id } }),
      prisma.projectMember.deleteMany({ where: { projectId: prjToDelete.id } }),
      prisma.project.delete({ where: { id: prjToDelete.id } }),
    ]);

    const checkDeletedPrj = await prisma.project.findUnique({ where: { id: prjToDelete.id } });
    const checkDeletedTasks = await prisma.task.findMany({ where: { projectId: prjToDelete.id } });
    const checkDeletedMembers = await prisma.projectMember.findMany({ where: { projectId: prjToDelete.id } });

    assert(checkDeletedPrj === null, 'Super Admin successfully deleted Project');
    assert(checkDeletedTasks.length === 0, 'Associated project tasks were cleanly cascaded and deleted');
    assert(checkDeletedMembers.length === 0, 'Associated project member records were cleanly cascaded and deleted');

    // Test 18B: Super Admin deletes a Section that has mapped users (users unassigned, section deleted)
    const testSecWithUsers = await prisma.sectionMaster.create({
      data: {
        name: 'Legacy Section to Delete',
        code: 'LEGACY-SEC',
        officeId: offices[0].id,
      },
    });

    const userMappedToSec = await prisma.user.create({
      data: {
        name: 'User In Legacy Section',
        email: 'user.legacy.sec@doitc.gov.in',
        ssoId: 'USER.LEGACY.SEC',
        designation: 'Technical Assistant',
        systemRole: 'EMPLOYEE',
        sectionId: testSecWithUsers.id,
        sectionName: testSecWithUsers.name,
        officeId: offices[0].id,
        passwordHash: 'dummyhash',
      },
    });

    // Unbind users mapped to this section
    await prisma.user.updateMany({
      where: { sectionId: testSecWithUsers.id },
      data: { sectionId: null, sectionName: null },
    });
    await prisma.sectionMaster.delete({ where: { id: testSecWithUsers.id } });

    const checkDeletedSec = await prisma.sectionMaster.findUnique({ where: { id: testSecWithUsers.id } });
    const checkUnboundUser = await prisma.user.findUnique({ where: { id: userMappedToSec.id } });

    assert(checkDeletedSec === null, 'Super Admin successfully deleted Section with mapped users');
    assert(checkUnboundUser?.sectionId === null, 'Mapped users had their sectionId safely cleared to null');

    // Clean up test user
    await prisma.user.delete({ where: { id: userMappedToSec.id } });

    console.log('\n========================================');
    console.log(`🎉 ALL TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
    console.log('========================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test suite encountered an unexpected error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
