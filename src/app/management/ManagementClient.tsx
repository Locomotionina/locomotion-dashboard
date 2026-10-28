"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  StaffCapacitySummary,
  PendingProfileRequestItem,
  PendingPasswordRequestItem,
} from "@/actions/management";
import {
  approveProfileUpdateAction,
  rejectProfileUpdateAction,
  approvePasswordResetAction,
  rejectPasswordResetAction,
  adminUpdateStaffProfileAction,
  adminResetStaffPasswordAction,
  toggleAdminRoleAction,
  deleteStaffAction,
  uploadAvatarAction,
} from "@/actions/auth";
import { DEPARTMENT_POSITIONS, DEPARTMENTS } from "@/lib/departments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  AlertTriangle,
  Sparkles,
  Users,
  FolderKanban,
  Clock,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Activity,
  Flame,
  FileSpreadsheet,
  UserCheck,
  UserX,
  ShieldCheck,
  Mail,
  Loader2,
  KeyRound,
  Pencil,
  Trash2,
  Shield,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Upload,
  Camera,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { TaskExportModal } from "@/components/TaskExportModal";
import { StaffReportModal } from "@/components/StaffReportModal";

interface PendingUser {
  id: string;
  name: string;
  username: string;
  email: string | null;
  department: string;
  position: string;
  createdAt: Date;
}

interface ManagementClientProps {
  staffSummaries: StaffCapacitySummary[];
  pendingUsers?: PendingUser[];
  pendingProfileRequests?: PendingProfileRequestItem[];
  pendingPasswordRequests?: PendingPasswordRequestItem[];
  metrics: {
    totalStaff: number;
    overloadedCount: number;
    availableCount: number;
    optimalCount: number;
    totalActiveTasks: number;
    avgTasksPerStaff: string;
    activeProjectsCount: number;
  };
  currentUserId?: string;
}

