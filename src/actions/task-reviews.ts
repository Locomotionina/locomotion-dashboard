"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export interface TaskParticipant {
  id: string;
  name: string;
  username: string;
  role: string;
  position?: string;
  department?: string;
  avatarUrl?: string | null;
  isReviewer?: boolean;
  isAssignee?: boolean;
  isCreator?: boolean;
}

export interface TaskChatMessageItem {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    userId: string;
    userName: string;
  } | null;
  mentionedUserIds: string[];
  createdAt: string;
  user: {
    id: string;
    name: string;
    username: string;
    role: string;
    position?: string;
    department?: string;
    avatarUrl?: string | null;
  };
}

/**
 * Parses reviewer IDs from task record
 */
function extractReviewerIds(task: { reviewerId?: string | null; reviewerIds?: string | null }): string[] {
  const ids = new Set<string>();
  if (task.reviewerId) ids.add(task.reviewerId);
  if (task.reviewerIds) {
    try {
      const parsed = JSON.parse(task.reviewerIds);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (typeof id === "string" && id.trim()) ids.add(id.trim());
        });
      }
    } catch {
      task.reviewerIds.split(",").forEach((s) => {
        if (s.trim()) ids.add(s.trim());
      });
    }
  }
  return Array.from(ids);
}

/**
 * Update Deliverable Link on Task & Notify Reviewers
 */
export async function updateTaskDeliverableLinkAction(taskId: string, deliverableLink: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    if (!taskId) return { success: false, error: "Task ID is required" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, code: true } },
        revisions: { orderBy: { round: "desc" }, take: 1 },
      },
    });

    if (!task) return { success: false, error: "Task not found" };

    const trimmedLink = (deliverableLink || "").trim();
    const now = new Date();

    // Accumulate elapsed seconds if timer was active
    const rawElapsed = task.timerActive && task.timerStartedAt
      ? Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000)
      : 0;
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    const isRevision = task.status === "Revision" || task.currentPhase === "REVISION";

    // Advance status to "In Review" if currently "On Progress", "To Do", or "Revision"
    let nextStatus = task.status;
    if (task.status === "On Progress" || task.status === "To Do" || task.status === "Revision") {
      nextStatus = "In Review";
    }

    if (isRevision && elapsed > 0) {
      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            seconds: (activeRevision.seconds || 0) + elapsed,
            timerActive: false,
            timerStartedAt: null,
            status: "DELIVERED",
            deliveredAt: now,
          },
        });
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        deliverableLink: trimmedLink || null,
        status: nextStatus,
        totalSeconds: (task.totalSeconds || 0) + elapsed,
        initialSeconds: !isRevision ? (task.initialSeconds || 0) + elapsed : task.initialSeconds,
        timerActive: false,
        timerStartedAt: null,
      },
      include: {
        user: { select: { id: true, name: true, avatarUrl: true } },
        project: { select: { id: true, name: true, code: true } },
      },
    });

    // Notify all registered reviewers
    const reviewerIds = extractReviewerIds(task);
    const recipientIds = reviewerIds.filter((id) => id !== currentUser.id);

    // If no reviewers assigned yet, fallback to task creator if different from current user
    if (recipientIds.length === 0 && task.createdById && task.createdById !== currentUser.id) {
      recipientIds.push(task.createdById);
    }

    if (recipientIds.length > 0) {
      const projectName = task.project?.name || "Tugas";
      const notifTitle = `👀 Review Tugas • ${projectName}`;
      const notifBody = `${task.title}\n👤 ${currentUser.name} mengirim/memperbarui Link Task untuk direview`;
      const notifUrl = `/dashboard?reviewTaskId=${taskId}`;

      // In-app notifications
      const notifsData = recipientIds.map((rId) => ({
        userId: rId,
        title: notifTitle,
        message: `${currentUser.name} mengirim/memperbarui Link Task untuk direview pada: "${task.title}"`,
        type: "TASK_REVIEW_REQUEST",
        link: notifUrl,
      }));

      prisma.notification
        .createMany({ data: notifsData })
        .catch((e) => console.error("[TaskReview] In-app notification error:", e));

      // Web Push notifications
      for (const rId of recipientIds) {
        sendPushToUser(rId, {
          title: notifTitle,
          body: notifBody,
          url: notifUrl,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `task-review-${taskId}`,
          type: "TASK_REVIEW_REQUEST",
        }).catch((e) => console.error("[TaskReview] Web push error:", e));
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return {
      success: true,
      message: "Link Task tersimpan & seluruh reviewer telah diberitahu",
      deliverableLink: updatedTask.deliverableLink,
      status: updatedTask.status,
    };
  } catch (err: any) {
    console.error("Error updating task deliverable link:", err);
    return { success: false, error: err.message || "Gagal memperbarui link deliverable." };
  }
}

