"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProjectAction } from "@/actions/projects";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Sparkles, AlertCircle } from "lucide-react";

export function NewProjectDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const res = await createProjectAction(formData);

    if (!res.success) {
      setError(res.error || "Failed to create project");
      setLoading(false);
    } else {
      setLoading(false);
      setOpen(false);
      router.push(`/projects/${res.projectId}`);
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          <span>New Agency Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <DialogTitle>Launch New Agency Project</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Management provision: Define client brief, strategic goals, deliverables, and overarching status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label htmlFor="name">Project Title</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="e.g. Air Max Day 2026 Immersive Hub"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="code">Project Code</Label>
                <Input
                  id="code"
                  name="code"
                  placeholder="e.g. LOCO-NK-02"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clientName">Client / Brand Name</Label>
                <Input
                  id="clientName"
                  name="clientName"
                  placeholder="e.g. Nike Global, Spotify Studios"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  name="category"
                  placeholder="e.g. WebGL Experience, Brand Identity"
                  defaultValue="Digital Experience"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="status">Overarching Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue="ACTIVE"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="ACTIVE" className="bg-popover text-foreground">Active</option>
                  <option value="ON_HOLD" className="bg-popover text-foreground">On Hold</option>
                  <option value="DONE" className="bg-popover text-foreground">Done</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  defaultValue="HIGH"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="URGENT" className="bg-popover text-foreground">URGENT</option>
                  <option value="HIGH" className="bg-popover text-foreground">HIGH</option>
                  <option value="MEDIUM" className="bg-popover text-foreground">MEDIUM</option>
                  <option value="LOW" className="bg-popover text-foreground">LOW</option>
                </select>
              </div>
            </div>

            {/* Project Timeline: Start Date & End Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="startDate">Start Project Date</Label>
                <Input id="startDate" name="startDate" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="deadline">End Project (Estimated) Date</Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="brief">Client Brief</Label>
              <Textarea
                id="brief"
                name="brief"
                placeholder="What is the client asking for? Core problem and target audience..."
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goals">Strategic Goals</Label>
              <Textarea
                id="goals"
                name="goals"
                placeholder="Key performance metrics, KPIs, and deliverables..."
                rows={2}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Scope & Description</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Technical & creative execution scope for Locomotion..."
                rows={2}
                required
              />
            </div>

            {/* Centralized Deliverables URLs */}
            <div className="border-t border-border/60 pt-3 space-y-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Initial Deliverables & Centralized URLs
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="previewUrl">Preview Link (Staging / Prototype)</Label>
                  <Input
                    id="previewUrl"
                    name="previewUrl"
                    placeholder="https://staging.locomotion.agency/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pitchDeckUrl">Pitch Deck URL</Label>
                  <Input
                    id="pitchDeckUrl"
                    name="pitchDeckUrl"
                    placeholder="https://slides.google.com/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="creativeDeckUrl">Creative Deck (Figma / Miro)</Label>
                  <Input
                    id="creativeDeckUrl"
                    name="creativeDeckUrl"
                    placeholder="https://figma.com/file/..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="finalAssetsUrl">Final Assets Repository</Label>
                  <Input
                    id="finalAssetsUrl"
                    name="finalAssetsUrl"
                    placeholder="https://drive.google.com/... or Frame.io"
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creating Project...</span>
                </>
              ) : (
                <span>Launch Project</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
