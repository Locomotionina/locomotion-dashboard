// In-memory presence store for user activity tracking with automatic expiration

interface PresenceRecord {
  lastSeen: number;
  taskId?: string;
  taskTitle?: string;
  timerActive?: boolean;
}

const g = globalThis as unknown as {
  __locomotionPresenceStore?: Map<string, PresenceRecord>;
};

if (!g.__locomotionPresenceStore) {
  g.__locomotionPresenceStore = new Map<string, PresenceRecord>();
}

export const presenceStore = g.__locomotionPresenceStore;

/**
 * Record a user heartbeat ping and update their activity telemetry
 */
export function recordUserHeartbeat(
  userId: string,
  data?: { taskId?: string; taskTitle?: string; timerActive?: boolean }
) {
  presenceStore.set(userId, {
    lastSeen: Date.now(),
    taskId: data?.taskId,
    taskTitle: data?.taskTitle,
    timerActive: data?.timerActive,
  });
}

/**
 * Explicitly mark a user as offline
 */
export function recordUserOffline(userId: string) {
  presenceStore.delete(userId);
}

/**
 * Returns an array of user IDs whose last heartbeat was within the threshold (45 seconds)
 */
export function getOnlineUserIds(): string[] {
  const now = Date.now();
  const threshold = 45000; // 45 seconds timeout
  const online: string[] = [];

  presenceStore.forEach((record, userId) => {
    if (now - record.lastSeen < threshold) {
      online.push(userId);
    } else {
      // Auto purge stale record
      presenceStore.delete(userId);
    }
  });

  return online;
}
