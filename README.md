# PragatiDesk (प्रगति डेस्क) — DoIT&C Agile Project & Task Workflow Tracking System

**PragatiDesk** is a tailored Jira-style Agile Issue & Project Tracking System engineered for government and enterprise operations at scale (modeled after the Department of Information Technology & Communication — DoIT&C, supporting 300–400 Group Heads & Office In-Charges).

---

## 🌟 Key Functional Features

### 1. Multi-Tier Role-Based Access Control (RBAC)
- **Super Admin (Secretariat Level)**:
  - Provisions and manages Group Head / Officer In-Charge (OIC) accounts across all department wings, divisions, and district offices.
  - Organization-wide governance, audit logs, and global operational metrics.
- **Group Head / Office In-Charge (OIC)**:
  - Creates projects (e.g., *Raj-Seva Citizen Portal*, *DoIT&C Service Desk*, *SDC Cloud Migration*).
  - Registers staff and assigns employees **multiple roles** (e.g., *To-Do Listing Operator*, *Resolving Employee*, *Review Officer*, *Admin*, *Developer*, *QA*) across multiple projects.
  - Dynamic Role Management: Can update employee role assignments dynamically at any time.
  - Exclusive Privileges: Only Group Heads / OICs can modify core task details (subject, reference numbers, descriptions, categories).
- **Employees / Project Members**:
  - Work on assigned tasks across projects.
  - Execute state transitions: **Transfer**, **Revert**, **Dispose** with mandatory remarks.
  - Set priority (Critical, High, Medium, Low), allocated durations (days/hours), and target deadlines.
  - **Disposal & Follow-Up Ownership**: The employee who marks a task as disposed is recorded as the **Follow-up Owner** and manages post-disposal replies, external department communications, and compliance reports.

### 2. Frictionless Task Registration (To-Do Intake)
- **Zero-Mandatory Initial Registration**: Tasks can be created instantly with minimal friction.
- Supports Official Letter / Correspondence intake verbatim, Reference Numbers (e.g., `FD-EXP/2026/F-8891`), technical descriptions, and multi-format document attachments (PDF, Excel, JPG, Word, CSV).

### 3. Accountable Task Lifecycle & Collaborative Audit Trail
- **Transfer Task**: Select target employee from a dropdown displaying `[Employee Name — Designation (Role)]`. Remark is strictly mandatory; file attachments supported.
- **Revert Task**: Send task back to previous assigner or Group Head with mandatory explanation.
- **Dispose Task**: Mark task resolved. Captures outcome summary and initiates the follow-up tracker.
- **Full Team Activity Timeline**: All remarks, transfers, reversions, priority adjustments, and attached documents are permanently visible to all project members.

### 4. Interactive Operational & Executive Dashboard
- **Real-Time KPI Cards**: Total Work Items, Pending Workload, Transferred, Reverted, Disposed, Critical Issues.
- **Interactive Employee Workload Matrix**: Click any employee to view their specific pending tasks, SLA countdowns, and turnaround metrics.
- **Project-Wise Health**: Completion rates, active backlogs, and team sizes.
- **Live Activity Stream**: Real-time chronological audit feed across the department.
- **Follow-Up Tracker**: Dedicated compliance module for monitoring disposed tasks.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Lucide React, Recharts |
| **Backend API** | Node.js, Express, TypeScript, RESTful architecture |
| **Database & ORM** | SQLite (zero-config local run) / PostgreSQL ready, Prisma ORM |
| **Authentication** | JWT (JSON Web Tokens) with granular RBAC & Persona Switcher |
| **File Storage** | Multer multi-format upload pipeline (`/uploads`) |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
# Install root, backend, and frontend packages
npm run install:all
```

### 2. Database Setup & Seeding
```bash
# Push Prisma schema to SQLite and seed realistic DoIT&C data
npm run db:push
npm run db:seed
```

### 3. Run Development Server
```bash
# Runs both backend (port 5000) and frontend (port 3000) concurrently
npm run dev
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API & Health**: `http://localhost:5000/api/health`

---

## 👥 Pre-Configured Demo Accounts

Use the **One-Click Persona Switcher** in the top header or log in with password `DoITC@2026`:

| Role | Name & Designation | Email |
|---|---|---|
| **Super Admin** | Dr. Rameshwar Sharma (Joint Secretary & SIO) | `admin@doitc.gov.in` |
| **Group Head 1** | Alok Verma (Technical Director, e-Gov Wing) | `gh.verma@doitc.gov.in` |
| **Group Head 2** | Sunita Meena (Additional Director, Cloud & SDC) | `gh.meena@doitc.gov.in` |
| **Employee (Analyst)** | Vikram Aditya (Senior System Analyst) | `vikram.aditya@doitc.gov.in` |
| **Employee (ACP)** | Priya Sharma (Analyst-cum-Programmer) | `priya.sharma@doitc.gov.in` |
| **Employee (Dev)** | Rohit Singh (Lead Software Engineer) | `rohit.singh@doitc.gov.in` |
| **Employee (QA)** | Ananya Joshi (QA Lead & Review Officer) | `ananya.joshi@doitc.gov.in` |
| **Employee (Operator)**| Deepak Kumar (Technical Assistant / Operator)| `deepak.kumar@doitc.gov.in` |

---

## 🧪 Running Automated Tests
```bash
npm run test:workflow
```
Verifies:
- Super Admin RBAC & Group Head creation
- Project creation & dynamic multi-role assignment matrix
- Frictionless task intake & sequential numbering
- State transitions (Transfer, Revert, Dispose)
- Mandatory remarks enforcement
- Follow-up ownership assignment on task disposal.
