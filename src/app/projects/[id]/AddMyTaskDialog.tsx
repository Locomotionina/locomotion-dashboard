"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTaskAction } from "@/actions/tasks";
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
import { PlusCircle, Loader2, Sparkles, CheckCircle2, AlertCircle, Layers } from "lucide-react";

interface AddMyTaskDialogProps {
  projectId: string;
  projectName: string;
  clientName: string;
  currentUserId?: string;
  currentUserName?: string;
}

export function AddMyTaskDialog({
  projectId,
  projectName,
  clientName,
  currentUserId,
  currentUserName,
}: AddMyTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [taskOutputTypeOption, setTaskOutputTypeOption] = useState<string>("Thumbnail");
  const [customOutputType, setCustomOutputType] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("projectId", projectId);

    const res = await createTaskAction(formData);

    if (!res.success) {
      setError(res.error || "Failed to create task");
      setLoading(false);
    } else {
      setLoading(false);
      setOpen(false);
      setTaskOutputTypeOption("Thumbnail");
      setCustomOutputType("");
      router.refresh();
    }
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setTaskOutputTypeOption("Thumbnail");
        setCustomOutputType("");
      }
    }}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white shadow-sm border-0">
          <PlusCircle className="h-4 w-4" />
          <span>Add My Task for this Project</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Sparkles className="h-4 w-4" />
              </div>
              <DialogTitle>Assign Task to Myself</DialogTitle>
            </div>
            <DialogDescription className="text-xs">
              Instantly generates a task in your personal Staff Dashboard linked to{" "}
              <strong className="text-foreground">{projectName}</strong> ({clientName}).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {error && (
              <div className="flex items-center gap-2 p-3 text-xs rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="rounded-lg bg-secondary/50 p-3 text-xs space-y-1 border border-border/60">
              <div className="text-muted-foreground">Assignee:</div>
              <div className="font-semibold text-foreground flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <span>{currentUserName || "Current Staff Member"} (You)</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                name="title"
                placeholder="e.g. 3D Model Optimization, Hero Copy Deck, Wireframes"
                required
                autoFocus
              />
            </div>

            {/* Tipe Output Task Field with Dynamic Custom Option */}
            <div className="space-y-1.5">
              <Label htmlFor="projectTaskOutputTypeSelect" className="text-foreground font-semibold flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span>TIPE OUTPUT TASK</span>
              </Label>
              <select
                id="projectTaskOutputTypeSelect"
                value={taskOutputTypeOption}
                onChange={(e) => setTaskOutputTypeOption(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium cursor-pointer"
              >
                <option value="Thumbnail">Thumbnail</option>
                <option value="Carousel">Carousel</option>
                <option value="Single Post">Single Post</option>
                <option value="Story">Story</option>
                <option value="Custom">Custom</option>
              </select>

              {taskOutputTypeOption === "Custom" && (
                <div className="pt-1.5 space-y-1 animate-in fade-in duration-200">
                  <Input
                    id="projectCustomTaskOutputType"
                    name="projectCustomTaskOutputType"
                    value={customOutputType}
                    onChange={(e) => setCustomOutputType(e.target.value)}
                    placeholder="Ketik tipe output custom (misal: Reels, Banner, Feed)..."
                    required
                    autoFocus
                    className="rounded-md border-blue-500/50 bg-blue-500/5 focus-visible:ring-blue-500"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Ketik spesifikasi tipe output custom yang Anda inginkan.
                  </p>
                </div>
              )}

              <input
                type="hidden"
                name="taskOutputType"
                value={taskOutputTypeOption === "Custom" ? (customOutputType.trim() || "Custom") : taskOutputTypeOption}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Task Description / Deliverable Notes</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Specify requirements, tools needed, or client feedback details..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-1.5">
                <Label htmlFor="status">Initial Status</Label>
                <select
                  id="status"
                  name="status"
                  defaultValue="On Progress"
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground"
                >
                  <option value="To Do" className="bg-popover text-foreground">To Do</option>
                  <option value="On Progress" className="bg-popover text-foreground">On Progress</option>
                  <option value="Done" className="bg-popover text-foreground">Done</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input id="dueDate" name="dueDate" type="date" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="estimatedHours">Est. Hours</Label>
                <Input
                  id="estimatedHours"
                  name="estimatedHours"
                  type="number"
                  step="0.5"
                  defaultValue="4.0"
                />
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
                  <span>Adding Task...</span>
                </>
              ) : (
                <span>Add Task to My Board</span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
