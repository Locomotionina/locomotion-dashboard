"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProjectDescriptionsAction } from "@/actions/projects";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  FileText,
  Target,
  Layers,
  Edit3,
  Loader2,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ProjectDescriptionsSectionProps {
  projectId: string;
  initialBrief: string;
  initialGoals: string;
  initialDescription: string;
  isManagement: boolean;
}

export function ProjectDescriptionsSection({
  projectId,
  initialBrief,
  initialGoals,
  initialDescription,
  isManagement,
}: ProjectDescriptionsSectionProps) {
  const router = useRouter();

  // Display state (updates immediately on save without full page reload)
  const [brief, setBrief] = useState(initialBrief);
  const [goals, setGoals] = useState(initialGoals);
  const [description, setDescription] = useState(initialDescription);

  // Edit modal state
  const [isOpen, setIsOpen] = useState(false);
  const [formBrief, setFormBrief] = useState(initialBrief);
  const [formGoals, setFormGoals] = useState(initialGoals);
  const [formDescription, setFormDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleOpenModal = () => {
    if (!isManagement) return;
    setFormBrief(brief);
    setFormGoals(goals);
    setFormDescription(description);
    setError(null);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!isManagement) return;

    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("projectId", projectId);
    formData.append("brief", formBrief);
    formData.append("goals", formGoals);
    formData.append("description", formDescription);

    const result = await updateProjectDescriptionsAction(formData);
    setSaving(false);

    if (result.success && result.project) {
      // Immediately reflect changes in the UI without requiring full page reload
      setBrief(result.project.brief);
      setGoals(result.project.goals);
      setDescription(result.project.description);
      setIsOpen(false);
      router.refresh();
    } else {
      setError(result.error || "Failed to update project descriptions.");
    }
  };

  // Helper to parse URLs in text and render them as clickable hyperlinks
  const renderTextWithClickableLinks = (text?: string | null) => {
    if (!text) return null;

    // Regular expression to match URLs starting with http:// or https://
    // Trims common trailing punctuation (. , : ; ! ? ) ] } ") so links don't break sentences
    const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2 break-all transition-colors inline-flex items-center gap-1 font-medium hover:opacity-90"
            onClick={(e) => e.stopPropagation()}
          >
            <span>{part}</span>
            <ExternalLink className="h-3 w-3 inline-block shrink-0 opacity-80" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Client Brief Card */}
      <Card className="border-border/80 bg-card/70 transition-all hover:border-border">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-indigo-400" />
              <span>Client Brief</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Core mandate, client problem statement, and primary audience.
            </CardDescription>
          </div>

          {isManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0 text-muted-foreground hover:text-foreground border-border/80 hover:border-indigo-500/40"
            >
              <Edit3 className="h-3 w-3 text-indigo-400" />
              <span>Edit</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
            {brief ? (
              renderTextWithClickableLinks(brief)
            ) : (
              <span className="text-muted-foreground italic">No client brief specified yet.</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Strategic Goals Card */}
      <Card className="border-border/80 bg-card/70 transition-all hover:border-border">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-400" />
              <span>Strategic Goals & Key Performance Metrics</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Milestones and benchmark metrics agreed with the client.
            </CardDescription>
          </div>

          {isManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0 text-muted-foreground hover:text-foreground border-border/80 hover:border-purple-500/40"
            >
              <Edit3 className="h-3 w-3 text-purple-400" />
              <span>Edit</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
            {goals ? (
              renderTextWithClickableLinks(goals)
            ) : (
              <span className="text-muted-foreground italic">No strategic goals specified yet.</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Scope & Description Card */}
      <Card className="border-border/80 bg-card/70 transition-all hover:border-border">
        <CardHeader className="pb-3 flex flex-row items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Agency Execution Scope & Description</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Locomotion technical architecture, creative vision, and craft standards.
            </CardDescription>
          </div>

          {isManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenModal}
              className="h-7 px-2.5 text-xs gap-1.5 shrink-0 text-muted-foreground hover:text-foreground border-border/80 hover:border-cyan-500/40"
            >
              <Edit3 className="h-3 w-3 text-cyan-400" />
              <span>Edit</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-line break-words">
            {description ? (
              renderTextWithClickableLinks(description)
            ) : (
              <span className="text-muted-foreground italic">No execution scope description specified yet.</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Management Edit Modal */}
      {isManagement && (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSave} className="space-y-4">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-lg">
                  <Edit3 className="h-5 w-5 text-indigo-400" />
                  <span>Edit Project Descriptions</span>
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Update the client brief, strategic goals, and execution scope. Only users with the Management role have access to edit these fields.
                </DialogDescription>
              </DialogHeader>

              {error && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-4 py-2">
                {/* Client Brief Textarea */}
                <div className="space-y-1.5">
                  <Label htmlFor="brief" className="text-xs font-semibold flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Client Brief</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Core mandate, client problem statement, and primary audience.
                  </p>
                  <Textarea
                    id="brief"
                    rows={4}
                    value={formBrief}
                    onChange={(e) => setFormBrief(e.target.value)}
                    placeholder="Describe the client's core mandate, problem statement, and requirements..."
                    className="text-xs leading-relaxed resize-y min-h-[90px]"
                    required
                  />
                </div>

                {/* Strategic Goals Textarea */}
                <div className="space-y-1.5">
                  <Label htmlFor="goals" className="text-xs font-semibold flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-purple-400" />
                    <span>Strategic Goals & Key Performance Metrics</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Milestones and benchmark metrics agreed with the client.
                  </p>
                  <Textarea
                    id="goals"
                    rows={4}
                    value={formGoals}
                    onChange={(e) => setFormGoals(e.target.value)}
                    placeholder="Key deliverables, KPIs, target reach, conversion, and performance metrics..."
                    className="text-xs leading-relaxed resize-y min-h-[90px]"
                    required
                  />
                </div>

                {/* Scope & Description Textarea */}
                <div className="space-y-1.5">
                  <Label htmlFor="description" className="text-xs font-semibold flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Agency Execution Scope & Description</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground">
                    Locomotion technical architecture, creative vision, and craft standards.
                  </p>
                  <Textarea
                    id="description"
                    rows={4}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Technical workflow, creative approach, software pipelines, and deliverables..."
                    className="text-xs leading-relaxed resize-y min-h-[90px]"
                    required
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t border-border/50">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={saving} className="gap-2">
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  <span>Save Changes</span>
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
