import { notFound } from "next/navigation";
import Link from "next/link";
import { getProjectById } from "@/actions/projects";
import { getCurrentUser } from "@/lib/auth";
import { AddMyTaskDialog } from "./AddMyTaskDialog";
import { ProjectDeliverablesHub } from "./ProjectDeliverablesHub";
import { AutomatedPICRoster } from "./AutomatedPICRoster";
import { ProjectDescriptionsSection } from "./ProjectDescriptionsSection";
import { ProjectHeroHeader } from "./ProjectHeroHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  ChevronLeft,
  Calendar,
  Layers,
  Target,
  FileText,
  Sparkles,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { formatDate, formatRelativeDays } from "@/lib/utils";
import { canManageDeliverables } from "@/lib/deliverables";

export default async function ProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = await getProjectById(params.id);
  const currentUser = await getCurrentUser();

  if (!project) {
    notFound();
  }

  const activeTasks = project.tasks.filter((t) => t.status !== "Done");
  const doneTasks = project.tasks.filter((t) => t.status === "Done");
  const totalTasks = project.tasks.length;
  const progress =
    totalTasks > 0 ? Math.round((doneTasks.length / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8 py-4">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Link
          href="/projects"
          className="flex items-center gap-1 hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-4 w-4" />
          <span>Global Projects Board</span>
        </Link>
        <span>/</span>
        <span className="font-mono text-indigo-400 font-semibold">
          {project.code}
        </span>
      </div>

      {/* Hero Header */}
      <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 space-y-6 shadow-xl">
        <ProjectHeroHeader
          project={project as any}
          currentUserId={currentUser?.id}
          currentUserName={currentUser?.name}
          canEdit={currentUser?.role === "MANAGEMENT" || currentUser?.role === "ADMIN"}
        />

        {/* Project Meta Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-border/50 text-xs">
          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
              Start Project Date
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-indigo-400" />
              <span>{formatDate(project.startDate)}</span>
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
              End Project Date
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
              <Calendar className="h-3.5 w-3.5 text-emerald-400" />
              <span>{formatDate(project.deadline)}</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              ({formatRelativeDays(project.deadline)})
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
              Team Engagement
            </span>
            <span className="font-semibold text-foreground flex items-center gap-1.5 mt-0.5">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span>{project.pics.length} Staff on Roster</span>
            </span>
            <span className="text-[10px] text-muted-foreground">
              {activeTasks.length} active tasks in flight
            </span>
          </div>

          <div>
            <span className="text-muted-foreground block text-[11px] uppercase tracking-wider">
              Deliverable Completion
            </span>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={progress} className="h-2 flex-1" />
              <span className="font-semibold text-foreground text-[11px]">
                {progress}%
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              {doneTasks.length} of {totalTasks} tasks complete
            </span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Brief, Goals, Scope, Centralized URLs Hub */}
        <div className="lg:col-span-2 space-y-6">
          {/* Project Descriptions Section (Client Brief, Goals, Scope) with Role-Based Edit */}
          <ProjectDescriptionsSection
            projectId={project.id}
            initialBrief={project.brief}
            initialGoals={project.goals}
            initialDescription={project.description}
            isManagement={currentUser?.role === "MANAGEMENT" || currentUser?.role === "ADMIN"}
          />

          {/* Centralized Deliverables Hub (URLs) */}
          <ProjectDeliverablesHub
            projectId={project.id}
            previewUrl={project.previewUrl}
            pitchDeckUrl={project.pitchDeckUrl}
            creativeDeckUrl={project.creativeDeckUrl}
            finalAssetsUrl={project.finalAssetsUrl}
            customDeliverables={project.deliverables as any}
            canManageDeliverables={canManageDeliverables(currentUser?.position)}
          />
        </div>

        {/* Right Column: Automated PIC Roster */}
        <div className="space-y-6">
          <AutomatedPICRoster pics={project.pics} />

          {/* Quick Help Card */}
          <Card className="border-border/60 bg-secondary/30 p-4 space-y-2 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span>Agency Workflow Rule</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Management</strong> provisions the project, overarching timeline, and client brief.
            </p>
            <p className="text-muted-foreground leading-relaxed">
              <strong>Staff members</strong> independently assign themselves tasks within this project using the &ldquo;Add My Task for this Project&rdquo; button, automatically updating the PIC team roster.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