/**
 * Add a Reviewer dynamically to a Task
 */
export async function addTaskReviewerAction(taskId: string, userId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    if (!taskId || !userId) return { success: false, error: "Task ID dan User ID diperlukan" };

    const [task, userToAdd] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        include: {
          project: { select: { id: true, name: true } },
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          position: true,
          department: true,
          avatarUrl: true,
        },
      }),
    ]);

    if (!task) return { success: false, error: "Task tidak ditemukan" };
    if (!userToAdd) return { success: false, error: "User tidak ditemukan" };

    const currentReviewerIds = extractReviewerIds(task);
    if (!currentReviewerIds.includes(userId)) {
      currentReviewerIds.push(userId);
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        reviewerId: task.reviewerId || userId,
        reviewerIds: JSON.stringify(currentReviewerIds),
      },
    });

    // Notify newly added reviewer
    if (userId !== currentUser.id) {
      const projectName = task.project?.name || "Tugas";
      const notifTitle = `👀 Ditambahkan Sebagai Reviewer • ${projectName}`;
      const notifBody = `${task.title}\n👤 ${currentUser.name} menambahkan Anda sebagai reviewer`;
      const notifUrl = `/dashboard?reviewTaskId=${taskId}`;

      prisma.notification
        .create({
          data: {
            userId,
            title: notifTitle,
            message: `Anda ditambahkan sebagai reviewer oleh ${currentUser.name} untuk tugas: "${task.title}"`,
            type: "TASK_REVIEWER_ADDED",
            link: notifUrl,
          },
        })
        .catch(() => {});

      sendPushToUser(userId, {
        title: notifTitle,
        body: notifBody,
        url: notifUrl,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag: `task-reviewer-${taskId}`,
        type: "TASK_REVIEWER_ADDED",
      }).catch(() => {});
    }

    // Return full list of reviewers
    const allReviewers = await prisma.user.findMany({
      where: { id: { in: currentReviewerIds } },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        position: true,
        department: true,
        avatarUrl: true,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");

    return {
      success: true,
      message: `${userToAdd.name} berhasil ditambahkan sebagai Reviewer`,
      reviewers: allReviewers,
    };
  } catch (err: any) {
    console.error("Error adding task reviewer:", err);
    return { success: false, error: err.message || "Gagal menambahkan reviewer." };
  }
}

/**
 * Fetch Full Task Details for the 2-Column Review Modal
 */
export async function getTaskReviewDetailsAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    if (!taskId) return { success: false, error: "Task ID is required" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            code: true,
            clientName: true,
          },
        },
        revisions: {
          orderBy: { round: "asc" },
        },
      },
    });

    if (!task) return { success: false, error: "Task not found" };

    const reviewerIds = extractReviewerIds(task);
    const reviewers = await prisma.user.findMany({
      where: { id: { in: reviewerIds } },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        position: true,
        department: true,
        avatarUrl: true,
      },
    });

    // Mark chat read for current user
    prisma.taskChatRead
      .upsert({
        where: {
          userId_taskId: {
            userId: currentUser.id,
            taskId,
          },
        },
        create: {
          userId: currentUser.id,
          taskId,
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
      })
      .catch(() => {});

    return {
      success: true,
      task: {
        ...task,
        dueDate: task.dueDate ? task.dueDate.toISOString() : null,
        completedAt: task.completedAt ? task.completedAt.toISOString() : null,
        timerStartedAt: task.timerStartedAt ? task.timerStartedAt.toISOString() : null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      },
      reviewers,
    };
  } catch (err: any) {
    console.error("Error fetching task review details:", err);
    return { success: false, error: err.message || "Gagal memuat detail review task." };
  }
}

