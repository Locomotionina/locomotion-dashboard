"use client";

import { useState, useEffect } from "react";
import { Timer } from "lucide-react";

interface TaskTimerPillProps {
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  totalSeconds: number;
}

function formatStopwatch(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function TaskTimerPill({
  timerActive,
  timerStartedAt,
  totalSeconds,
}: TaskTimerPillProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!timerActive || !timerStartedAt) {
      setElapsed(0);
      return;
    }

    const startTime = new Date(timerStartedAt).getTime();
    const updateElapsed = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsed(diff);
    };

    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [timerActive, timerStartedAt]);

  const liveTotal = (totalSeconds || 0) + elapsed;

  return (
    <div
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-mono font-bold border transition-colors ${
        timerActive
          ? "bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400"
          : "bg-card border-border/70 text-foreground"
      }`}
    >
      <Timer
        className={`h-3.5 w-3.5 ${
          timerActive ? "animate-pulse text-rose-500" : "text-blue-600 dark:text-blue-400"
        }`}
      />
      <span>{formatStopwatch(liveTotal)}</span>
      {timerActive && (
        <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping ml-0.5" />
      )}
    </div>
  );
}

export { formatStopwatch };
