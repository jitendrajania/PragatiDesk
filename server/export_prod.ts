import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  const offices = await prisma.officeMaster.findMany();
  const sections = await prisma.sectionMaster.findMany();
  const designations = await prisma.designationMaster.findMany();
  const roles = await prisma.roleMaster.findMany();
  const users = await prisma.user.findMany();
  const projects = await prisma.project.findMany();
  const members = await prisma.projectMember.findMany();
  const tasks = await prisma.task.findMany();
  const activities = await prisma.taskActivity.findMany();
  const followups = await prisma.followUpReport.findMany();

  const dump = { offices, sections, designations, roles, users, projects, members, tasks, activities, followups };
  const targetPath = path.join(__dirname, 'prisma/production_seed.json');
  fs.writeFileSync(targetPath, JSON.stringify(dump, null, 2));

  console.log('✅ Exported production data to:', targetPath);
  console.log({
    offices: offices.length,
    sections: sections.length,
    designations: designations.length,
    roles: roles.length,
    users: users.length,
    projects: projects.length,
    members: members.length,
    tasks: tasks.length
  });
}

main().finally(() => prisma.$disconnect());
