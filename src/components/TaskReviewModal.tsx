"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Eye,
  Link as LinkIcon,
  ExternalLink,
  Copy,
  Check,
  Send,
  Loader2,
  UserPlus,
  Clock,
  Calendar,
  AlertCircle,
  FileText,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TaskDiscussionThread } from "@/components/TaskDiscussionThread";
import {
  updateTaskDeliverableLinkAction,
  addTaskReviewerAction,
  getTaskReviewDetailsAction,
  getActiveTeamMembersAction,
  TaskParticipant,
} from "@/actions/task-reviews";

export interface TaskReviewModalProps {
  taskId: string | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser?: {
    id: string;
    name: string;
    role?: string;
    position?: string;
    department?: string;
    avatarUrl?: string | null;
  } | null;
  availableUsers?: Array<{
    id: string;
    name: string;
    username?: string;
    role?: string;
    position?: string;
    department?: string;
    avatarUrl?: string | null;
  }>;
  onTaskUpdated?: (updatedTask: any) => void;
}

function formatSecondsToHms(totalSec: number): string {
  const sec = Math.max(0, Math.floor(totalSec || 0));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) {
    return `${h}j ${m}m ${s}d`;
  }
  return `${m}m ${s}d`;
}

function formatDate(dateInput?: string | Date | null): string {
  if (!dateInput) return "-";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function renderTextWithLinks(text?: string | null): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      let cleanUrl = part;
      let trailingPunct = "";
      const matchPunct = part.match(/[.,;:!?)]+$/);
      if (matchPunct) {
        trailingPunct = matchPunct[0];
        cleanUrl = part.slice(0, -trailingPunct.length);
      }
      return (
        <span key={index}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 underline underline-offset-2 break-all font-medium inline-flex items-center gap-0.5"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{cleanUrl}</span>
            <ExternalLink className="h-3 w-3 inline-block shrink-0 opacity-80" />
          </a>
          {trailingPunct}
        </span>
      );
    }
    return part;
  });
}

