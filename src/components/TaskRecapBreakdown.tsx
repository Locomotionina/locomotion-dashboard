"use client";

import { useState, useEffect } from "react";
import { Clock, History, Calendar, CheckCircle2, Play, Pause, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { renderTextWithLinks } from "@/lib/utils";

interface TaskRevisionItem {
  id: string;
  round: number;
  feedback: string;
  authorId?: string | null;
  authorName?: string | null;
  seconds: number;
  timerActive: boolean;
  timerStartedAt: Date | string | null;
  status: string;
  createdAt?: Date | string;
  deliveredAt?: Date | string | null;
}

interface StoredSession {
  id: string;
  startedAt: string;
  stoppedAt: string | null;
  seconds: number;
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
    createdAt?: Date | string;
    completedAt?: Date | string | null;
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

function formatSessionTime(dateVal: Date | string | number | null | undefined): string {
  if (!dateVal) return "--:--";
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return "--:--";
  return d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDurationReadable(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.max(0, totalSeconds % 60);

  const parts: string[] = [];
  if (hours > 0) {
    parts.push(`${hours} ${hours === 1 ? "Hour" : "Hours"}`);
  }
  if (minutes > 0) {
    parts.push(`${minutes} ${minutes === 1 ? "Min" : "Mins"}`);
  }
  if (hours === 0 && (minutes === 0 || parts.length === 0)) {
    parts.push(`${seconds} ${seconds === 1 ? "Sec" : "Secs"}`);
  }

  return `${parts.join(" ")} duration`;
}

export function TaskRecapBreakdown({ task }: TaskRecapBreakdownProps) {
  const [elapsed, setElapsed] = useState(0);
  const [storedSessions, setStoredSessions] = useState<StoredSession[]>([]);
  const isWorking = task.timerActive && Boolean(task.timerStartedAt);
  const isRevisionPhase =
    task.currentPhase === "REVISION" || task.currentRevisionRound > 0;

  // Load any client-recorded sessions from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`loco_timer_sessions_${task.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setStoredSessions(parsed);
        }
      }
    } catch {
      // Ignore storage errors
    }
  }, [task.id]);

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

  // Build Draft 1 Session Logs
  const renderDraft1Sessions = () => {
    // If local recorded sessions exist and match draft phase
    if (storedSessions.length > 0) {
      return storedSessions.map((session, idx) => {
        const isSessionRunning = !session.stoppedAt && isWorking && !isRevisionPhase;
        const dur = isSessionRunning
          ? Math.max(0, Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 1000))
          : session.seconds;

        const startStr = formatSessionTime(session.startedAt);
        const stopStr = session.stoppedAt ? formatSessionTime(session.stoppedAt) : (isSessionRunning ? "Sekarang" : "Pause");

        return (
          <div
            key={session.id || idx}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 p-2 rounded-lg bg-card/90 border border-border/40 text-[11px]"
          >
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${isSessionRunning ? "bg-emerald-500 animate-pulse" : "bg-blue-500"}`} />
              <span className="font-semibold text-foreground">Sesi {idx + 1}:</span>
              <span className="font-mono text-muted-foreground break-all">
                Rentang: <strong className="text-foreground">{startStr}</strong> - <strong className="text-foreground">{stopStr}</strong>
              </span>
              <span className="font-mono font-bold text-blue-600 dark:text-blue-400">
                {formatDurationHms(dur)}
              </span>
              <span className="text-muted-foreground text-[10px]">
                ({formatDurationReadable(dur)})
              </span>
            </div>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto ${
              isSessionRunning
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-secondary text-muted-foreground"
            }`}>
              {isSessionRunning ? "Sedang Berjalan" : "Tercatat"}
            </span>
          </div>
        );
      });
    }

    // Fallback: structured generation from database telemetry
    const items: React.ReactNode[] = [];

    // Prior recorded draft work
    if (task.initialSeconds > 0) {
      const baseStart = task.createdAt ? new Date(task.createdAt) : new Date(Date.now() - task.initialSeconds * 1000);
      const baseStop = task.revisions && task.revisions.length > 0 && task.revisions[0].createdAt
        ? new Date(task.revisions[0].createdAt)
        : (task.completedAt ? new Date(task.completedAt) : new Date(baseStart.getTime() + task.initialSeconds * 1000));

      items.push(
        <div
          key="draft-session-1"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-card/90 border border-border/40 text-[11px]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
              <span className="font-semibold text-foreground">Waktu Aktif:</span>
              <strong className="text-blue-600 dark:text-blue-400 font-bold font-mono">
                {formatDurationHms(task.initialSeconds)}
              </strong>
              <span className="text-muted-foreground">
                ({formatDurationReadable(task.initialSeconds)})
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px] bg-secondary/50 px-2 py-0.5 rounded border border-border/30">
              <span>Rentang Sesi:</span>
              <strong className="text-foreground">{formatSessionTime(baseStart)}</strong>
              <span>-</span>
              <strong className="text-foreground">{formatSessionTime(baseStop)}</strong>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground shrink-0 self-start sm:self-auto">
            Akumulasi Stopwatch
          </span>
        </div>
      );
    }

    // Active session currently in progress
    if (isWorking && !isRevisionPhase && task.timerStartedAt) {
      items.push(
        <div
          key="draft-session-active"
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-emerald-500/5 border border-emerald-500/25 text-[11px]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="font-semibold text-foreground">Sesi Aktif:</span>
              <strong className="text-emerald-600 dark:text-emerald-400 font-bold font-mono">
                {formatDurationHms(draftLiveElapsed)}
              </strong>
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                ({formatDurationReadable(draftLiveElapsed)})
              </span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px] bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              <span>Mulai:</span>
              <strong className="text-foreground">{formatSessionTime(task.timerStartedAt)}</strong>
              <span>-</span>
              <strong className="text-emerald-600 dark:text-emerald-400">Sekarang</strong>
            </div>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0 self-start sm:self-auto">
            Sedang Berjalan
          </span>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="p-2.5 rounded-lg bg-card/60 border border-dashed border-border/50 text-[11px] text-muted-foreground text-center">
          Belum ada sesi timer tercatat untuk draft ini
        </div>
      );
    }

    return items;
  };

  return (
    <div className="rounded-xl border border-border/70 bg-secondary/35 p-3 sm:p-3.5 space-y-3 text-xs animate-fade-up shadow-2xs">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2 border-b border-border/50">
        <div className="flex items-center gap-2 font-bold text-foreground">
          <History className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span>Rincian Waktu Pengerjaan</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hidden sm:inline">
            Total Waktu:
          </span>
          <span className="font-mono font-bold text-xs bg-blue-500/10 text-blue-700 dark:text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-500/20">
            {formatDurationHms(liveTotal)}
          </span>
        </div>
      </div>

      {/* Draft 1 Card & Structured Sessions */}
      <div className="space-y-2 p-2.5 rounded-xl bg-card/70 border border-border/50">
        <div className="flex items-center justify-between text-xs font-semibold text-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <span>Pengerjaan Awal (Draft 1)</span>
          </div>
          <span className="font-mono font-bold text-foreground">
            {formatDurationHms(draftTotal)}
          </span>
        </div>

        {/* Structured Session Details */}
        <div className="space-y-1.5 pt-1 border-t border-border/30">
          {renderDraft1Sessions()}
        </div>
      </div>

      {/* Revision History Section */}
      {task.revisions && task.revisions.length > 0 && (
        <div className="pt-1 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            <span>Riwayat Timer Revisi ({task.revisions.length} Ronde):</span>
          </div>

          <div className="space-y-2">
            {task.revisions.map((rev) => {
              const isRevActive =
                isWorking && task.currentRevisionRound === rev.round;
              const revElapsed = isRevActive ? elapsed : 0;
              const revTotal = (rev.seconds || 0) + revElapsed;

              // Calculate start and stop for revision
              const revStart = rev.createdAt ? new Date(rev.createdAt) : new Date();
              const revStop = isRevActive
                ? "Sekarang"
                : rev.deliveredAt
                ? formatSessionTime(rev.deliveredAt)
                : formatSessionTime(new Date(revStart.getTime() + rev.seconds * 1000));

              return (
                <div
                  key={rev.id}
                  className="rounded-xl border border-border/50 bg-card/70 p-2.5 space-y-2"
                >
                  {/* Revision Round Header */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-foreground text-xs">
                        Ronde #{rev.round}
                      </span>
                      {rev.authorName && (
                        <span className="text-[10px] text-muted-foreground font-medium">
                          dari {rev.authorName}
                        </span>
                      )}
                      {rev.status && (
                        <span className={`text-[10px] font-semibold px-2 py-0.2 rounded-full border ${
                          rev.status === "DELIVERED" || rev.status === "APPROVED"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : rev.status === "IN_PROGRESS"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                            : "bg-secondary text-muted-foreground border-border/40"
                        }`}>
                          {rev.status}
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400">
                      {formatDurationHms(revTotal)}
                    </span>
                  </div>

                  {/* Feedback quote */}
                  {rev.feedback && (
                    <div className="text-[11px] text-muted-foreground italic bg-secondary/40 p-2 rounded-lg border border-border/30 max-h-36 overflow-y-auto whitespace-pre-wrap break-words custom-scrollbar leading-relaxed">
                      &ldquo;{renderTextWithLinks(rev.feedback)}&rdquo;
                    </div>
                  )}

                  {/* Structured Revision Session Log */}
                  <div className="space-y-1 pt-1 border-t border-border/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-secondary/40 border border-border/40 text-[11px]">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3 min-w-0 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full shrink-0 ${isRevActive ? "bg-emerald-500 animate-pulse" : "bg-purple-500"}`} />
                          <span className="font-semibold text-foreground">Waktu Aktif:</span>
                          <strong className="text-purple-600 dark:text-purple-400 font-bold font-mono">
                            {formatDurationHms(revTotal)}
                          </strong>
                          <span className="text-muted-foreground">
                            ({formatDurationReadable(revTotal)})
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px] bg-card/60 px-2 py-0.5 rounded border border-border/30">
                          <span>Rentang Revisi:</span>
                          <strong className="text-foreground">{formatSessionTime(revStart)}</strong>
                          <span>-</span>
                          <strong className="text-foreground">{revStop}</strong>
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 self-start sm:self-auto ${
                        isRevActive
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                          : "bg-secondary text-muted-foreground"
                      }`}>
                        {isRevActive ? "Sedang Berjalan" : "Akumulasi Stopwatch"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