/**
 * Fetch Task Messages & Participants for Task Chat Thread
 */
export async function getTaskMessagesAction(taskId: string, isPoll = false) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Unauthorized", messages: [], participants: [], unreadMentionCount: 0 };
    }

    if (!taskId) {
      return { success: false, error: "Task ID is required", messages: [], participants: [], unreadMentionCount: 0 };
    }

    if (isPoll) {
      const messages = await prisma.taskMessage.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });

      return {
        success: true,
        messages: messages.map((m) => ({
          id: m.id,
          taskId: m.taskId,
          userId: m.userId,
          content: m.content,
          replyToId: m.replyToId,
          replyTo: m.replyTo
            ? {
                id: m.replyTo.id,
                content: m.replyTo.content,
                userId: m.replyTo.userId,
                userName: m.replyTo.user?.name || "Member",
              }
            : null,
          mentionedUserIds: m.mentionedUserIds,
          createdAt: m.createdAt.toISOString(),
          user: m.user,
        })),
        participants: [],
        unreadMentionCount: 0,
      };
    }

    const [task, chatRead, messages] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
          reviewer: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      }),
      prisma.taskChatRead.findUnique({
        where: {
          userId_taskId: {
            userId: currentUser.id,
            taskId,
          },
        },
        select: { lastReadAt: true },
      }),
      prisma.taskMessage.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              role: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
          replyTo: {
            select: {
              id: true,
              content: true,
              userId: true,
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
    ]);

    if (!task) {
      return { success: false, error: "Task not found", messages: [], participants: [], unreadMentionCount: 0 };
    }

    // Calculate unread mentions
    const lastRead = chatRead?.lastReadAt;
    let unreadMentionCount = 0;
    for (const m of messages) {
      if (m.userId !== currentUser.id) {
        const isUnread = !lastRead || m.createdAt > lastRead;
        const isTagged =
          (Array.isArray(m.mentionedUserIds) && m.mentionedUserIds.includes(currentUser.id)) ||
          m.replyTo?.userId === currentUser.id;
        if (isUnread && isTagged) {
          unreadMentionCount++;
        }
      }
    }

    // Auto mark chat read
    prisma.taskChatRead
      .upsert({
        where: {
          userId_taskId: {
            userId: currentUser.id,
            taskId,
          },
        },
        create: {
          userId: currentUser.id,
          taskId,
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
      })
      .catch(() => {});

    // Collect participants exclusively for this task: PIC, Assignor, Reviewers
    const participantsMap = new Map<string, TaskParticipant>();

    if (task.user) {
      participantsMap.set(task.user.id, {
        ...task.user,
        isAssignee: true,
      });
    }

    if (task.createdBy) {
      const existing = participantsMap.get(task.createdBy.id);
      participantsMap.set(task.createdBy.id, {
        ...(existing || task.createdBy),
        isCreator: true,
      });
    }

    const reviewerIds = extractReviewerIds(task);
    if (reviewerIds.length > 0) {
      const reviewerUsers = await prisma.user.findMany({
        where: { id: { in: reviewerIds } },
        select: {
          id: true,
          name: true,
          username: true,
          role: true,
          position: true,
          department: true,
          avatarUrl: true,
        },
      });

      for (const rev of reviewerUsers) {
        const existing = participantsMap.get(rev.id);
        participantsMap.set(rev.id, {
          ...(existing || rev),
          isReviewer: true,
        });
      }
    }

    return {
      success: true,
      unreadMentionCount,
      participants: Array.from(participantsMap.values()),
      messages: messages.map((m) => ({
        id: m.id,
        taskId: m.taskId,
        userId: m.userId,
        content: m.content,
        replyToId: m.replyToId,
        replyTo: m.replyTo
          ? {
              id: m.replyTo.id,
              content: m.replyTo.content,
              userId: m.replyTo.userId,
              userName: m.replyTo.user?.name || "Member",
            }
          : null,
        mentionedUserIds: m.mentionedUserIds,
        createdAt: m.createdAt.toISOString(),
        user: m.user,
      })),
    };
  } catch (err: any) {
    console.error("Error fetching task messages:", err);
    return { success: false, error: err.message || "Gagal memuat pesan chat.", messages: [], participants: [], unreadMentionCount: 0 };
  }
}