export function ManagementClient({
  staffSummaries,
  pendingUsers = [],
  pendingProfileRequests = [],
  pendingPasswordRequests = [],
  metrics,
  currentUserId,
}: ManagementClientProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [capacityFilter, setCapacityFilter] = useState("ALL");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [expandedStaffId, setExpandedStaffId] = useState<string | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [selectedStaffReportId, setSelectedStaffReportId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string>("");
  const [isStaffReportOpen, setIsStaffReportOpen] = useState(false);

  // Pending lists states
  const [pendingUserList, setPendingUserList] = useState<PendingUser[]>(pendingUsers);
  const [pendingProfileList, setPendingProfileList] =
    useState<PendingProfileRequestItem[]>(pendingProfileRequests);
  const [pendingPasswordList, setPendingPasswordList] =
    useState<PendingPasswordRequestItem[]>(pendingPasswordRequests);

  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Admin Modal States for Staff Actions
  const [editingStaff, setEditingStaff] = useState<StaffCapacitySummary | null>(null);
  const [editDept, setEditDept] = useState<string>("Creative");
  const [editPosition, setEditPosition] = useState<string>("Audio Visual");
  const [editAvatarUrl, setEditAvatarUrl] = useState<string>("");

  const [resettingStaff, setResettingStaff] = useState<StaffCapacitySummary | null>(null);
  const [resetPasswordVal, setResetPasswordVal] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [deletingStaff, setDeletingStaff] = useState<StaffCapacitySummary | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // -------------------------------------------------------------
  // APPROVAL HANDLERS
  // -------------------------------------------------------------

  // 1. Profile Update Request Approval
  const handleApproveProfileRequest = async (requestId: string) => {
    setProcessingId(requestId);
    const res = await approveProfileUpdateAction(requestId);
    if (res.success) {
      setPendingProfileList((prev) => prev.filter((r) => r.id !== requestId));
      setActionMessage({ type: "success", text: "Perubahan profil staf berhasil disetujui." });
      router.refresh();
    } else {
      setActionMessage({ type: "error", text: res.error || "Gagal menyetujui profil." });
    }
    setProcessingId(null);
  };

  const handleRejectProfileRequest = async (requestId: string) => {
    if (!confirm("Tolak permintaan perubahan profil staf ini?")) return;
    setProcessingId(requestId);
    const res = await rejectProfileUpdateAction(requestId);
    if (res.success) {
      setPendingProfileList((prev) => prev.filter((r) => r.id !== requestId));
      setActionMessage({ type: "success", text: "Permintaan perubahan profil berhasil ditolak." });
      router.refresh();
    }
    setProcessingId(null);
  };

  // 3. Password Reset Request Approval
  const handleApprovePasswordRequest = async (requestId: string) => {
    setProcessingId(requestId);
    const res = await approvePasswordResetAction(requestId);
    if (res.success) {
      setPendingPasswordList((prev) => prev.filter((r) => r.id !== requestId));
      setActionMessage({ type: "success", text: "Permintaan reset password staf berhasil disetujui." });
      router.refresh();
    } else {
      setActionMessage({ type: "error", text: res.error || "Gagal menyetujui reset password." });
    }
    setProcessingId(null);
  };

  const handleRejectPasswordRequest = async (requestId: string) => {
    if (!confirm("Tolak permintaan reset password staf ini?")) return;
    setProcessingId(requestId);
    const res = await rejectPasswordResetAction(requestId);
    if (res.success) {
      setPendingPasswordList((prev) => prev.filter((r) => r.id !== requestId));
      setActionMessage({ type: "success", text: "Permintaan reset password berhasil ditolak." });
      router.refresh();
    }
    setProcessingId(null);
  };

  // -------------------------------------------------------------
  // ADMIN DIRECT ACTIONS (EDIT, RESET PASSWORD, PROMOTE, DELETE)
  // -------------------------------------------------------------

  // Admin Avatar Upload State (Strict 400KB Limit)
  const adminFileInputRef = useRef<HTMLInputElement>(null);
  const [adminUploading, setAdminUploading] = useState(false);
  const [adminUploadError, setAdminUploadError] = useState<string | null>(null);

  const handleAdminAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAdminUploadError(null);

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setAdminUploadError("Harap pilih file gambar dengan format JPG, JPEG, PNG, WebP, atau GIF.");
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
      return;
    }

    const MAX_FILE_SIZE = 400 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setAdminUploadError(`Ukuran file terlalu besar (${sizeKb} KB). Maksimal foto adalah 400 KB.`);
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
      return;
    }

    setAdminUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      if (editingStaff) {
        formData.append("targetUserId", editingStaff.id);
      }
      const res = await uploadAvatarAction(formData);
      if (!res.success) {
        setAdminUploadError(res.error || "Gagal mengunggah foto profil.");
      } else {
        setEditAvatarUrl(res.url!);
      }
    } catch {
      setAdminUploadError("Terjadi kesalahan saat mengunggah foto.");
    } finally {
      setAdminUploading(false);
      if (adminFileInputRef.current) adminFileInputRef.current.value = "";
    }
  };

  // Open Edit Profile Modal
  const openEditModal = (staff: StaffCapacitySummary) => {
    setEditingStaff(staff);
    const dept = DEPARTMENTS.includes(staff.department) ? staff.department : "Creative";
    setEditDept(dept);
    setEditPosition(staff.position || DEPARTMENT_POSITIONS[dept][0]);
    setEditAvatarUrl(staff.avatarUrl || "");
    setAdminUploadError(null);
    setModalError(null);
  };

  const handleSaveStaffProfile = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingStaff) return;
    setModalLoading(true);
    setModalError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("userId", editingStaff.id);
    formData.set("department", editDept);
    formData.set("position", editPosition);
    formData.set("avatarUrl", editAvatarUrl);

    const res = await adminUpdateStaffProfileAction(formData);
    if (!res.success) {
      setModalError(res.error || "Gagal memperbarui data staf.");
      setModalLoading(false);
    } else {
      setEditingStaff(null);
      setModalLoading(false);
      setActionMessage({ type: "success", text: res.message || "Profil staf berhasil diperbarui!" });
      router.refresh();
    }
  };

  // Open Reset Password Modal
  const openResetModal = (staff: StaffCapacitySummary) => {
    setResettingStaff(staff);
    setResetPasswordVal("");
    setShowResetPassword(false);
    setModalError(null);
  };

  const handleSaveResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!resettingStaff) return;
    setModalLoading(true);
    setModalError(null);

    const res = await adminResetStaffPasswordAction(resettingStaff.id, resetPasswordVal);
    if (!res.success) {
      setModalError(res.error || "Gagal mereset kata sandi staf.");
      setModalLoading(false);
    } else {
      setResettingStaff(null);
      setModalLoading(false);
      setActionMessage({ type: "success", text: `Kata sandi ${resettingStaff.name} berhasil direset!` });
      router.refresh();
    }
  };

  // Toggle Admin Role
  const handleToggleAdmin = async (staff: StaffCapacitySummary) => {
    const isPromote = staff.role !== "MANAGEMENT";
    const promptMsg = isPromote
      ? `Tunjuk staf "${staff.name}" sebagai Admin / Project Manager? Pengguna akan memiliki akses penuh ke manajemen project dan staf.`
      : `Cabut hak akses Admin dari "${staff.name}" kembali menjadi Staf biasa?`;

    if (!confirm(promptMsg)) return;

    const res = await toggleAdminRoleAction(staff.id);
    if (res.success) {
      setActionMessage({ type: "success", text: res.message || "Hak akses berhasil diubah." });
      router.refresh();
    } else {
      setActionMessage({ type: "error", text: res.error || "Gagal mengubah hak akses." });
    }
  };

  // Delete Staff
  const confirmDeleteStaff = async () => {
    if (!deletingStaff) return;
    setModalLoading(true);
    const res = await deleteStaffAction(deletingStaff.id);
    if (res.success) {
      setDeletingStaff(null);
      setModalLoading(false);
      setActionMessage({ type: "success", text: res.message || "Staf berhasil dihapus." });
      router.refresh();
    } else {
      setModalError(res.error || "Gagal menghapus staf.");
      setModalLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedStaffId((prev) => (prev === id ? null : id));
  };

  const departments = [
    "ALL",
    ...DEPARTMENTS,
    "N/A",
  ];

  const filteredStaff = staffSummaries.filter((staff) => {
    const matchesSearch =
      staff.name.toLowerCase().includes(search.toLowerCase()) ||
      staff.username.toLowerCase().includes(search.toLowerCase()) ||
      staff.position.toLowerCase().includes(search.toLowerCase()) ||
      staff.department.toLowerCase().includes(search.toLowerCase());

    const matchesCapacity =
      capacityFilter === "ALL" || staff.capacityStatus === capacityFilter;

    const matchesDepartment =
      departmentFilter === "ALL" || staff.department === departmentFilter;

    return matchesSearch && matchesCapacity && matchesDepartment;
  });

  const getCapacityBadge = (status: "OVERLOADED" | "OPTIMAL" | "AVAILABLE", count: number) => {
    switch (status) {
      case "OVERLOADED":
        return (
          <Badge variant="destructive" className="gap-1 px-3 py-1 text-xs font-semibold">
            <Flame className="h-3.5 w-3.5" />
            <span>Overloaded ({count} tasks)</span>
          </Badge>
        );
      case "AVAILABLE":
        return (
          <Badge variant="success" className="gap-1 px-3 py-1 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Available / Idle ({count} tasks)</span>
          </Badge>
        );
      case "OPTIMAL":
      default:
        return (
          <Badge variant="cyan" className="px-3 py-1 text-xs font-semibold">
            Optimal Flow ({count} tasks)
          </Badge>
        );
    }
  };

  const getProgressBarColor = (status: "OVERLOADED" | "OPTIMAL" | "AVAILABLE") => {
    switch (status) {
      case "OVERLOADED":
        return "bg-rose-500";
      case "AVAILABLE":
        return "bg-emerald-500";
      case "OPTIMAL":
      default:
        return "bg-blue-500";
    }
  };

  const totalPendingApprovals =
    pendingProfileList.length + pendingPasswordList.length;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              Management Workload Radar
            </h1>
            <Badge variant="purple" className="text-xs uppercase font-semibold">
              Project Manager (Admin)
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Pusat kendali kapasitas staf, delegasi project, perizinan profil, dan administrasi akun tim agensi.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Button
            onClick={() => setIsExportOpen(true)}
            className="rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm gap-2 transition-all active:scale-95 border-0"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Export Report (CSV)</span>
          </Button>
        </div>
      </div>

      {/* Global Notification Banner */}
      {actionMessage && (
        <div
          className={`p-3.5 rounded-2xl border text-xs flex items-center justify-between gap-2 animate-fade-down ${
            actionMessage.type === "success"
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <span className="font-medium">{actionMessage.text}</span>
          </div>
          <button
            onClick={() => setActionMessage(null)}
            className="text-[11px] font-bold opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* APPROVAL HUB: REGISTRASI, PERUBAHAN PROFIL, & RESET PASSWORD */}
      {/* ------------------------------------------------------------- */}
      {totalPendingApprovals > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <ShieldCheck className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-base font-bold text-foreground">
              Pusat Persetujuan Admin ({totalPendingApprovals} Menunggu ACC)
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {/* 1. Persetujuan Perubahan Profil Staf */}
            {pendingProfileList.length > 0 && (
              <Card className="rounded-2xl border-blue-500/30 bg-blue-500/5 backdrop-blur-md shadow-sm p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Pencil className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      Permintaan Perubahan Profil Staf ({pendingProfileList.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Perubahan nama, username, atau foto profil staf
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingProfileList.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">Profil Lama:</span>
                          <span className="font-bold text-foreground">
                            {req.user.name} (@{req.user.username})
                          </span>
                        </div>

                        <div className="p-2.5 rounded-lg bg-secondary/50 border border-border/60 text-xs space-y-1.5">
                          <p className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider">
                            Perubahan yang Diajukan:
                          </p>
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-9 w-9 border border-border">
                              <AvatarImage src={req.requestedAvatarUrl || req.user.avatarUrl || ""} />
                              <AvatarFallback>{req.requestedName[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold text-foreground">{req.requestedName}</p>
                              <p className="font-mono text-xs text-muted-foreground">@{req.requestedUsername}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          disabled={processingId === req.id}
                          onClick={() => handleApproveProfileRequest(req.id)}
                          className="flex-1 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-semibold gap-1.5"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Setujui (ACC)</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === req.id}
                          onClick={() => handleRejectProfileRequest(req.id)}
                          className="h-8 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* 3. Persetujuan Reset Password Staf */}
            {pendingPasswordList.length > 0 && (
              <Card className="rounded-2xl border-purple-500/30 bg-purple-500/5 backdrop-blur-md shadow-sm p-4 animate-fade-in">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <KeyRound className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-bold text-foreground">
                      Permintaan Reset Password Staf ({pendingPasswordList.length})
                    </h3>
                  </div>
                  <span className="text-[11px] text-muted-foreground">
                    Memerlukan persetujuan Admin agar kata sandi baru aktif
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {pendingPasswordList.map((req) => (
                    <div
                      key={req.id}
                      className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-1.5 text-xs">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={req.user.avatarUrl || ""} />
                            <AvatarFallback>{req.user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold text-foreground">{req.user.name}</p>
                            <p className="font-mono text-[11px] text-muted-foreground">@{req.user.username}</p>
                          </div>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          Diajukan:{" "}
                          <span className="text-foreground">
                            {new Date(req.createdAt).toLocaleString("id-ID", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          disabled={processingId === req.id}
                          onClick={() => handleApprovePasswordRequest(req.id)}
                          className="flex-1 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-xs font-semibold gap-1.5"
                        >
                          {processingId === req.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          <span>Setujui Reset</span>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={processingId === req.id}
                          onClick={() => handleRejectPasswordRequest(req.id)}
                          className="h-8 rounded-lg border-rose-500/30 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs gap-1"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Tolak</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Staff */}
        <div className="rounded-2xl border border-border bg-card p-5 card-hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Specialists
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">
              {metrics.totalStaff}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Across agency departments
            </p>
          </div>
        </div>

        {/* Overloaded Alert */}
        <div className="rounded-2xl border border-border bg-card p-5 card-hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              Overloaded Staff
            </span>
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-rose-600 dark:text-rose-400">
              {metrics.overloadedCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Tasks &ge; 5 (Burnout alert)
            </p>
          </div>
        </div>

        {/* Available / Idle */}
        <div className="rounded-2xl border border-border bg-card p-5 card-hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Available / Idle
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">
              {metrics.availableCount}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 font-medium">
              Ready for client assignments!
            </p>
          </div>
        </div>

        {/* Agency Average Tasks */}
        <div className="rounded-2xl border border-border bg-card p-5 card-hover-lift flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Avg Active Tasks
            </span>
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Activity className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-foreground">
              {metrics.avgTasksPerStaff}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {metrics.totalActiveTasks} active deliverables total
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-card/85 backdrop-blur-md border border-border/60 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search staff, position, username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 rounded-xl text-xs bg-background/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Department:</span>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="h-9 rounded-xl border border-border/80 bg-background/60 px-3 text-xs font-medium text-foreground"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Capacity Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Capacity:</span>
            <select
              value={capacityFilter}
              onChange={(e) => setCapacityFilter(e.target.value)}
              className="h-9 rounded-xl border border-border/80 bg-background/60 px-3 text-xs font-medium text-foreground"
            >
              <option value="ALL">All Status</option>
              <option value="AVAILABLE">Available (0 - 1)</option>
              <option value="OPTIMAL">Optimal (2 - 4)</option>
              <option value="OVERLOADED">Overloaded (5+)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Staff Roster Cards */}
      <div className="space-y-4">
        {filteredStaff.length === 0 ? (
          <div className="p-12 text-center border rounded-2xl bg-card/60">
            <Users className="h-10 w-10 text-muted-foreground mx-auto mb-2 opacity-50" />
            <p className="text-sm font-semibold text-foreground">Tidak ada staf yang sesuai filter.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Coba reset kata kunci pencarian atau ubah kriteria filter departemen.
            </p>
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isExpanded = expandedStaffId === staff.id;
            const isOverloaded = staff.capacityStatus === "OVERLOADED";
            const isAvailable = staff.capacityStatus === "AVAILABLE";
            const isSelf = staff.id === currentUserId;

            return (
              <Card
                key={staff.id}
                className={`border rounded-2xl transition-all duration-200 overflow-hidden card-hover-lift ${
                  isOverloaded
                    ? "border-rose-500/40 bg-card/90 hover:border-rose-500"
                    : isAvailable
                    ? "border-emerald-500/40 bg-card/90 hover:border-emerald-500"
                    : "border-border/60 bg-card/85 hover:border-blue-500/40"
                }`}
              >
                {/* Staff Member Master Row */}
                <div className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-4 min-w-[260px]">
                    <div className="relative">
                      <Avatar className="h-12 w-12 ring-2 ring-border/80">
                        <AvatarImage src={staff.avatarUrl || ""} />
                        <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                          {staff.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span
                        className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-background ${
                          isOverloaded
                            ? "bg-rose-500"
                            : isAvailable
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                        }`}
                        title={staff.statusLabel}
                      />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-base text-foreground">
                          {staff.name}
                        </h3>
                        <Badge variant="outline" className="text-[10px] rounded-full">
                          {staff.department}
                        </Badge>
                        <Badge
                          variant={staff.role === "MANAGEMENT" ? "purple" : "cyan"}
                          className="text-[10px]"
                        >
                          {staff.role === "MANAGEMENT" ? "Admin" : "Staff"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-medium">
                        {staff.position} • <span className="font-mono">@{staff.username}</span>
                      </p>
                      {staff.email && (
                        <p className="text-[11px] text-muted-foreground/80 flex items-center gap-1 mt-0.5">
                          <Mail className="h-3 w-3" />
                          <span>{staff.email}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Middle: Capacity Meter & Progress Bar */}
                  <div className="flex-1 max-w-md space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-muted-foreground flex items-center gap-1.5">
                        <span>Workload Capacity:</span>
                        <span className="text-foreground font-bold">
                          {staff.activeTaskCount} / 5 tasks
                        </span>
                      </span>
                      <span className="font-mono text-xs font-bold text-foreground">
                        {staff.capacityScore}%
                      </span>
                    </div>

                    <Progress
                      value={staff.capacityScore}
                      indicatorClassName={getProgressBarColor(staff.capacityStatus)}
                    />

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{staff.todoCount} To Do • {staff.inProgressCount} On Progress</span>
                      <span>{staff.archivedCount} Completed in Archive</span>
                    </div>
                  </div>

                  {/* Right: Status Pill & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-border/40 flex-wrap">
                    <div>
                      {getCapacityBadge(staff.capacityStatus, staff.activeTaskCount)}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1.5 rounded-xl border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 hover:border-blue-500/50"
                        onClick={() => {
                          setSelectedStaffReportId(staff.id);
                          setSelectedStaffName(staff.name);
                          setIsStaffReportOpen(true);
                        }}
                        title={`Export CSV & Ringkasan Naratif untuk ${staff.name}`}
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <span>Export CSV</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 gap-1 rounded-xl"
                        onClick={() => toggleExpand(staff.id)}
                      >
                        <span>{isExpanded ? "Hide Tasks" : "Tasks"}</span>
                        {isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </Button>

                      <Button
                        asChild
                        size="sm"
                        variant="ghost"
                        className="text-xs h-8 text-blue-600 dark:text-blue-400 hover:text-blue-500 rounded-xl"
                        title="View Staff Workspace"
                      >
                        <Link href={`/dashboard?userId=${staff.id}`}>
                          <span>Workspace</span>
                          <ArrowRight className="h-3.5 w-3.5 ml-1" />
                        </Link>
                      </Button>

                      {/* Admin Actions Dropdown for this Staff */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 rounded-xl"
                            title="Menu Aksi Admin"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52 rounded-xl">
                          <DropdownMenuItem
                            onClick={() => openEditModal(staff)}
                            className="gap-2 text-xs font-medium cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5 text-blue-500" />
                            <span>Edit Profil Staf</span>
                          </DropdownMenuItem>

                          <DropdownMenuItem
                            onClick={() => openResetModal(staff)}
                            className="gap-2 text-xs font-medium cursor-pointer"
                          >
                            <KeyRound className="h-3.5 w-3.5 text-amber-500" />
                            <span>Reset Password Staf</span>
                          </DropdownMenuItem>

                          {!isSelf && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleToggleAdmin(staff)}
                                className="gap-2 text-xs font-medium cursor-pointer"
                              >
                                <Shield className="h-3.5 w-3.5 text-purple-500" />
                                <span>
                                  {staff.role === "MANAGEMENT"
                                    ? "Cabut Hak Admin"
                                    : "Tunjuk Sebagai Admin"}
                                </span>
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => {
                                  setDeletingStaff(staff);
                                  setModalError(null);
                                }}
                                className="gap-2 text-xs font-medium text-rose-600 dark:text-rose-400 focus:text-rose-600 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>Hapus Staf</span>
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Expandable Drilldown: Current Active Tasks */}
                {isExpanded && (
                  <div className="border-t border-border/40 bg-secondary/30 p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Active Deliverables for {staff.name} ({staff.tasks.length}):
                      </p>
                      {isAvailable && (
                        <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <Sparkles className="h-3.5 w-3.5" />
                          <span>Candidate available for immediate client brief onboarding</span>
                        </span>
                      )}
                      {isOverloaded && (
                        <span className="text-xs text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1">
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Action needed: Reassign upcoming tasks or extend deadlines</span>
                        </span>
                      )}
                    </div>

                    {staff.tasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic bg-card/60 p-4 rounded-xl border border-border/40">
                        Currently has 0 active tasks. Fully idle and ready for new brand work.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {staff.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3.5 rounded-xl bg-card border border-border/60 text-xs space-y-1.5 shadow-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              {task.project ? (
                                <Link
                                  href={`/projects/${task.project.id}`}
                                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 truncate"
                                >
                                  <FolderKanban className="h-3 w-3" />
                                  <span>{task.project.code} • {task.project.clientName}</span>
                                </Link>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">
                                  Agency Internal
                                </span>
                              )}

                              <Badge
                                variant={
                                  task.priority === "URGENT"
                                    ? "destructive"
                                    : task.priority === "HIGH"
                                    ? "warning"
                                    : "secondary"
                                }
                                className="text-[9px]"
                              >
                                {task.priority}
                              </Badge>
                            </div>

                            <p className="font-semibold text-foreground">
                              {task.title}
                            </p>

                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/30">
                              <span className="font-medium text-foreground">
                                Status: {task.status}
                              </span>
                              {task.dueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  <span>Due {formatDate(task.dueDate)}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 1: EDIT STAFF PROFILE BY ADMIN */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!editingStaff} onOpenChange={(open) => !open && setEditingStaff(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Pencil className="h-4 w-4 text-blue-600" />
              <span>Edit Profil Staf: {editingStaff?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Sebagai Project Manager / Admin, Anda memiliki wewenang untuk mengubah data staf secara langsung.
            </DialogDescription>
          </DialogHeader>

          {modalError && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {editingStaff && (
            <form onSubmit={handleSaveStaffProfile} className="space-y-4">
              <div className="p-3.5 rounded-xl bg-secondary/40 border border-border/60 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[11px] font-semibold flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    <span>Foto Profil Staf</span>
                  </Label>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                    Maks. 400 KB
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-14 w-14 border shrink-0">
                    <AvatarImage src={editAvatarUrl || editingStaff.avatarUrl || ""} className="object-cover" />
                    <AvatarFallback className="text-base font-bold">{editingStaff.name[0]}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="file"
                        ref={adminFileInputRef}
                        onChange={handleAdminAvatarUpload}
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        className="hidden"
                        disabled={adminUploading}
                      />
                      <Button
                        type="button"
                        onClick={() => adminFileInputRef.current?.click()}
                        disabled={adminUploading}
                        variant="outline"
                        className="h-7 px-2.5 rounded-lg text-[11px] font-medium gap-1.5 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-50/50"
                      >
                        {adminUploading ? (
                          <>
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>Mengunggah...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3" />
                            <span>Upload Gambar (Maks 400KB)</span>
                          </>
                        )}
                      </Button>
                      {editAvatarUrl && (
                        <Button
                          type="button"
                          onClick={() => setEditAvatarUrl("")}
                          variant="ghost"
                          className="h-7 px-2 text-[10px] text-rose-600 hover:bg-rose-500/10"
                        >
                          Hapus
                        </Button>
                      )}
                    </div>

                    <Input
                      id="adminEditAvatar"
                      value={editAvatarUrl}
                      onChange={(e) => setEditAvatarUrl(e.target.value)}
                      placeholder="Atau masukkan URL gambar..."
                      className="h-8 text-xs bg-background"
                    />
                  </div>
                </div>

                {adminUploadError && (
                  <p className="text-[11px] text-rose-500 flex items-center gap-1 animate-fade-in">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    <span>{adminUploadError}</span>
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="adminEditName" className="text-xs font-semibold">
                    Nama Lengkap
                  </Label>
                  <Input
                    id="adminEditName"
                    name="name"
                    defaultValue={editingStaff.name}
                    required
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="adminEditUsername" className="text-xs font-semibold">
                    Username
                  </Label>
                  <Input
                    id="adminEditUsername"
                    name="username"
                    defaultValue={editingStaff.username}
                    required
                    className="h-9 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Department & Cascading Position */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="adminEditDept" className="text-xs font-semibold">
                    Departemen
                  </Label>
                  <select
                    id="adminEditDept"
                    name="department"
                    value={editDept}
                    onChange={(e) => {
                      const dept = e.target.value;
                      setEditDept(dept);
                      if (DEPARTMENT_POSITIONS[dept]) {
                        setEditPosition(DEPARTMENT_POSITIONS[dept][0]);
                      }
                    }}
                    className="flex h-9 w-full rounded-xl border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="adminEditPos" className="text-xs font-semibold">
                    Posisi / Role Title
                  </Label>
                  <select
                    id="adminEditPos"
                    name="position"
                    value={editPosition}
                    onChange={(e) => setEditPosition(e.target.value)}
                    className="flex h-9 w-full rounded-xl border border-border/80 bg-background px-3 py-1 text-xs font-medium text-foreground"
                  >
                    {(DEPARTMENT_POSITIONS[editDept] || []).map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingStaff(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading}
                  className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold"
                >
                  {modalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  <span>Simpan Perubahan</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 2: RESET PASSWORD STAF BY ADMIN */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!resettingStaff} onOpenChange={(open) => !open && setResettingStaff(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-amber-500" />
              <span>Reset Password Staf: {resettingStaff?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tetapkan kata sandi baru untuk staf ini. Kata sandi akan langsung aktif sehingga staf dapat login kembali.
            </DialogDescription>
          </DialogHeader>

          {modalError && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {resettingStaff && (
            <form onSubmit={handleSaveResetPassword} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="adminResetPasswordInput" className="text-xs font-semibold">
                  Kata Sandi Baru
                </Label>
                <div className="relative">
                  <Input
                    id="adminResetPasswordInput"
                    type={showResetPassword ? "text" : "password"}
                    value={resetPasswordVal}
                    onChange={(e) => setResetPasswordVal(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    minLength={6}
                    required
                    className="h-10 rounded-xl pr-10 text-xs bg-background"
                  />
                  <button
                    type="button"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                  >
                    {showResetPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setResettingStaff(null)}
                  className="h-9 text-xs rounded-xl"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={modalLoading || !resetPasswordVal}
                  className="h-9 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold"
                >
                  {modalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
                  <span>Reset Password Sekarang</span>
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ------------------------------------------------------------- */}
      {/* MODAL 3: DELETE STAFF CONFIRMATION */}
      {/* ------------------------------------------------------------- */}
      <Dialog open={!!deletingStaff} onOpenChange={(open) => !open && setDeletingStaff(null)}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <Trash2 className="h-4 w-4" />
              <span>Hapus Staf: {deletingStaff?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Tindakan ini tidak dapat dibatalkan. Akun staf @{deletingStaff?.username} beserta seluruh data tugas terkait akan dihapus secara permanen dari sistem.
            </DialogDescription>
          </DialogHeader>

          {modalError && (
            <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1 text-rose-700 dark:text-rose-300">
            <p className="font-bold">Konfirmasi Penghapusan:</p>
            <p>
              Nama: <strong>{deletingStaff?.name}</strong> • Posisi: <strong>{deletingStaff?.position}</strong>
            </p>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingStaff(null)}
              className="h-9 text-xs rounded-xl"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={modalLoading}
              onClick={confirmDeleteStaff}
              className="h-9 text-xs rounded-xl font-semibold"
            >
              {modalLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : null}
              <span>Hapus Staf Permanen</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task & Performance Export Modal */}
      <TaskExportModal
        open={isExportOpen}
        onOpenChange={setIsExportOpen}
        defaultDepartment={departmentFilter}
      />

      {/* Individual Staff Performance & Narrative Report Modal */}
      <StaffReportModal
        staffId={selectedStaffReportId}
        staffName={selectedStaffName}
        open={isStaffReportOpen}
        onOpenChange={setIsStaffReportOpen}
      />
    </div>
  );
}
