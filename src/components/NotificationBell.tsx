"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CheckCheck,
  Trash2,
  Send,
  Rocket,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
  deleteNotificationAction,
  clearAllNotificationsAction,
} from "@/actions/notifications";

interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  link: string | null;
  taskId: string | null;
  read: boolean;
  createdAt: string | Date;
}

function formatNotificationTime(dateInput: string | Date): string {
  const date = new Date(dateInput);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffSec < 45) return "Baru saja";
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m lalu`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}j lalu`;
  const diffDays = Math.floor(diffSec / 86400);
  if (diffDays === 1) return "Kemarin";
  if (diffDays < 7) return `${diffDays}h lalu`;
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
}

function getNotificationBadge(type: string) {
  switch (type) {
    case "TASK_ASSIGNED":
      return {
        icon: Send,
        color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        label: "Task Baru",
      };
    case "TASK_DELIVERED":
      return {
        icon: Rocket,
        color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        label: "Di-Deliver",
      };
    case "TASK_REVISION":
      return {
        icon: RotateCcw,
        color: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
        label: "Revisi",
      };
    case "TASK_APPROVED":
      return {
        icon: Sparkles,
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        label: "Disetujui",
      };
    case "TASK_DONE":
      return {
        icon: CheckCircle2,
        color: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        label: "Selesai",
      };
    default:
      return {
        icon: Info,
        color: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/20",
        label: "Info",
      };
  }
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const prevCountRef = useRef(0);

  const fetchNotifications = async () => {
    try {
      const res = await getNotificationsAction();
      if (res.success && res.notifications) {
        setNotifications(res.notifications as NotificationItem[]);
        setUnreadCount(res.unreadCount || 0);

        // Optional sound if new unread arrived
        if (prevCountRef.current > 0 && (res.unreadCount || 0) > prevCountRef.current) {
          playNotificationChime();
        }
        prevCountRef.current = res.unreadCount || 0;
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    }
  };

  function playNotificationChime() {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // Audio autoplay policy ignored safely
    }
  }

  useEffect(() => {
    // Slight delay so the initial page navigation & hydration render with zero lag
    const initialTimer = setTimeout(() => {
      fetchNotifications();
    }, 150);

    // Poll every 30 seconds when tab is active (saves database connections)
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchNotifications();
      }
    }, 30000);

    // Langsung fetch jika user kembali ke tab ini dari tab lain
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const handleMarkAllRead = async () => {
    setLoading(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsReadAction();
    setLoading(false);
  };

  const handleClearAll = async () => {
    setLoading(true);
    setNotifications([]);
    setUnreadCount(0);
    await clearAllNotificationsAction();
    setLoading(false);
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    if (!notif.read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
      await markNotificationReadAction(notif.id);
    }
    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const item = notifications.find((n) => n.id === id);
    if (item && !item.read) {
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteNotificationAction(id);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          aria-label="Notifikasi"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/80 bg-secondary/50 text-foreground transition-all duration-200 hover:bg-secondary hover:border-blue-500/30 focus:outline-none"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <>
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-sm ring-2 ring-background animate-in zoom-in-50">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
              <span className="absolute -top-1 -right-1 flex h-5 min-w-5 animate-ping rounded-full bg-rose-400 opacity-60 pointer-events-none" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-[360px] sm:w-[410px] rounded-2xl p-0 shadow-2xl border border-border/80 bg-card/95 backdrop-blur-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 bg-secondary/30">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-foreground">Notifikasi</h3>
            {unreadCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                {unreadCount} Baru
              </Badge>
            ) : (
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-normal text-muted-foreground">
                Semua terbaca
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              disabled={loading}
              className="h-7 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-500/10 px-2 gap-1 rounded-lg"
            >
              <CheckCheck className="h-3.5 w-3.5" />
              <span>Tandai Terbaca</span>
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-border/40 scrollbar-thin">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                <Bell className="h-6 w-6 opacity-60" />
              </div>
              <p className="text-sm font-semibold text-foreground">Belum ada notifikasi</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-[220px]">
                Notifikasi task masuk, deliver tugas, revisi, dan approval akan muncul langsung di sini secara real-time.
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const meta = getNotificationBadge(notif.type);
              const Icon = meta.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex items-start gap-3 p-3.5 transition-all cursor-pointer ${
                    notif.read
                      ? "hover:bg-secondary/40 opacity-80 hover:opacity-100"
                      : "bg-blue-500/[0.04] hover:bg-blue-500/[0.08]"
                  }`}
                >
                  {/* Unread blue dot indicator */}
                  {!notif.read && (
                    <span className="absolute left-1.5 top-5 h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-500/30" />
                  )}

                  {/* Icon badge */}
                  <div
                    className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border ${meta.color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-4">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className="text-xs font-bold text-foreground truncate">
                        {notif.title}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Clock className="h-2.5 w-2.5" />
                        {formatNotificationTime(notif.createdAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {notif.message}
                    </p>
                    {notif.link && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 group-hover:underline">
                        <span>Buka tugas</span>
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    )}
                  </div>

                  {/* Delete individual notification button */}
                  <button
                    onClick={(e) => handleDeleteItem(e, notif.id)}
                    aria-label="Hapus notifikasi"
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-rose-500 transition-opacity rounded-md hover:bg-secondary"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-2 bg-secondary/20 text-xs">
            <span className="text-[11px] text-muted-foreground">
              Total {notifications.length} notifikasi
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearAll}
              disabled={loading}
              className="h-6 text-[11px] text-muted-foreground hover:text-rose-500 hover:bg-rose-500/10 px-2 rounded-lg"
            >
              Hapus Semua
            </Button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
