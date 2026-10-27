"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  FolderKanban,
  Search,
  Users,
  Calendar,
  ArrowRight,
  Clock,
  RotateCcw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { formatDate, formatRelativeDays } from "@/lib/utils";
import { countCategoryUrls } from "@/lib/deliverables";
import { MiniCalendarRangePicker } from "./MiniCalendarRangePicker";

interface ProjectItem {
  id: string;
  code: string;
  name: string;
  clientName: string;
  status: string;
  priority: string;
  category: string;
  startDate: Date | null;
  deadline: Date | null;
  previewUrl: string | null;
  pitchDeckUrl: string | null;
  creativeDeckUrl: string | null;
  finalAssetsUrl: string | null;
  activeTasksCount: number;
  doneTasksCount: number;
  pics: {
    id: string;
    name: string;
    position: string;
    department: string;
    avatarUrl: string | null;
    taskCount: number;
    activeTaskCount: number;
  }[];
  _count: {
    tasks: number;
    deliverables: number;
  };
}

type TimelineFilterMode = "NONE" | "MODE_A" | "MODE_B";

export function ProjectBoardClient({ projects }: { projects: ProjectItem[] }) {
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Deadline & Timeline Filter State
  const [timelineMode, setTimelineMode] = useState<TimelineFilterMode>("NONE");
  // Mode A: Custom Days Input
  const [daysRemainingInput, setDaysRemainingInput] = useState<string>("");
  // Mode B: Calendar Range Picker (YYYY-MM-DD)
  const [calendarRangeStart, setCalendarRangeStart] = useState<string>("");
  const [calendarRangeEnd, setCalendarRangeEnd] = useState<string>("");

  const statusOptions = ["ALL", "ACTIVE", "ON_HOLD", "DONE"];

  const filtered = projects.filter((p) => {
    // 1. Search Query
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.code.toLowerCase().includes(search.toLowerCase());

    // 2. Status Filter
    const matchesStatus =
      selectedStatus === "ALL" ||
      p.status === selectedStatus ||
      (selectedStatus === "DONE" && (p.status === "DONE" || p.status === "DELIVERED"));

    if (!matchesSearch || !matchesStatus) return false;

    // 3. Deadline & Timeline Filter
    if (timelineMode === "MODE_A") {
      const daysThreshold = parseInt(daysRemainingInput, 10);
      if (!isNaN(daysThreshold)) {
        if (!p.deadline) return false;
        const target = new Date(p.deadline).getTime();
        const now = new Date().getTime();
        const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
        // Project remaining time from today until End Date is less than or equal to that number
        if (diffDays > daysThreshold) return false;
      }
    } else if (timelineMode === "MODE_B") {
      if (calendarRangeStart || calendarRangeEnd) {
        // Active timeline of project: between Start Project Date and End Project Date
        const pStart = p.startDate
          ? new Date(p.startDate)
          : p.deadline
          ? new Date(p.deadline)
          : null;
        const pEnd = p.deadline
          ? new Date(p.deadline)
          : p.startDate
          ? new Date(p.startDate)
          : null;

        if (!pStart && !pEnd) return false;

        const effectiveStart = pStart || pEnd!;
        const effectiveEnd = pEnd || pStart!;

        // Intersection test with calendar range: [effectiveStart, effectiveEnd] intersects [rStart, rEnd]
        if (calendarRangeStart && calendarRangeEnd) {
          const rStart = new Date(calendarRangeStart + "T00:00:00");
          const rEnd = new Date(calendarRangeEnd + "T23:59:59");
          const intersects = effectiveStart <= rEnd && effectiveEnd >= rStart;
          if (!intersects) return false;
        } else if (calendarRangeStart) {
          const rStart = new Date(calendarRangeStart + "T00:00:00");
          if (effectiveEnd < rStart) return false;
        } else if (calendarRangeEnd) {
          const rEnd = new Date(calendarRangeEnd + "T23:59:59");
          if (effectiveStart > rEnd) return false;
        }
      }
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
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
        return <Badge>{status}</Badge>;
    }
  };

  const renderCountdownBadge = (deadline: Date | null) => {
    if (!deadline) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-secondary/80 text-muted-foreground border border-border/40 font-medium">
          <Clock className="h-3 w-3" />
          <span>No deadline</span>
        </span>
      );
    }

    const target = new Date(deadline).getTime();
    const now = new Date().getTime();
    const diffDays = Math.ceil((target - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-500 dark:text-rose-400 border border-rose-500/30 shadow-xs animate-pulse">
          <Clock className="h-3 w-3" />
          <span>{Math.abs(diffDays)}d overdue</span>
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-500 dark:text-amber-400 border border-amber-500/40 shadow-xs">
          <Clock className="h-3 w-3" />
          <span>Due today</span>
        </span>
      );
    }
    if (diffDays === 1) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          <span>Due tomorrow</span>
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
          <Clock className="h-3 w-3" />
          <span>{diffDays}d remaining</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border border-indigo-500/30">
        <Clock className="h-3 w-3" />
        <span>{diffDays}d remaining</span>
      </span>
    );
  };

  const handleClearAllFilters = () => {
    setSearch("");
    setSelectedStatus("ALL");
    setTimelineMode("NONE");
    setDaysRemainingInput("");
    setCalendarRangeStart("");
    setCalendarRangeEnd("");
  };

  const isTimelineFilterActive =
    (timelineMode === "MODE_A" && daysRemainingInput !== "") ||
    (timelineMode === "MODE_B" && (calendarRangeStart !== "" || calendarRangeEnd !== ""));

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Search & Status Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-card/85 backdrop-blur-md border border-border/60 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by client, project name, or code..."
            className="pl-10 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {statusOptions.map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all duration-200 whitespace-nowrap ${
                selectedStatus === status
                  ? "bg-blue-600 dark:bg-blue-500 text-white shadow-sm"
                  : "bg-secondary/70 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Deadline & Timeline Filter Toolbar */}
      <div className="relative z-30 bg-card/85 backdrop-blur-md border border-border/60 p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
              <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
              <span>Timeline Filtering:</span>
            </span>

            {/* Mode Selector Toggle */}
            <div className="flex items-center bg-secondary/60 p-0.5 rounded-xl border border-border/60">
              <button
                type="button"
                onClick={() => {
                  setTimelineMode("NONE");
                  setDaysRemainingInput("");
                  setCalendarRangeStart("");
                  setCalendarRangeEnd("");
                }}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                  timelineMode === "NONE"
                    ? "bg-background text-foreground font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All Timelines
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode("MODE_A")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  timelineMode === "MODE_A"
                    ? "bg-background text-blue-600 dark:text-blue-400 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Clock className="h-3 w-3 text-blue-500" />
                <span>Mode A: Days Remaining</span>
              </button>
              <button
                type="button"
                onClick={() => setTimelineMode("MODE_B")}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                  timelineMode === "MODE_B"
                    ? "bg-background text-purple-600 dark:text-purple-400 font-semibold shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-3 w-3 text-purple-500" />
                <span>Mode B: Calendar Range</span>
              </button>
            </div>
          </div>

          {/* Reset Filters Shortcut */}
          {(isTimelineFilterActive || search || selectedStatus !== "ALL") && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClearAllFilters}
              className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1.5 self-start md:self-auto"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset All Filters</span>
            </Button>
          )}
        </div>

        {/* Mode A Controls: Custom Days Remaining Numeric Input */}
        {timelineMode === "MODE_A" && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 text-xs animate-fade-in flex-wrap">
            <span className="text-muted-foreground font-medium">
              Filter projects where remaining time (from today until End Date) is ≤
            </span>
            <div className="w-28 relative">
              <Input
                type="number"
                min="0"
                value={daysRemainingInput}
                onChange={(e) => setDaysRemainingInput(e.target.value)}
                placeholder="e.g. 7"
                className="h-8 text-xs font-semibold pr-8 bg-background"
              />
              <span className="absolute right-2.5 top-2 text-[10px] text-muted-foreground pointer-events-none">
                days
              </span>
            </div>

            {/* Quick Presets for Mode A */}
            <div className="flex items-center gap-1">
              {["7", "14", "30", "60"].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDaysRemainingInput(d)}
                  className={`px-2 py-1 rounded-md text-[11px] font-medium border transition-colors ${
                    daysRemainingInput === d
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-background/80 hover:bg-secondary text-muted-foreground border-border/60"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>

            {daysRemainingInput && (
              <div className="flex items-center gap-1.5 ml-auto">
                <Badge
                  variant="outline"
                  className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30 gap-1"
                >
                  <span>Filtering: ≤ {daysRemainingInput} days remaining</span>
                  <button
                    type="button"
                    onClick={() => setDaysRemainingInput("")}
                    className="hover:text-rose-400"
                  >
                    <X className="h-3 w-3 ml-0.5" />
                  </button>
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Mode B Controls: Pop-up Mini Calendar Range Picker */}
        {timelineMode === "MODE_B" && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs animate-fade-in flex-wrap">
            <span className="text-muted-foreground font-medium">
              Filter projects whose active timeline falls within or intersects:
            </span>

            <MiniCalendarRangePicker
              startDate={calendarRangeStart}
              endDate={calendarRangeEnd}
              onChange={(s, e) => {
                setCalendarRangeStart(s);
                setCalendarRangeEnd(e);
              }}
              onClear={() => {
                setCalendarRangeStart("");
                setCalendarRangeEnd("");
              }}
            />

            {(calendarRangeStart || calendarRangeEnd) && (
              <Badge
                variant="outline"
                className="text-[11px] text-purple-600 dark:text-purple-300 bg-purple-500/10 border-purple-500/30 gap-1 ml-auto"
              >
                <span>
                  Active Range: {calendarRangeStart ? formatDate(calendarRangeStart) : "Any"} –{" "}
                  {calendarRangeEnd ? formatDate(calendarRangeEnd) : "Any"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCalendarRangeStart("");
                    setCalendarRangeEnd("");
                  }}
                  className="hover:text-rose-400"
                >
                  <X className="h-3 w-3 ml-0.5" />
                </button>
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Projects Grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-12 text-center space-y-3 bg-card/40">
          <FolderKanban className="h-10 w-10 text-muted-foreground mx-auto" />
          <h3 className="text-base font-bold text-foreground">No agency projects found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            No projects matched the search criteria, selected status, or deadline timeline filters.
          </p>
          {(search || selectedStatus !== "ALL" || isTimelineFilterActive) && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClearAllFilters}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Clear All Active Filters</span>
            </Button>
          )}
        </div>
      ) : (
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((project) => {
            const totalTasks = project.activeTasksCount + project.doneTasksCount;
            const progress =
              totalTasks > 0
                ? Math.round((project.doneTasksCount / totalTasks) * 100)
                : 0;

            const deliverablesCount =
              countCategoryUrls(project.previewUrl) +
              countCategoryUrls(project.pitchDeckUrl) +
              countCategoryUrls(project.creativeDeckUrl) +
              countCategoryUrls(project.finalAssetsUrl) +
              project._count.deliverables;

            return (
              <Card
                key={project.id}
                className="group flex flex-col justify-between border-border/60 hover:border-blue-500/40 rounded-2xl transition-all duration-200 bg-card/85 backdrop-blur-md shadow-sm hover:shadow-md card-hover-lift"
              >
                {/* Card Header with Prominent Countdown Indicator in Top Area */}
                <CardHeader className="space-y-3 pb-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-bold tracking-wider text-blue-700 dark:text-blue-300 bg-blue-500/10 px-2.5 py-0.5 rounded-full border border-blue-500/20">
                        {project.code}
                      </span>
                      {/* Prominent Remaining Days Countdown Indicator at the top */}
                      {renderCountdownBadge(project.deadline)}
                    </div>
                    {getStatusBadge(project.status)}
                  </div>

                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      {project.clientName}
                    </span>
                    <h3 className="text-lg font-bold text-foreground leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                      {project.name}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                      {project.category}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Progress & Task Completion */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Task Completion</span>
                      <span className="font-semibold text-foreground">
                        {project.doneTasksCount}/{totalTasks} tasks ({progress}%)
                      </span>
                    </div>
                    <Progress
                      value={progress}
                      indicatorClassName={
                        progress === 100
                          ? "bg-emerald-500"
                          : progress > 50
                          ? "bg-blue-500"
                          : "bg-indigo-500"
                      }
                    />
                  </div>

                  {/* Automated PIC Preview (Persons In Charge) */}
                  <div className="space-y-1.5 pt-1 border-t border-border/40">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1 font-semibold uppercase tracking-wider">
                        <Users className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                        <span>Staff Assigned (PIC)</span>
                      </span>
                      <span>{project.pics.length} team members</span>
                    </div>

                    {project.pics.length > 0 ? (
                      <div className="flex items-center gap-1.5 pt-0.5">
                        <div className="flex -space-x-2 overflow-hidden">
                          {project.pics.slice(0, 4).map((pic) => (
                            <Avatar
                              key={pic.id}
                              className="inline-block h-7 w-7 rounded-full ring-2 ring-card"
                              title={`${pic.name} (${pic.department}) - ${pic.activeTaskCount} active tasks`}
                            >
                              <AvatarImage src={pic.avatarUrl || ""} />
                              <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600 font-bold">
                                {pic.name[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {project.pics.length > 4 && (
                          <span className="text-[11px] text-muted-foreground pl-1">
                            +{project.pics.length - 4} more
                          </span>
                        )}
                        <span className="text-[11px] text-muted-foreground ml-auto truncate max-w-[120px]">
                          {project.pics[0].name.split(" ")[0]}
                          {project.pics.length > 1
                            ? ` & ${project.pics.length - 1} others`
                            : ""}
                        </span>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground italic">
                        No staff tasks linked yet.
                      </p>
                    )}
                  </div>

                  {/* Metadata: Timeline Dates & Deliverables Count */}
                  <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground border-t border-border/40">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>
                        {project.startDate && project.deadline
                          ? `${formatDate(project.startDate)} – ${formatDate(project.deadline)}`
                          : project.deadline
                          ? `Due: ${formatDate(project.deadline)}`
                          : "No timeline set"}
                      </span>
                    </span>
                    <span className="text-[11px] font-medium bg-secondary/80 px-2.5 py-0.5 rounded-full">
                      {deliverablesCount} Deliverables
                    </span>
                  </div>

                  {/* Action Link to Detail View */}
                  <Button
                    asChild
                    variant="outline"
                    className="w-full justify-between rounded-xl border-border/70 group-hover:bg-blue-600 dark:group-hover:bg-blue-500 group-hover:text-white group-hover:border-transparent transition-all duration-200"
                  >
                    <Link href={`/projects/${project.id}`}>
                      <span>View Project & Deliverables</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
