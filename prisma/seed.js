"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding for PragatiDesk (DoIT&C)...');
    // Clear existing records
    await prisma.followUpReport.deleteMany({});
    await prisma.taskAttachment.deleteMany({});
    await prisma.taskActivity.deleteMany({});
    await prisma.task.deleteMany({});
    await prisma.projectMember.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({});
    const defaultPasswordHash = await bcryptjs_1.default.hash('DoITC@2026', 10);
    // 1. Super Admin
    const superAdmin = await prisma.user.create({
        data: {
            name: 'Dr. Rameshwar Sharma',
            email: 'admin@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Joint Secretary & State Informatics Officer',
            employeeCode: 'DOITC-SA-001',
            department: 'DoIT&C Secretariat',
            phone: '+91 94140 12345',
            systemRole: 'SUPER_ADMIN',
        },
    });
    // 2. Group Heads / Office In-Charges
    const gh1 = await prisma.user.create({
        data: {
            name: 'Alok Verma',
            email: 'gh.verma@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Technical Director & Group Head (e-Gov)',
            employeeCode: 'DOITC-GH-101',
            department: 'e-Governance & Digital Services Wing',
            phone: '+91 94140 22345',
            systemRole: 'GROUP_HEAD',
            createdById: superAdmin.id,
        },
    });
    const gh2 = await prisma.user.create({
        data: {
            name: 'Sunita Meena',
            email: 'gh.meena@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Additional Director & OIC (Cloud & Infra)',
            employeeCode: 'DOITC-GH-102',
            department: 'State Data Center & Network Division',
            phone: '+91 94140 32345',
            systemRole: 'GROUP_HEAD',
            createdById: superAdmin.id,
        },
    });
    const gh3 = await prisma.user.create({
        data: {
            name: 'Rajesh Gupta',
            email: 'gh.gupta@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Joint Director & Group Head (Citizen Grievances)',
            employeeCode: 'DOITC-GH-103',
            department: 'Public Service Delivery Wing',
            phone: '+91 94140 42345',
            systemRole: 'GROUP_HEAD',
            createdById: superAdmin.id,
        },
    });
    // 3. Employees / Project Members
    const emp1 = await prisma.user.create({
        data: {
            name: 'Vikram Aditya',
            email: 'vikram.aditya@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Senior System Analyst',
            employeeCode: 'EMP-2001',
            department: 'e-Governance Wing',
            phone: '+91 98290 11111',
            systemRole: 'EMPLOYEE',
            createdById: gh1.id,
        },
    });
    const emp2 = await prisma.user.create({
        data: {
            name: 'Priya Sharma',
            email: 'priya.sharma@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Analyst-cum-Programmer (ACP)',
            employeeCode: 'EMP-2002',
            department: 'e-Governance Wing',
            phone: '+91 98290 22222',
            systemRole: 'EMPLOYEE',
            createdById: gh1.id,
        },
    });
    const emp3 = await prisma.user.create({
        data: {
            name: 'Rohit Singh',
            email: 'rohit.singh@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Lead Software Engineer',
            employeeCode: 'EMP-2003',
            department: 'Application Development Cell',
            phone: '+91 98290 33333',
            systemRole: 'EMPLOYEE',
            createdById: gh1.id,
        },
    });
    const emp4 = await prisma.user.create({
        data: {
            name: 'Ananya Joshi',
            email: 'ananya.joshi@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'QA Lead & Review Officer',
            employeeCode: 'EMP-2004',
            department: 'Quality Assurance Division',
            phone: '+91 98290 44444',
            systemRole: 'EMPLOYEE',
            createdById: gh1.id,
        },
    });
    const emp5 = await prisma.user.create({
        data: {
            name: 'Deepak Kumar',
            email: 'deepak.kumar@doitc.gov.in',
            passwordHash: defaultPasswordHash,
            designation: 'Technical Assistant / Operator',
            employeeCode: 'EMP-2005',
            department: 'Central Dispatch & Intake Unit',
            phone: '+91 98290 55555',
            systemRole: 'EMPLOYEE',
            createdById: gh1.id,
        },
    });
    // 4. Projects
    const project1 = await prisma.project.create({
        data: {
            name: 'Raj-Seva Citizen Portal 2.0',
            projectCode: 'PRG-RAJ',
            description: 'Revamping the unified citizen service delivery portal with e-Sign, payment gateway, and mobile responsive forms.',
            groupHeadId: gh1.id,
            status: 'ACTIVE',
        },
    });
    const project2 = await prisma.project.create({
        data: {
            name: 'DoIT&C Enterprise Service Desk & Grievances',
            projectCode: 'PRG-DESK',
            description: 'Departmental letter intake, inter-departmental transfers, issue resolution, and follow-up tracking.',
            groupHeadId: gh1.id,
            status: 'ACTIVE',
        },
    });
    const project3 = await prisma.project.create({
        data: {
            name: 'SDC Cloud Migration & Security Compliance',
            projectCode: 'PRG-CLOUD',
            description: 'Migration of state department portals to State Data Center private cloud with ISO 27001 audit compliance.',
            groupHeadId: gh2.id,
            status: 'ACTIVE',
        },
    });
    // 5. Assign Members to Projects with Multi-Roles
    // Roles: TO_DO_LISTING_OPERATOR, RESOLVING_EMPLOYEE, REVIEW_OFFICER, ADMIN, DEVELOPER, QA
    await prisma.projectMember.createMany({
        data: [
            // Project 1 Members
            {
                projectId: project1.id,
                userId: gh1.id,
                rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']),
            },
            {
                projectId: project1.id,
                userId: emp1.id,
                rolesJson: JSON.stringify(['REVIEW_OFFICER', 'RESOLVING_EMPLOYEE']),
            },
            {
                projectId: project1.id,
                userId: emp2.id,
                rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR', 'RESOLVING_EMPLOYEE', 'DEVELOPER']),
            },
            {
                projectId: project1.id,
                userId: emp3.id,
                rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']),
            },
            {
                projectId: project1.id,
                userId: emp4.id,
                rolesJson: JSON.stringify(['QA', 'REVIEW_OFFICER']),
            },
            {
                projectId: project1.id,
                userId: emp5.id,
                rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR', 'RESOLVING_EMPLOYEE']),
            },
            // Project 2 Members
            {
                projectId: project2.id,
                userId: gh1.id,
                rolesJson: JSON.stringify(['ADMIN', 'REVIEW_OFFICER']),
            },
            {
                projectId: project2.id,
                userId: emp1.id,
                rolesJson: JSON.stringify(['RESOLVING_EMPLOYEE', 'REVIEW_OFFICER']),
            },
            {
                projectId: project2.id,
                userId: emp2.id,
                rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR', 'RESOLVING_EMPLOYEE']),
            },
            {
                projectId: project2.id,
                userId: emp5.id,
                rolesJson: JSON.stringify(['TO_DO_LISTING_OPERATOR']),
            },
            // Project 3 Members
            {
                projectId: project3.id,
                userId: gh2.id,
                rolesJson: JSON.stringify(['ADMIN']),
            },
            {
                projectId: project3.id,
                userId: emp3.id,
                rolesJson: JSON.stringify(['DEVELOPER', 'RESOLVING_EMPLOYEE']),
            },
            {
                projectId: project3.id,
                userId: emp4.id,
                rolesJson: JSON.stringify(['QA', 'REVIEW_OFFICER']),
            },
        ],
    });
    // 6. Tasks with Lifecycles, Letters, Technical Issues, and Attachments
    // Task 1: Official Letter received from Finance Department
    const task1 = await prisma.task.create({
        data: {
            taskNumber: 'PRG-RAJ-1001',
            referenceNumber: 'FD-EXP/2026/F-8891',
            subject: 'Integration of Treasury IFMS 3.0 with Raj-Seva Portal',
            description: 'Official letter received from Finance Department regarding real-time e-Challan reconciliation and automated sanction generation.',
            letterEmailContent: `To,\nThe Technical Director,\nDepartment of Information Technology & Communication (DoIT&C),\nJaipur.\n\nSubject: Direct API Integration with IFMS 3.0 for Receipt Reconciliation.\n\nSir,\nReference is invited to the meeting dated 10th Feb 2026. You are requested to expedite the API integration between Raj-Seva Citizen Portal and IFMS Treasury gateway.\n\nRegards,\nJoint Secretary (Finance-Exp)`,
            category: 'OFFICIAL_LETTER',
            priority: 'HIGH',
            status: 'IN_PROGRESS',
            projectId: project1.id,
            createdById: gh1.id,
            currentAssigneeId: emp2.id, // Priya Sharma
            allocatedDurationValue: 5,
            allocatedDurationUnit: 'DAYS',
            estimatedCompletionAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
    });
    await prisma.taskActivity.createMany({
        data: [
            {
                taskId: task1.id,
                actionType: 'CREATED',
                actorId: gh1.id,
                targetUserId: emp1.id,
                remark: 'Official letter logged and assigned to Vikram Aditya for initial scoping.',
                createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            },
            {
                taskId: task1.id,
                actionType: 'TRANSFERRED',
                actorId: emp1.id,
                targetUserId: emp2.id,
                remark: 'Scoping complete. Transferred to ACP Priya Sharma to build webhook listener and payload mapping.',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
        ],
    });
    // Task 2: Technical Issue: High Latency & SSO Loop
    const task2 = await prisma.task.create({
        data: {
            taskNumber: 'PRG-RAJ-1002',
            referenceNumber: 'TECH-BUG-4092',
            subject: 'SSO Session Expiry Loop on Mobile Browsers (Chrome / Safari)',
            description: 'Citizens report repeated redirects to login screen when applying for certificates on iOS Safari and Android Chrome.',
            category: 'TECHNICAL_ISSUE',
            priority: 'CRITICAL',
            status: 'IN_PROGRESS',
            projectId: project1.id,
            createdById: emp5.id, // Deepak Kumar (Operator)
            currentAssigneeId: emp3.id, // Rohit Singh (Developer)
            allocatedDurationValue: 24,
            allocatedDurationUnit: 'HOURS',
            estimatedCompletionAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
    });
    await prisma.taskActivity.createMany({
        data: [
            {
                taskId: task2.id,
                actionType: 'CREATED',
                actorId: emp5.id,
                targetUserId: gh1.id,
                remark: 'Issue registered from Call Center escalations.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
            {
                taskId: task2.id,
                actionType: 'TRANSFERRED',
                actorId: gh1.id,
                targetUserId: emp3.id,
                remark: 'Critical citizen impact. Rohit Singh, please debug SameSite cookie attribute and JWT refresh logic.',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
        ],
    });
    // Task 3: Disposed Task with Post-Disposal Follow-Up
    const task3 = await prisma.task.create({
        data: {
            taskNumber: 'PRG-DESK-1003',
            referenceNumber: 'DOITC/DISP/2026/331',
            subject: 'Security Vulnerability Assessment & Sign-Off by CERT-In Empanelled Auditor',
            description: 'Annual VAPT assessment and closure of low/medium vulnerability points for e-Governance portal.',
            category: 'SERVICE_REQUEST',
            priority: 'HIGH',
            status: 'DISPOSED',
            projectId: project2.id,
            createdById: gh1.id,
            currentAssigneeId: emp4.id, // Ananya Joshi
            disposedById: emp4.id, // Disposed by Ananya Joshi
            disposedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            allocatedDurationValue: 10,
            allocatedDurationUnit: 'DAYS',
            estimatedCompletionAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
    });
    await prisma.taskActivity.createMany({
        data: [
            {
                taskId: task3.id,
                actionType: 'CREATED',
                actorId: gh1.id,
                targetUserId: emp4.id,
                remark: 'Assigned for VAPT report review and compliance verification.',
                createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
            },
            {
                taskId: task3.id,
                actionType: 'DISPOSED',
                actorId: emp4.id,
                remark: 'All 14 auditor observations resolved. Safe-to-Host certificate issued. Task disposed for final file dispatch.',
                createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            },
        ],
    });
    // Follow-up entry for Task 3
    await prisma.followUpReport.create({
        data: {
            taskId: task3.id,
            reportedById: emp4.id,
            status: 'Safe-to-Host Certificate Dispatched to NIC Cloud Team',
            remarks: 'Hard copies sent to Joint Secretary office for signature archiving. Awaiting final dispatch receipt acknowledgment.',
            nextFollowUpDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        },
    });
    // Task 4: Reverted Task Example
    const task4 = await prisma.task.create({
        data: {
            taskNumber: 'PRG-RAJ-1004',
            referenceNumber: 'REQ-DOC-771',
            subject: 'Drafting of RFP for Cloud Server Capacity Expansion',
            description: 'Prepare technical specifications and SLA matrix for additional 50TB SAN storage.',
            category: 'GENERAL_TASK',
            priority: 'MEDIUM',
            status: 'REVERTED',
            projectId: project1.id,
            createdById: gh1.id,
            currentAssigneeId: gh1.id,
            allocatedDurationValue: 7,
            allocatedDurationUnit: 'DAYS',
            estimatedCompletionAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        },
    });
    await prisma.taskActivity.createMany({
        data: [
            {
                taskId: task4.id,
                actionType: 'CREATED',
                actorId: gh1.id,
                targetUserId: emp1.id,
                remark: 'Assigned to Vikram Aditya to draft technical evaluation clauses.',
                createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
            },
            {
                taskId: task4.id,
                actionType: 'REVERTED',
                actorId: emp1.id,
                targetUserId: gh1.id,
                remark: 'Reverted back to Group Head: Requires input on estimated budget ceiling and OEM criteria before finalizing draft.',
                createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
            },
        ],
    });
    // Task 5: Zero-mandatory quick registered To-Do item
    const task5 = await prisma.task.create({
        data: {
            taskNumber: 'PRG-DESK-1005',
            subject: 'Review Gazette Notification on IT Rules 2026',
            category: 'GENERAL_TASK',
            priority: 'LOW',
            status: 'OPEN',
            projectId: project2.id,
            createdById: emp5.id,
            currentAssigneeId: emp5.id,
            allocatedDurationValue: 2,
            allocatedDurationUnit: 'DAYS',
        },
    });
    await prisma.taskActivity.create({
        data: {
            taskId: task5.id,
            actionType: 'CREATED',
            actorId: emp5.id,
            targetUserId: emp5.id,
            remark: 'Quick To-Do task added to backlog.',
        },
    });
    console.log('✅ Seeding completed successfully!');
    console.log('👥 Users created:');
    console.log('   - Super Admin: admin@doitc.gov.in / DoITC@2026');
    console.log('   - Group Head 1: gh.verma@doitc.gov.in / DoITC@2026');
    console.log('   - Group Head 2: gh.meena@doitc.gov.in / DoITC@2026');
    console.log('   - Employee (Analyst): vikram.aditya@doitc.gov.in / DoITC@2026');
    console.log('   - Employee (ACP): priya.sharma@doitc.gov.in / DoITC@2026');
    console.log('   - Employee (Dev): rohit.singh@doitc.gov.in / DoITC@2026');
    console.log('   - Employee (QA): ananya.joshi@doitc.gov.in / DoITC@2026');
    console.log('   - Employee (Operator): deepak.kumar@doitc.gov.in / DoITC@2026');
}
main()
    .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
