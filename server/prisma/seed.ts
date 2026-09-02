import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const seedJsonPath = path.join(__dirname, 'production_seed.json');

  if (fs.existsSync(seedJsonPath)) {
    console.log('🌱 Loading live production snapshot from production_seed.json...');
    const data = JSON.parse(fs.readFileSync(seedJsonPath, 'utf-8'));

    // Safe seed: Upsert records without deleting user tasks or operational data

    // 1. Offices
    for (const off of data.offices || []) {
      await prisma.officeMaster.upsert({
        where: { id: off.id },
        update: {},
        create: {
          id: off.id,
          name: off.name,
          code: off.code,
          district: off.district,
          address: off.address,
          isActive: off.isActive,
        },
      });
    }

    // 2. Sections
    for (const sec of data.sections || []) {
      await prisma.sectionMaster.upsert({
        where: { id: sec.id },
        update: {},
        create: {
          id: sec.id,
          name: sec.name,
          code: sec.code,
          officeId: sec.officeId,
          isActive: sec.isActive,
        },
      });
    }

    // 3. Designations
    for (const des of data.designations || []) {
      await prisma.designationMaster.upsert({
        where: { id: des.id },
        update: {},
        create: {
          id: des.id,
          title: des.title,
          cadre: des.cadre,
          isActive: des.isActive,
        },
      });
    }

    // 4. Roles
    for (const role of data.roles || []) {
      await prisma.roleMaster.upsert({
        where: { id: role.id },
        update: {},
        create: {
          id: role.id,
          name: role.name,
          code: role.code,
          description: role.description,
          isSystem: role.isSystem,
          permissionsJson: role.permissionsJson,
          isActive: role.isActive,
        },
      });
    }

    // 5. Users
    for (const u of data.users || []) {
      await prisma.user.upsert({
        where: { id: u.id },
        update: {},
        create: {
          id: u.id,
          name: u.name,
          email: u.email,
          ssoId: u.ssoId,
          passwordHash: u.passwordHash,
          phone: u.phone,
          gmailId: u.gmailId,
          designation: u.designation,
          systemRole: u.systemRole,
          roleId: u.roleId,
          officeId: u.officeId,
          officeName: u.officeName,
          sectionId: u.sectionId,
          sectionName: u.sectionName,
          isActive: u.isActive,
          mustChangePassword: u.mustChangePassword || false,
        },
      });
    }

    // 6. Projects
    for (const p of data.projects || []) {
      await prisma.project.upsert({
        where: { id: p.id },
        update: {},
        create: {
          id: p.id,
          name: p.name,
          projectCode: p.projectCode,
          description: p.description,
          status: p.status,
          officeId: p.officeId,
          officeName: p.officeName,
          groupHeadId: p.groupHeadId,
        },
      });
    }

    // 7. Project Members
    for (const m of data.members || []) {
      await prisma.projectMember.upsert({
        where: { id: m.id },
        update: {},
        create: {
          id: m.id,
          projectId: m.projectId,
          userId: m.userId,
          rolesJson: m.rolesJson,
        },
      });
    }

    // 8. Tasks
    for (const t of data.tasks || []) {
      await prisma.task.upsert({
        where: { id: t.id },
        update: {},
        create: {
          id: t.id,
          taskNumber: t.taskNumber,
          referenceNumber: t.referenceNumber,
          rajKajNumber: t.rajKajNumber,
          issueNumber: t.issueNumber,
          subject: t.subject,
          description: t.description,
          letterEmailContent: t.letterEmailContent,
          status: t.status,
          priority: t.priority,
          category: t.category,
          projectId: t.projectId,
          createdById: t.createdById,
          currentAssigneeId: t.currentAssigneeId,
        },
      });
    }

    console.log(`✅ Production database restored with ${data.users.length} live staff accounts including ANKIT!`);
    return;
  }
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
  })
  .finally(() => prisma.$disconnect());
