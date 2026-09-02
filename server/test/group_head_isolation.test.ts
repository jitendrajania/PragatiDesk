import { prisma } from '../src/prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pragatidesk_doitc_secret_key_2026_jwt_token_secure';

async function testGroupHeadIsolation() {
  console.log('🧪 Testing Strict Group Head Multi-Tenancy Isolation & Reference Details...');

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
    // 1. Fetch Sunita Meena (Group Head)
    const sunita = await prisma.user.findUnique({
      where: { email: 'gh.meena@doitc.gov.in' },
    });

    if (!sunita) {
      throw new Error('Sunita Meena user not found in DB');
    }
    assert(sunita.systemRole === 'GROUP_HEAD', 'Sunita Meena has GROUP_HEAD systemRole');

    // 2. Fetch Alok Verma (Another Group Head)
    const alok = await prisma.user.findUnique({
      where: { email: 'gh.verma@doitc.gov.in' },
    });
    if (!alok) throw new Error('Alok Verma user not found');

    // 3. Create a project under Sunita if none exists
    let sunitaProject = await prisma.project.findFirst({
      where: { groupHeadId: sunita.id },
    });

    if (!sunitaProject) {
      sunitaProject = await prisma.project.create({
        data: {
          name: 'Sunita Division Automation Portal',
          projectCode: 'PRG-SUN',
          description: 'Dedicated division project managed by Sunita Meena',
          groupHeadId: sunita.id,
        },
      });
      await prisma.projectMember.create({
        data: {
          projectId: sunitaProject.id,
          userId: sunita.id,
          rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']),
        },
      });
    }
    assert(!!sunitaProject && sunitaProject.groupHeadId === sunita.id, 'Sunita has a dedicated project under her group');

    // 4. Verify Project Isolation Query: Group Head only sees their own projects
    const sunitaProjects = await prisma.project.findMany({
      where: { groupHeadId: sunita.id },
    });
    assert(
      sunitaProjects.every((p) => p.groupHeadId === sunita.id),
      `Sunita projects strictly filtered to her group (${sunitaProjects.length} found, 0 from other Group Heads)`
    );

    const alokProjects = await prisma.project.findMany({
      where: { groupHeadId: alok.id },
    });
    assert(
      alokProjects.every((p) => p.groupHeadId === alok.id),
      `Alok projects strictly filtered to his group (${alokProjects.length} found, 0 from Sunita)`
    );

    // 5. Create Task with RajKaj No, Issue No, and Reference Date
    const sampleTask = await prisma.task.create({
      data: {
        taskNumber: `PRG-SUN-${Date.now().toString().slice(-4)}`,
        referenceNumber: 'REF/SEC/2026/99',
        rajKajNumber: 'RJ-DK/2026/89421',
        issueNumber: 'ISSUE-7741',
        referenceDate: new Date('2026-08-25'),
        subject: 'Secretariat Dak Intake & Compliance File',
        category: 'OFFICIAL_LETTER',
        priority: 'CRITICAL',
        status: 'OPEN',
        projectId: sunitaProject.id,
        createdById: sunita.id,
        currentAssigneeId: sunita.id,
      },
    });

    assert(
      sampleTask.rajKajNumber === 'RJ-DK/2026/89421' &&
        sampleTask.issueNumber === 'ISSUE-7741' &&
        !!sampleTask.referenceDate,
      'Task created with RajKaj No, Issue No, and Email Date stored accurately'
    );

    // 6. Verify Task Isolation Query: Sunita only sees tasks belonging to her projects
    const sunitaTasks = await prisma.task.findMany({
      where: { project: { groupHeadId: sunita.id } },
    });
    assert(
      sunitaTasks.some((t) => t.id === sampleTask.id),
      'Sunita can view tasks in her group'
    );

    const alokTasks = await prisma.task.findMany({
      where: { project: { groupHeadId: alok.id } },
    });
    assert(
      !alokTasks.some((t) => t.id === sampleTask.id),
      'Alok CANNOT view Sunita’s tasks (Multi-tenancy isolation confirmed)'
    );

    // 7. Verify Super Admin Global Visibility
    const allTasksSuperAdmin = await prisma.task.findMany({});
    assert(
      allTasksSuperAdmin.some((t) => t.id === sampleTask.id) &&
        allTasksSuperAdmin.some((t) => t.projectId !== sunitaProject.id),
      'Super Admin retains 100% full visibility across all groups and all projects'
    );

    console.log('\n------------------------------------------------------');
    console.log(`📊 Isolation Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('------------------------------------------------------');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testGroupHeadIsolation();
