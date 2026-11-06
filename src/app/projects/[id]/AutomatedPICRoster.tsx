"use client";

import { useState, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Users,
  Clock,
  CheckCircle2,
  Filter,
  X,
  Layers,
  Send,
  Eye,
  Calendar,
  AlertCircle,
  FileText,
  ListTodo,
} from "lucide-react";
import { formatDate, formatRelativeDays, renderTextWithLinks } from "@/lib/utils";

interface TaskUserSummary {
  id: string;
  name: string;
  username?: string | null;
  position?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
}

export interface PICTask {
  id: string;
  title: string;
  description?: string | null;
  taskOutputType?: string | null;
  estimatedHours?: number | null;
  status: string;
  priority: string;
  dueDate: Date | string | null;
  userId?: string;
  createdById?: string | null;
  reviewerId?: string | null;
  previewDescription?: string | null;
  user?: TaskUserSummary | null;
  createdBy?: TaskUserSummary | null;
  reviewer?: TaskUserSummary | null;
}

export interface PICMember {
  id: string;
  name: string;
  username: string;
  position: string;
  department: string;
  avatarUrl: string | null;
  totalTasks: number;
  activeTasks: number;
  doneTasks: number;
  tasks: PICTask[];
}

interface AutomatedPICRosterProps {
  pics: PICMember[];
  tasks?: PICTask[];
}

