import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  ReportAnalyticsData,
  ReportFilterParams,
  Project,
  AssigneeOption,
  ReportTaskRow,
} from '../types';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../components/common/Badge';
import { useAuth } from '../context/AuthContext';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import {
  PieChart as PieChartIcon,
  BarChart3,
  Filter,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  RotateCcw,
  Search,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Users,
  Briefcase,
  Building,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';

interface ReportsDashboardViewProps {
  onSelectTask?: (taskId: string) => void;
}

export const ReportsDashboardView: React.FC<ReportsDashboardViewProps> = ({ onSelectTask }) => {
  const { user } = useAuth();

  // Filter States
  const [filters, setFilters] = useState<ReportFilterParams>({
    startDate: '',
    endDate: '',
    projectId: '',
    status: '',
    assigneeId: '',
    pendingDaysBucket: '',
    category: '',
    priority: '',
    search: '',
  });

  const [datePreset, setDatePreset] = useState<string>('all');
  const [data, setData] = useState<ReportAnalyticsData | null>(null);
  const [projectsList, setProjectsList] = useState<Project[]>([]);
  const [assigneesList, setAssigneesList] = useState<AssigneeOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeChartTab, setActiveChartTab] = useState<'status' | 'priority' | 'category' | 'aging' | 'workload'>('status');

  // Pagination & Sorting for Table
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortField, setSortField] = useState<keyof ReportTaskRow>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 1. Load initial dropdown data (Projects and Assignees)
  useEffect(() => {
    const loadDropdowns = async () => {
      try {
        const [projs, assignees] = await Promise.all([
          api.getProjects(),
          api.getAssignees(),
        ]);
        setProjectsList(projs);
        setAssigneesList(assignees);
      } catch (err) {
        console.error('Failed to load filter dropdowns:', err);
      }
    };
    loadDropdowns();
  }, []);

  // 2. Fetch Report Analytics Data
  const fetchReportData = async () => {
    setIsLoading(true);
    try {
      const res = await api.getReportAnalytics(filters);
      setData(res);
      setCurrentPage(1);
    } catch (err) {
      console.error('Failed to fetch report analytics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [
    filters.startDate,
    filters.endDate,
    filters.projectId,
    filters.status,
    filters.assigneeId,
    filters.pendingDaysBucket,
    filters.category,
    filters.priority,
  ]);

  // Quick Date Range Preset Handler
  const applyDatePreset = (preset: string) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    if (preset === 'today') {
      setFilters((prev) => ({ ...prev, startDate: todayStr, endDate: todayStr }));
    } else if (preset === '7days') {
      setFilters((prev) => ({
        ...prev,
        startDate: format(subDays(today, 7), 'yyyy-MM-dd'),
        endDate: todayStr,
      }));
    } else if (preset === '30days') {
      setFilters((prev) => ({
        ...prev,
        startDate: format(subDays(today, 30), 'yyyy-MM-dd'),
        endDate: todayStr,
      }));
    } else if (preset === 'thisMonth') {
      setFilters((prev) => ({
        ...prev,
        startDate: format(startOfMonth(today), 'yyyy-MM-dd'),
        endDate: format(endOfMonth(today), 'yyyy-MM-dd'),
      }));
    } else if (preset === 'all') {
      setFilters((prev) => ({ ...prev, startDate: '', endDate: '' }));
    }
  };

  const handleResetFilters = () => {
    setDatePreset('all');
    setFilters({
      startDate: '',
      endDate: '',
      projectId: '',
      status: '',
      assigneeId: '',
      pendingDaysBucket: '',
      category: '',
      priority: '',
      search: '',
    });
  };

  // Filtered & Sorted Table Tasks
  const sortedTasks = useMemo(() => {
    if (!data?.tasks) return [];
    let list = [...data.tasks];

    if (filters.search && filters.search.trim()) {
      const q = filters.search.toLowerCase();
      list = list.filter(
        (t) =>
          t.taskNumber.toLowerCase().includes(q) ||
          t.subject.toLowerCase().includes(q) ||
          (t.referenceNumber && t.referenceNumber.toLowerCase().includes(q)) ||
          (t.rajKajNumber && t.rajKajNumber.toLowerCase().includes(q)) ||
          (t.currentAssignee?.name && t.currentAssignee.name.toLowerCase().includes(q))
      );
    }

    list.sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      if (aVal === bVal) return 0;
      if (aVal === undefined || aVal === null) return 1;
      if (bVal === undefined || bVal === null) return -1;
      if (sortOrder === 'asc') return aVal > bVal ? 1 : -1;
      return aVal < bVal ? 1 : -1;
    });

    return list;
  }, [data?.tasks, sortField, sortOrder, filters.search]);

  const totalPages = Math.ceil(sortedTasks.length / pageSize) || 1;
  const paginatedTasks = sortedTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // ---------------------------------------------------------------------------
  // EXPORT 1: EXCEL (.XLSX) EXPORT
  // ---------------------------------------------------------------------------
  const handleExportExcel = () => {
    if (!data || sortedTasks.length === 0) {
      alert('No data available to export.');
      return;
    }

    const reportDate = format(new Date(), 'dd-MMM-yyyy HH:mm');

    // 1. KPI Summary Sheet Data
    const summaryRows = [
      ['PRAGATIDESK — DEPARTMENT OF IT & COMMUNICATION (DoIT&C)'],
      ['AGILE PROJECT, DAK & TASK WORKFLOW PERFORMANCE REPORT'],
      ['Generated On:', reportDate],
      ['Generated By:', `${user?.name} (${user?.designation}) [SSO: ${user?.ssoId}]`],
      ['Office:', user?.officeName || 'DoIT&C Secretariat HQ'],
      [],
      ['--- EXECUTIVE KPI SUMMARY ---'],
      ['Total Filtered Work Items', data.summary.totalTasks],
      ['Active / In-Progress Tasks', data.summary.activeTasks],
      ['Disposed / Completed Tasks', data.summary.disposedTasks],
      ['Critically Aged Tasks (>7 Days)', data.summary.criticalAgingTasks],
      ['Average Resolution Time (Days)', `${data.summary.avgResolutionDays} Days`],
      ['SLA Compliance Rate', `${data.summary.slaComplianceRate}%`],
      [],
      ['--- APPLIED FILTER CRITERIA ---'],
      ['Date Range:', filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : 'All Time'],
      ['Project Filter:', projectsList.find((p) => p.id === filters.projectId)?.name || 'All Projects'],
      ['Status Filter:', filters.status || 'All Statuses'],
      ['Assignee Filter:', assigneesList.find((a) => a.id === filters.assigneeId)?.name || 'All Assignees'],
      ['Aging Bucket Filter:', filters.pendingDaysBucket || 'All Aging Buckets'],
    ];

    // 2. Task Details Sheet Data
    const taskHeaders = [
      'Task Number',
      'Reference / Dispatch #',
      'RajKaj Dak #',
      'Issue #',
      'Subject / Title',
      'Project Code',
      'Project Name',
      'Category',
      'Priority',
      'Status',
      'Assignee Name',
      'Assignee SSO ID',
      'Assignee Designation',
      'Created Date',
      'Disposed Date',
      'Pending / Resolution Days',
      'Aging Bucket',
      'Overdue (>7d)',
    ];

    const taskRows = sortedTasks.map((t) => [
      t.taskNumber,
      t.referenceNumber || '',
      t.rajKajNumber || '',
      t.issueNumber || '',
      t.subject,
      t.project?.projectCode || '',
      t.project?.name || '',
      t.category,
      t.priority,
      t.status,
      t.currentAssignee?.name || 'Unassigned',
      t.currentAssignee?.ssoId || '',
      t.currentAssignee?.designation || '',
      format(new Date(t.createdAt), 'yyyy-MM-dd HH:mm'),
      t.disposedAt ? format(new Date(t.disposedAt), 'yyyy-MM-dd HH:mm') : '',
      t.pendingDays,
      t.agingBucket,
      t.isOverdue ? 'YES' : 'NO',
    ]);

    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    const wsTasks = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskRows]);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary Overview');
    XLSX.utils.book_append_sheet(wb, wsTasks, 'Detailed Task Records');

    XLSX.writeFile(wb, `PragatiDesk_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.xlsx`);
  };

  // ---------------------------------------------------------------------------
  // EXPORT 2: PDF DOSSIER EXPORT
  // ---------------------------------------------------------------------------
  const handleExportPDF = () => {
    if (!data || sortedTasks.length === 0) {
      alert('No data available to export.');
      return;
    }

    const doc = new jsPDF('landscape', 'pt', 'a4');
    const reportDate = format(new Date(), 'dd-MMM-yyyy HH:mm');

    // Header Branding
    doc.setFillColor(30, 41, 59); // Slate-900
    doc.rect(0, 0, 842, 60, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('GOVERNMENT OF RAJASTHAN — DEPARTMENT OF IT & COMMUNICATION', 40, 26);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`PragatiDesk: Workflow Performance & Task Governance Report | ${reportDate}`, 40, 45);

    // Meta Block
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.text(`Generated By: ${user?.name} (${user?.designation}) [SSO: ${user?.ssoId}]`, 40, 78);
    doc.text(`Office: ${user?.officeName || 'DoIT&C Secretariat HQ'}`, 40, 92);

    const activeProjectName = projectsList.find((p) => p.id === filters.projectId)?.name || 'All Projects';
    doc.text(`Project Scope: ${activeProjectName} | Status: ${filters.status || 'All'} | Aging: ${filters.pendingDaysBucket || 'All'}`, 400, 78);
    doc.text(`Date Range: ${filters.startDate && filters.endDate ? `${filters.startDate} to ${filters.endDate}` : 'All Time'}`, 400, 92);

    // Summary Box Table
    autoTable(doc, {
      startY: 104,
      head: [['Total Work Items', 'Active / In-Progress', 'Disposed / Resolved', 'Critically Aged (>7d)', 'Avg Turnaround', 'SLA Compliance']],
      body: [
        [
          String(data.summary.totalTasks),
          String(data.summary.activeTasks),
          String(data.summary.disposedTasks),
          String(data.summary.criticalAgingTasks),
          `${data.summary.avgResolutionDays} Days`,
          `${data.summary.slaComplianceRate}%`,
        ],
      ],
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', halign: 'center' },
      bodyStyles: { halign: 'center', fontStyle: 'bold', fontSize: 10 },
      margin: { left: 40, right: 40 },
    });

    // Detailed Task Records Table
    const tableColumns = [
      { header: 'Task #', dataKey: 'taskNumber' },
      { header: 'Dak / Ref #', dataKey: 'ref' },
      { header: 'Subject / Title', dataKey: 'subject' },
      { header: 'Category', dataKey: 'category' },
      { header: 'Priority', dataKey: 'priority' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Assignee', dataKey: 'assignee' },
      { header: 'Created', dataKey: 'created' },
      { header: 'Pending Days', dataKey: 'pendingDays' },
    ];

    const tableRows = sortedTasks.map((t) => ({
      taskNumber: t.taskNumber,
      ref: t.rajKajNumber || t.referenceNumber || '-',
      subject: t.subject.length > 45 ? `${t.subject.substring(0, 42)}...` : t.subject,
      category: t.category.replace('_', ' '),
      priority: t.priority,
      status: t.status,
      assignee: t.currentAssignee?.name ? `${t.currentAssignee.name} (${t.currentAssignee.ssoId})` : 'Unassigned',
      created: format(new Date(t.createdAt), 'dd-MMM-yy'),
      pendingDays: `${t.pendingDays}d ${t.isOverdue ? '⚠️' : ''}`,
    }));

    autoTable(doc, {
      startY: (doc as any).lastAutoTable.finalY + 15,
      columns: tableColumns,
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 40, right: 40 },
      didDrawPage: (dataObj) => {
        // Footer page numbering
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Page ${dataObj.pageNumber} of ${doc.getNumberOfPages()} — PragatiDesk Official State IT Dossier`,
          40,
          580
        );
      },
    });

    doc.save(`PragatiDesk_Official_Report_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`);
  };

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const p = payload[0];
      return (
        <div className="bg-slate-900 text-white p-2.5 rounded-xl shadow-xl border border-slate-800 text-xs space-y-1">
          <div className="font-bold">{p.name}</div>
          <div className="flex items-center gap-2 text-slate-300">
            <span>Count:</span>
            <span className="font-mono font-bold text-brand-300">{p.value}</span>
            {p.payload?.percentage !== undefined && (
              <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-400">
                {p.payload.percentage}%
              </span>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header with Export Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-inner">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              Reports & Advanced Analytics Dashboard
              <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full border border-indigo-200">
                Official DoIT&C Intelligence
              </span>
            </h1>
            <p className="text-xs text-slate-500">
              Interactive visual charts, multi-criteria filtering (Date Range, Project, Status, Assignee, Pending Days), and Excel/PDF export
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-xl transition-all shadow-xs"
            title="Download formatted Excel spreadsheet (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            Export Excel
          </button>

          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-300 rounded-xl transition-all shadow-xs"
            title="Download official PDF report dossier"
          >
            <FileText className="w-4 h-4 text-rose-600" />
            Export PDF Dossier
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MULTI-CRITERIA FILTER BAR */}
      {/* ========================================================================= */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Multi-Criteria Filters</span>
          </div>

          {/* Quick Date Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] text-slate-400 font-semibold mr-1">Date Range:</span>
            {[
              { id: 'all', label: 'All Time' },
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
              { id: 'thisMonth', label: 'This Month' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => applyDatePreset(p.id)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                  datePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filters Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">From Date</label>
            <input
              type="date"
              value={filters.startDate || ''}
              onChange={(e) => {
                setDatePreset('custom');
                setFilters({ ...filters, startDate: e.target.value });
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">To Date</label>
            <input
              type="date"
              value={filters.endDate || ''}
              onChange={(e) => {
                setDatePreset('custom');
                setFilters({ ...filters, endDate: e.target.value });
              }}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Project Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Target Project</label>
            <select
              value={filters.projectId || ''}
              onChange={(e) => setFilters({ ...filters, projectId: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
            >
              <option value="">All Projects</option>
              {projectsList.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.projectCode}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Task Status Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Task Status</label>
            <select
              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Active / Resolving (All Pending)</option>
              <option value="OPEN">To-Do / Open Intake</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="TRANSFERRED">Transferred Handover</option>
              <option value="REVERTED">Reverted Back</option>
              <option value="DISPOSED">Disposed (Resolved)</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>

          {/* User / Assignee Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">User / Assignee</label>
            <select
              value={filters.assigneeId || ''}
              onChange={(e) => setFilters({ ...filters, assigneeId: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium"
            >
              <option value="">All Assignees</option>
              <option value="UNASSIGNED">Unassigned (Open Queue)</option>
              {assigneesList.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.ssoId})
                </option>
              ))}
            </select>
          </div>

          {/* Pending Days / Aging Selector */}
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-600" />
              Pending Days
            </label>
            <select
              value={filters.pendingDaysBucket || ''}
              onChange={(e) => setFilters({ ...filters, pendingDaysBucket: e.target.value })}
              className="w-full text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white font-medium text-amber-900"
            >
              <option value="">All Aging Buckets</option>
              <option value="0-3 Days">0 - 3 Days (Normal SLA)</option>
              <option value="4-7 Days">4 - 7 Days (Moderate)</option>
              <option value="8-15 Days">8 - 15 Days (Delayed)</option>
              <option value="16-30 Days">16 - 30 Days (Critical)</option>
              <option value="30+ Days">30+ Days (Severe Delay)</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter Line: Category, Priority, Search, Reset */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="">All Categories</option>
              <option value="TECHNICAL_ISSUE">⚙️ Technical Issue</option>
              <option value="OFFICIAL_LETTER">✉️ Office Letters</option>
            </select>

            <select
              value={filters.priority || ''}
              onChange={(e) => setFilters({ ...filters, priority: e.target.value })}
              className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl font-medium"
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical Priority</option>
              <option value="HIGH">High Priority</option>
              <option value="MEDIUM">Medium Priority</option>
              <option value="LOW">Low Priority</option>
            </select>

            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search subject, RajKaj #, SSO..."
                value={filters.search || ''}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white"
              />
            </div>
          </div>

          <button
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 font-bold px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset All Filters
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KPI METRIC SUMMARY CARDS */}
      {/* ========================================================================= */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="p-4 bg-white rounded-3xl border border-slate-200 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Tasks</div>
            <div className="text-2xl font-black text-slate-900">{data.summary.totalTasks}</div>
            <div className="text-[10px] text-slate-400">All matching criteria</div>
          </div>

          <div className="p-4 bg-blue-50/60 rounded-3xl border border-blue-200/80 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Active Pending</div>
            <div className="text-2xl font-black text-blue-950">{data.summary.activeTasks}</div>
            <div className="text-[10px] text-blue-600">Open & In-Progress</div>
          </div>

          <div className="p-4 bg-emerald-50/60 rounded-3xl border border-emerald-200/80 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Disposed</div>
            <div className="text-2xl font-black text-emerald-950">{data.summary.disposedTasks}</div>
            <div className="text-[10px] text-emerald-600">Successfully resolved</div>
          </div>

          <div className="p-4 bg-rose-50/60 rounded-3xl border border-rose-200/80 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-rose-600" />
              Critical (&gt;7d)
            </div>
            <div className="text-2xl font-black text-rose-950">{data.summary.criticalAgingTasks}</div>
            <div className="text-[10px] text-rose-600">SLA overdue tasks</div>
          </div>

          <div className="p-4 bg-amber-50/60 rounded-3xl border border-amber-200/80 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Avg Turnaround</div>
            <div className="text-2xl font-black text-amber-950">{data.summary.avgResolutionDays} <span className="text-xs font-semibold text-amber-700">Days</span></div>
            <div className="text-[10px] text-amber-600">Disposal turnaround</div>
          </div>

          <div className="p-4 bg-indigo-50/60 rounded-3xl border border-indigo-200/80 shadow-xs space-y-1">
            <div className="text-[11px] font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
              SLA Compliance
            </div>
            <div className="text-2xl font-black text-indigo-950">{data.summary.slaComplianceRate}%</div>
            <div className="text-[10px] text-indigo-600">Resolved ≤ 7 Days</div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* INTERACTIVE VISUAL CHARTS SECTION */}
      {/* ========================================================================= */}
      {data && (
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between flex-wrap gap-3 border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Interactive Visual Analytics & Pie Charts
              </h2>
              <p className="text-xs text-slate-500">
                Hover over chart slices to inspect exact counts, percentages, and workload allocations
              </p>
            </div>

            {/* Chart Sub-Tab Switcher */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
              {[
                { id: 'status', label: 'Status Breakdown' },
                { id: 'priority', label: 'Priority Distribution' },
                { id: 'category', label: 'Category / Dak' },
                { id: 'aging', label: 'Pending Days Aging' },
                { id: 'workload', label: 'Staff Workload' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveChartTab(tab.id as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    activeChartTab === tab.id
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="min-h-[320px] flex items-center justify-center">
            {isLoading ? (
              <div className="text-xs text-slate-400">Loading analytics visualizer...</div>
            ) : (
              <div className="w-full">
                {/* 1. Status Pie Chart */}
                {activeChartTab === 'status' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.statusPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={105}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {data.charts.statusPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Status Share Breakdown
                      </div>
                      {data.charts.statusPie.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">{item.value} Tasks</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Priority Pie Chart */}
                {activeChartTab === 'priority' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.priorityPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {data.charts.priorityPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Priority Level Breakdown
                      </div>
                      {data.charts.priorityPie.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-slate-800">{item.name} Priority</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">{item.value} Tasks</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Category / Dak Pie Chart */}
                {activeChartTab === 'category' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.categoryPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={100}
                            paddingAngle={3}
                            dataKey="value"
                          >
                            {data.charts.categoryPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Departmental Dak Categories
                      </div>
                      {data.charts.categoryPie.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-slate-800 truncate">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="font-mono font-bold text-slate-900">{item.value}</span>
                            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Pending Days Aging Pie & Bar */}
                {activeChartTab === 'aging' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 items-center gap-6">
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data.charts.pendingDaysPie}
                            cx="50%"
                            cy="50%"
                            innerRadius={55}
                            outerRadius={100}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {data.charts.pendingDaysPie.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip content={<CustomTooltip />} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="space-y-2.5">
                      <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-amber-600" />
                        Pending Days Aging Distribution
                      </div>
                      {data.charts.pendingDaysPie.map((item) => (
                        <div
                          key={item.name}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="font-bold text-slate-800">{item.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-900">{item.value} Items</span>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Staff Workload Bar Chart */}
                {activeChartTab === 'workload' && (
                  <div className="space-y-4">
                    <div className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Staff Member Workload (Active vs Disposed Tasks)
                    </div>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.charts.assigneeWorkload} margin={{ top: 10, right: 20, left: 0, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-15} textAnchor="end" />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
                          <Bar dataKey="active" name="Active Tasks" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                          <Bar dataKey="disposed" name="Disposed Tasks" fill="#10b981" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED DATA TABLE */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-sm font-black text-slate-900">
              Detailed Task Records ({sortedTasks.length})
            </h3>
            <p className="text-xs text-slate-500">
              Complete task-by-task registry matching your active filter criteria
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="text-xs px-2.5 py-1 bg-slate-50 border rounded-lg font-medium"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider">
                <th
                  onClick={() => {
                    setSortField('taskNumber');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Task #
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
                <th className="py-3 px-4">Dak / RajKaj #</th>
                <th className="py-3 px-4">Subject / Title</th>
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assignee</th>
                <th
                  onClick={() => {
                    setSortField('pendingDays');
                    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                  }}
                  className="py-3 px-4 cursor-pointer hover:text-slate-900"
                >
                  <div className="flex items-center gap-1">
                    Pending Days
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-xs text-slate-400">
                    No task records found matching your multi-criteria filters.
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onSelectTask && onSelectTask(t.id)}
                    className="hover:bg-indigo-50/40 cursor-pointer transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-700 whitespace-nowrap">
                      {t.taskNumber}
                    </td>

                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                      {t.rajKajNumber ? (
                        <span className="bg-amber-50 text-amber-800 px-1.5 py-0.5 rounded border border-amber-200">
                          {t.rajKajNumber}
                        </span>
                      ) : t.referenceNumber ? (
                        t.referenceNumber
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate" title={t.subject}>
                      {t.subject}
                    </td>

                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">
                      <span className="font-semibold text-slate-800">
                        {t.project?.projectCode || 'PROJECT'}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <CategoryBadge category={t.category} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <PriorityBadge priority={t.priority} />
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <StatusBadge status={t.status} />
                    </td>

                    <td className="py-3 px-4 text-slate-700 whitespace-nowrap">
                      {t.currentAssignee ? (
                        <div>
                          <div className="font-bold text-slate-900">{t.currentAssignee.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {t.currentAssignee.ssoId}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span
                        className={`font-mono font-bold px-2 py-0.5 rounded-lg text-xs ${
                          t.isOverdue
                            ? 'bg-rose-100 text-rose-800 border border-rose-300'
                            : t.pendingDays >= 4
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}
                      >
                        {t.pendingDays} Days
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-500">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedTasks.length)} of {sortedTasks.length} entries
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border hover:bg-slate-50 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
