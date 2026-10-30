"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  ChevronDown,
  ChevronUp,
  Maximize2,
  ListTodo,
  ExternalLink,
  Eye,
  Send,
  MessageSquare,
} from "lucide-react";
import { formatDate, formatRelativeDays } from "@/lib/utils";

interface TaskUserSummary {
  id: string;
  name: string;
  username?: string | null;
  position?: string | null;
  department?: string | null;
  avatarUrl?: string | null;
}

interface PICTask {
  id: string;
  title: string;
  description?: string | null;
  taskOutputType?: string | null;
  estimatedHours?: number | null;
  status: string;
  priority: string;
  dueDate: Date | null;
  userId?: string;
  createdById?: string | null;
  reviewerId?: string | null;
  previewDescription?: string | null;
  user?: TaskUserSummary | null;
  createdBy?: TaskUserSummary | null;
  reviewer?: TaskUserSummary | null;
}

interface PICMember {
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

export function AutomatedPICRoster({ pics }: { pics: PICMember[] }) {
  const [expandedMember, setExpandedMember] = useState<string | null>(
    pics.length > 0 ? pics[0].id : null
  );
  const [isAllDetailsOpen, setIsAllDetailsOpen] = useState(false);
  const [selectedFilterMemberId, setSelectedFilterMemberId] = useState<string>("all");

  const toggleExpand = (id: string) => {
    setExpandedMember((prev) => (prev === id ? null : id));
  };

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <Badge variant="destructive" className="text-[9px]">URGENT</Badge>;
      case "HIGH":
        return <Badge variant="warning" className="text-[9px]">HIGH</Badge>;
      case "MEDIUM":
        return <Badge variant="default" className="text-[9px]">MEDIUM</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px]">LOW</Badge>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case "Done":
        return <Badge variant="success" className="text-[9px]">Done</Badge>;
      case "On Progress":
        return <Badge variant="default" className="text-[9px]">On Progress</Badge>;
      case "In Review":
        return <Badge variant="purple" className="text-[9px]">In Review</Badge>;
      case "Revision":
        return <Badge variant="destructive" className="text-[9px]">Revision</Badge>;
      default:
        return <Badge variant="secondary" className="text-[9px]">To Do</Badge>;
    }
  };

  const totalActiveTasks = pics.reduce((acc, p) => acc + p.activeTasks, 0);
  const totalDoneTasks = pics.reduce((acc, p) => acc + p.doneTasks, 0);
  const totalAllTasks = pics.reduce((acc, p) => acc + p.totalTasks, 0);

  const displayPics =
    selectedFilterMemberId === "all"
      ? pics
      : pics.filter((p) => p.id === selectedFilterMemberId);

  return (
    <>
      <Card className="border-border/80 bg-card/70">
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-start gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0 mt-0.5">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <CardTitle className="text-base font-semibold leading-tight text-foreground">
                  Automated PIC Roster
                </CardTitle>
                <span className="text-[10px] font-mono uppercase bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded border border-indigo-500/20 whitespace-nowrap">
                  {pics.length} Staff Assigned
                </span>
              </div>
              <CardDescription className="text-xs mt-1 leading-normal text-muted-foreground">
                Automatically queried from active & linked tasks assigned to this project.
              </CardDescription>
            </div>
          </div>

          {/* Centralized View All Staff Details Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedFilterMemberId("all");
              setIsAllDetailsOpen(true);
            }}
            disabled={pics.length === 0}
            className="w-full flex items-center justify-center gap-2 h-9 px-3 text-xs font-semibold border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 transition-colors shadow-2xs rounded-lg"
          >
            <Maximize2 className="h-3.5 w-3.5 shrink-0 text-indigo-500 dark:text-indigo-400" />
            <span>View All Staff Details</span>
          </Button>
        </CardHeader>

        <CardContent className="space-y-3 pt-0">
          {pics.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 p-6 text-center space-y-2">
              <Users className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-xs font-semibold text-foreground">
                No Staff currently assigned to this project
              </p>
              <p className="text-[11px] text-muted-foreground">
                Staff members can click &ldquo;Add My Task for this Project&rdquo; to join this project roster.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {pics.map((pic) => {
                const isExpanded = expandedMember === pic.id;

                return (
                  <div
                    key={pic.id}
                    className="rounded-lg border border-border/60 bg-secondary/30 transition-all hover:border-indigo-500/40 overflow-hidden"
                  >
                    {/* Summary Bar */}
                    <div
                      onClick={() => toggleExpand(pic.id)}
                      className="p-3 cursor-pointer select-none transition-colors hover:bg-secondary/40"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-9 w-9 ring-1 ring-border shrink-0 mt-0.5">
                          <AvatarImage src={pic.avatarUrl || ""} />
                          <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-semibold text-xs">
                            {pic.name[0]}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 space-y-1.5">
                          {/* Row 1: User Name & Expand Chevron */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground leading-snug break-words">
                                {pic.name}
                              </p>
                              {pic.username && pic.username !== pic.name && (
                                <p className="text-[10px] text-muted-foreground/75 font-mono truncate">
                                  @{pic.username}
                                </p>
                              )}
                            </div>
                            <div className="text-muted-foreground hover:text-foreground shrink-0 mt-0.5">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </div>
                          </div>

                          {/* Row 2: Department Badge & Role/Position */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal shrink-0">
                              {pic.department}
                            </Badge>
                            {pic.position && (
                              <span className="text-[11px] text-muted-foreground leading-tight break-words">
                                {pic.position}
                              </span>
                            )}
                          </div>

                          {/* Row 3: Task Count Status Pill (Strictly separate row, never overlapping) */}
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <span className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-md bg-secondary/80 border border-border/50 text-muted-foreground">
                              <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                                {pic.activeTasks} active
                              </span>
                              <span className="text-muted-foreground/50">•</span>
                              <span>
                                {pic.doneTasks} done
                              </span>
                            </span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              ({pic.totalTasks} total)
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Quick Inline Task Breakdown */}
                    {isExpanded && (
                      <div className="border-t border-border/40 bg-card/40 p-3 space-y-2">
                        <div className="flex items-center justify-between text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                          <span>Assigned Project Tasks ({pic.tasks.length}):</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedFilterMemberId(pic.id);
                              setIsAllDetailsOpen(true);
                            }}
                            className="text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-medium lowercase"
                          >
                            <span>buka rincian lengkap</span>
                            <ExternalLink className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        {pic.tasks.length === 0 ? (
                          <div className="p-3 text-center text-xs text-muted-foreground border border-dashed rounded border-border/50">
                            No tasks assigned yet
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {pic.tasks.map((task) => (
                              <div
                                key={task.id}
                                onClick={() => {
                                  setSelectedFilterMemberId(pic.id);
                                  setIsAllDetailsOpen(true);
                                }}
                                className="p-2 rounded-md bg-secondary/50 border border-border/30 hover:border-indigo-500/40 cursor-pointer transition-colors space-y-1"
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <span className="text-foreground font-medium text-xs break-words line-clamp-1 flex-1">
                                    {task.title}
                                  </span>
                                  <div className="shrink-0 flex items-center gap-1">
                                    {task.taskOutputType && (
                                      <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                        {task.taskOutputType}
                                      </span>
                                    )}
                                    {getPriorityBadge(task.priority)}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between gap-2 text-[10px] text-muted-foreground pt-0.5 flex-wrap">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {getStatusBadge(task.status)}
                                    {task.status === "In Review" && (
                                      <span className="text-[9px] text-purple-600 dark:text-purple-400 font-medium">
                                        ({!task.createdById || task.createdById === task.userId ? "Preview" : "Delegated"})
                                      </span>
                                    )}
                                  </div>
                                  {task.dueDate && (
                                    <span className="flex items-center gap-1 shrink-0 font-mono text-[10px]">
                                      <Clock className="h-3 w-3 text-indigo-400" />
                                      <span>{formatDate(task.dueDate)}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Centralized Staff Details Modal */}
      <Dialog
        open={isAllDetailsOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAllDetailsOpen(false);
          }
        }}
      >
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-hidden flex flex-col p-0">
          {/* Modal Header */}
          <DialogHeader className="p-5 pb-4 border-b border-border/60 bg-secondary/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5">
                  <Users className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                    All Staff Task Breakdown
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                    Full task breakdown for all team members assigned to this project.
                  </DialogDescription>
                </div>
              </div>

              {/* Overall Project Stats */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-lg font-semibold text-xs">
                  {totalActiveTasks} Active Tasks
                </span>
                <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-lg font-semibold text-xs">
                  {totalDoneTasks} Done
                </span>
                <span className="bg-secondary text-foreground/80 border border-border px-2.5 py-1 rounded-lg font-mono text-xs">
                  {pics.length} Staff
                </span>
              </div>
            </div>

            {/* Staff Filter Tabs (if more than 1 member) */}
            {pics.length > 1 && (
              <div className="flex items-center gap-1.5 pt-3 overflow-x-auto no-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedFilterMemberId("all")}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors shrink-0 ${
                    selectedFilterMemberId === "all"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  All Staff ({pics.length})
                </button>
                {pics.map((pic) => (
                  <button
                    key={pic.id}
                    type="button"
                    onClick={() => setSelectedFilterMemberId(pic.id)}
                    className={`px-3 py-1 text-xs rounded-full font-medium transition-colors shrink-0 flex items-center gap-1.5 ${
                      selectedFilterMemberId === pic.id
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-secondary/70 text-muted-foreground hover:text-foreground hover:bg-secondary"
                    }`}
                  >
                    <span>{pic.name.split(" ")[0]}</span>
                    <span className="text-[10px] opacity-80 font-mono">
                      ({pic.activeTasks})
                    </span>
                  </button>
                ))}
              </div>
            )}
          </DialogHeader>

          {/* Modal Content / Staff List */}
          <div className="p-5 overflow-y-auto space-y-6 flex-1">
            {displayPics.length === 0 ? (
              <div className="p-8 text-center border border-dashed rounded-xl border-border/80 text-muted-foreground text-xs">
                No staff members match the selected filter.
              </div>
            ) : (
              displayPics.map((pic) => (
                <div
                  key={pic.id}
                  className="rounded-xl border border-border/80 bg-secondary/15 p-4 space-y-3.5 shadow-2xs"
                >
                  {/* Staff Info Banner */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-border/50">
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-10 w-10 ring-2 ring-indigo-500/30 shrink-0">
                        <AvatarImage src={pic.avatarUrl || ""} />
                        <AvatarFallback className="bg-indigo-500/10 text-indigo-600 font-bold text-sm">
                          {pic.name[0]}
                        </AvatarFallback>
                      </Avatar>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-foreground">
                            {pic.name}
                          </h4>
                          <Badge variant="outline" className="text-[10px] font-normal shrink-0">
                            {pic.department}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {pic.position} {pic.username ? `• @${pic.username}` : ""}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                        {pic.activeTasks} Active
                      </span>
                      <span className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                        {pic.doneTasks} Done
                      </span>
                    </div>
                  </div>

                  {/* Tasks breakdown for this member */}
                  <div className="space-y-2.5">
                    <h5 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ListTodo className="h-3.5 w-3.5 text-indigo-400" />
                      <span>Assigned Project Tasks ({pic.tasks.length})</span>
                    </h5>

                    {pic.tasks.length === 0 ? (
                      <div className="p-4 text-center border border-dashed rounded-lg border-border/60 text-muted-foreground text-xs">
                        Tidak ada tugas yang ditugaskan ke anggota staf ini pada proyek ini.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {pic.tasks.map((task) => {
                          const isDelegated = Boolean(
                            task.createdById && task.userId && task.createdById !== task.userId
                          );
                          const isSelfTask = !task.createdById || task.createdById === task.userId;
                          const isInReview = task.status === "In Review";

                          // Review details
                          let reviewTypeLabel = "";
                          let reviewerName = "";

                          if (isInReview) {
                            if (isSelfTask) {
                              reviewTypeLabel = "Request Preview";
                              reviewerName = task.reviewer?.name || (task.reviewerId ? "Reviewer Ditugaskan" : "Belum Ditentukan");
                            } else {
                              reviewTypeLabel = "Delegated Task";
                              reviewerName = task.createdBy?.name || task.reviewer?.name || "Pemberi Task";
                            }
                          }

                          // Delegated details
                          const assignedToName = task.user?.name || pic.name;
                          const assignedByName = task.createdBy?.name;

                          return (
                            <div
                              key={task.id}
                              className="p-4 rounded-xl border border-border/80 bg-card hover:border-indigo-500/40 transition-all space-y-3 shadow-2xs"
                            >
                              {/* Header Row: Badges, Title & Due Date */}
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                                <div className="space-y-2 flex-1 min-w-0">
                                  {/* Badges & Status Indicators */}
                                  <div className="flex items-center gap-2 flex-wrap">
                                    {getStatusBadge(task.status)}
                                    {getPriorityBadge(task.priority)}
                                    {task.taskOutputType && (
                                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                                        {task.taskOutputType}
                                      </span>
                                    )}

                                    {/* Real-time Dynamic In Review Badge Label */}
                                    {isInReview && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 flex-wrap">
                                        <Eye className="h-3 w-3 shrink-0 text-purple-600 dark:text-purple-400" />
                                        <span>
                                          Review Type: <strong className="font-bold">{reviewTypeLabel}</strong>
                                        </span>
                                        <span className="opacity-40">•</span>
                                        <span>
                                          Reviewer: <strong className="text-foreground">{reviewerName}</strong>
                                        </span>
                                      </span>
                                    )}

                                    {/* Real-time Dynamic Delegated Task Badge Label */}
                                    {isDelegated && (
                                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/25 flex-wrap">
                                        <Send className="h-3 w-3 shrink-0 text-blue-600 dark:text-blue-400" />
                                        <span>
                                          Delegated to: <strong className="text-foreground font-semibold">{assignedToName}</strong>
                                        </span>
                                        {assignedByName && (
                                          <span className="text-[10px] text-muted-foreground font-normal">
                                            (by {assignedByName})
                                          </span>
                                        )}
                                      </span>
                                    )}

                                    {task.estimatedHours && (
                                      <span className="text-[11px] text-muted-foreground font-mono bg-secondary px-2 py-0.5 rounded border border-border/40">
                                        ⏱️ {task.estimatedHours}h est.
                                      </span>
                                    )}
                                  </div>

                                  {/* Task Title */}
                                  <h6 className="text-sm font-semibold text-foreground leading-snug break-words">
                                    {task.title}
                                  </h6>
                                </div>

                                {/* Due Date Block */}
                                {task.dueDate && (
                                  <div className="text-left sm:text-right shrink-0 bg-secondary/50 sm:bg-transparent p-2 sm:p-0 rounded-lg border sm:border-0 border-border/40">
                                    <span className="text-xs font-medium text-foreground flex items-center gap-1.5 sm:justify-end">
                                      <Clock className="h-3.5 w-3.5 text-indigo-500 dark:text-indigo-400" />
                                      <span>{formatDate(task.dueDate)}</span>
                                    </span>
                                    <span className="text-[10px] text-muted-foreground block">
                                      ({formatRelativeDays(task.dueDate)})
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Prominent Context Callout for "In Review" Tasks */}
                              {isInReview && (
                                <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 space-y-1.5 text-xs text-purple-700 dark:text-purple-300">
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 font-bold text-xs">
                                    <span className="flex items-center gap-1.5">
                                      <Eye className="h-3.5 w-3.5 shrink-0 text-purple-600 dark:text-purple-400" />
                                      <span>
                                        {isSelfTask
                                          ? "Review: Permintaan Preview (Request Preview)"
                                          : "Review: Penyerahan Tugas Delegasi (Delegated Task Review)"}
                                      </span>
                                    </span>
                                    <span className="bg-card/90 px-2.5 py-0.5 rounded-md border border-purple-500/25 text-[11px] text-foreground font-semibold inline-flex items-center gap-1">
                                      <span className="text-muted-foreground">Reviewer:</span>
                                      <span className="text-purple-600 dark:text-purple-400 font-bold">{reviewerName}</span>
                                    </span>
                                  </div>
                                  {task.previewDescription && (
                                    <div className="bg-card/85 p-2.5 rounded-md border border-purple-500/20 text-foreground font-medium italic text-xs whitespace-pre-line leading-relaxed">
                                      &ldquo;{task.previewDescription}&rdquo;
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Prominent Context Callout for "Delegated Tasks" (when not in review) */}
                              {isDelegated && !isInReview && (
                                <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 text-xs text-blue-700 dark:text-blue-300">
                                  <span className="flex items-center gap-1.5 font-medium">
                                    <Send className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                                    <span>
                                      Tugas didelegasikan kepada: <strong className="font-bold text-foreground">{assignedToName}</strong>
                                    </span>
                                  </span>
                                  {assignedByName && (
                                    <span className="text-[11px] text-muted-foreground">
                                      Pemberi Tugas: <span className="font-semibold text-foreground">{assignedByName}</span>
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Task Brief / Instructions */}
                              {task.description && (
                                <div className="pt-2 border-t border-border/40">
                                  <p className="text-xs text-muted-foreground/90 whitespace-pre-line break-words bg-secondary/30 p-2.5 rounded-lg border border-border/30 leading-relaxed font-normal">
                                    {task.description}
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Modal Footer */}
          <DialogFooter className="p-3 px-5 border-t border-border/60 bg-secondary/15 flex items-center justify-between sm:justify-between">
            <span className="text-[11px] text-muted-foreground">
              Total {totalAllTasks} tugas di {pics.length} staf
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAllDetailsOpen(false)}
              className="rounded-xl text-xs h-8 px-4"
            >
              Tutup
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