export function TaskReviewModal({
  taskId,
  isOpen,
  onClose,
  currentUser,
  availableUsers: initialUsers,
  onTaskUpdated,
}: TaskReviewModalProps) {
  const [task, setTask] = useState<any>(null);
  const [reviewers, setReviewers] = useState<TaskParticipant[]>([]);
  const [availableUsers, setAvailableUsers] = useState<any[]>(initialUsers || []);
  const [deliverableLink, setDeliverableLink] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingLink, setIsSavingLink] = useState(false);
  const [isAddingReviewer, setIsAddingReviewer] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showAddReviewerDropdown, setShowAddReviewerDropdown] = useState(false);
  const [reviewerSearchQuery, setReviewerSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  }, []);

  // Fetch task review details
  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;
    setIsLoading(true);
    try {
      const res = await getTaskReviewDetailsAction(taskId);
      if (res.success && res.task) {
        setTask(res.task);
        setDeliverableLink(res.task.deliverableLink || "");
        setReviewers(res.reviewers || []);
      }
    } catch (err) {
      console.error("Error loading task review details:", err);
    } finally {
      setIsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
    } else {
      setTask(null);
      setDeliverableLink("");
      setShowAddReviewerDropdown(false);
      setReviewerSearchQuery("");
    }
  }, [isOpen, taskId, loadTaskDetails]);

  // Fetch available team members if not provided
  useEffect(() => {
    if (!initialUsers || initialUsers.length === 0) {
      getActiveTeamMembersAction().then((res) => {
        if (res.success && res.users) {
          setAvailableUsers(res.users);
        }
      });
    } else {
      setAvailableUsers(initialUsers);
    }
  }, [initialUsers]);

  const handleCopyLink = () => {
    if (!deliverableLink) return;
    navigator.clipboard.writeText(deliverableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleNotifyReviewers = async () => {
    if (!taskId || !deliverableLink.trim()) return;
    setIsSavingLink(true);
    try {
      const res = await updateTaskDeliverableLinkAction(taskId, deliverableLink);
      if (res.success) {
        setTask((prev: any) =>
          prev
            ? {
                ...prev,
                deliverableLink: res.deliverableLink,
                status: res.status,
              }
            : null
        );
        showToast("Link Task tersimpan & seluruh reviewer telah diberitahu");
        onTaskUpdated?.({ id: taskId, deliverableLink: res.deliverableLink, status: res.status });
      } else {
        showToast(res.error || "Gagal memperbarui link deliverable");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal memperbarui link");
    } finally {
      setIsSavingLink(false);
    }
  };

  const handleAddReviewer = async (userId: string) => {
    if (!taskId) return;
    setIsAddingReviewer(true);
    try {
      const res = await addTaskReviewerAction(taskId, userId);
      if (res.success) {
        setReviewers(res.reviewers || []);
        setShowAddReviewerDropdown(false);
        setReviewerSearchQuery("");
        showToast(res.message || "Reviewer berhasil ditambahkan");
        onTaskUpdated?.({ id: taskId, reviewers: res.reviewers });
      } else {
        showToast(res.error || "Gagal menambahkan reviewer");
      }
    } catch (err: any) {
      showToast(err.message || "Gagal menambahkan reviewer");
    } finally {
      setIsAddingReviewer(false);
    }
  };

  // Filter candidates for + ADD Reviewer (exclude currently assigned reviewers)
  const candidateReviewers = useMemo(() => {
    const assignedIds = new Set(reviewers.map((r) => r.id));
    const q = reviewerSearchQuery.trim().toLowerCase();

    return availableUsers.filter((u) => {
      if (assignedIds.has(u.id)) return false;
      if (!q) return true;
      return (
        u.name.toLowerCase().includes(q) ||
        (u.username && u.username.toLowerCase().includes(q)) ||
        (u.department && u.department.toLowerCase().includes(q))
      );
    });
  }, [availableUsers, reviewers, reviewerSearchQuery]);

  const isValidUrl = useMemo(() => {
    try {
      const u = new URL(deliverableLink);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  }, [deliverableLink]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl w-full max-h-[92vh] h-[92vh] p-0 overflow-hidden flex flex-col rounded-2xl border border-border shadow-2xl bg-card">
        {/* Modal Top Header */}
        <DialogHeader className="p-4 sm:px-6 border-b border-border/60 bg-secondary/20 flex flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
              <Eye className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <DialogTitle className="text-sm sm:text-base font-bold text-foreground truncate">
                  {task ? task.title : "Review Tugas"}
                </DialogTitle>
                {task?.status && (
                  <Badge
                    variant={
                      task.status === "Done"
                        ? "default"
                        : task.status === "In Review"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-[10px] px-2 py-0.5"
                  >
                    {task.status}
                  </Badge>
                )}
                {task?.priority && (
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 uppercase border-border/70"
                  >
                    {task.priority}
                  </Badge>
                )}
                {task?.taskOutputType && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                  >
                    {task.taskOutputType}
                  </Badge>
                )}
              </div>
              {task?.project && (
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  Proyek: <span className="font-semibold text-foreground">{task.project.code}</span> • {task.project.name}
                  {task.project.clientName && ` (${task.project.clientName})`}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        {/* Modal Two-Column Body */}
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-xs text-muted-foreground gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-purple-600" />
            <span>Memuat data review tugas...</span>
          </div>
        ) : !task ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-xs text-muted-foreground gap-2">
            <AlertCircle className="h-8 w-8 text-rose-500 opacity-80" />
            <p className="font-semibold text-foreground">Data tugas tidak ditemukan</p>
            <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl mt-2 text-xs">
              Tutup
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border/60">
            {/* LEFT COLUMN: Output Link & Task Details (col-span-5) */}
            <div className="lg:col-span-5 flex flex-col min-h-0 overflow-y-auto p-4 sm:p-5 space-y-5 bg-secondary/15 custom-scrollbar">
              {/* 1. DELIVERABLE LINK SECTION */}
              <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                      <LinkIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-foreground">Link Task</h4>
                      <p className="text-[10px] text-muted-foreground">Tautan hasil pengerjaan/draft untuk direview</p>
                    </div>
                  </div>
                  {isValidUrl && (
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        asChild
                        className="h-7 px-2 text-xs text-blue-600 dark:text-blue-400 hover:bg-blue-500/10 rounded-lg gap-1"
                        title="Buka link di tab baru"
                      >
                        <a href={deliverableLink} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-3 w-3" />
                          <span>Buka</span>
                        </a>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleCopyLink}
                        className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground rounded-lg gap-1"
                        title="Salin tautan"
                      >
                        {copiedLink ? (
                          <Check className="h-3 w-3 text-emerald-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        <span>{copiedLink ? "Disalin" : "Salin"}</span>
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    value={deliverableLink}
                    onChange={(e) => setDeliverableLink(e.target.value)}
                    placeholder="https://drive.google.com/... atau link preview"
                    className="text-xs h-9 rounded-xl bg-secondary/40 border-border/80 font-mono"
                  />

                  <Button
                    onClick={handleNotifyReviewers}
                    disabled={isSavingLink || !deliverableLink.trim()}
                    className="w-full h-9 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-sm gap-2"
                  >
                    {isSavingLink ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    <span>Beritahu Reviewer</span>
                  </Button>
                </div>
              </div>

              {/* 2. TASK DETAIL SUMMARY (READ-ONLY) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-foreground">
                  <span className="flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-purple-500" />
                    <span>Ringkasan Task</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-normal">
                    Due: {formatDate(task.dueDate)}
                  </span>
                </div>

                {/* Brief & Instructions */}
                <div className="p-3.5 rounded-xl bg-card border border-border/70 text-xs space-y-1.5">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wide">
                    Brief / Instruksi:
                  </span>
                  <div className="text-foreground leading-relaxed whitespace-pre-wrap select-text text-xs">
                    {task.description ? (
                      renderTextWithLinks(task.description)
                    ) : (
                      <span className="text-muted-foreground italic">Tidak ada deskripsi tertulis.</span>
                    )}
                  </div>
                </div>

                {/* Metadata Grid */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                    <span className="text-[10px] text-muted-foreground">Pelaksana (PIC):</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border">
                        <AvatarImage src={task.user?.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          {task.user?.name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground truncate text-xs">
                        {task.user?.name || "-"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-card border border-border/70 space-y-1">
                    <span className="text-[10px] text-muted-foreground">Pemberi Tugas:</span>
                    <div className="flex items-center gap-2 pt-0.5">
                      <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border">
                        <AvatarImage src={task.createdBy?.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px]">
                          {task.createdBy?.name?.[0] || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-foreground truncate text-xs">
                        {task.createdBy?.name || "Self-assigned"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timer Breakdown */}
                <div className="p-3.5 rounded-xl bg-card border border-border/70 text-xs space-y-2">
                  <div className="flex items-center justify-between text-muted-foreground">
                    <span className="flex items-center gap-1.5 font-bold text-[11px] text-foreground">
                      <Clock className="h-3.5 w-3.5 text-blue-500" />
                      <span>Rincian Waktu Pengerjaan:</span>
                    </span>
                    <span className="font-mono font-bold text-foreground">
                      {formatSecondsToHms(task.totalSeconds)}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Draft Awal</p>
                      <p className="font-mono font-semibold text-foreground">
                        {formatSecondsToHms(task.initialSeconds)}
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/50 border border-border/40">
                      <p className="text-muted-foreground text-[10px]">Fase Revisi</p>
                      <p className="font-mono font-semibold text-foreground">
                        {formatSecondsToHms(Math.max(0, (task.totalSeconds || 0) - (task.initialSeconds || 0)))}
                      </p>
                    </div>
                  </div>

                  {task.revisions && task.revisions.length > 0 && (
                    <div className="pt-1 space-y-1">
                      <span className="text-[10px] text-muted-foreground font-semibold">Riwayat Putaran Revisi:</span>
                      <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar">
                        {task.revisions.map((rev: any) => (
                          <div
                            key={rev.id}
                            className="p-1.5 px-2 rounded-md bg-secondary/40 border border-border/50 text-[10px] flex items-center justify-between"
                          >
                            <span className="font-medium text-foreground">Revisi #{rev.round}</span>
                            <span className="font-mono text-muted-foreground">{formatSecondsToHms(rev.seconds)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Reviewer Management & Task Chat (col-span-7) */}
            <div className="lg:col-span-7 flex flex-col min-h-0 overflow-hidden bg-card/60">
              {/* 1. REVIEWER HEADER BAR */}
              <div className="p-3 sm:px-5 border-b border-border/60 bg-secondary/30 flex items-center justify-between gap-2 shrink-0 relative">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <span className="text-xs font-bold text-foreground shrink-0">Reviewer Task:</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {reviewers.length === 0 ? (
                      <span className="text-[11px] text-muted-foreground italic">
                        Belum ada reviewer ditugaskan
                      </span>
                    ) : (
                      reviewers.map((rev) => (
                        <div
                          key={rev.id}
                          className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-card border border-border/70 text-xs shadow-2xs"
                          title={`${rev.name} (${rev.position || rev.role})`}
                        >
                          <Avatar className="h-4 w-4 shrink-0">
                            <AvatarImage src={rev.avatarUrl || ""} />
                            <AvatarFallback className="text-[8px] bg-purple-500/10 text-purple-600 font-bold">
                              {rev.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-[11px] font-medium text-foreground max-w-[100px] truncate">
                            {rev.name}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* + ADD Reviewer Button */}
                <div className="relative shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddReviewerDropdown((prev) => !prev)}
                    className="h-7 px-2.5 rounded-lg text-xs font-semibold border-purple-500/40 text-purple-600 dark:text-purple-400 hover:bg-purple-500/10 gap-1"
                  >
                    <UserPlus className="h-3 w-3" />
                    <span>+ ADD Reviewer</span>
                  </Button>

                  {/* Searchable Add Reviewer Dropdown Popover */}
                  {showAddReviewerDropdown && (
                    <div className="absolute right-0 top-9 w-64 z-50 bg-card/95 backdrop-blur-md border border-border shadow-2xl rounded-xl p-2 space-y-2 animate-in fade-in slide-in-from-top-2">
                      <div className="flex items-center justify-between pb-1 border-b border-border/50">
                        <span className="text-[11px] font-bold text-foreground">Tugaskan Reviewer Baru</span>
                        <button
                          onClick={() => setShowAddReviewerDropdown(false)}
                          className="p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>

                      <div className="relative">
                        <Search className="h-3 w-3 text-muted-foreground absolute left-2 top-2" />
                        <Input
                          autoFocus
                          value={reviewerSearchQuery}
                          onChange={(e) => setReviewerSearchQuery(e.target.value)}
                          placeholder="Cari nama anggota..."
                          className="h-7 pl-7 text-xs rounded-lg bg-secondary/50 border-border/60"
                        />
                      </div>

                      <div className="max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                        {isAddingReviewer ? (
                          <div className="flex items-center justify-center py-4 text-xs text-muted-foreground gap-1.5">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-purple-600" />
                            <span>Menambahkan reviewer...</span>
                          </div>
                        ) : candidateReviewers.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground text-center py-3 italic">
                            Tidak ada anggota lain tersedia
                          </p>
                        ) : (
                          candidateReviewers.map((user) => (
                            <button
                              key={user.id}
                              type="button"
                              onClick={() => handleAddReviewer(user.id)}
                              className="w-full flex items-center justify-between gap-2 p-1.5 rounded-lg hover:bg-secondary/70 text-left transition-colors text-xs"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-5 w-5 shrink-0">
                                  <AvatarImage src={user.avatarUrl || ""} />
                                  <AvatarFallback className="text-[9px]">
                                    {user.name?.[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                  <p className="font-medium text-foreground truncate text-[11px]">
                                    {user.name}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground truncate">
                                    {user.department || user.position || user.role}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[10px] text-purple-600 font-semibold shrink-0">
                                + Tambah
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* 2. TASK DISCUSSION THREAD */}
              <div className="flex-1 min-h-0 overflow-hidden">
                <TaskDiscussionThread
                  taskId={task.id}
                  currentUser={currentUser}
                />
              </div>
            </div>
          </div>
        )}

        {/* Floating Toast Notification inside Modal */}
        {toastMessage && (
          <div className="absolute bottom-4 left-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card border border-border shadow-xl text-xs animate-in fade-in slide-in-from-bottom-2">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            <span className="text-foreground font-medium">{toastMessage}</span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
