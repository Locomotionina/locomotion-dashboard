"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export interface StaffCapacitySummary {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  position: string;
  department: string;
  avatarUrl: string | null;
  bio: string | null;
  activeTaskCount: number;
  todoCount: number;
  inProgressCount: number;
  archivedCount: number;
  capacityScore: number; // percentage (activeTasks / 5) * 100
  capacityStatus: "OVERLOADED" | "OPTIMAL" | "AVAILABLE";
  statusLabel: string;
  statusBadgeVariant: "destructive" | "default" | "success" | "warning";
  tasks: {
    id: string;
    title: string;
    status: string;
    priority: string;
    dueDate: Date | null;
    estimatedHours: number | null;
    project: {
      id: string;
      name: string;
      clientName: string;
      code: string;
    } | null;
  }[];
}

export interface PendingProfileRequestItem {
  id: string;
  userId: string;
  requestedName: string;
  requestedUsername: string;
  requestedAvatarUrl: string | null;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    department: string;
    position: string;
  };
}

export interface PendingPasswordRequestItem {
  id: string;
  userId: string;
  createdAt: Date;
  user: {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    department: string;
    position: string;
  };
}

export async function getManagementOverviewData() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return {
      authorized: false,
      error: "Access Denied: The Management Dashboard is restricted to users with the Management role.",
    };
  }

  // Parallel query execution with Promise.all for maximum speed and instant responsiveness
  const [
    staffMembers,
    activeProjectsCount,
    pendingUsers,
    pendingProfileRequests,
    pendingPasswordRequests,
  ] = await Promise.all([
    // 1. Fetch all team members (excluding current logged-in Project Manager) and their tasks
    prisma.user.findMany({
      where: {
        isApproved: true,
        id: { not: currentUser.id },
      },
      include: {
        tasks: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                clientName: true,
                code: true,
              },
            },
          },
          orderBy: [{ priority: "desc" }, { dueDate: "asc" }],
        },
      },
      orderBy: { name: "asc" },
    }),

    // 2. Active projects count
    prisma.project.count({
      where: { status: { in: ["ACTIVE", "PITCH", "IN_REVIEW"] } },
    }),

    // 3. Pending user registrations requiring approval
    prisma.user.findMany({
      where: { isApproved: false },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        department: true,
        position: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    }),

    // 4. Pending profile update requests
    prisma.profileUpdateRequest.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 5. Pending password reset requests
    prisma.passwordResetRequest.findMany({
      where: { status: "PENDING" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            avatarUrl: true,
            department: true,
            position: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const capacitySummaries: StaffCapacitySummary[] = staffMembers.map((staff) => {
    const activeTasks = staff.tasks.filter((t) => t.status !== "Done");
    const archivedTasks = staff.tasks.filter((t) => t.status === "Done");
    const todoTasks = activeTasks.filter((t) => t.status === "To Do");
    const inProgressTasks = activeTasks.filter((t) => t.status === "On Progress");

    const activeCount = activeTasks.length;
    // Standard baseline capacity threshold is 5 active concurrent client tasks
    const capacityScore = Math.min(Math.round((activeCount / 5) * 100), 150);

    let capacityStatus: "OVERLOADED" | "OPTIMAL" | "AVAILABLE" = "OPTIMAL";
    let statusLabel = "Optimal / In Flow";
    let statusBadgeVariant: "destructive" | "default" | "success" | "warning" = "default";

    if (activeCount >= 5) {
      capacityStatus = "OVERLOADED";
      statusLabel = "Overloaded";
      statusBadgeVariant = "destructive";
    } else if (activeCount <= 1) {
      capacityStatus = "AVAILABLE";
      statusLabel = "Available / Idle";
      statusBadgeVariant = "success";
    }

    return {
      id: staff.id,
      name: staff.name,
      username: staff.username,
      email: staff.email,
      role: staff.role,
      position: staff.position,
      department: staff.department,
      avatarUrl: staff.avatarUrl,
      bio: staff.bio,
      activeTaskCount: activeCount,
      todoCount: todoTasks.length,
      inProgressCount: inProgressTasks.length,
      archivedCount: archivedTasks.length,
      capacityScore,
      capacityStatus,
      statusLabel,
      statusBadgeVariant,
      tasks: activeTasks.map((t) => ({
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate,
        estimatedHours: t.estimatedHours,
        project: t.project,
      })),
    };
  });

  // Calculate high-level stats
  const totalStaff = capacitySummaries.length;
  const overloadedCount = capacitySummaries.filter(
    (s) => s.capacityStatus === "OVERLOADED"
  ).length;
  const availableCount = capacitySummaries.filter(
    (s) => s.capacityStatus === "AVAILABLE"
  ).length;
  const optimalCount = capacitySummaries.filter(
    (s) => s.capacityStatus === "OPTIMAL"
  ).length;

  const totalActiveTasks = capacitySummaries.reduce(
    (acc, s) => acc + s.activeTaskCount,
    0
  );
  const avgTasksPerStaff = totalStaff > 0 ? (totalActiveTasks / totalStaff).toFixed(1) : "0";

  return {
    authorized: true,
    staffSummaries: capacitySummaries,
    pendingUsers,
    pendingProfileRequests,
    pendingPasswordRequests,
    metrics: {
      totalStaff,
      overloadedCount,
      availableCount,
      optimalCount,
      totalActiveTasks,
      avgTasksPerStaff,
      activeProjectsCount,
    },
  };
}

// -------------------------------------------------------------
// MONTHLY REPORT & CSV EXPORT FUNCTIONALITY
// -------------------------------------------------------------

export interface StaffPerformanceReportItem {
  staffId: string;
  staffName: string;
  username: string;
  department: string;
  position: string;
  avatarUrl: string | null;
  totalTasks: number;
  completedTasks: number;
  inReviewTasks: number;
  inRevisionTasks: number;
  onProgressTasks: number;
  todoTasks: number;
  totalSeconds: number;
  totalTimeHms: string;
  totalHoursDecimal: number;
  initialSeconds: number;
  initialTimeHms: string;
  revisionSeconds: number;
  revisionTimeHms: string;
  totalRevisionRounds: number;
  avgSecondsPerTask: number;
  avgTimeHms: string;
  avgHoursDecimal: number;
  totalEstimatedHours: number;
  completionRate: number;
}

export interface DetailedTaskReportItem {
  taskId: string;
  title: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  assigneeName: string;
  assigneeUsername: string;
  assigneeDepartment: string;
  assigneePosition: string;
  createdByName: string;
  priority: string;
  status: string;
  currentPhase: string;
  createdAt: string;
  dueDate: string;
  completedAt: string;
  estimatedHours: number;
  initialTimeHms: string;
  initialSeconds: number;
  revisionRoundsCount: number;
  revisionTimeHms: string;
  revisionSeconds: number;
  totalTimeHms: string;
  totalSeconds: number;
  totalHoursDecimal: number;
  timeVarianceHours: number;
  latestFeedback: string;
  description: string;
}

export interface ReportPreviewResult {
  authorized: boolean;
  error?: string;
  availablePeriods: { value: string; label: string }[];
  staffSummary: StaffPerformanceReportItem[];
  tasksList: DetailedTaskReportItem[];
  totals: {
    totalTasks: number;
    completedTasks: number;
    totalSeconds: number;
    totalTimeHms: string;
    totalHoursDecimal: number;
    totalStaffCount: number;
  };
}

function formatDurationHms(totalSec: number): string {
  if (totalSec <= 0 || isNaN(totalSec)) return "00:00:00";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '""';
  if (val instanceof Date) {
    return `"${val.toISOString().replace("T", " ").slice(0, 19)}"`;
  }
  const str = String(val);
  return `"${str.replace(/"/g, '""')}"`;
}

function computeLiveTaskTime(task: any) {
  const now = Date.now();
  let initSec = task.initialSeconds || 0;
  if (task.timerActive && task.currentPhase === "INITIAL" && task.timerStartedAt) {
    initSec += Math.max(0, Math.floor((now - new Date(task.timerStartedAt).getTime()) / 1000));
  }

  let revSec = 0;
  const revisions = task.revisions || [];
  for (const r of revisions) {
    let rTime = r.seconds || 0;
    if (r.timerActive && r.timerStartedAt) {
      rTime += Math.max(0, Math.floor((now - new Date(r.timerStartedAt).getTime()) / 1000));
    }
    revSec += rTime;
  }

  const totalSec = initSec + revSec;
  return {
    initialSeconds: initSec,
    revisionSeconds: revSec,
    totalSeconds: totalSec,
    revisionRounds: revisions.length,
    latestFeedback: revisions.length > 0 ? revisions[revisions.length - 1].feedback : "-",
  };
}

const MONTH_MAP: { [key: string]: string } = {
  "01": "Januari",
  "02": "Februari",
  "03": "Maret",
  "04": "April",
  "05": "Mei",
  "06": "Juni",
  "07": "Juli",
  "08": "Agustus",
  "09": "September",
  "10": "Oktober",
  "11": "November",
  "12": "Desember",
};

export async function getManagementReportPreviewAction(options?: {
  period?: string;
  department?: string;
}): Promise<ReportPreviewResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return {
      authorized: false,
      error: "Akses Ditolak: Hanya manajemen yang dapat melihat laporan dan rekap kinerja staff.",
      availablePeriods: [],
      staffSummary: [],
      tasksList: [],
      totals: {
        totalTasks: 0,
        completedTasks: 0,
        totalSeconds: 0,
        totalTimeHms: "00:00:00",
        totalHoursDecimal: 0,
        totalStaffCount: 0,
      },
    };
  }

  const period = options?.period || "ALL";
  const department = options?.department || "ALL";

  // Discover available periods from all tasks
  const allTaskDates = await prisma.task.findMany({
    select: { createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  const periodSet = new Set<string>();
  const currentPeriodKey = new Date().toISOString().slice(0, 7);
  periodSet.add(currentPeriodKey);

  for (const t of allTaskDates) {
    if (t.createdAt) {
      periodSet.add(t.createdAt.toISOString().slice(0, 7));
    }
  }

  const availablePeriods: { value: string; label: string }[] = [
    { value: "ALL", label: "Semua Waktu (All Time)" },
  ];

  const sortedPeriodKeys = Array.from(periodSet).sort().reverse();
  for (const pKey of sortedPeriodKeys) {
    const [y, m] = pKey.split("-");
    const mName = MONTH_MAP[m] || m;
    const isCurrent = pKey === currentPeriodKey;
    availablePeriods.push({
      value: pKey,
      label: `${mName} ${y}${isCurrent ? " (Bulan Ini)" : ""}`,
    });
  }

  // Build filter for tasks
  const taskWhere: any = {};
  if (period !== "ALL") {
    const [yearStr, monthStr] = period.split("-");
    const y = parseInt(yearStr, 10);
    const m = parseInt(monthStr, 10) - 1;
    const startOfMonth = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    taskWhere.OR = [
      { createdAt: { gte: startOfMonth, lte: endOfMonth } },
      { completedAt: { gte: startOfMonth, lte: endOfMonth } },
    ];
  }

  if (department !== "ALL") {
    taskWhere.user = { department };
  }

  // Fetch all staff users
  const staffMembers = await prisma.user.findMany({
    where: {
      role: "STAFF",
      ...(department !== "ALL" ? { department } : {}),
    },
    orderBy: { name: "asc" },
  });

  // Fetch all filtered tasks
  const tasks = await prisma.task.findMany({
    where: taskWhere,
    include: {
      user: true,
      createdBy: true,
      project: true,
      revisions: {
        orderBy: { round: "asc" },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  // Compute detailed task items
  const tasksList: DetailedTaskReportItem[] = tasks.map((t) => {
    const time = computeLiveTaskTime(t);
    const actualHours = time.totalSeconds / 3600;
    const est = t.estimatedHours || 0;
    const variance = Number((est - actualHours).toFixed(2));

    const createdStr = t.createdAt
      ? new Date(t.createdAt).toISOString().replace("T", " ").slice(0, 16)
      : "-";
    const dueStr = t.dueDate
      ? new Date(t.dueDate).toISOString().slice(0, 10)
      : "-";
    const compStr = t.completedAt
      ? new Date(t.completedAt).toISOString().replace("T", " ").slice(0, 16)
      : "-";

    const phaseStr =
      t.currentPhase === "REVISION"
        ? `Revisi Ke-${t.currentRevisionRound || 1}`
        : "Draft Awal";

    return {
      taskId: t.id,
      title: t.title,
      projectCode: t.project?.code || "INDEPENDENT",
      projectName: t.project?.name || "Internal / Direct",
      clientName: t.project?.clientName || "Locomotion Internal",
      assigneeName: t.user?.name || "Unassigned",
      assigneeUsername: t.user?.username || "-",
      assigneeDepartment: t.user?.department || "-",
      assigneePosition: t.user?.position || "-",
      createdByName: t.createdBy?.name || "Self-assigned",
      priority: t.priority,
      status: t.status,
      currentPhase: phaseStr,
      createdAt: createdStr,
      dueDate: dueStr,
      completedAt: compStr,
      estimatedHours: est,
      initialTimeHms: formatDurationHms(time.initialSeconds),
      initialSeconds: time.initialSeconds,
      revisionRoundsCount: time.revisionRounds,
      revisionTimeHms: formatDurationHms(time.revisionSeconds),
      revisionSeconds: time.revisionSeconds,
      totalTimeHms: formatDurationHms(time.totalSeconds),
      totalSeconds: time.totalSeconds,
      totalHoursDecimal: Number(actualHours.toFixed(2)),
      timeVarianceHours: variance,
      latestFeedback: time.latestFeedback,
      description: t.description || "-",
    };
  });

  // Compute per-staff summary
  const staffSummary: StaffPerformanceReportItem[] = staffMembers.map((staff) => {
    const staffTasks = tasks.filter((t) => t.userId === staff.id);
    const totalTasks = staffTasks.length;
    const completedTasks = staffTasks.filter((t) => t.status === "Done").length;
    const inReviewTasks = staffTasks.filter((t) => t.status === "In Review").length;
    const inRevisionTasks = staffTasks.filter((t) => t.status === "Revision").length;
    const onProgressTasks = staffTasks.filter((t) => t.status === "On Progress").length;
    const todoTasks = staffTasks.filter((t) => t.status === "To Do").length;

    let totalSec = 0;
    let initSec = 0;
    let revSec = 0;
    let revRounds = 0;
    let totalEst = 0;

    for (const t of staffTasks) {
      const time = computeLiveTaskTime(t);
      totalSec += time.totalSeconds;
      initSec += time.initialSeconds;
      revSec += time.revisionSeconds;
      revRounds += time.revisionRounds;
      totalEst += t.estimatedHours || 0;
    }

    const avgSec = totalTasks > 0 ? Math.round(totalSec / totalTasks) : 0;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      staffId: staff.id,
      staffName: staff.name,
      username: staff.username,
      department: staff.department,
      position: staff.position,
      avatarUrl: staff.avatarUrl,
      totalTasks,
      completedTasks,
      inReviewTasks,
      inRevisionTasks,
      onProgressTasks,
      todoTasks,
      totalSeconds: totalSec,
      totalTimeHms: formatDurationHms(totalSec),
      totalHoursDecimal: Number((totalSec / 3600).toFixed(2)),
      initialSeconds: initSec,
      initialTimeHms: formatDurationHms(initSec),
      revisionSeconds: revSec,
      revisionTimeHms: formatDurationHms(revSec),
      totalRevisionRounds: revRounds,
      avgSecondsPerTask: avgSec,
      avgTimeHms: formatDurationHms(avgSec),
      avgHoursDecimal: Number((avgSec / 3600).toFixed(2)),
      totalEstimatedHours: Number(totalEst.toFixed(1)),
      completionRate,
    };
  });

  const totalTasksCount = tasksList.length;
  const completedTasksCount = tasksList.filter((t) => t.status === "Done").length;
  const totalAgencySeconds = staffSummary.reduce((acc, s) => acc + s.totalSeconds, 0);

  return {
    authorized: true,
    availablePeriods,
    staffSummary,
    tasksList,
    totals: {
      totalTasks: totalTasksCount,
      completedTasks: completedTasksCount,
      totalSeconds: totalAgencySeconds,
      totalTimeHms: formatDurationHms(totalAgencySeconds),
      totalHoursDecimal: Number((totalAgencySeconds / 3600).toFixed(2)),
      totalStaffCount: staffSummary.length,
    },
  };
}

export async function exportManagementCsvAction(options: {
  type: "COMPLETE" | "SUMMARY" | "DETAILED";
  period?: string;
  department?: string;
}): Promise<{
  success: boolean;
  csvContent?: string;
  filename?: string;
  error?: string;
}> {
  const preview = await getManagementReportPreviewAction({
    period: options.period,
    department: options.department,
  });

  if (!preview.authorized) {
    return { success: false, error: preview.error || "Akses tidak diizinkan." };
  }

  const periodLabel =
    preview.availablePeriods.find((p) => p.value === (options.period || "ALL"))?.label ||
    "Semua Periode";
  const periodSlug = (options.period || "ALL").replace(/[^a-zA-Z0-9_-]/g, "_");
  const dateStamp = new Date().toISOString().slice(0, 10);

  let csvRows: string[] = [];

  // Summary headers & rows
  const summaryHeaders = [
    "Nama Staff",
    "Username",
    "Departemen",
    "Jabatan",
    "Total Task Diberikan",
    "Task Selesai (Done)",
    "Menunggu Review",
    "Dalam Revisi",
    "Sedang Dikerjakan",
    "Belum Dimulai (To Do)",
    "Total Waktu Kerja (HH:MM:SS)",
    "Total Jam Kerja (Desimal)",
    "Total Waktu Draft Awal (HH:MM:SS)",
    "Total Waktu Revisi (HH:MM:SS)",
    "Total Putaran Revisi",
    "Rata-rata Waktu / Task (HH:MM:SS)",
    "Rata-rata Jam / Task (Desimal)",
    "Total Estimasi (Jam)",
    "Tingkat Penyelesaian (%)",
  ];

  const summaryDataRows = preview.staffSummary.map((s) => [
    escapeCsvField(s.staffName),
    escapeCsvField(s.username),
    escapeCsvField(s.department),
    escapeCsvField(s.position),
    s.totalTasks,
    s.completedTasks,
    s.inReviewTasks,
    s.inRevisionTasks,
    s.onProgressTasks,
    s.todoTasks,
    escapeCsvField(s.totalTimeHms),
    s.totalHoursDecimal,
    escapeCsvField(s.initialTimeHms),
    escapeCsvField(s.revisionTimeHms),
    s.totalRevisionRounds,
    escapeCsvField(s.avgTimeHms),
    s.avgHoursDecimal,
    s.totalEstimatedHours,
    `${s.completionRate}%`,
  ].join(","));

  // Detailed tasks headers & rows
  const detailedHeaders = [
    "ID Task",
    "Judul Task",
    "Kode Project",
    "Nama Project",
    "Klien",
    "Staff Pelaksana",
    "Username Staff",
    "Departemen",
    "Jabatan",
    "Diberikan Oleh",
    "Prioritas",
    "Status",
    "Fase Saat Ini",
    "Tanggal Dibuat",
    "Batas Waktu (Due Date)",
    "Tanggal Selesai",
    "Estimasi (Jam)",
    "Durasi Draft Awal (HH:MM:SS)",
    "Durasi Draft Awal (Detik)",
    "Jumlah Putaran Revisi",
    "Durasi Revisi (HH:MM:SS)",
    "Durasi Revisi (Detik)",
    "Total Durasi Pengerjaan (HH:MM:SS)",
    "Total Jam Pengerjaan (Desimal)",
    "Variansi vs Estimasi (Jam)",
    "Catatan Revisi Terakhir",
    "Deskripsi Task",
  ];

  const detailedDataRows = preview.tasksList.map((t) => [
    escapeCsvField(t.taskId),
    escapeCsvField(t.title),
    escapeCsvField(t.projectCode),
    escapeCsvField(t.projectName),
    escapeCsvField(t.clientName),
    escapeCsvField(t.assigneeName),
    escapeCsvField(t.assigneeUsername),
    escapeCsvField(t.assigneeDepartment),
    escapeCsvField(t.assigneePosition),
    escapeCsvField(t.createdByName),
    escapeCsvField(t.priority),
    escapeCsvField(t.status),
    escapeCsvField(t.currentPhase),
    escapeCsvField(t.createdAt),
    escapeCsvField(t.dueDate),
    escapeCsvField(t.completedAt),
    t.estimatedHours,
    escapeCsvField(t.initialTimeHms),
    t.initialSeconds,
    t.revisionRoundsCount,
    escapeCsvField(t.revisionTimeHms),
    t.revisionSeconds,
    escapeCsvField(t.totalTimeHms),
    t.totalHoursDecimal,
    t.timeVarianceHours,
    escapeCsvField(t.latestFeedback),
    escapeCsvField(t.description),
  ].join(","));

  let filename = "";

  if (options.type === "SUMMARY") {
    filename = `Locomotion_Staff_Performance_Summary_${periodSlug}_${dateStamp}.csv`;
    csvRows.push(summaryHeaders.map(escapeCsvField).join(","));
    csvRows.push(...summaryDataRows);
  } else if (options.type === "DETAILED") {
    filename = `Locomotion_Task_Telemetry_Detail_${periodSlug}_${dateStamp}.csv`;
    csvRows.push(detailedHeaders.map(escapeCsvField).join(","));
    csvRows.push(...detailedDataRows);
  } else {
    // COMPLETE (All-in-one monthly executive report)
    filename = `Locomotion_Monthly_Audit_Executive_${periodSlug}_${dateStamp}.csv`;
    csvRows.push(escapeCsvField("LOCOMOTION AGENCY - LAPORAN KINERJA STAFF & AUDIT TASK BULANAN"));
    csvRows.push([escapeCsvField("Periode Laporan:"), escapeCsvField(periodLabel)].join(","));
    csvRows.push([escapeCsvField("Tanggal Unduh:"), escapeCsvField(dateStamp)].join(","));
    csvRows.push([escapeCsvField("Total Staff:"), preview.totals.totalStaffCount].join(","));
    csvRows.push([escapeCsvField("Total Task:"), preview.totals.totalTasks].join(","));
    csvRows.push([escapeCsvField("Task Selesai:"), preview.totals.completedTasks].join(","));
    csvRows.push([escapeCsvField("Total Jam Kerja:"), preview.totals.totalHoursDecimal + " jam (" + preview.totals.totalTimeHms + ")"].join(","));
    csvRows.push(""); // empty row
    csvRows.push(escapeCsvField("=== BAGIAN 1: RINGKASAN KINERJA PER STAFF (STAFF PERFORMANCE SUMMARY) ==="));
    csvRows.push(summaryHeaders.map(escapeCsvField).join(","));
    csvRows.push(...summaryDataRows);
    csvRows.push(""); // empty row
    csvRows.push(""); // empty row
    csvRows.push(escapeCsvField("=== BAGIAN 2: RINCIAN SEMUA TASK & TELEMETRI WAKTU (DETAILED TASK & TIME LOGS) ==="));
    csvRows.push(detailedHeaders.map(escapeCsvField).join(","));
    csvRows.push(...detailedDataRows);
  }

  // Prepend UTF-8 BOM so Excel opens accents and symbols seamlessly
  const finalCsv = "\uFEFF" + csvRows.join("\r\n");

  return {
    success: true,
    csvContent: finalCsv,
    filename,
  };
}

export interface SingleStaffReportData {
  staff: {
    id: string;
    name: string;
    username: string;
    position: string;
    department: string;
    avatarUrl: string | null;
    bio: string | null;
    totalTasks: number;
    activeCount: number;
    todoCount: number;
    inProgressCount: number;
    inReviewCount: number;
    revisionCount: number;
    completedCount: number;
    overdueCount: number;
    urgentCount: number;
    clientCount: number;
    clientNames: string[];
    totalEffectiveSeconds: number;
    totalEffectiveHms: string;
    totalEffectiveHoursDecimal: string;
    avgHoursPerTask: string;
    capacityStatus: "OVERLOADED" | "OPTIMAL" | "AVAILABLE";
  };
  narrativeSummary: string;
  csvContent: string;
  filename: string;
}

export async function exportSingleStaffReportAction(
  staffId: string
): Promise<{ success: boolean; data?: SingleStaffReportData; error?: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };

  if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN" && currentUser.id !== staffId) {
    return { success: false, error: "Access denied: Anda tidak memiliki izin mengunduh laporan ini." };
  }

  const staff = await prisma.user.findUnique({
    where: { id: staffId },
    include: {
      tasks: {
        include: {
          project: true,
          revisions: { orderBy: { round: "asc" } },
          createdBy: { select: { id: true, name: true, position: true } },
        },
        orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
      },
    },
  });

  if (!staff) {
    return { success: false, error: "Data staf tidak ditemukan." };
  }

  const now = Date.now();
  const allTasks = staff.tasks;
  const activeTasks = allTasks.filter((t: any) => t.status !== "Done");
  const completedTasks = allTasks.filter((t: any) => t.status === "Done");
  const todoTasks = activeTasks.filter((t: any) => t.status === "To Do");
  const inProgressTasks = activeTasks.filter((t: any) => t.status === "On Progress");
  const inReviewTasks = activeTasks.filter((t: any) => t.status === "In Review");
  const revisionTasks = activeTasks.filter((t: any) => t.status === "Revision");
  const overdueTasks = activeTasks.filter((t: any) => t.dueDate && new Date(t.dueDate).getTime() < now);
  const urgentTasks = activeTasks.filter((t: any) => t.priority === "URGENT" || t.priority === "HIGH");

  // Klien unik yang ditangani staf sebagai PIC
  const clientNamesSet = new Set<string>();
  allTasks.forEach((t: any) => {
    if (t.project?.clientName) {
      clientNamesSet.add(t.project.clientName.trim());
    }
  });
  const clientNames = Array.from(clientNamesSet);
  const clientCount = clientNames.length;

  // Hitung akumulasi live time pengerjaan
  let totalEffectiveSeconds = 0;
  const detailedTaskRows: any[] = [];

  allTasks.forEach((t: any, index: number) => {
    const timeData = computeLiveTaskTime(t);
    totalEffectiveSeconds += timeData.totalSeconds;
    const isOverdue = t.status !== "Done" && t.dueDate && new Date(t.dueDate).getTime() < now;
    const latestFeedback =
      t.revisions && t.revisions.length > 0 ? t.revisions[t.revisions.length - 1].feedback : "-";

    detailedTaskRows.push({
      no: index + 1,
      title: t.title,
      clientName: t.project?.clientName || "Operasional Internal",
      projectCode: t.project?.code || "-",
      projectName: t.project?.name || "-",
      status: t.status,
      priority: t.priority,
      phase: t.currentPhase === "REVISION" ? `Revisi Ke-${t.currentRevisionRound || 1}` : "Draft Awal",
      dueDate: t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "-",
      deadlineStatus: t.status === "Done" ? "Selesai" : isOverdue ? "Terlambat (Overdue)" : "On Track",
      initialTimeHms: formatDurationHms(timeData.initialSeconds),
      revisionRounds: t.revisions?.length || 0,
      revisionTimeHms: formatDurationHms(timeData.revisionSeconds),
      totalTimeHms: formatDurationHms(timeData.totalSeconds),
      totalHoursDecimal: (timeData.totalSeconds / 3600).toFixed(2),
      estimatedHours: t.estimatedHours || 0,
      delegator: t.createdBy ? `${t.createdBy.name} (${t.createdBy.position})` : "Dibuat Sendiri",
      description: t.description || "-",
      latestFeedback,
    });
  });

  const totalEffectiveHoursDecimal = (totalEffectiveSeconds / 3600).toFixed(2);
  const totalEffectiveHms = formatDurationHms(totalEffectiveSeconds);
  const avgHoursPerTask = allTasks.length > 0 ? (totalEffectiveSeconds / allTasks.length / 3600).toFixed(1) : "0.0";

  let capacityStatus: "OVERLOADED" | "OPTIMAL" | "AVAILABLE" = "OPTIMAL";
  let capacityNarrative = "Kapasitas saat ini dalam alur OPTIMAL (kapasitas sehat & produktif).";
  if (activeTasks.length >= 5) {
    capacityStatus = "OVERLOADED";
    capacityNarrative = "Kapasitas saat ini dalam status OVERLOADED (beban tinggi). Disarankan untuk menyeimbangkan penugasan baru atau mempertimbangkan penyesuaian tenggat waktu.";
  } else if (activeTasks.length <= 1) {
    capacityStatus = "AVAILABLE";
    capacityNarrative = "Kapasitas saat ini dalam status AVAILABLE (Tersedia). Staf sangat siap dan memiliki kelonggaran waktu untuk menerima brief atau proyek klien baru.";
  }

  const todayStr = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const narrativeSummary = `RINGKASAN EKSEKUTIF KINERJA STAF: ${staff.name.toUpperCase()}
Jabatan: ${staff.position} | Divisi: ${staff.department}
Tanggal Laporan: ${todayStr}

1. BEBAN TUGAS & TANGGUNG JAWAB KLIEN (PIC):
Saat ini ${staff.name} memegang tanggung jawab PIC untuk ${clientCount} klien/brand aktif (${clientCount > 0 ? clientNames.join(", ") : "Operasional Internal Agensi"}).
Dari total ${allTasks.length} penugasan yang tercatat dalam sistem:
• Tugas Aktif: ${activeTasks.length} tugas
• Tugas Selesai (Arsip): ${completedTasks.length} tugas

2. STATUS & PROGRESS PENGERJAAN SAAT INI:
• Belum Dikerjakan (Antrean To Do): ${todoTasks.length} tugas ${todoTasks.length > 0 ? `(${todoTasks.map((t: any) => `"${t.title}"`).slice(0, 3).join(", ")}${todoTasks.length > 3 ? "..." : ""})` : ""}
• Sedang Berjalan (On Progress): ${inProgressTasks.length} tugas
• Menunggu Review Pembuat/Klien: ${inReviewTasks.length} tugas
• Dalam Tahap Revisi: ${revisionTasks.length} tugas
• Prioritas Mendesak / Tinggi: ${urgentTasks.length} tugas
${overdueTasks.length > 0 ? `⚠️ PERHATIAN: Terdapat ${overdueTasks.length} tugas aktif yang telah melewati batas tenggat (overdue).` : `✓ Seluruh tenggat waktu tugas berada dalam jadwal aman (on-track).`}

3. TELEMETRI WAKTU KERJA EFEKTIF:
Total akumulasi waktu kerja produktif yang tercatat adalah ${totalEffectiveHms} (${totalEffectiveHoursDecimal} jam kerja efektif). Rata-rata waktu yang dialokasikan per deliverable adalah ${avgHoursPerTask} jam.

4. STATUS KAPASITAS & REKOMENDASI:
${capacityNarrative}`;

  // Susun baris-baris CSV
  const csvRows: string[] = [];
  csvRows.push(escapeCsvField(`LOCOMOTION AGENCY - LAPORAN KINERJA INDIVIDUAL STAF: ${staff.name.toUpperCase()}`));
  csvRows.push([escapeCsvField("Nama Staf:"), escapeCsvField(staff.name)].join(","));
  csvRows.push([escapeCsvField("Jabatan:"), escapeCsvField(staff.position)].join(","));
  csvRows.push([escapeCsvField("Departemen:"), escapeCsvField(staff.department)].join(","));
  csvRows.push([escapeCsvField("Tanggal Ekspor:"), escapeCsvField(todayStr)].join(","));
  csvRows.push("");
  csvRows.push(escapeCsvField("=== RINGKASAN METRIK KINERJA ==="));
  csvRows.push([escapeCsvField("Total Penugasan:"), allTasks.length].join(","));
  csvRows.push([escapeCsvField("Tugas Aktif:"), activeTasks.length].join(","));
  csvRows.push([escapeCsvField("Tugas Selesai:"), completedTasks.length].join(","));
  csvRows.push([escapeCsvField("Antrean Belum Dikerjakan (To Do):"), todoTasks.length].join(","));
  csvRows.push([escapeCsvField("Sedang Berjalan (On Progress):"), inProgressTasks.length].join(","));
  csvRows.push([escapeCsvField("Dalam Review (In Review):"), inReviewTasks.length].join(","));
  csvRows.push([escapeCsvField("Dalam Revisi:"), revisionTasks.length].join(","));
  csvRows.push([escapeCsvField("Jumlah Klien / Brand (PIC):"), clientCount].join(","));
  csvRows.push([escapeCsvField("Daftar Klien / Brand:"), escapeCsvField(clientNames.join("; ") || "-")].join(","));
  csvRows.push([escapeCsvField("Total Waktu Kerja Efektif:"), escapeCsvField(`${totalEffectiveHoursDecimal} jam (${totalEffectiveHms})`)].join(","));
  csvRows.push([escapeCsvField("Status Kapasitas:"), escapeCsvField(capacityStatus)].join(","));
  csvRows.push("");
  csvRows.push(escapeCsvField("=== RINGKASAN NARATIF EKSEKUTIF ==="));
  csvRows.push(escapeCsvField(narrativeSummary));
  csvRows.push("");
  csvRows.push(escapeCsvField("=== RINCIAN TUGAS & TELEMETRI WAKTU ==="));

  const headers = [
    "No",
    "Judul Task",
    "Klien / Brand",
    "Kode Proyek",
    "Nama Proyek",
    "Status",
    "Prioritas",
    "Fase Pengerjaan",
    "Due Date",
    "Status Deadline",
    "Waktu Draft Awal",
    "Jumlah Ronde Revisi",
    "Waktu Ronde Revisi",
    "Total Waktu Efektif",
    "Total Jam (Desimal)",
    "Target Estimasi (Jam)",
    "Pemberi Task / Delegator",
    "Brief & Instruksi Kerja",
    "Catatan Revisi Terakhir",
  ];
  csvRows.push(headers.map(escapeCsvField).join(","));

  detailedTaskRows.forEach((row) => {
    csvRows.push([
      row.no,
      escapeCsvField(row.title),
      escapeCsvField(row.clientName),
      escapeCsvField(row.projectCode),
      escapeCsvField(row.projectName),
      escapeCsvField(row.status),
      escapeCsvField(row.priority),
      escapeCsvField(row.phase),
      escapeCsvField(row.dueDate),
      escapeCsvField(row.deadlineStatus),
      escapeCsvField(row.initialTimeHms),
      row.revisionRounds,
      escapeCsvField(row.revisionTimeHms),
      escapeCsvField(row.totalTimeHms),
      row.totalHoursDecimal,
      row.estimatedHours,
      escapeCsvField(row.delegator),
      escapeCsvField(row.description),
      escapeCsvField(row.latestFeedback),
    ].join(","));
  });

  const finalCsv = "\uFEFF" + csvRows.join("\r\n");
  const filename = `Locomotion_Staff_Report_${staff.name.replace(/[^a-zA-Z0-9]/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;

  return {
    success: true,
    data: {
      staff: {
        id: staff.id,
        name: staff.name,
        username: staff.username,
        position: staff.position,
        department: staff.department,
        avatarUrl: staff.avatarUrl,
        bio: staff.bio,
        totalTasks: allTasks.length,
        activeCount: activeTasks.length,
        todoCount: todoTasks.length,
        inProgressCount: inProgressTasks.length,
        inReviewCount: inReviewTasks.length,
        revisionCount: revisionTasks.length,
        completedCount: completedTasks.length,
        overdueCount: overdueTasks.length,
        urgentCount: urgentTasks.length,
        clientCount,
        clientNames,
        totalEffectiveSeconds,
        totalEffectiveHms,
        totalEffectiveHoursDecimal,
        avgHoursPerTask,
        capacityStatus,
      },
      narrativeSummary,
      csvContent: finalCsv,
      filename,
    },
  };
}
