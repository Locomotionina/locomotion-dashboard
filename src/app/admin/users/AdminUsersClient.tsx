"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  approveUserAction,
  rejectUserAction,
  toggleSuspendUserAction,
  deleteUserPermanentlyAction,
} from "@/actions/auth";
import { SessionUser } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  UserX,
  UserCheck,
  PauseCircle,
  PlayCircle,
  Trash2,
  Loader2,
  AlertTriangle,
  Mail,
  Briefcase,
  CheckCircle2,
  Clock,
  Filter,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

export interface AdminUserData {
  id: string;
  name: string;
  username: string;
  email: string | null;
  role: string;
  position: string;
  department: string;
  avatarUrl: string | null;
  isApproved: boolean;
  isSuspended: boolean;
  createdAt: Date;
  activeTasksCount: number;
  totalTasksCount: number;
}

interface AdminUsersClientProps {
  initialUsers: AdminUserData[];
  currentUser: SessionUser;
}

export function AdminUsersClient({
  initialUsers,
  currentUser,
}: AdminUsersClientProps) {
  const router = useRouter();
  const [users, setUsers] = useState<AdminUserData[]>(initialUsers);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Loading states
  const [loadingId, setLoadingId] = useState<string | null>(null);

  // Remove confirmation modal
  const [userToDelete, setUserToDelete] = useState<AdminUserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Metrics calculation
  const totalUsers = users.length;
  const activeCount = users.filter((u) => u.isApproved && !u.isSuspended).length;
  const suspendedCount = users.filter((u) => u.isSuspended).length;
  const pendingCount = users.filter((u) => !u.isApproved).length;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.email && u.email.toLowerCase().includes(search.toLowerCase())) ||
      u.position.toLowerCase().includes(search.toLowerCase()) ||
      u.department.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === "ALL" || u.role === roleFilter;

    let matchesStatus = true;
    if (statusFilter === "ACTIVE") {
      matchesStatus = u.isApproved && !u.isSuspended;
    } else if (statusFilter === "SUSPENDED") {
      matchesStatus = u.isSuspended;
    } else if (statusFilter === "PENDING") {
      matchesStatus = !u.isApproved;
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Action: Toggle Suspend (Hold / Unhold)
  const handleToggleSuspend = async (targetUser: AdminUserData) => {
    if (targetUser.id === currentUser.id) return;
    const actionName = targetUser.isSuspended ? "mengaktifkan kembali" : "menangguhkan (Hold)";
    if (!confirm(`Apakah Anda yakin ingin ${actionName} akun @${targetUser.username}?`)) return;

    setLoadingId(targetUser.id);
    const res = await toggleSuspendUserAction(targetUser.id);
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === targetUser.id ? { ...u, isSuspended: !u.isSuspended } : u
        )
      );
      router.refresh();
    } else {
      alert(res.error || "Gagal mengubah status penangguhan akun.");
    }
  };

  // Action: Permanently Remove User
  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    setErrorMessage(null);

    const res = await deleteUserPermanentlyAction(userToDelete.id);
    setIsDeleting(false);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      router.refresh();
    } else {
      setErrorMessage(res.error || "Gagal menghapus akun pengguna.");
    }
  };

  // Action: Approve Registration
  const handleApprove = async (userId: string) => {
    setLoadingId(userId);
    const res = await approveUserAction(userId);
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isApproved: true } : u))
      );
      router.refresh();
    } else {
      alert(res.error || "Gagal menyetujui pendaftaran akun.");
    }
  };

  // Action: Reject Registration
  const handleReject = async (targetUser: AdminUserData) => {
    if (!confirm(`Tolak dan hapus permohonan pendaftaran dari @${targetUser.username}?`)) return;
    setLoadingId(targetUser.id);
    const res = await rejectUserAction(targetUser.id);
    setLoadingId(null);

    if (res.success) {
      setUsers((prev) => prev.filter((u) => u.id !== targetUser.id));
      router.refresh();
    } else {
      alert(res.error || "Gagal menolak pendaftaran.");
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "ADMIN":
        return (
          <Badge variant="destructive" className="text-[10px] uppercase font-bold tracking-wider">
            Admin
          </Badge>
        );
      case "MANAGEMENT":
        return (
          <Badge variant="purple" className="text-[10px] uppercase font-bold tracking-wider">
            Management
          </Badge>
        );
      default:
        return (
          <Badge variant="cyan" className="text-[10px] uppercase font-semibold tracking-wider">
            Staff
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
              All Users
            </h1>
            <Badge variant="destructive" className="text-xs uppercase font-bold flex items-center gap-1">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span>Admin Exclusive (HRGA)</span>
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Direktori profil seluruh staf agensi — persetujuan pendaftaran baru, suspensi akun (Hold), dan penghapusan permanen.
          </p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-border/80 bg-card/85 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Users</span>
            <Users className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-foreground mt-2">{totalUsers}</div>
          <span className="text-[10px] text-muted-foreground">Semua akun terdaftar</span>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/85 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Staff</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-500 mt-2">{activeCount}</div>
          <span className="text-[10px] text-muted-foreground">Akun aktif & disetujui</span>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/85 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">On Hold</span>
            <PauseCircle className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-500 mt-2">{suspendedCount}</div>
          <span className="text-[10px] text-muted-foreground">Ditangguhkan dari sistem</span>
        </Card>

        <Card className="rounded-2xl border-border/80 bg-card/85 backdrop-blur-md p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Awaiting ACC</span>
            <Clock className="h-4 w-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-400 mt-2">{pendingCount}</div>
          <span className="text-[10px] text-muted-foreground">Menunggu persetujuan Admin</span>
        </Card>
      </div>

      {/* Pending Approval Section (If any) */}
      {pendingCount > 0 && (
        <Card className="rounded-2xl border-purple-500/30 bg-purple-500/5 backdrop-blur-md shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-400" />
              <h3 className="text-sm font-bold text-foreground">
                Pendaftaran Akun Baru Menunggu ACC ({pendingCount})
              </h3>
            </div>
            <span className="text-[11px] text-muted-foreground">
              Wewenang eksklusif Admin (HRGA)
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users
              .filter((u) => !u.isApproved)
              .map((u) => (
                <div
                  key={u.id}
                  className="rounded-xl border border-border/80 bg-card p-3.5 space-y-3 shadow-sm flex flex-col justify-between"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-sm text-foreground">{u.name}</h4>
                        <p className="text-xs text-muted-foreground font-mono">@{u.username}</p>
                      </div>
                      <Badge variant="warning" className="text-[10px] shrink-0">
                        {u.department}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Posisi: <span className="font-semibold text-foreground">{u.position}</span>
                    </p>
                    {u.email && (
                      <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      size="sm"
                      disabled={loadingId === u.id}
                      onClick={() => handleApprove(u.id)}
                      className="flex-1 h-8 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5"
                    >
                      {loadingId === u.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                      <span>Setujui (ACC)</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={loadingId === u.id}
                      onClick={() => handleReject(u)}
                      className="h-8 rounded-lg border-rose-500/30 text-rose-500 hover:bg-rose-500/10 text-xs gap-1"
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

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-card/85 backdrop-blur-md border border-border/60 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari nama, @username, email, posisi..."
            className="pl-10 rounded-xl text-xs h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60 text-xs">
            {["ALL", "ACTIVE", "SUSPENDED", "PENDING"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  statusFilter === st
                    ? "bg-background text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st === "ALL"
                  ? "All Status"
                  : st === "ACTIVE"
                  ? "Active"
                  : st === "SUSPENDED"
                  ? "On Hold"
                  : "Awaiting ACC"}
              </button>
            ))}
          </div>

          {/* Role Filter */}
          <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60 text-xs">
            {["ALL", "ADMIN", "MANAGEMENT", "STAFF"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  roleFilter === r
                    ? "bg-background text-foreground font-bold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Comprehensive Staff Table */}
      <Card className="rounded-2xl border-border/80 bg-card/85 backdrop-blur-md shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-3 border-b border-border/50">
          <CardTitle className="text-base font-bold flex items-center justify-between">
            <span>Staff Directory ({filteredUsers.length} Users)</span>
            <span className="text-xs font-normal text-muted-foreground">
              Kelola status aktif, penangguhan (Hold), dan penghapusan profil
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border/50 bg-secondary/30 text-muted-foreground font-semibold">
                  <th className="py-3 px-4">User Profile</th>
                  <th className="py-3 px-4">Contact</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department & Position</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Tasks</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      Tidak ada pengguna yang cocok dengan kriteria filter.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isSuspended = user.isSuspended;
                    const isPending = !user.isApproved;

                    return (
                      <tr
                        key={user.id}
                        className={`hover:bg-secondary/20 transition-colors ${
                          isSuspended ? "bg-amber-500/5 opacity-80" : ""
                        }`}
                      >
                        {/* User Profile */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <Avatar className="h-8 w-8 ring-1 ring-border/60">
                              <AvatarImage src={user.avatarUrl || ""} />
                              <AvatarFallback className="bg-blue-500/10 text-blue-600 font-bold text-xs">
                                {user.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {isSelf && (
                                  <span className="text-[9px] bg-secondary px-1.5 py-0.2 rounded text-muted-foreground">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] font-mono text-muted-foreground">
                                @{user.username}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td className="py-3 px-4">
                          {user.email ? (
                            <span className="font-mono text-[11px] text-muted-foreground">
                              {user.email}
                            </span>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">-</span>
                          )}
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">{getRoleBadge(user.role)}</td>

                        {/* Department & Position */}
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{user.position}</div>
                          <div className="text-[10px] text-muted-foreground">{user.department}</div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          {isPending ? (
                            <Badge variant="warning" className="text-[10px]">
                              Awaiting ACC
                            </Badge>
                          ) : isSuspended ? (
                            <Badge variant="destructive" className="text-[10px] bg-amber-500/20 text-amber-500 border-amber-500/40 font-bold">
                              On Hold (Suspended)
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              Active
                            </Badge>
                          )}
                        </td>

                        {/* Tasks */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-foreground">
                            {user.activeTasksCount}
                          </span>
                          <span className="text-muted-foreground text-[11px]">
                            {" "}/ {user.totalTasksCount} tasks
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isPending ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => handleApprove(user.id)}
                                  disabled={loadingId === user.id}
                                  className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                  {loadingId === user.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "ACC"
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleReject(user)}
                                  disabled={loadingId === user.id}
                                  className="h-7 text-xs px-2 text-rose-500 border-rose-500/30 hover:bg-rose-500/10"
                                >
                                  Tolak
                                </Button>
                              </>
                            ) : (
                              <>
                                {/* Hold / Unhold Toggle Button */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isSuspended ? "default" : "outline"}
                                  disabled={isSelf || loadingId === user.id}
                                  onClick={() => handleToggleSuspend(user)}
                                  title={
                                    isSelf
                                      ? "Anda tidak dapat menangguhkan akun Anda sendiri"
                                      : isSuspended
                                      ? "Aktifkan kembali akun ini"
                                      : "Tangguhkan akun ini (blokir login, data tetap utuh)"
                                  }
                                  className={`h-7 text-xs px-2.5 gap-1 ${
                                    isSuspended
                                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                                      : "text-amber-600 dark:text-amber-400 border-amber-500/40 hover:bg-amber-500/10"
                                  }`}
                                >
                                  {loadingId === user.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : isSuspended ? (
                                    <>
                                      <PlayCircle className="h-3 w-3" />
                                      <span>Unhold</span>
                                    </>
                                  ) : (
                                    <>
                                      <PauseCircle className="h-3 w-3" />
                                      <span>Hold</span>
                                    </>
                                  )}
                                </Button>

                                {/* Permanent Remove Button */}
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  disabled={isSelf || loadingId === user.id}
                                  onClick={() => setUserToDelete(user)}
                                  title={
                                    isSelf
                                      ? "Anda tidak dapat menghapus akun Anda sendiri"
                                      : "Hapus akun secara permanen (untuk staf yang resign)"
                                  }
                                  className="h-7 w-7 p-0 text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog open={Boolean(userToDelete)} onOpenChange={(open) => !open && setUserToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-500">
              <AlertTriangle className="h-5 w-5" />
              <span>Hapus Akun Pengguna Secara Permanen?</span>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Tindakan ini permanen dan tidak dapat dibatalkan. Digunakan khusus untuk staf yang sudah mengundurkan diri (resign).
            </DialogDescription>
          </DialogHeader>

          {userToDelete && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs space-y-1.5">
              <p className="font-semibold text-rose-400">
                Akun yang akan dihapus:
              </p>
              <div className="flex items-center gap-2 font-medium text-foreground">
                <span>{userToDelete.name}</span>
                <span className="font-mono text-muted-foreground">(@{userToDelete.username})</span>
              </div>
              <p className="text-muted-foreground text-[11px]">
                Posisi: {userToDelete.position} ({userToDelete.department}) • Role: {userToDelete.role}
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
              {errorMessage}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => setUserToDelete(null)}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="gap-2 bg-rose-600 hover:bg-rose-700 font-semibold"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menghapus Akun...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Hapus Permanen</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
