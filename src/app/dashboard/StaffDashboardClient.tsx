"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createTaskAction,
  updateTaskStatusAction,
  deleteTaskAction,
  updateTaskAction,
  startTaskTimerAction,
  pauseTaskTimerAction,
  deliverTaskAction,
  requestRevisionAction,
  approveTaskAction,
  requestTaskPreviewAction,
  completeTaskAction,
} from "@/actions/tasks";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Archive,
  RotateCcw,
  Trash2,
  FolderKanban,
  Edit,
  Sparkles,
  Loader2,
  AlertTriangle,
  Flame,
  Check,
  TrendingUp,
  Activity,
  Briefcase,
  Send,
  Play,
  Pause,
  Rocket,
  MessageSquare,
  History,
  Timer,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  X,
  CalendarDays,
  Filter,
  User,
  FileSpreadsheet,
  Download,
  Eye,
} from "lucide-react";
import { formatDate, formatRelativeDays } from "@/lib/utils";
import { StaffReportModal } from "@/components/StaffReportModal";
import { TaskTimerPill } from "@/components/TaskTimerPill";
import { TaskRecapBreakdown } from "@/components/TaskRecapBreakdown";

interface TaskRevisionItem {
  id: string;
  round: number;
  feedback: string;
  seconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  status: string;
  createdAt: Date | string;
  deliveredAt: Date | string | null;
}

interface TaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  completedAt: Date | null;
  initialSeconds: number;
  totalSeconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  currentPhase: string;
  currentRevisionRound: number;
  revisions: TaskRevisionItem[];
  createdAt: Date | string;
  updatedAt?: Date | string;
  userId?: string;
  createdById?: string | null;
  reviewerId?: string | null;
  previewDescription?: string | null;
  project: {
    id: string;
    name: string;
    clientName: string;
    code: string;
    status: string;
  } | null;
  createdBy?: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  } | null;
  reviewer?: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  } | null;
}

export interface ReviewRequestItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  completedAt: Date | null;
  initialSeconds: number;
  totalSeconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  currentPhase: string;
  currentRevisionRound: number;
  revisions: TaskRevisionItem[];
  createdAt: Date | string;
  updatedAt: Date | string;
  reviewerId?: string | null;
  previewDescription?: string | null;
  user: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  };
  createdBy?: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  } | null;
  reviewer?: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  } | null;
  project: {
    id: string;
    name: string;
    clientName: string;
    code: string;
    status: string;
  } | null;
}

interface DelegatedTaskItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  estimatedHours: number | null;
  completedAt: Date | null;
  initialSeconds: number;
  totalSeconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  currentPhase: string;
  currentRevisionRound: number;
  revisions: TaskRevisionItem[];
  createdAt: Date;
  updatedAt: Date;
  previewDescription?: string | null;
  user: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  };
  project: {
    id: string;
    name: string;
    clientName: string;
    code: string;
    status: string;
  } | null;
}

interface ProjectOption {
  id: string;
  name: string;
  clientName: string;
  code: string;
  status: string;
}

interface StaffMemberOption {
  id: string;
  name: string;
  position: string;
  department: string;
  avatarUrl: string | null;
}

interface AgencyTaskItem extends TaskItem {
  user?: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
  } | null;
}

interface StaffDashboardClientProps {
  user: any;
  activeTasks: TaskItem[];
  archivedTasks: TaskItem[];
  delegatedTasks?: DelegatedTaskItem[];
  reviewRequests?: ReviewRequestItem[];
  allTasks?: AgencyTaskItem[];
  staffMembers?: StaffMemberOption[];
  projects: ProjectOption[];
  stats: {
    activeCount: number;
    todoCount: number;
    inProgressCount: number;
    inReviewCount?: number;
    revisionCount?: number;
    archivedCount: number;
    delegatedCount?: number;
    delegatedActiveCount?: number;
    reviewRequestsCount?: number;
    urgentCount: number;
    totalHours: number;
  };
}

