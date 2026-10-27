"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type NotificationType =
  | "TASK_ASSIGNED"
  | "TASK_DELIVERED"
  | "TASK_REVISION"
  | "TASK_APPROVED"
  | "TASK_DONE"
  | "INFO";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
  taskId?: string;
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
    });
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