export function AutomatedPICRoster({ pics, tasks }: AutomatedPICRosterProps) {
  // Consolidate all project tasks from props or fallback to pics
  const allTasks: PICTask[] = useMemo(() => {
    if (tasks && tasks.length > 0) {
      return tasks;
    }
    // Flatten from pics if tasks not explicitly provided
    return pics.flatMap((p) =>
      p.tasks.map((t) => ({
        ...t,
        user: t.user || {
          id: p.id,
          name: p.name,
          username: p.username,
          position: p.position,
          department: p.department,
          avatarUrl: p.avatarUrl,
        },
      }))
    );
  }, [tasks, pics]);

  // Filters State
  const [nameFilter, setNameFilter] = useState<string>("ALL");
  const [outputTypeFilter, setOutputTypeFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Selected Task for Detail Modal
  const [selectedTask, setSelectedTask] = useState<PICTask | null>(null);

  // Summary Metrics calculations
  const totalStaffAssigned = useMemo(() => {
    if (pics && pics.length > 0) return pics.length;
    const uniqueUserIds = new Set(
      allTasks.map((t) => t.user?.id || t.userId).filter(Boolean)
    );
    return uniqueUserIds.size;
  }, [pics, allTasks]);

  const totalActiveTasks = useMemo(() => {
    return allTasks.filter((t) => t.status !== "Done").length;
  }, [allTasks]);

  const totalDoneTasks = useMemo(() => {
    return allTasks.filter((t) => t.status === "Done").length;
  }, [allTasks]);

  // Unique Names for Filter Dropdown
  const uniqueNames = useMemo(() => {
    const names = new Set<string>();
    allTasks.forEach((t) => {
      if (t.user?.name) names.add(t.user.name);
    });
    pics.forEach((p) => {
      if (p.name) names.add(p.name);
    });
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allTasks, pics]);

  // Unique Output Types for Filter Dropdown
  const uniqueOutputTypes = useMemo(() => {
    const types = new Set<string>(["Thumbnail", "Carousel", "Single Post", "Story"]);
    allTasks.forEach((t) => {
      if (t.taskOutputType && t.taskOutputType.trim()) {
        types.add(t.taskOutputType.trim());
      }
    });
    return Array.from(types).sort((a, b) => a.localeCompare(b));
  }, [allTasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      // 1. Name Filter
      if (nameFilter !== "ALL") {
        const assignedName = task.user?.name || "";
        if (assignedName !== nameFilter) {
          return false;
        }
      }

      // 2. Output Type Filter
      if (outputTypeFilter !== "ALL") {
        if (outputTypeFilter === "UNSPECIFIED") {
          if (task.taskOutputType && task.taskOutputType.trim() !== "") {
            return false;
          }
        } else {
          if (task.taskOutputType !== outputTypeFilter) {
            return false;
          }
        }
      }

      // 3. Status Filter
      if (statusFilter !== "ALL") {
        if (task.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [allTasks, nameFilter, outputTypeFilter, statusFilter]);

  const isFiltered =
    nameFilter !== "ALL" || outputTypeFilter !== "ALL" || statusFilter !== "ALL";

  const handleResetFilters = () => {
    setNameFilter("ALL");
    setOutputTypeFilter("ALL");
    setStatusFilter("ALL");
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="destructive" className="text-[9px] px-1.5 py-0">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[9px] px-1.5 py-0">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="default" className="text-[9px] px-1.5 py-0">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px] px-1.5 py-0">LOW</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Done":
        return (
          <Badge variant="success" className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
            Done
          </Badge>
        );
      case "On Progress":
        return (
          <Badge variant="default" className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
            On Progress
          </Badge>
        );
      case "In Review":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 whitespace-nowrap">
            In Review
          </span>
        );
      case "Revision":
        return (
          <Badge variant="destructive" className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
            Revision
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] font-semibold px-2 py-0.5 whitespace-nowrap">
            To Do
          </Badge>
        );
    }
  };

  return (
    <>
      <Card className="border-border/80 bg-card/70 transition-all hover:border-border overflow-hidden">
        {/* Card Header with PIC Roster Overview */}
        <CardHeader className="p-5 pb-4 space-y-3 border-b border-border/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
                <Users className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <CardTitle className="text-base sm:text-lg font-bold text-foreground">
                    Automated PIC Roster & Task Breakdown
                  </CardTitle>
                  <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/25 font-semibold">
                    {totalStaffAssigned} Staff Assigned
                  </span>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  Structured overview of assigned staff and project deliverables.
                </CardDescription>
              </div>
            </div>

            {/* Quick Assigned Staff Avatars Stack */}
            {pics.length > 0 && (
              <div className="flex items-center -space-x-2 overflow-hidden py-1 self-start sm:self-auto shrink-0">
                {pics.slice(0, 5).map((pic) => (
                  <Avatar
                    key={pic.id}
                    title={`${pic.name} (${pic.position || pic.department})`}
                    className="inline-block h-8 w-8 rounded-full ring-2 ring-background border border-border/60 shrink-0 cursor-default"
                  >
                    <AvatarImage src={pic.avatarUrl || ""} />
                    <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                      {pic.name[0]?.toUpperCase() || "?"}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {pics.length > 5 && (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-foreground text-[10px] font-bold ring-2 ring-background border border-border/60">
                    +{pics.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>
        </CardHeader>

        {/* 2. Metrics Header: Clean, modern typography and proper spacing */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 sm:p-5 border-b border-border/50 bg-secondary/15">
          {/* STAFF ASSIGNED */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shrink-0">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                STAFF ASSIGNED:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 tracking-tight block">
                {totalStaffAssigned}
              </span>
            </div>
          </div>

          {/* TASK ACTIVE */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
            <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                TASK ACTIVE:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 tracking-tight block">
                {totalActiveTasks}
              </span>
            </div>
          </div>

          {/* TASK COMPLETE */}
          <div className="flex items-center gap-3.5 p-3.5 rounded-xl bg-card border border-border/70 shadow-2xs">
            <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-wider block">
                TASK COMPLETE:
              </span>
              <span className="text-xl sm:text-2xl font-bold text-foreground mt-0.5 tracking-tight block">
                {totalDoneTasks}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Interactive Filtering: Dropdowns directly above the task table */}
        <div className="p-4 sm:p-5 border-b border-border/50 bg-card/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
              <Filter className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                Filter Task Table
              </span>
              <span className="text-[11px] text-muted-foreground">
                ({filteredTasks.length} dari {allTasks.length} task)
              </span>
            </div>

            {isFiltered && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground self-start sm:self-auto gap-1.5"
              >
                <X className="h-3 w-3" />
                <span>Reset Filter</span>
              </Button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Name Filter Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Filter Nama
              </label>
              <Select value={nameFilter} onValueChange={setNameFilter}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/80 border-border/70">
                  <SelectValue placeholder="Semua Nama (All Staff)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Nama (All Staff)</SelectItem>
                  {uniqueNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Task Output Type Filter Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Tipe Output Task
              </label>
              <Select value={outputTypeFilter} onValueChange={setOutputTypeFilter}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/80 border-border/70">
                  <SelectValue placeholder="Semua Tipe Output" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Tipe Output</SelectItem>
                  {uniqueOutputTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                  <SelectItem value="UNSPECIFIED">Tanpa Output Type</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter Dropdown */}
            <div className="space-y-1">
              <label className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                Status Task
              </label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 text-xs rounded-xl bg-background/80 border-border/70">
                  <SelectValue placeholder="Semua Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Status</SelectItem>
                  <SelectItem value="To Do">To Do</SelectItem>
                  <SelectItem value="On Progress">On Progress</SelectItem>
                  <SelectItem value="In Review">In Review</SelectItem>
                  <SelectItem value="Revision">Revision</SelectItem>
                  <SelectItem value="Done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* 2. Modern UI Table */}
        <CardContent className="p-4 sm:p-5 pt-4">
          <div className="rounded-xl border border-border/70 overflow-hidden bg-card shadow-2xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-border/60 bg-slate-50 dark:bg-slate-900/60 text-muted-foreground font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">NAMA</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap min-w-[200px]">TASK TITLE</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">TIPE OUTPUT TASK</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">DUE DATE</th>
                    <th className="py-3 px-4 font-semibold whitespace-nowrap">STATUS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40 text-foreground">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">
                        {allTasks.length === 0 ? (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Users className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-xs font-semibold text-foreground">
                              Belum ada task pada proyek ini
                            </p>
                            <p className="text-[11px] text-muted-foreground max-w-sm">
                              Klik tombol &ldquo;Add My Task for this Project&rdquo; di header untuk menambahkan task pertama Anda.
                            </p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center space-y-2">
                            <Filter className="h-8 w-8 text-muted-foreground/40" />
                            <p className="text-xs font-semibold text-foreground">
                              Tidak ada task yang cocok dengan kriteria filter
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              Silakan sesuaikan kembali filter nama, tipe output, atau status.
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleResetFilters}
                              className="mt-2 h-7 px-3 text-xs"
                            >
                              Reset Semua Filter
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task) => {
                      const isInReview = task.status === "In Review";
                      const isDelegated = Boolean(
                        task.createdById && task.userId && task.createdById !== task.userId
                      );

                      return (
                        <tr
                          key={task.id}
                          onClick={() => setSelectedTask(task)}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors cursor-pointer group"
                        >
                          {/* Column 1: NAMA */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2.5">
                              <Avatar className="h-8 w-8 ring-1 ring-border/60 shrink-0">
                                <AvatarImage src={task.user?.avatarUrl || ""} />
                                <AvatarFallback className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
                                  {task.user?.name ? task.user.name[0]?.toUpperCase() : "?"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <div className="font-semibold text-foreground text-xs leading-tight truncate">
                                  {task.user?.name || "Unassigned"}
                                </div>
                                {task.user?.position && (
                                  <div className="text-[10px] text-muted-foreground truncate leading-tight mt-0.5">
                                    {task.user.position}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Column 2: TASK TITLE */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1 max-w-md">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-foreground text-xs leading-snug group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {task.title}
                                </span>
                                {task.priority && task.priority !== "LOW" && (
                                  <span className="shrink-0">{getPriorityBadge(task.priority)}</span>
                                )}
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-muted-foreground line-clamp-1 font-normal break-words">
                                  {renderTextWithLinks(task.description)}
                                </p>
                              )}

                              {/* Subtle review or delegated indicator */}
                              {isInReview && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-medium">
                                  <Eye className="h-3 w-3" />
                                  <span>Review: {task.reviewer?.name || "In Review"}</span>
                                </span>
                              )}
                              {isDelegated && !isInReview && task.createdBy && (
                                <span className="inline-flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 font-normal">
                                  <Send className="h-3 w-3" />
                                  <span>by {task.createdBy.name}</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Column 3: TIPE OUTPUT TASK */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.taskOutputType ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/25">
                                {task.taskOutputType}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic font-mono">
                                —
                              </span>
                            )}
                          </td>

                          {/* Column 4: DUE DATE */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.dueDate ? (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                                <Clock className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
                                <span>{formatDate(task.dueDate)}</span>
                              </div>
                            ) : (
                              <span className="text-[11px] text-muted-foreground/60 italic font-mono">
                                —
                              </span>
                            )}
                          </td>

                          {/* Column 5: STATUS */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {getStatusBadge(task.status)}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Task Details Dialog */}
      <Dialog
        open={Boolean(selectedTask)}
        onOpenChange={(open) => {
          if (!open) setSelectedTask(null);
        }}
      >
        <DialogContent className="max-w-xl max-h-[88vh] overflow-y-auto space-y-4">
          {selectedTask && (
            <>
              <DialogHeader className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {getStatusBadge(selectedTask.status)}
                  {getPriorityBadge(selectedTask.priority)}
                  {selectedTask.taskOutputType && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                      {selectedTask.taskOutputType}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-base sm:text-lg font-bold text-foreground leading-snug">
                  {selectedTask.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Detail penugasan task pada proyek ini.
                </DialogDescription>
              </DialogHeader>

              {/* Assignee & Dates Bar */}
              <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 text-xs">
                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    Penanggung Jawab (NAMA):
                  </span>
                  <div className="flex items-center gap-2 mt-1">
                    <Avatar className="h-6 w-6 ring-1 ring-border shrink-0">
                      <AvatarImage src={selectedTask.user?.avatarUrl || ""} />
                      <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-bold text-[10px]">
                        {selectedTask.user?.name ? selectedTask.user.name[0]?.toUpperCase() : "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <span className="font-semibold text-foreground block truncate">
                        {selectedTask.user?.name || "Unassigned"}
                      </span>
                      {selectedTask.user?.position && (
                        <span className="text-[10px] text-muted-foreground block truncate">
                          {selectedTask.user.position}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">
                    DUE DATE:
                  </span>
                  <div className="flex items-center gap-1.5 font-medium text-foreground mt-1">
                    <Clock className="h-3.5 w-3.5 text-indigo-500" />
                    <span>{selectedTask.dueDate ? formatDate(selectedTask.dueDate) : "Tidak ada deadline"}</span>
                  </div>
                  {selectedTask.dueDate && (
                    <span className="text-[10px] text-muted-foreground block mt-0.5">
                      ({formatRelativeDays(selectedTask.dueDate)})
                    </span>
                  )}
                </div>
              </div>

              {/* Review Callout if In Review */}
              {selectedTask.status === "In Review" && (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-purple-700 dark:text-purple-300">
                    <span className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4 shrink-0" />
                      <span>Review Context</span>
                    </span>
                    <span className="text-[11px] text-foreground bg-card/80 px-2 py-0.5 rounded border border-purple-500/20">
                      Reviewer: {selectedTask.reviewer?.name || "Belum Ditentukan"}
                    </span>
                  </div>
                  {selectedTask.previewDescription && (
                    <div className="bg-card/90 p-2.5 rounded-lg border border-purple-500/20 text-foreground italic text-xs leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap break-words custom-scrollbar">
                      &ldquo;{renderTextWithLinks(selectedTask.previewDescription)}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* Delegated Task Callout */}
              {selectedTask.createdById &&
                selectedTask.userId &&
                selectedTask.createdById !== selectedTask.userId && (
                  <div className="rounded-xl border border-blue-500/25 bg-blue-500/5 p-3 text-xs text-blue-700 dark:text-blue-300 flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-medium">
                      <Send className="h-3.5 w-3.5" />
                      <span>Didelegasikan ke: <strong>{selectedTask.user?.name}</strong></span>
                    </span>
                    {selectedTask.createdBy && (
                      <span className="text-[11px] text-muted-foreground">
                        Pemberi: <strong>{selectedTask.createdBy.name}</strong>
                      </span>
                    )}
                  </div>
                )}

              {/* Task Description */}
              <div className="space-y-1.5 pt-1">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Deskripsi / Brief Task</span>
                </span>
                <div className="p-3 rounded-xl bg-secondary/30 border border-border/40 text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap break-words max-h-48 overflow-y-auto custom-scrollbar">
                  {selectedTask.description ? (
                    renderTextWithLinks(selectedTask.description)
                  ) : (
                    <span className="italic text-muted-foreground/60">
                      Tidak ada deskripsi rinci untuk task ini.
                    </span>
                  )}
                </div>
              </div>

              <DialogFooter className="pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedTask(null)}
                  className="rounded-xl text-xs h-8 px-4"
                >
                  Tutup
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
