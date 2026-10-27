import { getProjects } from "@/actions/projects";
import { getCurrentUser } from "@/lib/auth";
import { ProjectBoardClient } from "./ProjectBoardClient";
import { NewProjectDialog } from "./NewProjectDialog";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ShieldCheck } from "lucide-react";

export default async function ProjectsPage() {
  const projects = await getProjects();
  const user = await getCurrentUser();

  return (
    <div className="space-y-8 py-4">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Global Project & Brand Hub
            </h1>
            <Badge variant="cyan" className="text-[10px]">
              Accessible to All
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tracking active agency engagements, client briefs, deliverables, and automated team rosters.
          </p>
        </div>

        {/* Management & Admin Project Creation button */}
        {user?.role === "MANAGEMENT" || user?.role === "ADMIN" ? (
          <NewProjectDialog />
        ) : (
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/40 border border-border/60 px-3 py-1.5 rounded-lg">
            <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>Staff view: Click any project to inspect brief or add your task.</span>
          </div>
        )}
      </div>

      {/* Board Client */}
      <ProjectBoardClient projects={projects as any} />
    </div>
  );
}
