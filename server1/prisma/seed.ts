import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // PRODUCTION SAFETY GUARD: Prevent accidental data wiping
  const userCount = await prisma.user.count();
  if (userCount > 0 && process.env.FORCE_SEED !== 'true') {
    console.error('⛔ [PRODUCTION SAFETY GUARD] Database already contains live data. Seeding is aborted to prevent accidental data loss.');
    console.error('If you explicitly intend to wipe the database, run: $env:FORCE_SEED="true"; npm run db:seed');
    process.exit(0);
  }

  console.log('🌱 Starting comprehensive database seeding for PragatiDesk (DoIT&C)...');

  // Clear existing records in correct relation order
  await prisma.followUpReport.deleteMany({});
  await prisma.taskAttachment.deleteMany({});
  await prisma.taskActivity.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.otpRecord.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.roleMaster.deleteMany({});
  await prisma.designationMaster.deleteMany({});
  await prisma.sectionMaster.deleteMany({});
  await prisma.officeMaster.deleteMany({});

  const defaultPasswordHash = await bcrypt.hash('DoITC@2026', 10);

  // 1. Office Masters
  console.log('  🏢 Seeding Office Masters...');
  const officeHq = await prisma.officeMaster.create({
    data: {
      name: 'DoIT&C Secretariat, Jaipur (HQ)',
      code: 'HQ-JPR',
      district: 'Jaipur',
      address: 'Yojna Bhawan, Tilak Marg, C-Scheme, Jaipur - 302005',
      isActive: true,
    },
  });

  const officeSdc = await prisma.officeMaster.create({
    data: {
      name: 'State Data Center (SDC), Jaipur',
      code: 'SDC-JPR',
      district: 'Jaipur',
      address: 'IT Park, RIICO Industrial Area, Mansarovar, Jaipur - 302020',
      isActive: true,
    },
  });

  const officeJodhpur = await prisma.officeMaster.create({
    data: {
      name: 'DoIT&C District Office, Jodhpur',
      code: 'DO-JDH',
      district: 'Jodhpur',
      address: 'Collectorate Complex, High Court Road, Jodhpur - 342001',
      isActive: true,
    },
  });

  const officeUdaipur = await prisma.officeMaster.create({
    data: {
      name: 'DoIT&C District Office, Udaipur',
      code: 'DO-UDP',
      district: 'Udaipur',
      address: 'Mini Secretariat, Court Circle, Udaipur - 313001',
      isActive: true,
    },
  });

  // 2. Section Masters
  console.log('  📂 Seeding Section Masters...');
  const secEgov = await prisma.sectionMaster.create({
    data: {
      name: 'e-Governance & Digital Services Wing',
      code: 'SEC-EGOV',
      officeId: officeHq.id,
      isActive: true,
    },
  });

  const secPsdg = await prisma.sectionMaster.create({
    data: {
      name: 'Public Service Delivery & Citizen Grievances',
      code: 'SEC-PSDG',
      officeId: officeHq.id,
      isActive: true,
    },
  });

  const secCyber = await prisma.sectionMaster.create({
    data: {
      name: 'Network & Cybersecurity Wing',
      code: 'SEC-CYBER',
      officeId: officeHq.id,
      isActive: true,
    },
  });

  const secSdcOps = await prisma.sectionMaster.create({
    data: {
      name: 'Cloud Infrastructure & SDC Operations',
      code: 'SEC-SDC-OPS',
      officeId: officeSdc.id,
      isActive: true,
    },
  });

  const secJdhOps = await prisma.sectionMaster.create({
    data: {
      name: 'District Operations & Citizen IT Services',
      code: 'SEC-JDH-OPS',
      officeId: officeJodhpur.id,
      isActive: true,
    },
  });

  // 3. Designation Masters
  console.log('  🎖️ Seeding Designation Masters...');
  const designationsList = [
    { title: 'Joint Secretary & State Informatics Officer', cadre: 'State Secretariat Cadre' },
    { title: 'Joint Director & Office In-Charge', cadre: 'Directorate Cadre' },
    { title: 'Technical Director', cadre: 'Senior Technical Cadre' },
    { title: 'Additional Director', cadre: 'Senior Technical Cadre' },
    { title: 'Joint Director', cadre: 'Senior Technical Cadre' },
    { title: 'Senior System Analyst', cadre: 'Technical Officer Cadre' },
    { title: 'Analyst-cum-Programmer (ACP)', cadre: 'Programmer Cadre' },
    { title: 'Lead Software Engineer', cadre: 'Engineering Cadre' },
    { title: 'QA Lead & Review Officer', cadre: 'Quality Assurance Cadre' },
    { title: 'Technical Assistant / Operator', cadre: 'Operations Cadre' },
  ];

  for (const des of designationsList) {
    await prisma.designationMaster.create({ data: des });
  }

  // 4. Role Masters & Permissions
  console.log('  🛡️ Seeding Role Masters with Module Permissions...');
  const superAdminRole = await prisma.roleMaster.create({
    data: {
      name: 'Super Admin',
      code: 'SUPER_ADMIN',
      description: 'Full governance, masters management, role definition, and cross-office control.',
      isSystem: true,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: true, canEdit: true },
        { module: 'KANBAN', canView: true, canEdit: true },
        { module: 'TASKS', canView: true, canEdit: true },
        { module: 'PROJECTS', canView: true, canEdit: true },
        { module: 'FOLLOWUP', canView: true, canEdit: true },
        { module: 'EMPLOYEES', canView: true, canEdit: true },
        { module: 'MASTERS', canView: true, canEdit: true },
        { module: 'ROLES_MANAGEMENT', canView: true, canEdit: true },
        { module: 'ADMIN_PORTAL', canView: true, canEdit: true },
      ]),
    },
  });

  const officeSuperAdminRole = await prisma.roleMaster.create({
    data: {
      name: 'Office Super Admin',
      code: 'OFFICE_SUPER_ADMIN',
      description: 'Office-level administrative oversight and user/work management.',
      isSystem: true,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: true, canEdit: true },
        { module: 'KANBAN', canView: true, canEdit: true },
        { module: 'TASKS', canView: true, canEdit: true },
        { module: 'PROJECTS', canView: true, canEdit: true },
        { module: 'FOLLOWUP', canView: true, canEdit: true },
        { module: 'EMPLOYEES', canView: true, canEdit: true },
        { module: 'MASTERS', canView: true, canEdit: false },
        { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
        { module: 'ADMIN_PORTAL', canView: true, canEdit: true },
      ]),
    },
  });

  const groupHeadRole = await prisma.roleMaster.create({
    data: {
      name: 'Group Head / Section',
      code: 'GROUP_HEAD',
      description: 'Oversees projects, employee role mappings, and section task workflows.',
      isSystem: true,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: true, canEdit: true },
        { module: 'KANBAN', canView: true, canEdit: true },
        { module: 'TASKS', canView: true, canEdit: true },
        { module: 'PROJECTS', canView: true, canEdit: true },
        { module: 'FOLLOWUP', canView: true, canEdit: true },
        { module: 'EMPLOYEES', canView: true, canEdit: true },
        { module: 'MASTERS', canView: false, canEdit: false },
        { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
        { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
      ]),
    },
  });

  const employeeRole = await prisma.roleMaster.create({
    data: {
      name: 'Employee',
      code: 'EMPLOYEE',
      description: 'Standard departmental member executing task lifecycle transitions.',
      isSystem: true,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: true, canEdit: true },
        { module: 'KANBAN', canView: true, canEdit: true },
        { module: 'TASKS', canView: true, canEdit: true },
        { module: 'PROJECTS', canView: true, canEdit: false },
        { module: 'FOLLOWUP', canView: true, canEdit: true },
        { module: 'EMPLOYEES', canView: true, canEdit: false },
        { module: 'MASTERS', canView: false, canEdit: false },
        { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
        { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
      ]),
    },
  });

  const reviewAuditorRole = await prisma.roleMaster.create({
    data: {
      name: 'Compliance & Review Auditor',
      code: 'REVIEW_AUDITOR',
      description: 'Read-only departmental compliance auditor with follow-up oversight.',
      isSystem: false,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: true, canEdit: false },
        { module: 'KANBAN', canView: true, canEdit: false },
        { module: 'TASKS', canView: true, canEdit: false },
        { module: 'PROJECTS', canView: true, canEdit: false },
        { module: 'FOLLOWUP', canView: true, canEdit: true },
        { module: 'EMPLOYEES', canView: true, canEdit: false },
        { module: 'REPORTS', canView: true, canEdit: false },
        { module: 'MASTERS', canView: false, canEdit: false },
        { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
        { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
      ]),
    },
  });

  const reportsRole = await prisma.roleMaster.create({
    data: {
      name: 'reports',
      code: 'REPORTS',
      description: 'Reports and Analytics Viewer with interactive pie charts and export access.',
      isSystem: false,
      isActive: true,
      permissionsJson: JSON.stringify([
        { module: 'DASHBOARD', canView: false, canEdit: false },
        { module: 'KANBAN', canView: false, canEdit: false },
        { module: 'TASKS', canView: false, canEdit: false },
        { module: 'PROJECTS', canView: false, canEdit: false },
        { module: 'FOLLOWUP', canView: false, canEdit: false },
        { module: 'EMPLOYEES', canView: false, canEdit: false },
        { module: 'REPORTS', canView: true, canEdit: false },
        { module: 'MASTERS', canView: false, canEdit: false },
        { module: 'ROLES_MANAGEMENT', canView: false, canEdit: false },
        { module: 'ADMIN_PORTAL', canView: false, canEdit: false },
      ]),
    },
  });

  // 5. Users
  console.log('  👥 Seeding Users & Hierarchy...');
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Jitendra Jania',
      email: 'jitendrajania.doit@rajasthan.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'State Super Admin & Technical In-Charge',
      ssoId: 'JITENDRA.DOIT',
      phone: '9414012345',
      gmailId: 'jitendra.jania@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'SUPER_ADMIN',
      roleId: superAdminRole.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const officeSuperAdmin = await prisma.user.create({
    data: {
      name: 'Rajesh Verma',
      email: 'osa.jodhpur@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Joint Director & Office In-Charge',
      ssoId: 'DOITC-OSA-101',
      phone: '9414055555',
      gmailId: 'rajesh.verma.jdh@gmail.com',
      officeId: officeJodhpur.id,
      officeName: officeJodhpur.name,
      sectionId: secJdhOps.id,
      sectionName: secJdhOps.name,
      systemRole: 'OFFICE_SUPER_ADMIN',
      roleId: officeSuperAdminRole.id,
      createdById: superAdmin.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const gh1 = await prisma.user.create({
    data: {
      name: 'Alok Verma',
      email: 'gh.verma@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Technical Director',
      ssoId: 'DOITC-GH-101',
      phone: '9414022345',
      gmailId: 'alok.verma.doitc@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'GROUP_HEAD',
      roleId: groupHeadRole.id,
      createdById: superAdmin.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const gh2 = await prisma.user.create({
    data: {
      name: 'Sunita Meena',
      email: 'gh.meena@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Additional Director',
      ssoId: 'DOITC-GH-102',
      phone: '9414032345',
      gmailId: 'sunita.meena.sdc@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secPsdg.id,
      sectionName: secPsdg.name,
      systemRole: 'GROUP_HEAD',
      roleId: groupHeadRole.id,
      createdById: superAdmin.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const gh3 = await prisma.user.create({
    data: {
      name: 'Suresh Choudhary',
      email: 'gh.choudhary@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Joint Director',
      ssoId: 'DOITC-GH-103',
      phone: '9414044444',
      gmailId: 'suresh.choudhary.doitc@gmail.com',
      officeId: officeSdc.id,
      officeName: officeSdc.name,
      sectionId: secSdcOps.id,
      sectionName: secSdcOps.name,
      systemRole: 'GROUP_HEAD',
      roleId: groupHeadRole.id,
      createdById: superAdmin.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Employees under GH1 (e-Gov Wing)
  const emp1 = await prisma.user.create({
    data: {
      name: 'Vikram Aditya',
      email: 'vikram.aditya@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Senior System Analyst',
      ssoId: 'DOITC-EMP-2001',
      phone: '9829011111',
      gmailId: 'vikram.aditya.work@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh1.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const emp2 = await prisma.user.create({
    data: {
      name: 'Priya Sharma',
      email: 'priya.sharma@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Analyst-cum-Programmer (ACP)',
      ssoId: 'DOITC-EMP-2002',
      phone: '9829022222',
      gmailId: 'priya.sharma.doitc@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh1.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const emp3 = await prisma.user.create({
    data: {
      name: 'Rohit Singh',
      email: 'rohit.singh@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Lead Software Engineer',
      ssoId: 'DOITC-EMP-2003',
      phone: '9829033333',
      gmailId: 'rohit.singh.dev@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh1.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const emp4 = await prisma.user.create({
    data: {
      name: 'Ananya Joshi',
      email: 'ananya.joshi@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'QA Lead & Review Officer',
      ssoId: 'DOITC-EMP-2004',
      phone: '9829044444',
      gmailId: 'ananya.joshi.qa@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh1.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const emp5 = await prisma.user.create({
    data: {
      name: 'Deepak Kumar',
      email: 'deepak.kumar@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Technical Assistant / Operator',
      ssoId: 'DOITC-EMP-2005',
      phone: '9829055555',
      gmailId: 'deepak.kumar.ops@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secEgov.id,
      sectionName: secEgov.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh1.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Employees under GH2 (Public Service Delivery & Citizen Grievances Wing)
  const gh2Emp1 = await prisma.user.create({
    data: {
      name: 'Jitendra Choudhary',
      email: 'jitendra.choudhary@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Analyst-cum-Programmer (ACP)',
      ssoId: 'DOITC-EMP-2006',
      phone: '9829077777',
      gmailId: 'jitendra.choudhary.psd@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secPsdg.id,
      sectionName: secPsdg.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh2.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  const gh2Emp2 = await prisma.user.create({
    data: {
      name: 'Kavita Sharma',
      email: 'kavita.sharma@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Senior System Analyst',
      ssoId: 'DOITC-EMP-2007',
      phone: '9829088888',
      gmailId: 'kavita.sharma.psd@gmail.com',
      officeId: officeHq.id,
      officeName: officeHq.name,
      sectionId: secPsdg.id,
      sectionName: secPsdg.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: gh2.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // Jodhpur District Employee
  const jdhEmp1 = await prisma.user.create({
    data: {
      name: 'Manish Gehlot',
      email: 'manish.gehlot@doitc.gov.in',
      passwordHash: defaultPasswordHash,
      designation: 'Analyst-cum-Programmer (ACP)',
      ssoId: 'DOITC-EMP-3001',
      phone: '9829066666',
      gmailId: 'manish.jodhpur@gmail.com',
      officeId: officeJodhpur.id,
      officeName: officeJodhpur.name,
      sectionId: secJdhOps.id,
      sectionName: secJdhOps.name,
      systemRole: 'EMPLOYEE',
      roleId: employeeRole.id,
      createdById: officeSuperAdmin.id,
      isActive: true,
      mustChangePassword: false,
    },
  });

  // 6. Projects
  console.log('  🚀 Seeding Projects & Dynamic Role Memberships...');
  const proj1 = await prisma.project.create({
    data: {
      projectCode: 'RAJ-SEVA',
      name: 'Raj-Seva Citizen Services Unified Portal',
      description: 'Centralized citizen service delivery and tracking portal for Rajasthan Government.',
      groupHeadId: gh1.id,
      officeId: officeHq.id,
      officeName: officeHq.name,
      status: 'ACTIVE',
    },
  });

  const proj2 = await prisma.project.create({
    data: {
      projectCode: 'DOITC-DESK',
      name: 'DoIT&C Internal IT Service Desk & Workflow Engine',
      description: 'Automated ticket tracking, dispatch management, and SLA compliance monitoring.',
      groupHeadId: gh1.id,
      officeId: officeHq.id,
      officeName: officeHq.name,
      status: 'ACTIVE',
    },
  });

  const proj3 = await prisma.project.create({
    data: {
      projectCode: 'SDC-CLOUD',
      name: 'SDC Multi-Tenant Cloud & Disaster Recovery Migration',
      description: 'Migration of departmental infrastructure to tier-4 State Data Center cloud nodes.',
      groupHeadId: gh1.id,
      officeId: officeHq.id,
      officeName: officeHq.name,
      status: 'ACTIVE',
    },
  });

  const projJodhpur = await prisma.project.create({
    data: {
      projectCode: 'JDH-EDIST',
      name: 'Jodhpur District e-Governance & e-Mitra Plus Network',
      description: 'District level kiosk monitoring and digital service delivery.',
      groupHeadId: officeSuperAdmin.id,
      officeId: officeJodhpur.id,
      officeName: officeJodhpur.name,
      status: 'ACTIVE',
    },
  });

  // Map Members & Roles
  await prisma.projectMember.createMany({
    data: [
      { projectId: proj1.id, userId: gh1.id, rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']) },
      { projectId: proj1.id, userId: emp1.id, rolesJson: JSON.stringify(['REVIEW_OFFICER', 'RESOLVING_EMPLOYEE']) },
      { projectId: proj1.id, userId: emp2.id, rolesJson: JSON.stringify(['RESOLVING_EMPLOYEE', 'DEVELOPER']) },
      { projectId: proj1.id, userId: emp3.id, rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']) },
      { projectId: proj1.id, userId: emp4.id, rolesJson: JSON.stringify(['QA', 'REVIEW_OFFICER']) },
      { projectId: proj1.id, userId: emp5.id, rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR']) },

      { projectId: proj2.id, userId: gh1.id, rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']) },
      { projectId: proj2.id, userId: emp1.id, rolesJson: JSON.stringify(['RESOLVING_EMPLOYEE', 'REVIEW_OFFICER']) },
      { projectId: proj2.id, userId: emp2.id, rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']) },
      { projectId: proj2.id, userId: emp5.id, rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR']) },

      { projectId: proj3.id, userId: gh1.id, rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']) },
      { projectId: proj3.id, userId: emp3.id, rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']) },
      { projectId: proj3.id, userId: emp4.id, rolesJson: JSON.stringify(['QA']) },

      { projectId: projJodhpur.id, userId: officeSuperAdmin.id, rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']) },
      { projectId: projJodhpur.id, userId: jdhEmp1.id, rolesJson: JSON.stringify(['RESOLVING_EMPLOYEE', 'DEVELOPER']) },
    ],
  });

  // 7. Seed Tasks, Activities, and Follow-ups
  console.log('  📝 Seeding Tasks, Workflow Activities, and Follow-up Reports...');
  const task1 = await prisma.task.create({
    data: {
      taskNumber: 'RAJ-1001',
      referenceNumber: 'FD-EXP/2026/F-8891',
      rajKajNumber: 'RJ-DK/2026/89421',
      issueNumber: 'ISSUE-4091',
      referenceDate: new Date('2026-08-20'),
      subject: 'Security Audit Compliance for Citizen Payment Gateway Integration',
      description: 'Finance Department requested formal clearance certificate for CERT-In certified gateway before Janmashtami festival launch.',
      category: 'OFFICIAL_LETTER',
      priority: 'CRITICAL',
      status: 'IN_PROGRESS',
      projectId: proj1.id,
      createdById: emp5.id,
      currentAssigneeId: emp2.id,
      allocatedDurationValue: 3,
      allocatedDurationUnit: 'DAYS',
      estimatedCompletionAt: new Date('2026-09-03'),
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task1.id,
      actionType: 'CREATED',
      actorId: emp5.id,
      remark: 'Intake from Finance Dept dispatch file. Initial registration logged.',
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task1.id,
      actionType: 'TRANSFERRED',
      actorId: gh1.id,
      targetUserId: emp2.id,
      remark: 'Transferred to ACP Priya Sharma for immediate SSL TLS 1.3 audit check.',
    },
  });

  const task2 = await prisma.task.create({
    data: {
      taskNumber: 'RAJ-1002',
      referenceNumber: 'CMO-GRV/2026/902',
      issueNumber: 'ISSUE-4110',
      referenceDate: new Date('2026-08-24'),
      subject: 'Aadhaar e-KYC Verification Latency Reduction in District Kiosks',
      description: 'Field reports from Bharatpur and Kota indicating timeout during biometric authentication peak hours (11:00 AM - 2:00 PM).',
      category: 'TECHNICAL_ISSUE',
      priority: 'HIGH',
      status: 'TRANSFERRED',
      projectId: proj1.id,
      createdById: gh1.id,
      currentAssigneeId: emp3.id,
      allocatedDurationValue: 4,
      allocatedDurationUnit: 'DAYS',
      estimatedCompletionAt: new Date('2026-09-04'),
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task2.id,
      actionType: 'CREATED',
      actorId: gh1.id,
      remark: 'Grievance escalation received from Chief Minister Office desk.',
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task2.id,
      actionType: 'TRANSFERRED',
      actorId: gh1.id,
      targetUserId: emp3.id,
      remark: 'Transferred to Lead Software Engineer Rohit Singh for connection pooling optimization.',
    },
  });

  const task3 = await prisma.task.create({
    data: {
      taskNumber: 'DESK-1001',
      referenceNumber: 'DOITC-DIR/2026/304',
      subject: 'Annual Maintenance Contract (AMC) Renewal for Secretariat Server Room',
      description: 'Vendor quotes compiled and technical evaluation sheet finalized for approval.',
      category: 'SERVICE_REQUEST',
      priority: 'MEDIUM',
      status: 'DISPOSED',
      projectId: proj2.id,
      createdById: gh1.id,
      currentAssigneeId: emp1.id,
      disposedById: emp1.id,
      disposedAt: new Date('2026-08-28'),
      allocatedDurationValue: 5,
      allocatedDurationUnit: 'DAYS',
    },
  });

  await prisma.taskActivity.create({
    data: {
      taskId: task3.id,
      actionType: 'DISPOSED',
      actorId: emp1.id,
      remark: 'Financial scrutiny completed. File forwarded to Finance Section for sanction.',
    },
  });

  await prisma.followUpReport.create({
    data: {
      taskId: task3.id,
      reportedById: emp1.id,
      status: 'Under Review at Finance Section',
      remarks: 'Followed up with Accounts Officer. Sanction order expected by Friday.',
      nextFollowUpDate: new Date('2026-09-05'),
    },
  });

  console.log('✅ Seeding completed successfully!\n');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed with error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
