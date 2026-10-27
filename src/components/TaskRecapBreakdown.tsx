"use client";

import { useState, useEffect } from "react";

interface TaskRevisionItem {
  id: string;
  round: number;
  feedback: string;
  seconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  status: string;
}

interface TaskRecapBreakdownProps {
  task: {
    id: string;
    totalSeconds: number;
    initialSeconds: number;
    timerActive: boolean;
    timerStartedAt: Date | string | null;
    currentPhase: string;
    currentRevisionRound: number;
    revisions: TaskRevisionItem[];
  };
}

function formatDurationHms(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}j ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds} detik`;
}

export function TaskRecapBreakdown({ task }: TaskRecapBreakdownProps) {
  const [elapsed, setElapsed] = useState(0);
  const isWorking = task.timerActive && Boolean(task.timerStartedAt);
  const isRevisionPhase =
    task.currentPhase === "REVISION" || task.currentRevisionRound > 0;

  useEffect(() => {
    if (!isWorking || !task.timerStartedAt) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(task.timerStartedAt).getTime();
    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsed(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [isWorking, task.timerStartedAt]);

  const liveTotal = (task.totalSeconds || 0) + elapsed;
  const draftLiveElapsed = !isRevisionPhase && isWorking ? elapsed : 0;
  const draftTotal = (task.initialSeconds || 0) + draftLiveElapsed;

  return (
    <div className="rounded-xl border border-border/60 bg-secondary/40 p-3 space-y-2 text-xs animate-fade-up">
      <div className="flex items-center justify-between pb-1.5 border-b border-border/40 font-bold text-foreground">
        <span>Rincian Waktu Pengerjaan</span>
        <span className="font-mono text-blue-600 dark:text-blue-400">
          {formatDurationHms(liveTotal)}
        </span>
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Pengerjaan Awal (Draft 1):</span>
          <span className="font-mono font-semibold text-foreground">
            {formatDurationHms(draftTotal)}
          </span>
        </div>

        {task.revisions && task.revisions.length > 0 && (
          <div className="pt-1 space-y-1 border-t border-border/30">
            <span className="font-semibold text-muted-foreground uppercase text-[10px]">
              Riwayat Timer Revisi:
            </span>
            {task.revisions.map((rev) => {
              const revElapsed =
                isWorking && task.currentRevisionRound === rev.round ? elapsed : 0;
              const revTotal = (rev.seconds || 0) + revElapsed;

              return (
                <div
                  key={rev.id}
                  className="flex flex-col gap-0.5 bg-card p-1.5 rounded-lg border border-border/40"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">
                      Ronde #{rev.round}:
                    </span>
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                      {formatDurationHms(revTotal)}
                    </span>
                  </div>
                  <span className="text-[10px] text-muted-foreground italic truncate">
                    &ldquo;{rev.feedback}&rdquo;
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
