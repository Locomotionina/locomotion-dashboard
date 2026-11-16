import { setVapidDetails, sendNotification } from "web-push";
import { prisma } from "@/lib/prisma";

const vapidPublicKey =
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ||
  "BGeFi3XoBjv7MbKeJ9GED-oRxcJkEKfqggTokUIT9vWSW2bcWQ1EXOG42NbGkjbQM5HjF21yi9ro3XQYte_xXeg";
const vapidPrivateKey =
  process.env.VAPID_PRIVATE_KEY || "6Mk8NHQP2M6TW8BWEUcbLCrL8kJ_ZaCWR5H93EP7hOE";
const vapidSubject =
  process.env.VAPID_SUBJECT || "mailto:notifikasi@locomotiondashboardtracker.web.id";

let isVapidConfigured = false;

if (vapidPublicKey && vapidPrivateKey) {
  try {
    setVapidDetails(vapidSubject, vapidPublicKey.trim(), vapidPrivateKey.trim());
    isVapidConfigured = true;
  } catch (err) {
    console.error("[WebPush] Failed to initialize VAPID details:", err);
  }
} else {
  console.warn("[WebPush] VAPID keys not fully configured in environment.");
}

export interface PushNotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  taskId?: string;
  type?: string;
  tag?: string;
}

export interface FormatPushPayloadParams {
  type?: string;
  title?: string;
  message: string;
  taskId?: string;
  link?: string;
  taskTitle?: string;
  actorName?: string;
  revisionRound?: number | null;
}

/**
 * Format notification payload according to the 4 core event specs:
 * 1. Task Delegated: "Task Baru: [Task Title] dari [Assignor]"
 * 2. Preview Requested: "Request Preview: [Task Title] siap direview"
 * 3. Revision Delivered: "Revisi Baru #[Round]: [Task Title]"
 * 4. Task Approved: "Task Disetujui: [Task Title] telah selesai"
 */
export function formatPushPayload(params: FormatPushPayloadParams): PushNotificationPayload {
  const taskTitle = params.taskTitle || params.title || "Task";
  const actor = params.actorName || "Tim Locomotion";
  const round = params.revisionRound && params.revisionRound > 0 ? params.revisionRound : 1;
  const eventType = (params.type || "").toUpperCase();

  let title = params.title || "Locomotion Update";
  let body = params.message;
  let targetUrl = params.link || "/dashboard";

  if (eventType === "TASK_ASSIGNED" || eventType === "TASK_DELEGATED") {
    title = `Task Baru: ${taskTitle} dari ${actor}`;
    body = params.message || `${actor} menugaskan task baru untuk Anda.`;
    targetUrl = params.taskId
      ? `/dashboard?tab=active&taskId=${params.taskId}`
      : params.link || "/dashboard?tab=active";
  } else if (eventType === "PREVIEW_REQUESTED") {
    title = `Request Preview: ${taskTitle} siap direview`;
    body = params.message || `${actor} meminta review untuk task ini.`;
    targetUrl = params.taskId
      ? `/dashboard?tab=reviews&taskId=${params.taskId}`
      : params.link || "/dashboard?tab=delivered";
  } else if (eventType === "REVISION_DELIVERED") {
    title = `Revisi Baru #${round}: ${taskTitle}`;
    body = params.message || `${actor} telah menyelesaikan dan mengirim hasil revisi #${round}.`;
    targetUrl = params.taskId
      ? `/dashboard?tab=reviews&taskId=${params.taskId}`
      : params.link || "/dashboard?tab=delivered";
  } else if (eventType === "TASK_APPROVED") {
    title = `Task Disetujui: ${taskTitle} telah selesai`;
    body = params.message || `Task telah resmi disetujui oleh ${actor}.`;
    targetUrl = params.taskId
      ? `/dashboard?tab=archive&taskId=${params.taskId}`
      : params.link || "/dashboard?tab=archive";
  } else if (eventType === "TASK_REVISION") {
    title = `Catatan Revisi #${round}: ${taskTitle}`;
    body = params.message || `${actor} memberikan catatan revisi baru.`;
    targetUrl = params.taskId
      ? `/dashboard?tab=active&taskId=${params.taskId}`
      : params.link || "/dashboard?tab=active";
  }

  return {
    title,
    body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    url: targetUrl,
    taskId: params.taskId,
    type: params.type,
    tag: params.taskId ? `task-${params.taskId}` : undefined,
  };
}

/**
 * Dispatch native Web Push notifications to all active subscriptions of a user.
 * Completely non-blocking and safe against network/expired subscription failures.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<{ success: boolean; sentCount: number; errors?: any[] }> {
  if (!isVapidConfigured) {
    console.warn("[WebPush] Skipping push dispatch: VAPID keys are not configured.");
    return { success: false, sentCount: 0 };
  }

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (!subscriptions || subscriptions.length === 0) {
      return { success: true, sentCount: 0 };
    }

    const payloadString = JSON.stringify(payload);
    const expiredSubIds: string[] = [];
    let sentCount = 0;
    const errors: any[] = [];

    const sendPromises = subscriptions.map(async (sub) => {
      const pushConfig = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      };

      try {
        await sendNotification(pushConfig, payloadString);
        sentCount++;
      } catch (err: any) {
        // HTTP 410 (Gone) or 404 (Not Found) indicates the subscription has expired or unsubscribed
        if (err.statusCode === 410 || err.statusCode === 404) {
          expiredSubIds.push(sub.id);
        } else {
          errors.push({ endpoint: sub.endpoint, error: err.message || err });
        }
      }
    });

    await Promise.allSettled(sendPromises);

    // Clean up expired subscriptions asynchronously
    if (expiredSubIds.length > 0) {
      prisma.pushSubscription
        .deleteMany({
          where: { id: { in: expiredSubIds } },
        })
        .catch((cleanErr) => {
          console.error("[WebPush] Failed cleaning expired subscriptions:", cleanErr);
        });
    }

    return {
      success: true,
      sentCount,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (err: any) {
    console.error("[WebPush] Safe exception caught in sendPushToUser:", err);
    return { success: false, sentCount: 0, errors: [err.message || err] };
  }
}
