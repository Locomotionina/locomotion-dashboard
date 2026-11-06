"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { updateProjectMetadataAction, deleteProjectAction } from "@/actions/projects";
import { canDeleteProject } from "@/lib/departments";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Edit3,
  Loader2,
  AlertCircle,
  FolderKanban,
  FileText,
  Target,
  Layers,
  Calendar,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
} from "lucide-react";
import { AddMyTaskDialog } from "./AddMyTaskDialog";

interface ProjectData {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  priority: string;
  category: string;
  brief: string;
  goals: string;
  description: string;
  startDate?: Date | string | null;
  deadline?: Date | string | null;
}

interface ProjectHeroHeaderProps {
  project: ProjectData;
  currentUser?: {
    id?: string;
    name?: string;
    role?: string;
    position?: string;
    department?: string;
  } | null;
  currentUserId?: string;
  currentUserName?: string;
  canEdit: boolean; // MANAGEMENT or ADMIN
}

export function ProjectHeroHeader({
  project,
  currentUser,
  currentUserId,
  currentUserName,
  canEdit,
}: ProjectHeroHeaderProps) {
  const router = useRouter();

  const getInitialDateStr = (dateVal?: Date | string | null) => {
    if (!dateVal) return "";
    try {
      const d = new Date(dateVal);
      return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
    } catch {
      return "";
    }
  };

  // Local state to immediately reflect edits without full page reload
  const [name, setName] = useState(project.name);
  const [code, setCode] = useState(project.code);
  const [clientName, setClientName] = useState(project.clientName);
  const [category, setCategory] = useState(project.category);
  const [status, setStatus] = useState(project.status);
  const [priority, setPriority] = useState(project.priority);

  // Edit Modal State
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [formName, setFormName] = useState(project.name);
  const [formCode, setFormCode] = useState(project.code);
  const [formClientName, setFormClientName] = useState(project.clientName);
  const [formCategory, setFormCategory] = useState(project.category);
  const [formStatus, setFormStatus] = useState(project.status);
  const [formPriority, setFormPriority] = useState(project.priority);
  const [formBrief, setFormBrief] = useState(project.brief);
  const [formGoals, setFormGoals] = useState(project.goals);
  const [formDescription, setFormDescription] = useState(project.description);
  const [formStartDate, setFormStartDate] = useState(getInitialDateStr(project.startDate));
  const [formDeadline, setFormDeadline] = useState(getInitialDateStr(project.deadline));

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // RBAC for Project Deletion: Only Account Executive (AE) and Project Manager (PM)
  const canDelete = canDeleteProject(currentUser);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = (message: string, type: "success" | "error" = "success") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await deleteProjectAction(project.id);
      if (res.success) {
        setIsConfirmDeleteOpen(false);
        showToast(
          res.message || "Project berhasil dihapus dan seluruh task terkait telah diubah statusnya menjadi DONE.",
          "success"
        );
        router.push("/projects");
        router.refresh();
      } else {
        showToast(res.error || "Gagal menghapus project.", "error");
      }
    } catch (err: any) {
      showToast(err.message || "Terjadi kesalahan saat menghapus project.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenEdit = () => {
    if (!canEdit) return;
    setFormName(name);
    setFormCode(code);
    setFormClientName(clientName);
    setFormCategory(category);
    setFormStatus(status);
    setFormPriority(priority);
    setFormBrief(project.brief);
    setFormGoals(project.goals);
    setFormDescription(project.description);
    setFormStartDate(getInitialDateStr(project.startDate));
    setFormDeadline(getInitialDateStr(project.deadline));
    setError(null);
    setIsEditOpen(true);
  };

  const handleSaveMetadata = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("projectId", project.id);
    formData.append("name", formName);
    formData.append("code", formCode);
    formData.append("clientName", formClientName);
    formData.append("category", formCategory);
    formData.append("status", formStatus);
    formData.append("priority", formPriority);
    formData.append("brief", formBrief);
    formData.append("goals", formGoals);
    formData.append("description", formDescription);
    formData.append("startDate", formStartDate);
    formData.append("deadline", formDeadline);

    const result = await updateProjectMetadataAction(formData);
    setSaving(false);

    if (result.success && result.project) {
      // Immediately reflect changes on UI without requiring full page reload
      setName(result.project.name);
      setCode(result.project.code);
      setClientName(result.project.clientName);
      setCategory(result.project.category);
      setStatus(result.project.status);
      setPriority(result.project.priority);
      setIsEditOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to update project metadata.");
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACTIVE":
        return <Badge variant="success">Active</Badge>;
      case "ON_HOLD":
        return <Badge variant="secondary">On Hold</Badge>;
      case "DONE":
      case "DELIVERED":
        return <Badge variant="cyan">Done</Badge>;
      case "PITCH":
        return <Badge variant="purple">Pitch</Badge>;
      case "IN_REVIEW":
        return <Badge variant="warning">In Review</Badge>;
      default:
        return <Badge>{st}</Badge>;
    }
  };

  const getPriorityBadge = (pr: string) => {
    switch (pr) {
      case "URGENT":
        return <Badge variant="destructive">URGENT PRIORITY</Badge>;
      case "HIGH":
        return <Badge variant="warning">HIGH PRIORITY</Badge>;
      case "MEDIUM":
        return <Badge variant="default">MEDIUM PRIORITY</Badge>;
      default:
        return <Badge variant="secondary">LOW PRIORITY</Badge>;
    }
  };

  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-md border border-indigo-500/20">
              {code}
            </span>
            {getStatusBadge(status)}
            {getPriorityBadge(priority)}
            <Badge variant="outline">{category}</Badge>
          </div>

          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground pt-1">
            Client: {clientName}
          </p>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            {name}
          </h1>
        </div>

        {/* Action Controls */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Delete Project action strictly rendered ONLY for Account Executive (AE) and Project Manager (PM) */}
          {canDelete && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConfirmDeleteOpen(true)}
              className="gap-1.5 text-xs h-9 border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-300 hover:border-rose-500/60 font-semibold transition-all"
            >
              <Trash2 className="h-4 w-4 text-rose-500" />
              <span>Delete Project</span>
            </Button>
          )}

          {/* Edit Project Details button strictly for Management & Admin */}
          {canEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleOpenEdit}
              className="gap-1.5 text-xs h-9 border-indigo-500/40 hover:bg-indigo-500/10 text-indigo-600 dark:text-indigo-300 font-semibold transition-all"
            >
              <Edit3 className="h-4 w-4" />
              <span>Edit Project Details</span>
            </Button>
          )}

          {/* Quick Action: "Add My Task for this Project" */}
          <AddMyTaskDialog
            projectId={project.id}
            projectName={name}
            clientName={clientName}
            currentUserId={currentUserId}
            currentUserName={currentUserName}
          />
        </div>
      </div>

      {/* Management / Admin Edit Modal */}
      {canEdit && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSaveMetadata} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Edit3 className="h-5 w-5 text-indigo-400" />
                  <span>Edit Project Details & Metadata</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update project metadata, overarching status, urgency, client, and execution brief. Exclusively accessible to Management & Admin roles.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4 py-2">
                {/* Project Title & Code */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 space-y-1.5">
                    <Label htmlFor="edit-name" className="text-xs font-semibold">
                      Project Title
                    </Label>
                    <Input
                      id="edit-name"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="e.g. Air Max Day 2026 Immersive Hub"
                      className="text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-code" className="text-xs font-semibold">
                      Project Code
                    </Label>
                    <Input
                      id="edit-code"
                      value={formCode}
                      onChange={(e) => setFormCode(e.target.value)}
                      placeholder="e.g. LOCO-NK-02"
                      className="text-xs h-9 font-mono uppercase"
                      required
                    />
                  </div>
                </div>

                {/* Client Name & Category */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-client" className="text-xs font-semibold">
                      Client / Brand Name
                    </Label>
                    <Input
                      id="edit-client"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="e.g. Nike Global"
                      className="text-xs h-9"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-category" className="text-xs font-semibold">
                      Category
                    </Label>
                    <Input
                      id="edit-category"
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      placeholder="e.g. Digital Campaign, WebGL Experience"
                      className="text-xs h-9"
                      required
                    />
                  </div>
                </div>

                {/* Overarching Status & Urgency/Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-status" className="text-xs font-semibold">
                      Project Status
                    </Label>
                    <select
                      id="edit-status"
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="ACTIVE" className="bg-popover text-foreground">Active</option>
                      <option value="ON_HOLD" className="bg-popover text-foreground">On Hold</option>
                      <option value="DONE" className="bg-popover text-foreground">Done</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-priority" className="text-xs font-semibold">
                      Urgency / Priority
                    </Label>
                    <select
                      id="edit-priority"
                      value={formPriority}
                      onChange={(e) => setFormPriority(e.target.value)}
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                    >
                      <option value="URGENT" className="bg-popover text-foreground">URGENT</option>
                      <option value="HIGH" className="bg-popover text-foreground">HIGH</option>
                      <option value="MEDIUM" className="bg-popover text-foreground">MEDIUM</option>
                      <option value="LOW" className="bg-popover text-foreground">LOW</option>
                    </select>
                  </div>
                </div>

                {/* Timeline Parameters: Start Date & End Date */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-start-date" className="text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                      <span>Start Project Date</span>
                    </Label>
                    <Input
                      id="edit-start-date"
                      type="date"
                      value={formStartDate}
                      onChange={(e) => setFormStartDate(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-deadline" className="text-xs font-semibold flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-emerald-500 dark:text-emerald-400" />
                      <span>End Project Date (Deadline)</span>
                    </Label>
                    <Input
                      id="edit-deadline"
                      type="date"
                      value={formDeadline}
                      onChange={(e) => setFormDeadline(e.target.value)}
                      className="text-xs h-9"
                    />
                  </div>
                </div>

                {/* Optional Brief, Goals, Scope editing in the same modal */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Project Descriptions & Scope
                  </p>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-brief" className="text-xs font-medium flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Client Brief</span>
                    </Label>
                    <Textarea
                      id="edit-brief"
                      rows={2}
                      value={formBrief}
                      onChange={(e) => setFormBrief(e.target.value)}
                      placeholder="What is the client asking for?..."
                      className="text-xs resize-y"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-goals" className="text-xs font-medium flex items-center gap-1.5">
                      <Target className="h-3.5 w-3.5 text-purple-400" />
                      <span>Strategic Goals & KPIs</span>
                    </Label>
                    <Textarea
                      id="edit-goals"
                      rows={2}
                      value={formGoals}
                      onChange={(e) => setFormGoals(e.target.value)}
                      placeholder="Key performance metrics and deliverables..."
                      className="text-xs resize-y"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="edit-scope" className="text-xs font-medium flex items-center gap-1.5">
                      <Layers className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Agency Execution Scope</span>
                    </Label>
                    <Textarea
                      id="edit-scope"
                      rows={2}
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="Technical and creative execution scope..."
                      className="text-xs resize-y"
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-2 border-t border-border/50">
                {canDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditOpen(false);
                      setIsConfirmDeleteOpen(true);
                    }}
                    className="border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/60 font-semibold text-xs h-9 gap-1.5 self-start sm:self-auto"
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                    <span>Delete Project</span>
                  </Button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditOpen(false)}
                    disabled={saving}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saving} className="gap-2">
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    <span>Save Project Changes</span>
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Confirmation Modal Pop-up */}
      <Dialog
        open={isConfirmDeleteOpen}
        onOpenChange={(open) => !open && !isDeleting && setIsConfirmDeleteOpen(false)}
      >
        <DialogContent className="max-w-md p-6">
          <DialogHeader className="space-y-3 text-left">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
              </div>
              <DialogTitle className="text-lg font-bold text-foreground">
                Hapus Project?
              </DialogTitle>
            </div>
            <DialogDescription className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              Apakah Anda yakin ingin menghapus project ini? Seluruh task yang terdaftar di dalam project ini akan otomatis diubah statusnya menjadi DONE di setiap akun anggota tim.
            </DialogDescription>
          </DialogHeader>

          <div className="p-3 rounded-xl bg-secondary/50 border border-border/60 text-xs space-y-1 my-2">
            <div className="font-semibold text-foreground flex items-center gap-2">
              <span className="font-mono text-indigo-400 text-[11px] font-bold">
                {code}
              </span>
              <span>•</span>
              <span className="truncate">{name}</span>
            </div>
            <div className="text-muted-foreground text-[11px]">
              Client: {clientName}
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2 pt-4 border-t border-border/50">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsConfirmDeleteOpen(false)}
              disabled={isDeleting}
              className="text-xs h-9"
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="text-xs h-9 bg-rose-600 hover:bg-rose-700 text-white font-semibold gap-2"
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
              <span>Ya, Hapus Project</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Success / Error Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl text-xs font-semibold backdrop-blur-md border animate-fade-in ${
            toast.type === "error"
              ? "bg-rose-600/95 text-white border-rose-500 shadow-rose-900/30"
              : "bg-emerald-600/95 text-white border-emerald-500 shadow-emerald-900/30"
          }`}
        >
          {toast.type === "error" ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-white" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-white" />
          )}
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-2 text-white/80 hover:text-white p-0.5 rounded-full hover:bg-white/10"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </>
  );
}