// Format duration helper (e.g. "02h 14m 35s" or "45m 10s")
function formatSeconds(totalSec: number): string {
  if (totalSec <= 0 || isNaN(totalSec)) return "00m 00s";
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) {
    return `${h.toString().padStart(2, "0")}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
  }
  return `${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
}

// Digital Stopwatch live display
function formatStopwatch(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

// Date string helper YYYY-MM-DD
function toDateKey(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function isTaskOnDate(
  task: { dueDate?: Date | string | null; createdAt?: Date | string; completedAt?: Date | string | null },
  targetDate: string
): boolean {
  if (!targetDate) return true;
  const dueKey = toDateKey(task.dueDate);
  const createdKey = toDateKey(task.createdAt);
  const compKey = toDateKey(task.completedAt);
  return dueKey === targetDate || createdKey === targetDate || compKey === targetDate;
}

function formatDisplayDate(dateKey: string): string {
  if (!dateKey) return "";
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type SortOption = "newest" | "oldest" | "deadline";

export function StaffDashboardClient({
  user,
  activeTasks,
  archivedTasks,
  delegatedTasks = [],
  reviewRequests = [],
  allTasks = [],
  staffMembers = [],
  projects,
  stats,
}: StaffDashboardClientProps) {
  const router = useRouter();
  const isAdminOrPM =
    user.role === "MANAGEMENT" ||
    user.role === "ADMIN" ||
    Boolean(user.position && user.position.toLowerCase().includes("project manager")) ||
    Boolean(user.position && user.position.toLowerCase().includes("pm"));

  const [createOpen, setCreateOpen] = useState(false);
  const [editTask, setEditTask] = useState<TaskItem | DelegatedTaskItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [delegatedFilter, setDelegatedFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<SortOption>("newest");
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>("");
  const [calendarMonthDate, setCalendarMonthDate] = useState(() => new Date());
  const [calendarSelectedDate, setCalendarSelectedDate] = useState<string | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [filterCalMonth, setFilterCalMonth] = useState(() => new Date());
  const datePickerRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState("active");
  const [highlightedTaskId, setHighlightedTaskId] = useState<string | null>(null);

  // Request Preview Modal State
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewModalTask, setPreviewModalTask] = useState<TaskItem | null>(null);
  const [previewTargetUserId, setPreviewTargetUserId] = useState<string>("");
  const [previewDescription, setPreviewDescription] = useState<string>("");
  const [previewSubmitting, setPreviewSubmitting] = useState(false);

  // Deliver Modal State (Delegated Tasks)
  const [deliverModalOpen, setDeliverModalOpen] = useState(false);
  const [deliverModalTask, setDeliverModalTask] = useState<TaskItem | null>(null);
  const [deliverDescription, setDeliverDescription] = useState<string>("");
  const [deliverSubmitting, setDeliverSubmitting] = useState(false);

  // Close date picker popover on outside click or Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setIsDatePickerOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setIsDatePickerOpen(false);
    }

    if (isDatePickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDatePickerOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get("tab");
      if (tabParam && ["active", "delivered", "reviews", "all-tasks"].includes(tabParam)) {
        setActiveTab(tabParam);
      }

      const targetTaskId = params.get("taskId");
      if (targetTaskId) {
        const inActive = activeTasks.some((t) => t.id === targetTaskId);
        const inReview = reviewRequests.some((t) => t.id === targetTaskId);
        const inDelegated = delegatedTasks.some((t) => t.id === targetTaskId);
        const inAll = allTasks.some((t) => t.id === targetTaskId);
        const inArchived = archivedTasks.some((t) => t.id === targetTaskId);

        if (inActive) {
          setActiveTab("active");
        } else if (inReview) {
          setActiveTab("reviews");
        } else if (inDelegated) {
          setActiveTab("delivered");
        } else if (inAll && isAdminOrPM) {
          setActiveTab("all-tasks");
        } else if (inArchived) {
          setActiveTab("active");
          setStatusFilter("Done");
        }

        setHighlightedTaskId(targetTaskId);

        setTimeout(() => {
          const el = document.getElementById(`task-${targetTaskId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 350);

        setTimeout(() => {
          setHighlightedTaskId((prev) => (prev === targetTaskId ? null : prev));
        }, 5000);
      }
    }
  }, [activeTasks, reviewRequests, delegatedTasks, allTasks, archivedTasks, isAdminOrPM]);
  
  // Revision input state: { [taskId]: string }
  const [revisionInputs, setRevisionInputs] = useState<Record<string, string>>({});
  const [openRevisionFormId, setOpenRevisionFormId] = useState<string | null>(null);
  const [expandedRecapId, setExpandedRecapId] = useState<string | null>(null);
  const [isPersonalReportOpen, setIsPersonalReportOpen] = useState(false);
  const [expandedBriefIds, setExpandedBriefIds] = useState<Record<string, boolean>>({});

  const toggleBriefExpand = (taskId: string) => {
    setExpandedBriefIds((prev) => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  // Helper hitung detik live pengerjaan saat dibutuhkan on-demand (e.g. saat klik export CSV)
  const computeLiveTaskSecondsOnDemand = (task: TaskItem | DelegatedTaskItem) => {
    let currentLive = 0;
    if (task.timerActive && task.timerStartedAt) {
      currentLive = Math.max(0, Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000));
    }
    return (task.totalSeconds || 0) + currentLive;
  };

  const handleCreateTask = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const res = await createTaskAction(formData);

    setLoading(false);
    if (res.success) {
      setCreateOpen(false);
      router.refresh();
    }
  };

  // Timer actions
  const handleStartTimer = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await startTaskTimerAction(taskId);
      if (res && !res.success) {
        alert(res.error || "Gagal memulai task.");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error starting task timer:", err);
      alert("Terjadi kesalahan sistem saat memulai task: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePauseTimer = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await pauseTaskTimerAction(taskId);
      if (res && !res.success) {
        alert(res.error || "Gagal menjeda timer.");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error pausing task timer:", err);
      alert("Terjadi kesalahan sistem saat menjeda timer: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeliverTask = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await deliverTaskAction(taskId);
      if (res && !res.success) {
        alert(res.error || "Gagal mendeliver task.");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error delivering task:", err);
      alert("Terjadi kesalahan sistem saat mendeliver task: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenDeliverModal = (task: TaskItem) => {
    setDeliverModalTask(task);
    setDeliverDescription(task.previewDescription || "");
    setDeliverModalOpen(true);
  };

  const handleSubmitDeliver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deliverModalTask) return;
    if (!deliverDescription.trim()) {
      alert("Mohon masukkan Request Description / catatan hasil kerja terlebih dahulu.");
      return;
    }

    setDeliverSubmitting(true);
    try {
      const res = await deliverTaskAction({
        taskId: deliverModalTask.id,
        description: deliverDescription.trim(),
      });
      if (res && !res.success) {
        alert(res.error || "Gagal mendeliver task.");
      } else {
        setDeliverModalOpen(false);
        setDeliverModalTask(null);
        setDeliverDescription("");
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error delivering task:", err);
      alert("Terjadi kesalahan sistem saat mendeliver task: " + (err?.message || err));
    } finally {
      setDeliverSubmitting(false);
    }
  };

  const handleRequestRevision = async (taskId: string) => {
    const feedback = revisionInputs[taskId];
    if (!feedback || feedback.trim().length === 0) {
      alert("Mohon masukkan catatan revisi terlebih dahulu.");
      return;
    }

    setActionLoadingId(taskId);
    try {
      const res = await requestRevisionAction({
        taskId,
        feedback: feedback.trim(),
      });
      if (res && !res.success) {
        alert(res.error || "Gagal meminta revisi.");
      } else {
        setRevisionInputs((prev) => ({ ...prev, [taskId]: "" }));
        setOpenRevisionFormId(null);
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error requesting revision:", err);
      alert("Terjadi kesalahan sistem saat meminta revisi: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await approveTaskAction(taskId);
      if (res && !res.success) {
        alert(res.error || "Gagal menyetujui task.");
      } else {
        router.refresh();
      }
    } catch (err: any) {
      console.error("Error approving task:", err);
      alert("Terjadi kesalahan sistem saat menyetujui task: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRequestPreview = (task: TaskItem) => {
    setPreviewModalTask(task);
    const otherStaff = (staffMembers || []).filter((m) => m.id !== task.userId);
    const defaultReviewerId = task.reviewerId || (otherStaff.length > 0 ? otherStaff[0].id : "");
    setPreviewTargetUserId(defaultReviewerId);
    setPreviewDescription(task.previewDescription || "");
    setPreviewModalOpen(true);
  };

  const handleSubmitRequestPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewModalTask) return;
    if (!previewTargetUserId) {
      alert("Pilih Target User (Reviewer) terlebih dahulu.");
      return;
    }

    setPreviewSubmitting(true);
    try {
      const res = await requestTaskPreviewAction({
        taskId: previewModalTask.id,
        targetUserId: previewTargetUserId,
        description: previewDescription.trim(),
      });

      if (res && res.success) {
        setPreviewModalOpen(false);
        setPreviewModalTask(null);
        setPreviewDescription("");
        router.refresh();
      } else {
        alert(res?.error || "Gagal mengajukan preview task.");
      }
    } catch (err: any) {
      console.error("Error requesting preview:", err);
      alert("Terjadi kesalahan sistem saat mengajukan preview task: " + (err?.message || err));
    } finally {
      setPreviewSubmitting(false);
    }
  };

  const handleDoneTask = async (taskId: string) => {
    setActionLoadingId(taskId);
    try {
      const res = await completeTaskAction(taskId);
      if (res && res.success) {
        router.refresh();
      } else {
        alert(res?.error || "Gagal menyelesaikan task.");
      }
    } catch (err: any) {
      console.error("Error completing task:", err);
      alert("Terjadi kesalahan sistem saat menyelesaikan task: " + (err?.message || err));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        const res = await deleteTaskAction(taskId);
        if (res && !res.success) {
          alert(res.error || "Gagal menghapus task.");
        } else {
          router.refresh();
        }
      } catch (err: any) {
        console.error("Error deleting task:", err);
        alert("Terjadi kesalahan sistem saat menghapus task: " + (err?.message || err));
      }
    }
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editTask) return;
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.append("taskId", editTask.id);

    await updateTaskAction(formData);
    setLoading(false);
    setEditTask(null);
    router.refresh();
  };

  const handleExportMyTasks = () => {
    const allMyTasks = [...activeTasks, ...archivedTasks];
    if (allMyTasks.length === 0) {
      alert("Belum ada task untuk diekspor.");
      return;
    }

    const headers = [
      "Judul Task",
      "Kode Project",
      "Nama Project",
      "Klien",
      "Prioritas",
      "Status",
      "Fase Saat Ini",
      "Batas Waktu (Due Date)",
      "Tanggal Selesai",
      "Estimasi (Jam)",
      "Waktu Draft Awal (HH:MM:SS)",
      "Jumlah Putaran Revisi",
      "Waktu Revisi (HH:MM:SS)",
      "Total Waktu Kerja (HH:MM:SS)",
      "Total Jam (Desimal)",
      "Deskripsi / Catatan",
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      return `"${String(val).replace(/"/g, '""')}"`;
    };

    const rows = allMyTasks.map((t) => {
      const liveTotal = computeLiveTaskSecondsOnDemand(t);
      const revs = t.revisions || [];
      const totalRevSec = revs.reduce((acc, r) => acc + (r.seconds || 0), 0);
      const initSec = t.initialSeconds || 0;
      const decHours = (liveTotal / 3600).toFixed(2);
      const dueStr = t.dueDate ? new Date(t.dueDate).toISOString().slice(0, 10) : "-";
      const compStr = t.completedAt ? new Date(t.completedAt).toISOString().slice(0, 10) : "-";

      return [
        escapeCsv(t.title),
        escapeCsv(t.project?.code || "-"),
        escapeCsv(t.project?.name || "-"),
        escapeCsv(t.project?.clientName || "-"),
        escapeCsv(t.priority),
        escapeCsv(t.status),
        escapeCsv(t.currentPhase === "REVISION" ? `Revisi Ke-${t.currentRevisionRound || 1}` : "Draft Awal"),
        escapeCsv(dueStr),
        escapeCsv(compStr),
        t.estimatedHours || 0,
        escapeCsv(formatStopwatch(initSec)),
        revs.length,
        escapeCsv(formatStopwatch(totalRevSec)),
        escapeCsv(formatStopwatch(liveTotal)),
        decHours,
        escapeCsv(t.description || "-"),
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.map(escapeCsv).join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `Locomotion_My_Tasks_${user.username}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const allMyTasks = [...activeTasks, ...archivedTasks];

  const filteredActiveTasks = (() => {
    let pool: TaskItem[];
    if (statusFilter === "Done") {
      pool = archivedTasks;
    } else if (selectedDateFilter) {
      pool = allMyTasks;
    } else {
      pool = activeTasks;
    }

    let result = pool.filter((t) => {
      if (statusFilter === "ALL") return true;
      return t.status === statusFilter;
    });

    if (selectedDateFilter) {
      result = result.filter((t) => isTaskOnDate(t, selectedDateFilter));
    }

    return result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "deadline") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  })();

  const filteredDelegatedTasks = (() => {
    let result = delegatedTasks.filter((t) => {
      if (delegatedFilter === "ALL") return true;
      return t.status === delegatedFilter;
    });

    if (selectedDateFilter) {
      result = result.filter((t) => isTaskOnDate(t, selectedDateFilter));
    }

    return result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "deadline") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  })();

  const filteredReviewRequests = (() => {
    let result = (reviewRequests || []).filter((t) => {
      if (statusFilter === "ALL") return true;
      return t.status === statusFilter;
    });

    if (selectedDateFilter) {
      result = result.filter((t) => isTaskOnDate(t, selectedDateFilter));
    }

    return result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "deadline") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  })();

  const filteredAllTasks = (() => {
    let result = allTasks.filter((t) => {
      if (statusFilter === "ALL") return true;
      return t.status === statusFilter;
    });

    if (selectedDateFilter) {
      result = result.filter((t) => isTaskOnDate(t, selectedDateFilter));
    }

    return result.sort((a, b) => {
      if (sortOrder === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortOrder === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortOrder === "deadline") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      }
      return 0;
    });
  })();

  // Calendar Widget Computations
  const allWorkspaceTasks = isAdminOrPM && allTasks.length > 0 ? allTasks : [...activeTasks, ...archivedTasks, ...delegatedTasks];
  const tasksByDateMap: Record<string, typeof allWorkspaceTasks> = {};
  allWorkspaceTasks.forEach((t) => {
    const dates = new Set<string>();
    const dueKey = toDateKey(t.dueDate);
    const createdKey = toDateKey(t.createdAt);
    const compKey = toDateKey(t.completedAt);
    if (dueKey) dates.add(dueKey);
    if (createdKey) dates.add(createdKey);
    if (compKey) dates.add(compKey);

    dates.forEach((dKey) => {
      if (!tasksByDateMap[dKey]) tasksByDateMap[dKey] = [];
      if (!tasksByDateMap[dKey].some((item) => item.id === t.id)) {
        tasksByDateMap[dKey].push(t);
      }
    });
  });

  const calendarYear = calendarMonthDate.getFullYear();
  const calendarMonth = calendarMonthDate.getMonth();
  const calendarDaysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const calendarFirstDayOffset = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const calendarSelectedDayTasks = calendarSelectedDate ? (tasksByDateMap[calendarSelectedDate] || []) : [];

  const filterYear = filterCalMonth.getFullYear();
  const filterMonth = filterCalMonth.getMonth();
  const filterDaysInMonth = new Date(filterYear, filterMonth + 1, 0).getDate();
  const filterFirstDayOffset = (new Date(filterYear, filterMonth, 1).getDay() + 6) % 7;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return (
          <Badge variant="destructive" className="gap-1 text-[11px] font-semibold">
            <Flame className="h-3 w-3" />
            <span>URGENT</span>
          </Badge>
        );
      case "HIGH":
        return <Badge variant="warning" className="text-[11px] font-semibold">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="cyan" className="text-[11px] font-semibold">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="text-[11px]">LOW</Badge>;
    }
  };

  const getStatusBadge = (s: string, round = 0) => {
    switch (s) {
      case "Done":
        return (
          <Badge variant="success" className="gap-1 text-[10px] font-semibold">
            <Check className="h-3 w-3" />
            <span>Done</span>
          </Badge>
        );
      case "In Review":
        return (
          <Badge variant="purple" className="gap-1 text-[10px] font-semibold">
            <MessageSquare className="h-3 w-3" />
            <span>In Review</span>
          </Badge>
        );
      case "Revision":
        return (
          <Badge variant="destructive" className="gap-1 text-[10px] font-semibold">
            <AlertTriangle className="h-3 w-3" />
            <span>Revisi #{round || 1}</span>
          </Badge>
        );
      case "On Progress":
        return (
          <Badge variant="cyan" className="gap-1 text-[10px] font-semibold">
            <Clock className="h-3 w-3" />
            <span>On Progress</span>
          </Badge>
        );
      default:
        return (
          <Badge variant="warning" className="gap-1 text-[10px] font-semibold">
            <span>To Do</span>
          </Badge>
        );
    }
  };

  const isOverloaded = stats.activeCount >= 5;
  const isAvailable = stats.activeCount <= 1;

  // Chart data calculations
  const totalTasks = stats.activeCount + stats.archivedCount;
  const inProgressPct = totalTasks ? Math.round((stats.inProgressCount / totalTasks) * 100) : 0;
  const todoPct = totalTasks ? Math.round((stats.todoCount / totalTasks) * 100) : 0;
  const inReviewPct = totalTasks ? Math.round(((stats.inReviewCount || 0) / totalTasks) * 100) : 0;
  const archivedPct = totalTasks ? Math.round((stats.archivedCount / totalTasks) * 100) : 0;

  // Donut circumference (radius = 40 => 2 * pi * 40 ≈ 251.2)
  const c = 251.2;
  const strokeProgress = (inProgressPct / 100) * c;
  const strokeTodo = (todoPct / 100) * c;
  const strokeInReview = (inReviewPct / 100) * c;
  const strokeArchived = (archivedPct / 100) * c;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Workspace Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Overview
            </h1>
            <Badge variant="default" className="text-xs font-medium">
              Staff Workspace
            </Badge>
            {isOverloaded ? (
              <Badge variant="destructive" className="text-xs gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>Overloaded ({stats.activeCount} tasks)</span>
              </Badge>
            ) : isAvailable ? (
              <Badge variant="success" className="text-xs gap-1">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Available for Assignment</span>
              </Badge>
            ) : (
              <Badge variant="cyan" className="text-xs gap-1">
                <Activity className="h-3.5 w-3.5" />
                <span>Optimal Flow ({stats.activeCount} tasks)</span>
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Welcome back, <strong className="text-foreground">{user.name}</strong>! Real-time task timers, revision tracking, and deliverable handoffs are active.
          </p>
        </div>

        {/* Action Buttons: Export CSV & Create / Delegate Task */}
        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          <Button
            variant="outline"
            onClick={() => setIsPersonalReportOpen(true)}
            className="gap-2 rounded-xl border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 hover:border-blue-500/50 text-xs font-semibold h-10 px-3.5 shadow-sm"
            title="Lihat ringkasan kinerja naratif & download CSV"
          >
            <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span>Export Report & Ringkasan</span>
          </Button>

          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0 h-10 px-4">
                <Plus className="h-4 w-4" />
                <span>Create / Delegate Task</span>
              </Button>
            </DialogTrigger>
          <DialogContent className="max-w-lg rounded-2xl">
            <form onSubmit={handleCreateTask}>
              <DialogHeader>
                <DialogTitle>Create / Deliver Task</DialogTitle>
                <DialogDescription className="text-xs">
                  Create a task for yourself or delegate/deliver it to another agency staff specialist with auto-timer.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="title">Task Title</Label>
                  <Input
                    id="title"
                    name="title"
                    placeholder="e.g. Design 3D Sneaker Key Visual"
                    required
                    autoFocus
                    className="rounded-xl"
                  />
                </div>

                {/* Assignee / Deliver To Selection */}
                <div className="space-y-1.5">
                  <Label htmlFor="assigneeId" className="text-blue-600 dark:text-blue-400 font-semibold flex items-center gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    <span>Assignee (Deliver To)</span>
                  </Label>
                  <select
                    id="assigneeId"
                    name="assigneeId"
                    defaultValue="ME"
                    className="flex h-10 w-full rounded-xl border border-blue-500/40 bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
                  >
                    <option value="ME">
                      Myself ({user.name} • {user.position})
                    </option>
                    <optgroup label="Delegate to Other Staff Specialists">
                      {staffMembers
                        .filter((s) => s.id !== user.id)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} — {s.position} ({s.department})
                          </option>
                        ))}
                    </optgroup>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    Assigning to another specialist will place this deliverable in their workspace and track it in your <strong>&ldquo;Deliver by Me&rdquo;</strong> tab.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projectId">
                    Related Project (Global Board) *
                  </Label>
                  <select
                    id="projectId"
                    name="projectId"
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
                    defaultValue=""
                  >
                    <option value="NONE">
                      None (General Agency Internal Task)
                    </option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.code} • {proj.name} ({proj.clientName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="description">Task Description / Brief</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Key deliverables, briefs, assets, or instructions for the assignee..."
                    rows={3}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="priority">Priority</Label>
                    <select
                      id="priority"
                      name="priority"
                      defaultValue="MEDIUM"
                      className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="URGENT">URGENT</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="status">Initial Status</Label>
                    <select
                      id="status"
                      name="status"
                      defaultValue="To Do"
                      className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="To Do">To Do (Waiting to Start)</option>
                      <option value="On Progress">On Progress</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="date" className="rounded-xl" />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="estimatedHours">Est. Hours</Label>
                    <Input
                      id="estimatedHours"
                      name="estimatedHours"
                      type="number"
                      step="0.5"
                      defaultValue="4.0"
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCreateOpen(false)}
                  disabled={loading}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 shadow-sm"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save / Deliver Task</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>

      {/* Review Requests Alert Banner (Jika ada task menunggu review Anda) */}
      {(reviewRequests || []).filter((t) => t.status === "In Review").length > 0 && activeTab !== "reviews" && (
        <div className="rounded-2xl border border-purple-500/40 bg-purple-500/10 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-up">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-300 flex items-center justify-center shrink-0">
              <Eye className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-purple-900 dark:text-purple-200">
                Anda memiliki {(reviewRequests || []).filter((t) => t.status === "In Review").length} Permintaan Preview yang Menunggu Review
              </p>
              <p className="text-[11px] text-muted-foreground">
                Rekan tim mengajukan hasil kerja task mandiri untuk Anda review, setujui, atau minta perbaikan.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => setActiveTab("reviews")}
            className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs border-0 shrink-0 shadow-sm"
          >
            Buka Review Requests
          </Button>
        </div>
      )}

      {/* Task Management Tabs: Active Tasks vs Review Requests vs Deliver by Me vs Archive */}
      <Tabs id="task-board" value={activeTab} onValueChange={setActiveTab} className="space-y-6 scroll-mt-20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-3">
          <TabsList className="h-11 rounded-xl bg-secondary/60 p-1 flex-wrap">
            {/* Tab 1: My Active Tasks */}
            <TabsTrigger value="active" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Layers className="h-4 w-4" />
              <span>Active Tasks</span>
              <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                {stats.activeCount}
              </span>
            </TabsTrigger>

            {/* Tab 2: Review Requests (Target User Preview Hub) */}
            <TabsTrigger
              value="reviews"
              className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <Eye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
              <span>Review Requests</span>
              <span
                className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  (reviewRequests || []).filter((t) => t.status === "In Review").length > 0
                    ? "bg-purple-500/20 text-purple-700 dark:text-purple-300 font-extrabold ring-1 ring-purple-500/30"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {(reviewRequests || []).length}
              </span>
            </TabsTrigger>

            {/* Tab 3: Deliver by Me (Delegated Tasks) */}
            <TabsTrigger value="delivered" className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm">
              <Send className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Deliver by Me</span>
              <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                {delegatedTasks.length}
              </span>
            </TabsTrigger>

            {/* Tab 3: All Tasks (Khusus Admin / Project Manager) */}
            {isAdminOrPM && (
              <TabsTrigger
                value="all-tasks"
                className="gap-2 rounded-lg data-[state=active]:bg-card data-[state=active]:shadow-sm"
              >
                <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>All Tasks</span>
                <span className="ml-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                  {allTasks.length}
                </span>
              </TabsTrigger>
            )}
          </TabsList>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Status Dropdown Filter */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs shadow-sm transition-all ${
                statusFilter !== "ALL"
                  ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                  : "border-border/60 bg-card/90 hover:bg-card text-foreground font-semibold hover:border-blue-500/40"
              }`}
            >
              <Filter className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-muted-foreground text-[11px] font-medium hidden sm:inline">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setStatusFilter(val);
                  setDelegatedFilter(val);
                }}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="ALL" className="bg-card text-foreground font-medium">Semua Status (ALL)</option>
                <option value="To Do" className="bg-card text-foreground font-medium">To Do</option>
                <option value="On Progress" className="bg-card text-foreground font-medium">On Progress</option>
                <option value="In Review" className="bg-card text-foreground font-medium">In Review</option>
                <option value="Revision" className="bg-card text-foreground font-medium">Revision</option>
                <option value="Done" className="bg-card text-foreground font-medium">Done (Selesai)</option>
              </select>
            </div>

            {/* Custom Theme-Aware Date Calendar Picker */}
            <div className="relative" ref={datePickerRef}>
              <button
                type="button"
                onClick={() => {
                  if (!isDatePickerOpen && selectedDateFilter) {
                    const [y, m, d] = selectedDateFilter.split("-").map(Number);
                    setFilterCalMonth(new Date(y, m - 1, d));
                  }
                  setIsDatePickerOpen(!isDatePickerOpen);
                }}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-sm transition-all ${
                  selectedDateFilter
                    ? "border-blue-500/60 bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold"
                    : "border-border/60 bg-card/90 hover:bg-card text-foreground font-semibold hover:border-blue-500/40"
                }`}
                title="Filter task berdasarkan kalender"
              >
                <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>{selectedDateFilter ? formatDisplayDate(selectedDateFilter) : "Pilih Tanggal"}</span>
                {selectedDateFilter ? (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedDateFilter("");
                    }}
                    className="text-muted-foreground hover:text-rose-500 p-0.5 rounded-full hover:bg-secondary transition-colors"
                    title="Hapus filter tanggal"
                  >
                    <X className="h-3 w-3" />
                  </span>
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </button>

              {/* Custom Theme-Aware Calendar Popover */}
              {isDatePickerOpen && (
                <div className="absolute right-0 sm:right-auto sm:left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl border border-border/70 bg-card/95 backdrop-blur-md p-4 shadow-2xl z-50 animate-fade-up">
                  {/* Month Navigation Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => {
                        setFilterCalMonth(
                          new Date(filterCalMonth.getFullYear(), filterCalMonth.getMonth() - 1, 1)
                        );
                      }}
                      title="Bulan sebelumnya"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>

                    <span className="text-xs font-bold text-foreground capitalize">
                      {filterCalMonth.toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                    </span>

                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary"
                      onClick={() => {
                        setFilterCalMonth(
                          new Date(filterCalMonth.getFullYear(), filterCalMonth.getMonth() + 1, 1)
                        );
                      }}
                      title="Bulan berikutnya"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Weekdays */}
                  <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center text-[10px] font-bold text-muted-foreground">
                    {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((dayName) => (
                      <div key={dayName} className="py-0.5">
                        {dayName}
                      </div>
                    ))}
                  </div>

                  {/* Day Cells Matrix */}
                  <div className="grid grid-cols-7 gap-1 text-center">
                    {Array.from({ length: filterFirstDayOffset }).map((_, i) => (
                      <div key={`cal-empty-${i}`} className="h-8 w-full" />
                    ))}

                    {Array.from({ length: filterDaysInMonth }).map((_, i) => {
                      const dayNum = i + 1;
                      const dateKey = `${filterYear}-${String(filterMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                      const isToday = toDateKey(new Date()) === dateKey;
                      const isSelected = selectedDateFilter === dateKey;
                      const dayTasks = tasksByDateMap[dateKey] || [];
                      const taskCount = dayTasks.length;

                      return (
                        <button
                          key={dateKey}
                          type="button"
                          onClick={() => {
                            setSelectedDateFilter(dateKey);
                            setIsDatePickerOpen(false);
                          }}
                          className={`h-8 w-full rounded-xl flex flex-col items-center justify-center relative text-xs transition-all ${
                            isSelected
                              ? "bg-blue-600 dark:bg-blue-500 text-white font-bold shadow-md scale-105 z-10"
                              : isToday
                              ? "border border-blue-500/60 bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold"
                              : taskCount > 0
                              ? "bg-secondary/70 hover:bg-secondary text-foreground font-semibold"
                              : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          <span>{dayNum}</span>
                          {taskCount > 0 && (
                            <span
                              className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                                isSelected ? "bg-white" : "bg-blue-600 dark:bg-blue-400"
                              }`}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Quick Actions Footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border/40 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date();
                        setFilterCalMonth(today);
                        setSelectedDateFilter(toDateKey(today) || "");
                        setIsDatePickerOpen(false);
                      }}
                      className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Pilih Hari Ini
                    </button>

                    <div className="flex items-center gap-1.5">
                      {selectedDateFilter && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedDateFilter("");
                            setIsDatePickerOpen(false);
                          }}
                          className="h-6 text-[11px] px-2 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10 font-medium"
                        >
                          Reset
                        </Button>
                      )}

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsDatePickerOpen(false)}
                        className="h-6 text-[11px] px-2 rounded-lg font-medium"
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Sort Filter Dropdown */}
            <div className="flex items-center gap-1.5 bg-card/90 px-2.5 py-1.5 rounded-xl border border-border/60 text-xs shadow-sm hover:border-blue-500/40 transition-colors">
              <ArrowUpDown className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span className="text-muted-foreground text-[11px] font-medium hidden sm:inline">Urutan:</span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as SortOption)}
                className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer pr-1"
              >
                <option value="newest" className="bg-card text-foreground font-medium">Terbaru</option>
                <option value="oldest" className="bg-card text-foreground font-medium">Terlama</option>
                <option value="deadline" className="bg-card text-foreground font-medium">Deadline Terdekat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Active Date Filter Notice Banner */}
        {selectedDateFilter && (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-blue-500/10 border border-blue-500/25 text-xs text-blue-700 dark:text-blue-300 animate-fade-up">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-400" />
              <span>
                Menampilkan task pada tanggal: <strong>{formatDisplayDate(selectedDateFilter)}</strong>
              </span>
            </div>
            <button
              onClick={() => setSelectedDateFilter("")}
              className="font-bold underline hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
            >
              Hapus Filter
            </button>
          </div>
        )}

        {/* Tab 1: Active Tasks (Assigned to Me) */}
        <TabsContent value="active" className="space-y-4">
          {filteredActiveTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/40">
              <CheckCircle2 className="h-10 w-10 text-blue-500 mx-auto" />
              <h3 className="text-base font-bold text-foreground">
                {selectedDateFilter
                  ? `Tidak ada task pada tanggal ${formatDisplayDate(selectedDateFilter)}`
                  : statusFilter !== "ALL"
                  ? `Tidak ada task dengan status "${statusFilter}"`
                  : "No active tasks in this view"}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                {selectedDateFilter || statusFilter !== "ALL"
                  ? "Coba sesuaikan filter status, pilih tanggal lain di kalender, atau hapus filter untuk melihat semua tugas."
                  : "All tasks are cleared or match another status filter. Ready to tackle a new agency deliverable?"}
              </p>
              {selectedDateFilter || statusFilter !== "ALL" ? (
                <Button
                  onClick={() => {
                    setStatusFilter("ALL");
                    setSelectedDateFilter("");
                  }}
                  size="sm"
                  variant="outline"
                  className="rounded-xl text-xs gap-1.5 font-semibold"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>Reset Filter</span>
                </Button>
              ) : (
                <Button onClick={() => setCreateOpen(true)} size="sm" className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 shadow-sm">
                  <Plus className="h-4 w-4" />
                  <span>Create Task</span>
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredActiveTasks.map((task) => {
                const isWorking = task.timerActive;
                const isRevisionPhase = task.status === "Revision" || task.currentPhase === "REVISION";
                const isReviewPhase = task.status === "In Review";
                const activeRevision = task.revisions?.find((r) => r.round === task.currentRevisionRound);
                const isLoading = actionLoadingId === task.id;
                const isPemberiTask = !task.createdBy || task.createdBy.id === user.id || (task as any).createdById === user.id;
                const isSelfAssigned = isPemberiTask;
                const isBriefLong = Boolean(
                  task.description && (task.description.length > 100 || task.description.includes("\n"))
                );
                const isBriefExpanded = Boolean(expandedBriefIds[task.id]);

                return (
                  <Card
                    key={task.id}
                    id={`task-${task.id}`}
                    className={`flex flex-col justify-between border border-border/70 hover:border-blue-500/50 bg-card/90 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md card-hover-lift rounded-2xl overflow-hidden scroll-mt-28 ${
                      highlightedTaskId === task.id ? "ring-2 ring-blue-600 dark:ring-blue-400 shadow-xl scale-[1.01]" : ""
                    }`}
                  >
                    <div>
                      {/* Top Context & Dominant Title Bar */}
                      <div className="p-4 pb-3 border-b border-border/40 bg-secondary/15 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {task.project ? (
                            <Link
                              href={`/projects/${task.project.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/25 truncate transition-colors"
                              title="Buka Hub Proyek"
                            >
                              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {task.project.code} • {task.project.clientName}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full font-medium">
                              Operasional Internal
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(task.status, task.currentRevisionRound)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>

                        {/* Title: Big, bold & focused */}
                        <h3 className="text-base font-bold tracking-tight text-foreground leading-snug">
                          {task.title}
                        </h3>

                        {/* Delegated from another staff indicator */}
                        {task.createdBy && task.createdBy.id !== user.id && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-muted-foreground bg-secondary/60 px-2 py-0.5 rounded-lg border border-border/40">
                            <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span>Ditugaskan oleh: <strong className="text-foreground">{task.createdBy.name}</strong></span>
                          </div>
                        )}

                        {/* Reviewer indicator for preview requests */}
                        {task.reviewer && (
                          <div className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/25">
                            <Eye className="h-3 w-3" />
                            <span>Reviewer Preview: <strong className="text-foreground">{task.reviewer.name}</strong></span>
                          </div>
                        )}
                      </div>

                      {/* Card Body: Brief & Instruksi Kerja (Pusat Perhatian Utama) */}
                      <div className="p-4 space-y-3">
                        {/* WADAH BRIEF KHUSUS DENGAN COLLAPSE / EXPAND ICON */}
                        <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] p-3 space-y-2">
                          <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 gap-2">
                            <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                              <FileSpreadsheet className="h-3.5 w-3.5" />
                              <span>Brief & Instruksi</span>
                            </span>
                            <div className="flex items-center gap-2">
                              {task.estimatedHours && (
                                <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {task.estimatedHours}h
                                </span>
                              )}
                              {isBriefLong && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleBriefExpand(task.id)}
                                  className="h-6 px-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 gap-1 rounded-md"
                                  title={isBriefExpanded ? "Ciutkan Brief" : "Buka Brief Lengkap"}
                                >
                                  <span>{isBriefExpanded ? "Ciutkan" : "Brief"}</span>
                                  {isBriefExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </div>

                          {task.description ? (
                            <div>
                              <p
                                className={`text-sm text-foreground/90 leading-relaxed font-normal whitespace-pre-line transition-all duration-200 ${
                                  !isBriefExpanded && isBriefLong ? "line-clamp-2" : ""
                                }`}
                              >
                                {task.description}
                              </p>
                              {isBriefLong && (
                                <button
                                  type="button"
                                  onClick={() => toggleBriefExpand(task.id)}
                                  className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-1.5 transition-colors group"
                                >
                                  <span>{isBriefExpanded ? "Sembunyikan sebagian" : "Baca brief selengkapnya..."}</span>
                                  {isBriefExpanded ? (
                                    <ChevronUp className="h-3 w-3 group-hover:-translate-y-0.5 transition-transform" />
                                  ) : (
                                    <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform" />
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">
                              Belum ada instruksi brief tertulis khusus untuk tugas ini.
                            </p>
                          )}
                        </div>

                        {/* REVISION ALERT BOX (If in Revision state) */}
                        {isRevisionPhase && activeRevision && (
                          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3.5 space-y-2 animate-fade-up">
                            <div className="flex items-center justify-between text-xs font-bold text-rose-700 dark:text-rose-300">
                              <span className="flex items-center gap-1.5">
                                <AlertTriangle className="h-4 w-4" />
                                <span>Catatan Revisi #{activeRevision.round}</span>
                              </span>
                              <Badge variant="destructive" className="text-[10px] uppercase font-bold">Harap Dikerjakan</Badge>
                            </div>
                            <p className="text-xs sm:text-sm text-foreground bg-card/90 p-3 rounded-lg border border-rose-500/20 font-medium whitespace-pre-line">
                              &ldquo;{activeRevision.feedback}&rdquo;
                            </p>
                          </div>
                        )}

                        {/* IN REVIEW BANNER */}
                        {isReviewPhase && (
                          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 space-y-2 text-xs text-purple-700 dark:text-purple-300 animate-fade-up">
                            <div className="flex items-center justify-between font-bold">
                              <span className="flex items-center gap-1.5">
                                <Eye className="h-4 w-4" />
                                <span>
                                  {isSelfAssigned && task.reviewer
                                    ? `Permintaan Preview Diajukan ke ${task.reviewer.name}`
                                    : "Telah di-Deliver! Menunggu review & persetujuan pembuat task."}
                                </span>
                              </span>
                              <Badge variant="purple" className="text-[10px]">In Review</Badge>
                            </div>
                            {task.previewDescription && (
                              <p className="text-xs bg-card/80 p-2.5 rounded-lg border border-purple-500/20 text-foreground font-medium italic whitespace-pre-line">
                                &ldquo;{task.previewDescription}&rdquo;
                              </p>
                            )}
                          </div>
                        )}

                        {/* EXPANDED TIMER REKAP DATA BREAKDOWN (Toggled from footer) */}
                        {expandedRecapId === task.id && (
                          <TaskRecapBreakdown task={task as any} />
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Compact Pill Timer & Action Bar */}
                    <div className="p-3.5 sm:p-4 bg-secondary/25 border-t border-border/50 flex flex-col gap-2.5">
                      {/* Top Row: Compact Timer, Deadline Pill, Rekap, and Pemberi Task Actions */}
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                          {/* Compact Pill Timer (Isolasi internal timer, 0 root re-renders) */}
                          <TaskTimerPill
                            timerActive={task.timerActive}
                            timerStartedAt={task.timerStartedAt}
                            totalSeconds={task.totalSeconds}
                          />

                          {/* Deadline pill */}
                          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-card/60 px-2.5 py-1 rounded-xl border border-border/40 shrink-0">
                            <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-foreground">{formatDate(task.dueDate)}</span>
                            <span className="text-[10px]">({formatRelativeDays(task.dueDate)})</span>
                          </div>

                          {/* Recap toggle */}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-[11px] gap-1 px-2 rounded-lg text-muted-foreground hover:text-foreground shrink-0"
                            onClick={() => setExpandedRecapId(expandedRecapId === task.id ? null : task.id)}
                            title="Lihat rincian waktu"
                          >
                            <History className="h-3 w-3" />
                            <span>Rekap</span>
                            {expandedRecapId === task.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                          </Button>
                        </div>

                        {/* Edit & Delete Actions - Hanya untuk Pemberi Task */}
                        {isPemberiTask && (
                          <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                              onClick={() => setEditTask(task)}
                              title="Edit Task (Pemberi Task)"
                            >
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                              onClick={() => handleDeleteTask(task.id)}
                              title="Delete Task (Pemberi Task)"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Bottom Row: Full-Width Action Controls */}
                      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-border/40">
                        {/* State 1: To Do -> START TASK */}
                        {task.status === "To Do" && (
                          <div className="flex items-center gap-2 flex-wrap w-full">
                            <Button
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleStartTimer(task.id)}
                              className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm h-8 px-3.5 border-0"
                            >
                              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-white" />}
                              <span>Mulai Task</span>
                            </Button>

                            {isSelfAssigned && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => handleDoneTask(task.id)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 font-semibold text-xs shadow-sm h-8 px-3"
                                title="Tandai langsung Selesai (Done)"
                              >
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                <span>Done</span>
                              </Button>
                            )}
                          </div>
                        )}

                        {/* State 2: On Progress */}
                        {task.status === "On Progress" && (
                          <div className="flex items-center gap-2 flex-wrap w-full">
                            {isWorking ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => handlePauseTimer(task.id)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold text-xs h-8 px-2.5"
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 fill-amber-500" />}
                                <span>Jeda</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => handleStartTimer(task.id)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1 rounded-xl border-blue-500/40 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-semibold text-xs h-8 px-2.5"
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-blue-500" />}
                                <span>Lanjut</span>
                              </Button>
                            )}

                            {isSelfAssigned ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isLoading}
                                  onClick={() => handleOpenRequestPreview(task)}
                                  className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-semibold text-xs shadow-sm h-8 px-3"
                                  title="Ajukan preview ke rekan tim sebelum selesai"
                                >
                                  <Eye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Request Preview</span>
                                </Button>

                                <Button
                                  size="sm"
                                  disabled={isLoading}
                                  onClick={() => handleDoneTask(task.id)}
                                  className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm h-8 px-3.5 border-0"
                                  title="Tandai langsung Selesai (Done)"
                                >
                                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  <span>Done</span>
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleOpenDeliverModal(task)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm h-8 px-3.5 border-0"
                              >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                                <span>Deliver</span>
                              </Button>
                            )}
                          </div>
                        )}

                        {/* State 3: Revision Phase */}
                        {isRevisionPhase && (
                          <div className="flex items-center gap-2 flex-wrap w-full">
                            {isWorking ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => handlePauseTimer(task.id)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1 rounded-xl border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-semibold text-xs h-8 px-2.5"
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Pause className="h-3 w-3 fill-amber-500" />}
                                <span>Jeda</span>
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => handleStartTimer(task.id)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1 rounded-xl border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold text-xs h-8 px-2.5"
                              >
                                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3 fill-rose-500" />}
                                <span>Start Rev #{task.currentRevisionRound}</span>
                              </Button>
                            )}

                            {isSelfAssigned ? (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={isLoading}
                                  onClick={() => handleOpenRequestPreview(task)}
                                  className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl border-purple-500/40 text-purple-700 dark:text-purple-300 hover:bg-purple-500/10 font-semibold text-xs shadow-sm h-8 px-3"
                                  title="Ajukan preview hasil revisi ke reviewer"
                                >
                                  <Eye className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                                  <span>Request Preview</span>
                                </Button>

                                <Button
                                  size="sm"
                                  disabled={isLoading}
                                  onClick={() => handleDoneTask(task.id)}
                                  className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm h-8 px-3.5 border-0"
                                  title="Tandai revisi selesai dan selesaikan task"
                                >
                                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  <span>Done</span>
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleOpenDeliverModal(task)}
                                className="shrink-0 whitespace-nowrap min-w-fit gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm h-8 px-3.5 border-0"
                              >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                                <span>Deliver Revisi</span>
                              </Button>
                            )}
                          </div>
                        )}

                        {/* State 4: In Review */}
                        {task.status === "In Review" && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-3 py-1.5 rounded-xl border border-purple-500/20 shrink-0">
                            <Eye className="h-3.5 w-3.5" />
                            <span>
                              {isSelfAssigned && task.reviewer
                                ? `Reviewer: ${task.reviewer.name}`
                                : "Menunggu Review"}
                            </span>
                          </div>
                        )}

                        {/* State 5: Done */}
                        {task.status === "Done" && (
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-xl shrink-0">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span>Selesai & Diarsip</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab: Review Requests (Permintaan Preview dari Staf) */}
        <TabsContent value="reviews" className="space-y-4">
          <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Eye className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm">
                  Review Requests Hub
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Daftar permintaan preview hasil kerja rekan tim. Berikan persetujuan untuk menyelesaikan task (<strong>Approve & Selesai</strong>) atau kirimkan catatan perbaikan (<strong>Minta Revisi</strong>).
                </p>
              </div>
            </div>
            <span className="font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20 whitespace-nowrap self-start sm:self-auto">
              {filteredReviewRequests.length} Permintaan Review
            </span>
          </div>

          {filteredReviewRequests.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/40">
              <Eye className="h-10 w-10 text-purple-500/70 mx-auto" />
              <h3 className="text-base font-bold text-foreground">Tidak ada permintaan preview</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Saat ini belum ada tugas yang ditujukan kepada Anda untuk direview, atau tidak ada yang sesuai dengan filter yang dipilih.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredReviewRequests.map((task) => {
                const isReviewPhase = task.status === "In Review";
                const isRevisionPhase = task.status === "Revision" || task.currentPhase === "REVISION";
                const isLoading = actionLoadingId === task.id;
                const activeRevision = task.revisions?.find((r) => r.round === task.currentRevisionRound);
                const nextRevisionRound = (task.currentRevisionRound || 0) + 1;
                const showRevisionForm = openRevisionFormId === task.id;

                return (
                  <Card
                    key={task.id}
                    id={`task-${task.id}`}
                    className={`flex flex-col justify-between border border-border/70 hover:border-purple-500/50 bg-card/90 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md card-hover-lift rounded-2xl overflow-hidden scroll-mt-28 ${
                      highlightedTaskId === task.id ? "ring-2 ring-purple-600 dark:ring-purple-400 shadow-xl scale-[1.01]" : ""
                    }`}
                  >
                    <div>
                      {/* Top Context & Dominant Title Bar */}
                      <div className="p-4 pb-3 border-b border-border/40 bg-secondary/15 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {task.project ? (
                            <Link
                              href={`/projects/${task.project.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/25 truncate transition-colors"
                              title="Buka Hub Proyek"
                            >
                              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {task.project.code} • {task.project.clientName}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full font-medium">
                              Operasional Internal
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(task.status, task.currentRevisionRound)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>

                        {/* Title: Big, bold & focused */}
                        <h3 className="text-base font-bold tracking-tight text-foreground leading-snug">
                          {task.title}
                        </h3>

                        {/* Specialist / Worker Profile Badge */}
                        <div className="rounded-xl border border-border/60 bg-secondary/50 p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 ring-1 ring-purple-500/30">
                              <AvatarImage src={task.user.avatarUrl || ""} />
                              <AvatarFallback className="text-[10px] bg-purple-500/10 text-purple-600 font-bold">
                                {task.user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                                <span>{task.user.name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({task.user.department})
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {task.user.position}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] uppercase font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-md shrink-0 border border-purple-500/20">
                            Pemohon Preview
                          </span>
                        </div>
                      </div>

                      {/* Card Content: Request Description & Brief */}
                      <div className="p-4 space-y-3">
                        {/* WADAH CATATAN / DESKRIPSI REQUEST PREVIEW */}
                        <div className="rounded-xl border border-purple-500/30 bg-purple-500/[0.06] p-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare className="h-3.5 w-3.5" />
                              <span>Catatan Request Preview:</span>
                            </span>
                            <Badge variant="purple" className="text-[10px]">Preview Request</Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-foreground bg-card/90 p-2.5 rounded-lg border border-purple-500/20 font-medium whitespace-pre-line">
                            {task.previewDescription ? (
                              task.previewDescription
                            ) : (
                              <span className="text-muted-foreground italic">Tidak ada catatan instruksi khusus dari pemohon.</span>
                            )}
                          </p>
                        </div>

                        {/* BRIEF ASLI TASK (Dapat di-expand) */}
                        {(() => {
                          const isBriefLong = Boolean(
                            task.description && (task.description.length > 100 || task.description.includes("\n"))
                          );
                          const isBriefExpanded = Boolean(expandedBriefIds[task.id]);

                          return (
                            <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-foreground gap-2">
                                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px] text-muted-foreground">
                                  <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                                  <span>Brief Awal Task</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  {task.estimatedHours && (
                                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> {task.estimatedHours}h
                                    </span>
                                  )}
                                  {isBriefLong && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleBriefExpand(task.id)}
                                      className="h-6 px-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 gap-1 rounded-md"
                                      title={isBriefExpanded ? "Ciutkan Brief" : "Buka Brief Lengkap"}
                                    >
                                      <span>{isBriefExpanded ? "Ciutkan" : "Brief"}</span>
                                      {isBriefExpanded ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {task.description ? (
                                <div>
                                  <p
                                    className={`text-xs text-foreground/90 leading-relaxed font-normal whitespace-pre-line transition-all duration-200 ${
                                      !isBriefExpanded && isBriefLong ? "line-clamp-2" : ""
                                    }`}
                                  >
                                    {task.description}
                                  </p>
                                  {isBriefLong && (
                                    <button
                                      type="button"
                                      onClick={() => toggleBriefExpand(task.id)}
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-1 transition-colors group"
                                    >
                                      <span>{isBriefExpanded ? "Sembunyikan" : "Baca brief selengkapnya..."}</span>
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Belum ada brief awal khusus.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* IN REVIEW CONTROLS (Approve & Selesai vs Minta Revisi) */}
                        {isReviewPhase && (
                          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3.5 space-y-3 animate-fade-up">
                            <div className="flex items-center justify-between text-xs font-bold text-purple-700 dark:text-purple-300">
                              <span>🔍 Menunggu Tindakan Review Anda</span>
                              <span className="text-[10px] uppercase font-mono">Perlu Review</span>
                            </div>

                            {/* 2 Decision Buttons: Approve & Selesai vs Minta Revisi */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleApproveTask(task.id)}
                                className="flex-1 min-w-[140px] shrink-0 whitespace-nowrap gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 text-white font-semibold text-xs shadow-sm h-9 px-3 border-0"
                                title="Setujui hasil kerja dan tandai task resmi selesai"
                              >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                <span>Approve & Selesai</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => setOpenRevisionFormId(showRevisionForm ? null : task.id)}
                                className="flex-1 min-w-[140px] shrink-0 whitespace-nowrap gap-1.5 rounded-xl border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold text-xs h-9 px-3"
                                title="Tolak preview dan minta revisi dengan catatan"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{showRevisionForm ? "Tutup Form" : `Minta Revisi #${nextRevisionRound}`}</span>
                              </Button>
                            </div>

                            {/* KOLOM REVISI (Form Input Catatan Revisi) */}
                            {showRevisionForm && (
                              <div className="pt-2 border-t border-purple-500/20 space-y-2 animate-fade-up">
                                <Label htmlFor={`feedback-${task.id}`} className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                  <span>Catatan Revisi untuk {task.user.name}:</span>
                                </Label>
                                <Textarea
                                  id={`feedback-${task.id}`}
                                  placeholder="Tuliskan poin-poin yang perlu direvisi/disesuaikan oleh pembuat task..."
                                  rows={2}
                                  value={revisionInputs[task.id] || ""}
                                  onChange={(e) => setRevisionInputs({ ...revisionInputs, [task.id]: e.target.value })}
                                  className="rounded-xl text-xs bg-card"
                                />
                                <Button
                                  size="sm"
                                  disabled={isLoading || !revisionInputs[task.id]?.trim()}
                                  onClick={() => handleRequestRevision(task.id)}
                                  className="w-full gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm"
                                >
                                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                  <span>Kirim Revisi ke {task.user.name}</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ACTIVE REVISION STATUS BANNER */}
                        {isRevisionPhase && (
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Sedang dalam pengerjaan Revisi #{task.currentRevisionRound} oleh {task.user.name}</span>
                            </span>
                          </div>
                        )}

                        {/* STATUS DONE BANNER */}
                        {task.status === "Done" && (
                          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Task telah disetujui & berstatus Selesai (Done)</span>
                            </span>
                          </div>
                        )}

                        {/* EXPANDED TIMER REKAP DATA BREAKDOWN (Toggled from footer) */}
                        {expandedRecapId === task.id && (
                          <TaskRecapBreakdown task={task as any} />
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Pill Timer, Deadline, & Actions */}
                    <div className="p-4 bg-secondary/25 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <TaskTimerPill
                          timerActive={task.timerActive}
                          timerStartedAt={task.timerStartedAt}
                          totalSeconds={task.totalSeconds}
                        />

                        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-card/60 px-2.5 py-1 rounded-xl border border-border/40">
                          <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-foreground">{formatDate(task.dueDate)}</span>
                        </div>

                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2 rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedRecapId(expandedRecapId === task.id ? null : task.id)}
                          title="Lihat rincian waktu"
                        >
                          <History className="h-3 w-3" />
                          <span>Rekap</span>
                          {expandedRecapId === task.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Status summary pill */}
                      <div className="self-end sm:self-auto">
                        {task.status === "In Review" && (
                          <span className="text-[11px] font-bold text-purple-700 dark:text-purple-300 bg-purple-500/10 px-2.5 py-1 rounded-xl border border-purple-500/20">
                            Menunggu Review Anda
                          </span>
                        )}
                        {task.status === "Revision" && (
                          <span className="text-[11px] font-bold text-rose-700 dark:text-rose-300 bg-rose-500/10 px-2.5 py-1 rounded-xl border border-rose-500/20">
                            Sedang Disesuaikan
                          </span>
                        )}
                        {task.status === "Done" && (
                          <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-xl border border-emerald-500/20">
                            Disetujui
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Deliver by Me (Delegated Tasks to Other Staff + KOLOM REVISI) */}
        <TabsContent value="delivered" className="space-y-4">
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="h-8 w-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Send className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-foreground text-sm">
                  Deliver by Me Hub
                </span>
                <p className="text-[11px] text-muted-foreground">
                  Pantau progres pengerjaan staf, timer pengerjaan, approve deliverable, atau masukkan catatan ke <strong>Kolom Revisi</strong>.
                </p>
              </div>
            </div>
            <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 whitespace-nowrap self-start sm:self-auto">
              {delegatedTasks.length} Delegated Tasks Total
            </span>
          </div>

          {filteredDelegatedTasks.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/40">
              <Send className="h-10 w-10 text-blue-500/70 mx-auto" />
              <h3 className="text-base font-bold text-foreground">No delegated tasks found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You haven&apos;t delivered any tasks to other staff specialists yet, or none match the selected filter.
              </p>
              <Button
                onClick={() => setCreateOpen(true)}
                size="sm"
                className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 shadow-sm"
              >
                <Plus className="h-4 w-4" />
                <span>Deliver a Task to Staf</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredDelegatedTasks.map((task) => {
                const isWorking = task.timerActive;
                const isReviewPhase = task.status === "In Review";
                const isRevisionPhase = task.status === "Revision";
                const isLoading = actionLoadingId === task.id;
                const activeRevision = task.revisions?.find((r) => r.round === task.currentRevisionRound);
                const nextRevisionRound = (task.currentRevisionRound || 0) + 1;
                const showRevisionForm = openRevisionFormId === task.id;

                return (
                  <Card
                    key={task.id}
                    id={`task-${task.id}`}
                    className={`flex flex-col justify-between border border-border/70 hover:border-blue-500/50 bg-card/90 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md card-hover-lift rounded-2xl overflow-hidden scroll-mt-28 ${
                      highlightedTaskId === task.id ? "ring-2 ring-blue-600 dark:ring-blue-400 shadow-xl scale-[1.01]" : ""
                    }`}
                  >
                    <div>
                      {/* Top Context & Dominant Title Bar */}
                      <div className="p-4 pb-3 border-b border-border/40 bg-secondary/15 space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {task.project ? (
                            <Link
                              href={`/projects/${task.project.id}`}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/25 truncate transition-colors"
                              title="Buka Hub Proyek"
                            >
                              <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate max-w-[160px]">
                                {task.project.code} • {task.project.clientName}
                              </span>
                            </Link>
                          ) : (
                            <span className="text-xs text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full font-medium">
                              Operasional Internal
                            </span>
                          )}

                          <div className="flex items-center gap-1.5">
                            {getStatusBadge(task.status, task.currentRevisionRound)}
                            {getPriorityBadge(task.priority)}
                          </div>
                        </div>

                        {/* Title: Big, bold & focused */}
                        <h3 className="text-base font-bold tracking-tight text-foreground leading-snug">
                          {task.title}
                        </h3>

                        {/* Assigned Specialist PIC Badge */}
                        <div className="rounded-xl border border-border/60 bg-secondary/50 p-2 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <Avatar className="h-6 w-6 ring-1 ring-blue-500/30">
                              <AvatarImage src={task.user.avatarUrl || ""} />
                              <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600 font-bold">
                                {task.user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-foreground truncate flex items-center gap-1">
                                <span>{task.user.name}</span>
                                <span className="text-[10px] text-muted-foreground font-normal">
                                  ({task.user.department})
                                </span>
                              </div>
                              <p className="text-[10px] text-muted-foreground truncate">
                                {task.user.position}
                              </p>
                            </div>
                          </div>

                          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md shrink-0">
                            Penerima Task
                          </span>
                        </div>
                      </div>

                      {/* Card Content: Brief & Work Instructions */}
                      <div className="p-4 space-y-3">
                        {/* WADAH BRIEF KHUSUS DENGAN COLLAPSE / EXPAND ICON */}
                        {(() => {
                          const isBriefLong = Boolean(
                            task.description && (task.description.length > 100 || task.description.includes("\n"))
                          );
                          const isBriefExpanded = Boolean(expandedBriefIds[task.id]);

                          return (
                            <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] p-3 space-y-2">
                              <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 gap-2">
                                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                  <FileSpreadsheet className="h-3.5 w-3.5" />
                                  <span>Brief & Instruksi</span>
                                </span>
                                <div className="flex items-center gap-2">
                                  {task.estimatedHours && (
                                    <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" /> {task.estimatedHours}h
                                    </span>
                                  )}
                                  {isBriefLong && (
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => toggleBriefExpand(task.id)}
                                      className="h-6 px-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 gap-1 rounded-md"
                                      title={isBriefExpanded ? "Ciutkan Brief" : "Buka Brief Lengkap"}
                                    >
                                      <span>{isBriefExpanded ? "Ciutkan" : "Brief"}</span>
                                      {isBriefExpanded ? (
                                        <ChevronUp className="h-3.5 w-3.5" />
                                      ) : (
                                        <ChevronDown className="h-3.5 w-3.5" />
                                      )}
                                    </Button>
                                  )}
                                </div>
                              </div>

                              {task.description ? (
                                <div>
                                  <p
                                    className={`text-sm text-foreground/90 leading-relaxed font-normal whitespace-pre-line transition-all duration-200 ${
                                      !isBriefExpanded && isBriefLong ? "line-clamp-2" : ""
                                    }`}
                                  >
                                    {task.description}
                                  </p>
                                  {isBriefLong && (
                                    <button
                                      type="button"
                                      onClick={() => toggleBriefExpand(task.id)}
                                      className="inline-flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold mt-1.5 transition-colors group"
                                    >
                                      <span>{isBriefExpanded ? "Sembunyikan sebagian" : "Baca brief selengkapnya..."}</span>
                                      {isBriefExpanded ? (
                                        <ChevronUp className="h-3 w-3 group-hover:-translate-y-0.5 transition-transform" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 group-hover:translate-y-0.5 transition-transform" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground italic">
                                  Belum ada instruksi brief tertulis khusus untuk tugas ini.
                                </p>
                              )}
                            </div>
                          );
                        })()}

                        {/* IN REVIEW CONTROLS (Approve vs Minta Revisi) */}
                        {isReviewPhase && (
                          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-3.5 space-y-3 animate-fade-up">
                            <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300">
                              <span>🚀 Staf Telah Deliver Task!</span>
                              <span className="text-[10px] uppercase font-mono">Perlu Review</span>
                            </div>

                            {task.previewDescription && (
                              <div className="rounded-xl border border-blue-500/20 bg-card/90 p-3 text-xs space-y-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                                  <MessageSquare className="h-3 w-3" />
                                  <span>Catatan Deliver dari Staf:</span>
                                </span>
                                <p className="text-foreground font-medium whitespace-pre-line italic">
                                  &ldquo;{task.previewDescription}&rdquo;
                                </p>
                              </div>
                            )}

                            {/* 2 Decision Buttons: Approve vs Minta Revisi */}
                            <div className="flex items-center gap-2 flex-wrap">
                              <Button
                                size="sm"
                                disabled={isLoading}
                                onClick={() => handleApproveTask(task.id)}
                                className="flex-1 min-w-[140px] shrink-0 whitespace-nowrap gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm h-9 px-3 border-0"
                              >
                                {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                <span>✓ Approve & Selesai</span>
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isLoading}
                                onClick={() => setOpenRevisionFormId(showRevisionForm ? null : task.id)}
                                className="flex-1 min-w-[140px] shrink-0 whitespace-nowrap gap-1.5 rounded-xl border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 font-semibold text-xs h-9 px-3"
                              >
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>{showRevisionForm ? "Tutup Form" : `Minta Revisi #${nextRevisionRound}`}</span>
                              </Button>
                            </div>

                            {/* KOLOM REVISI (Form Input Catatan Revisi) */}
                            {showRevisionForm && (
                              <div className="pt-2 border-t border-blue-500/20 space-y-2 animate-fade-up">
                                <Label htmlFor={`feedback-${task.id}`} className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                  <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                                  <span>Kolom Catatan Revisi #{nextRevisionRound}:</span>
                                </Label>
                                <Textarea
                                  id={`feedback-${task.id}`}
                                  placeholder="Tuliskan poin-poin yang perlu direvisi oleh staf (misal: warna font, posisi logo, ukuran aset)..."
                                  rows={2}
                                  value={revisionInputs[task.id] || ""}
                                  onChange={(e) => setRevisionInputs({ ...revisionInputs, [task.id]: e.target.value })}
                                  className="rounded-xl text-xs bg-card"
                                />
                                <Button
                                  size="sm"
                                  disabled={isLoading || !revisionInputs[task.id]?.trim()}
                                  onClick={() => handleRequestRevision(task.id)}
                                  className="w-full gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs shadow-sm"
                                >
                                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                  <span>Kirim Catatan Revisi #{nextRevisionRound} ke Staf</span>
                                </Button>
                              </div>
                            )}
                          </div>
                        )}

                        {/* ACTIVE REVISION STATUS BANNER */}
                        {isRevisionPhase && (
                          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between">
                            <span className="flex items-center gap-1.5 font-semibold">
                              <AlertTriangle className="h-3.5 w-3.5" />
                              <span>Sedang dalam pengerjaan Revisi #{task.currentRevisionRound} oleh staf</span>
                            </span>
                          </div>
                        )}

                        {/* EXPANDED TIMER REKAP DATA BREAKDOWN (Toggled from footer) */}
                        {expandedRecapId === task.id && (
                          <TaskRecapBreakdown task={task as any} />
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Compact Pill Timer & Action Bar */}
                    <div className="p-4 bg-secondary/25 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      {/* Left: Compact Timer & Deadline Pill */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Compact Pill Timer (Isolasi internal timer, 0 root re-renders) */}
                        <TaskTimerPill
                          timerActive={task.timerActive}
                          timerStartedAt={task.timerStartedAt}
                          totalSeconds={task.totalSeconds}
                        />

                        {/* Deadline pill */}
                        <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-card/60 px-2.5 py-1 rounded-xl border border-border/40">
                          <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                          <span className="font-medium text-foreground">{formatDate(task.dueDate)}</span>
                          <span className="text-[10px]">({formatRelativeDays(task.dueDate)})</span>
                        </div>

                        {/* Recap toggle */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2 rounded-lg text-muted-foreground hover:text-foreground"
                          onClick={() => setExpandedRecapId(expandedRecapId === task.id ? null : task.id)}
                          title="Lihat rincian waktu"
                        >
                          <History className="h-3 w-3" />
                          <span>Rekap</span>
                          {expandedRecapId === task.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        </Button>
                      </div>

                      {/* Right: Edit & Delete Actions */}
                      <div className="flex items-center gap-1 self-end sm:self-auto">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                          onClick={() => setEditTask(task as any)}
                          title="Edit Delegated Task"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                          onClick={() => handleDeleteTask(task.id)}
                          title="Delete Task"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Tab 3: All Tasks (Khusus Admin / Project Manager) */}
        {isAdminOrPM && (
          <TabsContent value="all-tasks" className="space-y-4">
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4 text-xs text-muted-foreground flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Briefcase className="h-4 w-4" />
                </div>
                <div>
                  <span className="font-bold text-foreground text-sm">
                    All Project Tasks Hub (Admin & Project Manager)
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    Memantau seluruh task di agensi: penerima task (PIC), pengirim task, durasi pengerjaan, dan progres status.
                  </p>
                </div>
              </div>
              <span className="font-bold text-blue-700 dark:text-blue-300 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20 whitespace-nowrap self-start sm:self-auto">
                {filteredAllTasks.length} Tasks Ditampilkan
              </span>
            </div>

            {filteredAllTasks.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/40">
                <Briefcase className="h-10 w-10 text-blue-500/70 mx-auto" />
                <h3 className="text-base font-bold text-foreground">
                  {selectedDateFilter
                    ? `Tidak ada task pada tanggal ${formatDisplayDate(selectedDateFilter)}`
                    : statusFilter !== "ALL"
                    ? `Tidak ada task dengan status "${statusFilter}"`
                    : "Belum ada task dalam sistem"}
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  {selectedDateFilter || statusFilter !== "ALL"
                    ? "Coba sesuaikan filter status atau tanggal di toolbar atas."
                    : "Task dari seluruh project akan otomatis terdata di sini."}
                </p>
                {(selectedDateFilter || statusFilter !== "ALL") && (
                  <Button
                    onClick={() => {
                      setStatusFilter("ALL");
                      setSelectedDateFilter("");
                    }}
                    size="sm"
                    variant="outline"
                    className="rounded-xl text-xs gap-1.5 font-semibold"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Reset Filter</span>
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredAllTasks.map((task) => {
                  const isWorking = task.timerActive;
                  const isReviewPhase = task.status === "In Review";
                  const isRevisionPhase = task.status === "Revision";
                  const isLoading = actionLoadingId === task.id;
                  const activeRevision = task.revisions?.find((r) => r.round === task.currentRevisionRound);
                  const isBriefLong = Boolean(
                    task.description && (task.description.length > 100 || task.description.includes("\n"))
                  );
                  const isBriefExpanded = Boolean(expandedBriefIds[task.id]);

                  // Hitung estimasi persentase progres status
                  let progressPct = 15;
                  if (task.status === "Done") progressPct = 100;
                  else if (task.status === "In Review") progressPct = 85;
                  else if (task.status === "Revision") progressPct = 65;
                  else if (task.status === "On Progress") progressPct = 45;

                  const liveTotalSec = computeLiveTaskSecondsOnDemand(task);

                  return (
                    <Card
                      key={task.id}
                      id={`task-${task.id}`}
                      className={`flex flex-col justify-between border border-border/70 hover:border-blue-500/50 bg-card/90 backdrop-blur-md transition-all duration-300 shadow-sm hover:shadow-md card-hover-lift rounded-2xl overflow-hidden scroll-mt-28 ${
                        highlightedTaskId === task.id ? "ring-2 ring-blue-600 dark:ring-blue-400 shadow-xl scale-[1.01]" : ""
                      }`}
                    >
                      <div>
                        {/* Top Context & Project Bar */}
                        <div className="p-4 pb-3 border-b border-border/40 bg-secondary/15 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            {task.project ? (
                              <Link
                                href={`/projects/${task.project.id}`}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 dark:text-blue-300 hover:text-blue-600 bg-blue-500/10 hover:bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-500/25 truncate transition-colors"
                                title="Buka Hub Proyek"
                              >
                                <FolderKanban className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate max-w-[160px]">
                                  {task.project.code} • {task.project.clientName}
                                </span>
                              </Link>
                            ) : (
                              <span className="text-xs text-muted-foreground bg-secondary/80 px-2.5 py-0.5 rounded-full font-medium">
                                Operasional Internal
                              </span>
                            )}

                            <div className="flex items-center gap-1.5">
                              {getStatusBadge(task.status, task.currentRevisionRound)}
                              {getPriorityBadge(task.priority)}
                            </div>
                          </div>

                          {/* Task Title */}
                          <h3 className="text-base font-bold tracking-tight text-foreground leading-snug">
                            {task.title}
                          </h3>

                          {/* Penerima (PIC) & Pengirim Task Context Box */}
                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl border border-border/60 bg-secondary/30 text-xs">
                            {/* Penerima Task (PIC) */}
                            <div className="space-y-1 min-w-0 border-r border-border/40 pr-2">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <User className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span>Penerima (PIC)</span>
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Avatar className="h-5 w-5 ring-1 ring-blue-500/20 shrink-0">
                                  <AvatarImage src={task.user?.avatarUrl || ""} />
                                  <AvatarFallback className="text-[9px] bg-blue-500/10 text-blue-600 font-bold">
                                    {task.user?.name ? task.user.name[0] : "?"}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-bold text-foreground text-xs truncate">
                                    {task.user?.name || "Belum ditentukan"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {task.user?.position || "-"}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Pengirim Task (Pemberi) */}
                            <div className="space-y-1 min-w-0 pl-1">
                              <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Send className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span>Pengirim Task</span>
                              </div>
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0 text-[9px] font-bold text-foreground">
                                  {task.createdBy?.name ? task.createdBy.name[0] : "S"}
                                </div>
                                <div className="min-w-0">
                                  <p className="font-semibold text-foreground text-xs truncate">
                                    {task.createdBy?.name || "Internal Agency"}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {task.createdBy?.position || "PM"}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Body: Progress Telemetry & Brief */}
                        <div className="p-4 space-y-3">
                          {/* Progress Telemetry Bar */}
                          <div className="space-y-1.5 p-2.5 rounded-xl border border-border/50 bg-secondary/20 text-xs">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="font-semibold text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                <span>Progres Status ({progressPct}%)</span>
                              </span>
                              <span className="font-mono font-bold text-foreground">
                                {formatStopwatch(liveTotalSec)} / {task.estimatedHours || 4}h
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${
                                  task.status === "Done"
                                    ? "bg-emerald-500"
                                    : task.status === "Revision"
                                    ? "bg-rose-500"
                                    : "bg-blue-600 dark:bg-blue-500"
                                }`}
                                style={{ width: `${progressPct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-0.5">
                              <span className="capitalize">{task.currentPhase === "REVISION" ? `Revisi Ke-${task.currentRevisionRound || 1}` : "Fase Draft Awal"}</span>
                              {task.timerActive ? (
                                <span className="text-blue-600 dark:text-blue-400 font-bold flex items-center gap-1">
                                  <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-pulse" />
                                  Sedang Berjalan
                                </span>
                              ) : (
                                <span>{task.status === "Done" ? "Selesai" : "Standby / Jeda"}</span>
                              )}
                            </div>
                          </div>

                          {/* Brief Box */}
                          <div className="rounded-xl border border-blue-500/25 bg-blue-500/[0.03] dark:bg-blue-500/[0.05] p-3 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold text-blue-700 dark:text-blue-300 gap-2">
                              <span className="flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
                                <FileSpreadsheet className="h-3.5 w-3.5" />
                                <span>Brief & Instruksi</span>
                              </span>
                              {isBriefLong && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleBriefExpand(task.id)}
                                  className="h-6 px-1.5 text-[11px] font-semibold text-blue-700 dark:text-blue-300 hover:bg-blue-500/15 gap-1 rounded-md"
                                  title={isBriefExpanded ? "Ciutkan Brief" : "Buka Brief Lengkap"}
                                >
                                  <span>{isBriefExpanded ? "Ciutkan" : "Brief"}</span>
                                  {isBriefExpanded ? (
                                    <ChevronUp className="h-3.5 w-3.5" />
                                  ) : (
                                    <ChevronDown className="h-3.5 w-3.5" />
                                  )}
                                </Button>
                              )}
                            </div>

                            {task.description ? (
                              <p className={`text-xs text-foreground/90 leading-relaxed font-normal whitespace-pre-line ${
                                !isBriefExpanded && isBriefLong ? "line-clamp-2" : ""
                              }`}>
                                {task.description}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground italic">
                                Belum ada instruksi brief tertulis khusus.
                              </p>
                            )}
                          </div>

                          {/* REVISION ALERT BOX (If in Revision state) */}
                          {isRevisionPhase && activeRevision && (
                            <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 space-y-1.5 text-xs animate-fade-up">
                              <div className="flex items-center justify-between font-bold text-rose-700 dark:text-rose-300 text-xs">
                                <span className="flex items-center gap-1">
                                  <AlertTriangle className="h-3.5 w-3.5" />
                                  <span>Revisi #{activeRevision.round}</span>
                                </span>
                                <Badge variant="destructive" className="text-[10px] uppercase font-bold py-0">Sedang Direvisi</Badge>
                              </div>
                              <p className="text-xs text-foreground bg-card/90 p-2 rounded-lg border border-rose-500/20 font-medium whitespace-pre-line">
                                &ldquo;{activeRevision.feedback}&rdquo;
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Footer: Deadline, Quick Approve/Revision, Edit & Delete */}
                      <div className="p-3.5 sm:p-4 bg-secondary/25 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="inline-flex items-center gap-1 text-[11px] text-muted-foreground bg-card/60 px-2.5 py-1 rounded-xl border border-border/40">
                            <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                            <span className="font-medium text-foreground">{formatDate(task.dueDate)}</span>
                            <span className="text-[10px]">({formatRelativeDays(task.dueDate)})</span>
                          </div>
                        </div>

                        {/* PM Actions */}
                        <div className="flex items-center gap-1.5 self-end sm:self-auto">
                          {isReviewPhase && (
                            <Button
                              size="sm"
                              disabled={isLoading}
                              onClick={() => handleApproveTask(task.id)}
                              className="h-8 text-xs font-semibold px-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white gap-1 border-0"
                            >
                              <Check className="h-3.5 w-3.5" />
                              <span>Approve</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
                            onClick={() => setEditTask(task as any)}
                            title="Edit / Reassign Task (Admin/PM)"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-500/10"
                            onClick={() => handleDeleteTask(task.id)}
                            title="Hapus Task (Admin/PM)"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>

      {/* Workspace Analytics & Capacity Flow Section */}
      <div className="pt-8 border-t border-border/60 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <span>Workspace Analytics & Capacity Flow</span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Workload distribution, burndown velocity, and specialist capacity telemetry
            </p>
          </div>
        </div>

        {/* 5 KPI Cards Strip (FinEdge Reference Style) */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Metric 1: My Active Tasks */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-4 card-hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                My Active Tasks
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Layers className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.activeCount}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-3 w-3" />
                <span>Assigned to me</span>
              </div>
            </div>
          </div>

          {/* Metric 2: On Progress */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-4 card-hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                On Progress
              </span>
              <div className="h-9 w-9 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.inProgressCount}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-cyan-600 dark:text-cyan-400">
                <Activity className="h-3 w-3" />
                <span>In active flow</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Deliver by Me (Delegated Tasks) */}
          <div className="rounded-2xl border border-blue-500/30 bg-card/85 backdrop-blur-md p-4 card-hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                Deliver by Me
              </span>
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Send className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {delegatedTasks.length}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                <Sparkles className="h-3 w-3" />
                <span>Given to other staff</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Archive (Done) */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-4 card-hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Delivered (Done)
              </span>
              <div className="h-9 w-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.archivedCount}
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span>Completed archive</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Est. Workload */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-4 card-hover-lift col-span-2 lg:col-span-1 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Est. Hours
              </span>
              <div className="h-9 w-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Briefcase className="h-4 w-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                {stats.totalHours} <span className="text-base font-normal text-muted-foreground">hrs</span>
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
                <span>Capacity allocation</span>
              </div>
            </div>
          </div>
        </div>

        {/* Middle Interactive Section: Workload Velocity Chart & Interactive Calendar Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Workload Velocity Chart */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-6 card-hover-lift flex flex-col justify-between">
            <div className="flex items-center justify-between pb-4 border-b border-border/40">
              <div>
                <h2 className="text-base font-bold text-foreground">
                  Workload Velocity & Deliverable Flow
                </h2>
                <p className="text-xs text-muted-foreground">
                  Task burn-down pace across active projects
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs px-2.5 py-1 rounded-full bg-secondary font-medium text-foreground">
                  This Sprint
                </span>
              </div>
            </div>

            <div className="relative pt-6 pb-2">
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <span className="text-3xl font-black text-foreground">
                    {stats.totalHours} hrs
                  </span>
                  <span className="ml-2 text-xs font-semibold text-blue-600 dark:text-blue-400 inline-flex items-center gap-0.5">
                    <TrendingUp className="h-3 w-3" /> +14.2% vs last cycle
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  Optimal Peak: 40 hrs/wk
                </div>
              </div>

              <svg viewBox="0 0 500 160" className="w-full h-40 overflow-visible" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="velocityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563EB" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#2563EB" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="4 4" />
                <line x1="0" y1="80" x2="500" y2="80" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="4 4" />
                <line x1="0" y1="130" x2="500" y2="130" stroke="currentColor" strokeOpacity="0.07" strokeDasharray="4 4" />

                <path
                  d="M 0,140 C 70,120 130,50 200,75 C 270,100 330,30 400,45 C 450,55 480,25 500,20 L 500,160 L 0,160 Z"
                  fill="url(#velocityGradient)"
                />

                <path
                  d="M 0,140 C 70,120 130,50 200,75 C 270,100 330,30 400,45 C 450,55 480,25 500,20"
                  fill="none"
                  stroke="#2563EB"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  className="transition-all duration-500"
                />

                <g transform="translate(400, 45)">
                  <circle r="7" fill="#2563EB" className="animate-ping opacity-30" />
                  <circle r="5" fill="#2563EB" stroke="#ffffff" strokeWidth="2" />
                </g>
              </svg>

              <div className="flex justify-between text-[11px] font-medium text-muted-foreground pt-2">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Today</span>
              </div>
            </div>
          </div>

          {/* Right: Interactive Calendar Widget (Directly beside Workload Velocity) */}
          <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-6 card-hover-lift flex flex-col justify-between">
            <div>
              {/* Calendar Header with Navigation */}
              <div className="flex items-center justify-between pb-3 border-b border-border/40 gap-2">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                    <CalendarDays className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-foreground">
                      Kalender Task & Jadwal
                    </h2>
                    <p className="text-[11px] text-muted-foreground">
                      Klik tanggal untuk melihat task
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCalendarMonthDate(
                        new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1)
                      );
                    }}
                    title="Bulan sebelumnya"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>

                  <span className="text-xs font-bold text-foreground min-w-[95px] text-center capitalize">
                    {calendarMonthDate.toLocaleDateString("id-ID", {
                      month: "short",
                      year: "numeric",
                    })}
                  </span>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setCalendarMonthDate(
                        new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1)
                      );
                    }}
                    title="Bulan berikutnya"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 text-[11px] px-2 rounded-lg ml-0.5 font-semibold text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                    onClick={() => {
                      const today = new Date();
                      setCalendarMonthDate(today);
                      setCalendarSelectedDate(toDateKey(today));
                    }}
                  >
                    Hari Ini
                  </Button>
                </div>
              </div>

              {/* Weekday Names */}
              <div className="grid grid-cols-7 gap-1 pt-3 pb-1 text-center text-[11px] font-bold text-muted-foreground">
                {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((dayName) => (
                  <div key={dayName} className="py-1">
                    {dayName}
                  </div>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {/* Empty cells for leading offset */}
                {Array.from({ length: calendarFirstDayOffset }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-8 w-full" />
                ))}

                {/* Days of the month */}
                {Array.from({ length: calendarDaysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                  const isToday = toDateKey(new Date()) === dateKey;
                  const isSelected = calendarSelectedDate === dateKey;
                  const dayTasks = tasksByDateMap[dateKey] || [];
                  const taskCount = dayTasks.length;

                  return (
                    <button
                      key={dateKey}
                      type="button"
                      onClick={() => {
                        setCalendarSelectedDate(isSelected ? null : dateKey);
                      }}
                      className={`h-8 sm:h-8.5 w-full rounded-xl flex flex-col items-center justify-center relative text-xs transition-all duration-150 ${
                        isSelected
                          ? "bg-blue-600 dark:bg-blue-500 text-white font-bold shadow-md scale-105 z-10"
                          : isToday
                          ? "border border-blue-500/60 bg-blue-500/10 font-bold text-blue-600 dark:text-blue-400"
                          : taskCount > 0
                          ? "bg-secondary/70 hover:bg-secondary text-foreground font-semibold"
                          : "hover:bg-secondary/40 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <span>{dayNum}</span>
                      {taskCount > 0 && (
                        <span
                          className={`absolute bottom-0.5 h-1 w-1 rounded-full ${
                            isSelected ? "bg-white" : "bg-blue-600 dark:bg-blue-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Date Task List Detail View */}
            <div className="mt-4 pt-3 border-t border-border/40">
              {calendarSelectedDate ? (
                <div className="space-y-2 animate-fade-up">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 font-bold text-foreground">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>{formatDisplayDate(calendarSelectedDate)}</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-400 font-bold">
                        {calendarSelectedDayTasks.length} Task
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 text-[11px] px-2 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 font-semibold"
                        onClick={() => {
                          setSelectedDateFilter(calendarSelectedDate);
                          const el = document.getElementById("task-board");
                          if (el) el.scrollIntoView({ behavior: "smooth" });
                        }}
                      >
                        Filter di Board
                      </Button>
                      <button
                        type="button"
                        onClick={() => setCalendarSelectedDate(null)}
                        className="text-muted-foreground hover:text-foreground p-0.5 rounded-md"
                        title="Tutup detail tanggal"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {calendarSelectedDayTasks.length === 0 ? (
                    <div className="p-3 text-center text-xs text-muted-foreground bg-secondary/30 rounded-xl">
                      Tidak ada task yang dijadwalkan pada tanggal ini.
                    </div>
                  ) : (
                    <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                      {calendarSelectedDayTasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-2.5 rounded-xl border border-border/60 bg-secondary/25 hover:bg-secondary/50 transition-colors flex items-center justify-between gap-2 text-xs"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {getStatusBadge(task.status, (task as any).currentRevisionRound)}
                              {getPriorityBadge(task.priority)}
                              {task.project && (
                                <span className="text-[10px] text-muted-foreground font-medium truncate max-w-[130px]">
                                  {task.project.code}
                                </span>
                              )}
                            </div>
                            <p className="font-bold text-foreground truncate">
                              {task.title}
                            </p>
                            <div className="text-[10px] text-muted-foreground flex items-center gap-2">
                              {toDateKey(task.dueDate) === calendarSelectedDate && (
                                <span className="text-blue-600 dark:text-blue-400 font-semibold">
                                  📌 Deadline
                                </span>
                              )}
                              {toDateKey(task.createdAt) === calendarSelectedDate && (
                                <span>📝 Dibuat</span>
                              )}
                              {toDateKey(task.completedAt) === calendarSelectedDate && (
                                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                                  ✅ Selesai
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-between text-xs text-muted-foreground bg-secondary/20 p-2.5 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Pilih tanggal pada kalender untuk melihat task harian</span>
                  </div>
                  <span className="text-[10px] font-medium text-foreground">
                    {Object.keys(tasksByDateMap).length} hari aktif
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Task Status Breakdown Donut Chart */}
        <div className="rounded-2xl border border-border/60 bg-card/85 backdrop-blur-md p-6 card-hover-lift">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-border/40 gap-2">
            <div>
              <h2 className="text-base font-bold text-foreground">Task Status Breakdown</h2>
              <p className="text-xs text-muted-foreground">Distribution of active & archived work</p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-secondary text-foreground self-start sm:self-auto">
              Total {totalTasks} Tasks
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-4">
            <div className="flex items-center justify-center my-auto py-2">
              <div className="relative flex items-center justify-center">
                <svg className="h-36 w-36 -rotate-90 transform" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="currentColor"
                    strokeOpacity="0.08"
                    strokeWidth="12"
                    fill="none"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#2563EB"
                    strokeWidth="12"
                    strokeDasharray={`${strokeProgress} ${c}`}
                    strokeDashoffset="0"
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700 ease-out"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#f59e0b"
                    strokeWidth="12"
                    strokeDasharray={`${strokeTodo} ${c}`}
                    strokeDashoffset={`-${strokeProgress}`}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700 ease-out"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#8b5cf6"
                    strokeWidth="12"
                    strokeDasharray={`${strokeInReview} ${c}`}
                    strokeDashoffset={`-${strokeProgress + strokeTodo}`}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700 ease-out"
                  />

                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    stroke="#10b981"
                    strokeWidth="12"
                    strokeDasharray={`${strokeArchived} ${c}`}
                    strokeDashoffset={`-${strokeProgress + strokeTodo + strokeInReview}`}
                    strokeLinecap="round"
                    fill="none"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-black text-foreground">{totalTasks}</span>
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Total
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground font-medium">On Progress</span>
                </div>
                <span className="font-bold text-foreground">
                  {stats.inProgressCount} ({inProgressPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                  <span className="text-muted-foreground font-medium">To Do Queue</span>
                </div>
                <span className="font-bold text-foreground">
                  {stats.todoCount} ({todoPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground font-medium">In Review / Revisi</span>
                </div>
                <span className="font-bold text-foreground">
                  {(stats.inReviewCount || 0) + (stats.revisionCount || 0)} ({inReviewPct}%)
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-secondary/30">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-muted-foreground font-medium">Completed</span>
                </div>
                <span className="font-bold text-foreground">
                  {stats.archivedCount} ({archivedPct}%)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Task Dialog */}
      {editTask && (
        <Dialog open={Boolean(editTask)} onOpenChange={() => setEditTask(null)}>
          <DialogContent className="max-w-lg rounded-2xl">
            <form onSubmit={handleEditSubmit}>
              <DialogHeader>
                <DialogTitle>Edit Task</DialogTitle>
                <DialogDescription className="text-xs">
                  Update task details, reassign, or re-link to an agency project.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="edit-title">Task Title</Label>
                  <Input
                    id="edit-title"
                    name="title"
                    defaultValue={editTask.title}
                    required
                    className="rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-assigneeId" className="text-blue-600 dark:text-blue-400 font-medium">
                    Assignee (PIC)
                  </Label>
                  <select
                    id="edit-assigneeId"
                    name="assigneeId"
                    defaultValue="KEEP"
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="KEEP">
                      Keep current assignee {("user" in editTask && editTask.user) ? `(${editTask.user.name})` : `(${user.name})`}
                    </option>
                    <option value="ME">Myself ({user.name})</option>
                    {staffMembers
                      .filter((s) => s.id !== user.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {s.position} ({s.department})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-projectId" className="text-blue-600 dark:text-blue-400 font-medium">
                    Related Project
                  </Label>
                  <select
                    id="edit-projectId"
                    name="projectId"
                    defaultValue={editTask.project?.id || "NONE"}
                    className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                  >
                    <option value="NONE">None (General Agency Internal Task)</option>
                    {projects.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.code} • {proj.name} ({proj.clientName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    name="description"
                    defaultValue={editTask.description || ""}
                    rows={3}
                    className="rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-priority">Priority</Label>
                    <select
                      id="edit-priority"
                      name="priority"
                      defaultValue={editTask.priority}
                      className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="URGENT">URGENT</option>
                      <option value="HIGH">HIGH</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="LOW">LOW</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-status">Status</Label>
                    <select
                      id="edit-status"
                      name="status"
                      defaultValue={editTask.status}
                      className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="To Do">To Do</option>
                      <option value="On Progress">On Progress</option>
                      <option value="In Review">In Review</option>
                      <option value="Revision">Revision</option>
                      <option value="Done">Done</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-dueDate">Due Date</Label>
                    <Input
                      id="edit-dueDate"
                      name="dueDate"
                      type="date"
                      className="rounded-xl"
                      defaultValue={
                        editTask.dueDate
                          ? new Date(editTask.dueDate).toISOString().split("T")[0]
                          : ""
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-estimatedHours">Est. Hours</Label>
                    <Input
                      id="edit-estimatedHours"
                      name="estimatedHours"
                      type="number"
                      step="0.5"
                      className="rounded-xl"
                      defaultValue={editTask.estimatedHours || 4}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditTask(null)}
                  className="rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white border-0 shadow-sm"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Changes</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* REQUEST PREVIEW MODAL */}
      <Dialog open={previewModalOpen} onOpenChange={setPreviewModalOpen}>
        <DialogContent className="sm:max-w-[480px] rounded-2xl border-border bg-card/95 backdrop-blur-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Eye className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Request Preview
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Pilih rekan tim (Target User) untuk me-review hasil kerja Anda sebelum task ditandai selesai.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {previewModalTask && (
            <form onSubmit={handleSubmitRequestPreview} className="space-y-4 pt-2">
              {/* Task Summary Banner */}
              <div className="p-3 rounded-xl bg-secondary/60 border border-border/50 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Tugas yang Diajukan:</span>
                <p className="font-semibold text-foreground text-sm line-clamp-1">{previewModalTask.title}</p>
                {previewModalTask.project && (
                  <p className="text-[11px] text-muted-foreground">
                    Proyek: {previewModalTask.project.code} • {previewModalTask.project.name}
                  </p>
                )}
              </div>

              {/* Field 1: User selection dropdown to assign a "Target User" (the reviewer) */}
              <div className="space-y-1.5">
                <Label htmlFor="previewTargetUserId" className="text-xs font-bold text-foreground flex items-center gap-1">
                  <span>Target User (Reviewer)</span>
                  <span className="text-rose-500">*</span>
                </Label>
                <select
                  id="previewTargetUserId"
                  value={previewTargetUserId}
                  onChange={(e) => setPreviewTargetUserId(e.target.value)}
                  required
                  className="flex h-10 w-full rounded-xl border border-input bg-card px-3 py-1 text-xs font-medium shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 text-foreground"
                >
                  <option value="" disabled>-- Pilih Reviewer (Target User) --</option>
                  {(staffMembers || [])
                    .filter((m) => m.id !== previewModalTask.userId)
                    .map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name} — {member.position || member.department} ({member.department})
                      </option>
                    ))}
                </select>
                <p className="text-[10px] text-muted-foreground">
                  Permintaan review ini akan diteruskan langsung ke dashboard Target User yang dipilih.
                </p>
              </div>

              {/* Field 2: Text area for the "Request Description" */}
              <div className="space-y-1.5">
                <Label htmlFor="previewDescription" className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span>Request Description</span>
                  <span className="text-[10px] text-muted-foreground font-normal">Catatan instruksi untuk reviewer</span>
                </Label>
                <Textarea
                  id="previewDescription"
                  value={previewDescription}
                  onChange={(e) => setPreviewDescription(e.target.value)}
                  placeholder="Tuliskan deskripsi atau hal khusus yang perlu direview (misal: link preview draft, cek komposisi layout, cek copy teks)..."
                  rows={3}
                  className="rounded-xl text-xs bg-card"
                />
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPreviewModalOpen(false)}
                  disabled={previewSubmitting}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={previewSubmitting || !previewTargetUserId}
                  className="gap-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs border-0 shadow-sm"
                >
                  {previewSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                  <span>Kirim Request Preview</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Deliver Task Delegasi dengan Request Description */}
      <Dialog open={deliverModalOpen} onOpenChange={setDeliverModalOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl border-border bg-card p-6 shadow-2xl">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Deliver Task
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Kirimkan hasil pengerjaan kepada pembuat task untuk di-review beserta catatan deliverable.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deliverModalTask && (
            <form onSubmit={handleSubmitDeliver} className="space-y-4 pt-2">
              {/* Task Summary Banner */}
              <div className="p-3 rounded-xl bg-secondary/60 border border-border/50 text-xs space-y-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground">Tugas yang di-Deliver:</span>
                <p className="font-semibold text-foreground text-sm line-clamp-1">{deliverModalTask.title}</p>
                {deliverModalTask.project && (
                  <p className="text-[11px] text-muted-foreground">
                    Proyek: {deliverModalTask.project.code} • {deliverModalTask.project.name}
                  </p>
                )}
                {deliverModalTask.createdBy && (
                  <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                    Pemberi Tugas: {deliverModalTask.createdBy.name} ({deliverModalTask.createdBy.department})
                  </p>
                )}
              </div>

              {/* Field: Request Description / Catatan Hasil Kerja */}
              <div className="space-y-1.5">
                <Label htmlFor="deliverDescription" className="text-xs font-bold text-foreground flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <span>Request Description</span>
                    <span className="text-rose-500">*</span>
                  </span>
                  <span className="text-[10px] text-rose-500 font-medium">Wajib diisi</span>
                </Label>
                <Textarea
                  id="deliverDescription"
                  required
                  value={deliverDescription}
                  onChange={(e) => setDeliverDescription(e.target.value)}
                  placeholder="Tuliskan deskripsi hasil kerja, link preview/dokumen deliverable, atau catatan penting untuk pembuat task..."
                  rows={4}
                  className="rounded-xl text-xs bg-card"
                />
                <p className="text-[10px] text-muted-foreground">
                  Catatan ini akan dikirimkan kepada pembuat task untuk ditinjau saat proses review.
                </p>
              </div>

              <DialogFooter className="gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDeliverModalOpen(false)}
                  disabled={deliverSubmitting}
                  className="rounded-xl text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={deliverSubmitting || !deliverDescription.trim()}
                  className="gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs border-0 shadow-sm"
                >
                  {deliverSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  <span>Kirim & Deliver</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Staff Performance & Narrative Report Modal */}
      <StaffReportModal
        staffId={user.id}
        staffName={user.name}
        open={isPersonalReportOpen}
        onOpenChange={setIsPersonalReportOpen}
      />
    </div>
  );
}
