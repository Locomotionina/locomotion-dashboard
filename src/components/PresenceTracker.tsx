"use client";

import { useEffect, useRef } from "react";
import {
  getSupabaseBrowserClient,
  LOCOMOTION_PRESENCE_CHANNEL,
  RealtimePresencePayload,
} from "@/lib/supabase";
import {
  heartbeatPresenceAction,
  recordUserOfflineAction,
} from "@/actions/management";

interface PresenceTrackerProps {
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    department: string;
    avatarUrl?: string | null;
  };
}

export function PresenceTracker({ user }: PresenceTrackerProps) {
  const currentTaskRef = useRef<{
    taskId?: string;
    taskTitle?: string;
    timerActive?: boolean;
  }>({});

  useEffect(() => {
    if (!user?.id) return;

    // 1. Initial Heartbeat
    const sendHeartbeat = () => {
      heartbeatPresenceAction(currentTaskRef.current).catch(() => {});
    };

    sendHeartbeat();
    const heartbeatInterval = setInterval(sendHeartbeat, 20000);

    // 2. Supabase Realtime Presence Channel
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    const trackCurrentPresence = async () => {
      if (!channel) return;
      const payload: RealtimePresencePayload = {
        userId: user.id,
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        role: user.role,
        department: user.department,
        onlineAt: new Date().toISOString(),
        activeTaskId: currentTaskRef.current.taskId || null,
        activeTaskTitle: currentTaskRef.current.taskTitle || null,
        isTimerActive: Boolean(currentTaskRef.current.timerActive),
      };
      try {
        await channel.track(payload);
      } catch (err) {
        console.debug("Supabase presence track error:", err);
      }
    };

    if (supabase) {
      channel = supabase.channel(LOCOMOTION_PRESENCE_CHANNEL, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel.subscribe(async (status: string) => {
        if (status === "SUBSCRIBED") {
          await trackCurrentPresence();
        }
      });
    }

    // 3. Custom event listener for instant timer state changes
    const handleTimerChange = (e: Event) => {
      const customEvent = e as CustomEvent<{
        taskId?: string;
        taskTitle?: string;
        timerActive?: boolean;
      }>;

      if (customEvent.detail) {
        currentTaskRef.current = {
          taskId: customEvent.detail.taskId,
          taskTitle: customEvent.detail.taskTitle,
          timerActive: customEvent.detail.timerActive,
        };

        // Broadcast to Supabase Realtime channel
        if (channel) {
          channel.track({
            userId: user.id,
            username: user.username,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            department: user.department,
            onlineAt: new Date().toISOString(),
            activeTaskId: customEvent.detail.taskId || null,
            activeTaskTitle: customEvent.detail.taskTitle || null,
            isTimerActive: Boolean(customEvent.detail.timerActive),
          });

          channel.send({
            type: "broadcast",
            event: "task_timer_updated",
            payload: {
              userId: user.id,
              taskId: customEvent.detail.taskId || null,
              taskTitle: customEvent.detail.taskTitle || null,
              timerActive: Boolean(customEvent.detail.timerActive),
            },
          });
        }

        // Trigger immediate heartbeat update
        sendHeartbeat();
      }
    };

    window.addEventListener("task-timer-state-changed", handleTimerChange);

    // 4. Handle window beforeunload / tab close
    const handleBeforeUnload = () => {
      recordUserOfflineAction().catch(() => {});
      if (channel) {
        channel.untrack();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // 5. Reconnection & tab focus handler
    const handleReconnect = () => {
      if (!document.hidden && channel) {
        sendHeartbeat();
        trackCurrentPresence();
      }
    };

    document.addEventListener("visibilitychange", handleReconnect);
    window.addEventListener("focus", handleReconnect);
    window.addEventListener("online", handleReconnect);

    return () => {
      clearInterval(heartbeatInterval);
      window.removeEventListener("task-timer-state-changed", handleTimerChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleReconnect);
      window.removeEventListener("focus", handleReconnect);
      window.removeEventListener("online", handleReconnect);

      if (channel) {
        channel.untrack?.();
        channel.unsubscribe?.();
        if (supabase) {
          supabase.removeChannel(channel);
        }
      }
    };
  }, [user]);

  return null;
}
