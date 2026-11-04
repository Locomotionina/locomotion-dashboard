"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { sendTaskNotificationEmail, TaskEmailEventType } from "@/lib/email";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "TASK_ASSIGNED"       // 1. Task Delegated
  | "TASK_DELEGATED"      // 1. Task Delegated
  | "PREVIEW_REQUESTED"   // 2. Preview Requested
  | "REVISION_DELIVERED"  // 3. Revision Delivered
  | "TASK_DELIVERED"      // legacy alias
  | "TASK_REVISION"       // 4. Revision Feedback
  | "TASK_APPROVED"       // 4. Task Approved
  | "TASK_DONE"
  | "INFO";

const EMAIL_TRIGGER_EVENT_TYPES = new Set([
  "TASK_ASSIGNED",
  "TASK_DELEGATED",
  "PREVIEW_REQUESTED",
  "REVISION_DELIVERED",
  "TASK_DELIVERED",
  "TASK_REVISION",
  "TASK_APPROVED",
]);

export interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  taskId?: string;
  actorName?: string;
  taskTitle?: string;
  projectName?: string;
  outputType?: string;
  priority?: string;
  dueDate?: Date | string | null;
  estimatedHours?: number | null;
  reviewerNames?: string[] | string | null;
  brief?: string | null;
  revisionRound?: number | null;
  revisionNote?: string | null;
  revisionAuthor?: string | null;
}

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "INFO",
        link: params.link,
        taskId: params.taskId,
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });

    // Kirim notifikasi email via Resend secara otomatis (non-blocking) khusus untuk 4 event task utama
    const shouldSendEmail =
      Boolean(notification.user?.email) &&
      Boolean(params.type && EMAIL_TRIGGER_EVENT_TYPES.has(params.type));

    if (shouldSendEmail && notification.user?.email) {
      try {
        sendTaskNotificationEmail({
          to: notification.user.email,
          userName: notification.user.name,
          title: params.title,
          message: params.message,
          link: params.link,
          type: params.type as TaskEmailEventType,
          taskId: params.taskId,
          actorName: params.actorName,
          taskTitle: params.taskTitle,
          projectName: params.projectName,
          outputType: params.outputType,
          priority: params.priority,
          dueDate: params.dueDate,
          estimatedHours: params.estimatedHours,
          reviewerNames: params.reviewerNames,
          brief: params.brief,
          revisionRound: params.revisionRound,
          revisionNote: params.revisionNote,
          revisionAuthor: params.revisionAuthor,
        }).catch((mailErr) => {
          console.error("[Resend] Gagal mengirim notifikasi email:", mailErr);
        });
      } catch (mailException) {
        // Strict constraint: email failure must NEVER block notification or DB transaction
        console.error("[Resend] Safe exception caught during email dispatch:", mailException);
      }
    }

    return { success: true, notification };
  } catch (err: any) {
    console.error("Failed to create notification:", err);
    return { success: false, error: err.message };
  }
}

export async function getNotificationsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, notifications: [], unreadCount: 0 };

  try {
    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId: currentUser.id },
        orderBy: { createdAt: "desc" },
        take: 30,
      }),
      prisma.notification.count({
        where: { userId: currentUser.id, read: false },
      }),
    ]);

    return {
      success: true,
      notifications,
      unreadCount,
    };
  } catch (err: any) {
    console.error("Failed to fetch notifications:", err);
    return { success: false, notifications: [], unreadCount: 0, error: err.message };
  }
}

export async function markNotificationReadAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };

  try {
    await prisma.notification.updateMany({
      where: { id, userId: currentUser.id },
      data: { read: true },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function markAllNotificationsReadAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };

  try {
    await prisma.notification.updateMany({
      where: { userId: currentUser.id, read: false },
      data: { read: true },
    });
    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function deleteNotificationAction(id: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };

  try {
    await prisma.notification.deleteMany({
      where: { id, userId: currentUser.id },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function clearAllNotificationsAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser) return { success: false, error: "Unauthorized" };

  try {
    await prisma.notification.deleteMany({
      where: { userId: currentUser.id },
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
