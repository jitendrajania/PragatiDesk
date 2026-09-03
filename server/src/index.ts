import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import projectRoutes from './routes/project.routes';
import taskRoutes from './routes/task.routes';
import followupRoutes from './routes/followup.routes';
import dashboardRoutes from './routes/dashboard.routes';
import uploadRoutes from './routes/upload.routes';
import masterRoutes from './routes/master.routes';
import reportRoutes from './routes/report.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5050;

// Enable CORS
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Ensure uploads folder exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/masters', masterRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'PragatiDesk - DoIT&C Agile Project & Task Workflow Management',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend SPA from client/dist (for direct LAN and intranet access)
const clientDistDir = path.join(__dirname, '../../client/dist');
if (fs.existsSync(clientDistDir)) {
  app.use(express.static(clientDistDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistDir, 'index.html'));
  });
}

import { prisma } from './prisma';
import { execSync } from 'child_process';

async function autoInitDatabase() {
  try {
    // Check and restore snapshot if database is empty
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      console.log('🌱 Empty database detected. Restoring live snapshot...');
      const seedJsonPath = path.join(__dirname, '../prisma/production_seed.json');
      if (fs.existsSync(seedJsonPath)) {
        const data = JSON.parse(fs.readFileSync(seedJsonPath, 'utf-8'));

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
        console.log(`✅ Production database successfully initialized with ${data.users.length} accounts including ANKIT!`);
      }
    }
  } catch (err) {
    console.error('Database auto-initialization note:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`====================================================`);
  console.log(`🚀 PragatiDesk API Server running on port ${PORT}`);
  console.log(`🌐 Local URL:   http://localhost:${PORT}`);
  console.log(`🏢 Office LAN:  http://10.68.100.143:${PORT}`);
  console.log(`====================================================`);
  await autoInitDatabase();
});