/**
 * Send a Task Chat Message
 */
export async function sendTaskMessageAction(
  taskId: string,
  content: string,
  replyToId?: string | null,
  mentionedUserIds: string[] = []
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const trimmed = (content || "").trim();
    if (!trimmed) return { success: false, error: "Pesan tidak boleh kosong" };
    if (!taskId) return { success: false, error: "Task ID is required" };

    const [task, replyToMessage] = await Promise.all([
      prisma.task.findUnique({
        where: { id: taskId },
        include: {
          user: { select: { id: true, name: true } },
          createdBy: { select: { id: true, name: true } },
          project: { select: { id: true, name: true, code: true } },
        },
      }),
      replyToId
        ? prisma.taskMessage.findUnique({
            where: { id: replyToId },
            select: {
              id: true,
              userId: true,
              content: true,
              user: { select: { name: true } },
            },
          })
        : Promise.resolve(null),
    ]);

    if (!task) return { success: false, error: "Task tidak ditemukan" };

    // Find all valid participants for mentions
    const participantIds = new Set<string>();
    if (task.userId) participantIds.add(task.userId);
    if (task.createdById) participantIds.add(task.createdById);
    extractReviewerIds(task).forEach((id) => participantIds.add(id));

    // Sanitize mentionedUserIds
    const finalMentionedUserIds = new Set<string>();
    if (Array.isArray(mentionedUserIds)) {
      for (const id of mentionedUserIds) {
        if (participantIds.has(id) && id !== currentUser.id) {
          finalMentionedUserIds.add(id);
        }
      }
    }

    // Auto-detect @Full Name mentions from text
    const allParticipants = await prisma.user.findMany({
      where: { id: { in: Array.from(participantIds) } },
      select: { id: true, name: true },
    });

    const lowerContent = trimmed.toLowerCase();
    for (const p of allParticipants) {
      if (p.id !== currentUser.id && p.name && lowerContent.includes(`@${p.name.toLowerCase()}`)) {
        finalMentionedUserIds.add(p.id);
      }
    }
    const sanitizedMentionedUserIds = Array.from(finalMentionedUserIds);

    // Create message
    const newMessage = await prisma.taskMessage.create({
      data: {
        taskId,
        userId: currentUser.id,
        content: trimmed,
        replyToId: replyToMessage?.id || null,
        mentionedUserIds: sanitizedMentionedUserIds,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            username: true,
            role: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        replyTo: {
          select: {
            id: true,
            content: true,
            userId: true,
            user: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Mark sender chat as read
    prisma.taskChatRead
      .upsert({
        where: {
          userId_taskId: {
            userId: currentUser.id,
            taskId,
          },
        },
        create: {
          userId: currentUser.id,
          taskId,
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
      })
      .catch(() => {});

    // Dispatch Notifications & Web Push to all participants except sender
    const recipientIds = Array.from(participantIds).filter((id) => id !== currentUser.id);

    if (recipientIds.length > 0) {
      const truncated = trimmed.length > 70 ? `${trimmed.substring(0, 67)}...` : trimmed;
      const targetUrl = `/dashboard?reviewTaskId=${taskId}`;

      const notifsData = recipientIds.map((rId) => {
        const isMentionedOrReplied =
          sanitizedMentionedUserIds.includes(rId) ||
          (replyToMessage && replyToMessage.userId === rId);

        const pushTitle = isMentionedOrReplied
          ? `🔔 ${currentUser.name} menyebutmu • ${task.title}`
          : `💬 Chat Task • ${task.title}`;

        return {
          userId: rId,
          title: pushTitle,
          message: `${currentUser.name}: ${truncated}`,
          type: isMentionedOrReplied ? "TASK_CHAT_MENTION" : "TASK_CHAT",
          link: targetUrl,
        };
      });

      prisma.notification
        .createMany({ data: notifsData })
        .catch((e) => console.error("[TaskChat] Notification createMany error:", e));

      for (const rId of recipientIds) {
        const isMentionedOrReplied =
          sanitizedMentionedUserIds.includes(rId) ||
          (replyToMessage && replyToMessage.userId === rId);

        const pushTitle = isMentionedOrReplied
          ? `🔔 ${currentUser.name} menyebutmu • ${task.title}`
          : `💬 Chat Task • ${task.title}`;

        sendPushToUser(rId, {
          title: pushTitle,
          body: `${currentUser.name}: ${truncated}`,
          url: targetUrl,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `task-chat-${taskId}`,
          type: "TASK_CHAT",
        }).catch((e) => console.error("[TaskChat] WebPush error:", e));
      }
    }

    return {
      success: true,
      message: {
        id: newMessage.id,
        taskId: newMessage.taskId,
        userId: newMessage.userId,
        content: newMessage.content,
        replyToId: newMessage.replyToId,
        replyTo: newMessage.replyTo
          ? {
              id: newMessage.replyTo.id,
              content: newMessage.replyTo.content,
              userId: newMessage.replyTo.userId,
              userName: newMessage.replyTo.user?.name || "Member",
            }
          : null,
        mentionedUserIds: newMessage.mentionedUserIds,
        createdAt: newMessage.createdAt.toISOString(),
        user: newMessage.user,
      },
    };
  } catch (err: any) {
    console.error("Error sending task message:", err);
    return { success: false, error: err.message || "Gagal mengirim pesan chat." };
  }
}

/**
 * Mark Task Chat as Read for Current User
 */
export async function markTaskChatAsReadAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };
    if (!taskId) return { success: false, error: "Task ID is required" };

    await prisma.taskChatRead.upsert({
      where: {
        userId_taskId: {
          userId: currentUser.id,
          taskId,
        },
      },
      create: {
        userId: currentUser.id,
        taskId,
        lastReadAt: new Date(),
      },
      update: {
        lastReadAt: new Date(),
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Error marking task chat read:", err);
    return { success: false, error: err.message || "Failed to mark chat as read." };
  }
}

/**
 * Fast Batch Unread Mention / Reply Counter across tasks for the current user
 */
export async function getTasksUnreadMentionsAction(taskIds: string[]) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, unreadCounts: {} };

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return { success: true, unreadCounts: {} };
    }

    const [chatReads, unreadMessages] = await Promise.all([
      prisma.taskChatRead.findMany({
        where: {
          userId: currentUser.id,
          taskId: { in: taskIds },
        },
        select: {
          taskId: true,
          lastReadAt: true,
        },
      }),
      prisma.taskMessage.findMany({
        where: {
          taskId: { in: taskIds },
          userId: { not: currentUser.id },
        },
        select: {
          id: true,
          taskId: true,
          mentionedUserIds: true,
          replyTo: { select: { userId: true } },
          createdAt: true,
        },
      }),
    ]);

    const readMap = new Map<string, Date>();
    chatReads.forEach((r) => readMap.set(r.taskId, r.lastReadAt));

    const counts: Record<string, number> = {};
    for (const m of unreadMessages) {
      const lastRead = readMap.get(m.taskId);
      const isUnread = !lastRead || m.createdAt > lastRead;
      const isTagged =
        (Array.isArray(m.mentionedUserIds) && m.mentionedUserIds.includes(currentUser.id)) ||
        m.replyTo?.userId === currentUser.id;

      if (isUnread && isTagged) {
        counts[m.taskId] = (counts[m.taskId] || 0) + 1;
      }
    }

    return { success: true, unreadCounts: counts };
  } catch (err: any) {
    console.error("Error fetching tasks unread mentions:", err);
    return { success: false, unreadCounts: {} };
  }
}

/**
 * Get active team members for Reviewer dropdown selection
 */
export async function getActiveTeamMembersAction() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, users: [] };

    const users = await prisma.user.findMany({
      where: {
        isApproved: true,
        isSuspended: false,
      },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        position: true,
        department: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    });

    return { success: true, users };
  } catch (err: any) {
    console.error("Error fetching active team members:", err);
    return { success: false, users: [] };
  }
}

