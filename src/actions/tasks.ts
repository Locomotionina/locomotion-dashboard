"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notifications";

export async function createTaskAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Authentication required to create tasks." };
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const taskOutputTypeRaw = (formData.get("taskOutputType") as string) || "";
  const taskOutputType = taskOutputTypeRaw.trim() || null;
  const projectId = (formData.get("projectId") as string) || null;
  const folderIdRaw = (formData.get("folderId") as string) || null;
  const folderId = folderIdRaw === "NONE" || !folderIdRaw ? null : folderIdRaw;
  const priority = (formData.get("priority") as string) || "MEDIUM";
  const status = (formData.get("status") as string) || "To Do";
  const dueDateStr = formData.get("dueDate") as string;
  const estimatedHours = parseFloat((formData.get("estimatedHours") as string) || "4");
  const assigneeId = (formData.get("assigneeId") as string) || "ME";
  const rawReviewerIds = formData.get("reviewerIds") as string;
  let reviewerIds: string[] = [];
  if (rawReviewerIds) {
    try {
      const parsed = JSON.parse(rawReviewerIds);
      reviewerIds = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      reviewerIds = rawReviewerIds.split(",").map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!title || title.trim().length === 0) {
    return { success: false, error: "Task title is required." };
  }

  const targetUserId = assigneeId && assigneeId !== "ME" ? assigneeId : currentUser.id;
  const primaryReviewer = reviewerIds.length > 0 ? reviewerIds[0] : null;
  const reviewerIdsJson = reviewerIds.length > 0 ? JSON.stringify(reviewerIds) : null;

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      taskOutputType,
      priority,
      status,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      estimatedHours: isNaN(estimatedHours) ? 4.0 : estimatedHours,
      userId: targetUserId,
      createdById: currentUser.id,
      reviewerId: primaryReviewer,
      reviewerIds: reviewerIdsJson,
      projectId: projectId === "NONE" || !projectId ? null : projectId,
      folderId,
      completedAt: status === "Done" ? new Date() : null,
      currentPhase: "INITIAL",
      currentRevisionRound: 0,
      initialSeconds: 0,
      totalSeconds: 0,
      timerActive: false,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/projects");
  revalidatePath("/management");
  if (projectId) {
    revalidatePath(`/projects/${projectId}`);
  }

  // Notifikasi real-time terintegrasi untuk penerima task jika ditugaskan ke orang lain
  if (targetUserId !== currentUser.id) {
    await createNotification({
      userId: targetUserId,
      title: "Task Baru Masuk",
      message: `${currentUser.name} menugaskan task baru: "${title.trim()}".`,
      type: "TASK_ASSIGNED",
      link: "/dashboard?tab=active",
      taskId: task.id,
      actorName: currentUser.name,
      taskTitle: task.title,
      brief: task.description,
      outputType: task.taskOutputType || undefined,
      priority: task.priority,
      dueDate: task.dueDate,
      estimatedHours: task.estimatedHours,
    });
  }

  return { success: true, task };
}

/**
 * START TIMER:
 * - If in Initial Draft (To Do / On Progress): starts initial timer & sets status to "On Progress".
 * - If in Revision: starts the timer for the active revision round.
 */
export async function startTaskTimerAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task not found" };

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id &&
      task.createdById !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized to control timer" };
    }

    const now = new Date();

    if (task.status === "Revision" || task.currentPhase === "REVISION") {
      // Start active revision timer
      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            timerActive: true,
            timerStartedAt: now,
            status: "IN_PROGRESS",
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          timerActive: true,
          timerStartedAt: now,
        },
      });
    } else {
      // Start initial work timer
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "On Progress",
          currentPhase: "INITIAL",
          timerActive: true,
          timerStartedAt: now,
          completedAt: null,
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in startTaskTimerAction:", err);
    return { success: false, error: err.message || "Gagal memulai task." };
  }
}

/**
 * PAUSE (JEDA) TIMER:
 * Accumulates elapsed seconds into task or active revision without changing overall phase.
 */
export async function pauseTaskTimerAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task not found" };

    if (!task.timerActive || !task.timerStartedAt) {
      return { success: true }; // already paused
    }

    const rawElapsed = Math.floor((Date.now() - new Date(task.timerStartedAt).getTime()) / 1000);
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    if (task.status === "Revision" || task.currentPhase === "REVISION") {
      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            seconds: (activeRevision.seconds || 0) + elapsed,
            timerActive: false,
            timerStartedAt: null,
            status: "IN_PROGRESS",
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in pauseTaskTimerAction:", err);
    return { success: false, error: err.message || "Gagal menjeda timer." };
  }
}

/**
 * DELIVER TASK (Workflow Deliver Delegated Task):
 * Stops active timer, accumulates seconds, records previewDescription notes,
 * sets optional multi-select reviewers, and transitions task to "In Review" status.
 */
export async function deliverTaskAction(
  input:
    | string
    | FormData
    | { taskId: string; description?: string; targetUserIds?: string[] }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    let taskId: string;
    let description = "";
    let targetUserIds: string[] = [];

    if (typeof input === "string") {
      taskId = input;
    } else if (input instanceof FormData) {
      taskId = input.get("taskId") as string;
      description = (input.get("description") as string) || "";
      const rawTargets = input.get("targetUserIds") as string;
      if (rawTargets) {
        try {
          const parsed = JSON.parse(rawTargets);
          targetUserIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          targetUserIds = rawTargets.split(",").map((s) => s.trim()).filter(Boolean);
        }
      }
    } else if (input && typeof input === "object") {
      taskId = input.taskId;
      description = input.description || "";
      if (Array.isArray(input.targetUserIds)) {
        targetUserIds = input.targetUserIds;
      }
    } else {
      return { success: false, error: "Data input tidak valid." };
    }

    if (!taskId) return { success: false, error: "Task ID diperlukan." };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task not found" };

    // Staff authorization check: Only the assignee (or admin/management) can deliver the task
    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Akses ditolak: Hanya pelaksana task yang dapat mendeliver task ini." };
    }

    const now = new Date();
    const rawElapsed = task.timerActive && task.timerStartedAt
      ? Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000)
      : 0;
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    let finalReviewerId = task.reviewerId;
    let finalReviewerIds = task.reviewerIds;

    if (targetUserIds.length > 0) {
      finalReviewerId = targetUserIds[0];
      finalReviewerIds = JSON.stringify(targetUserIds);
    } else if (!finalReviewerId && task.createdById) {
      finalReviewerId = task.createdById;
      finalReviewerIds = JSON.stringify([task.createdById]);
    }

    const isRevision = task.status === "Revision" || task.currentPhase === "REVISION";

    if (isRevision) {
      await prisma.taskRevision.updateMany({
        where: {
          taskId,
          round: task.currentRevisionRound,
          status: "PENDING",
        },
        data: {
          timerActive: false,
          timerStartedAt: null,
          status: "DELIVERED",
          deliveredAt: now,
        },
      });

      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            seconds: (activeRevision.seconds || 0) + elapsed,
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
          reviewerId: finalReviewerId,
          reviewerIds: finalReviewerIds,
          previewDescription: description.trim() || task.previewDescription || null,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
          reviewerId: finalReviewerId,
          reviewerIds: finalReviewerIds,
          previewDescription: description.trim() || null,
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    // Notifikasi terintegrasi untuk pembuat/pengirim task dan semua reviewer yang dipilih
    const recipients = new Set<string>();
    if (targetUserIds.length > 0) {
      targetUserIds.forEach((id) => recipients.add(id));
    } else if (task.createdById && task.createdById !== currentUser.id) {
      recipients.add(task.createdById);
    }

    const snippet = description.trim().length > 60 ? description.trim().slice(0, 57) + "..." : description.trim();
    const eventType = isRevision ? "REVISION_DELIVERED" : "PREVIEW_REQUESTED";
    const notifTitle = isRevision ? "Revisi Telah Diserahkan 🚀" : "Permintaan Preview Task 🔍";
    const notifMessage = isRevision
      ? `${currentUser.name} telah men-deliver hasil revisi task "${task.title}" untuk di-review${snippet ? `: "${snippet}"` : "."}`
      : `${currentUser.name} telah men-deliver task "${task.title}" untuk di-review${snippet ? `: "${snippet}"` : "."}`;

    for (const recipientId of Array.from(recipients)) {
      if (recipientId !== currentUser.id) {
        await createNotification({
          userId: recipientId,
          title: notifTitle,
          message: notifMessage,
          type: eventType,
          link: "/dashboard?tab=delivered",
          taskId: task.id,
          actorName: currentUser.name,
          taskTitle: task.title,
          brief: isRevision ? undefined : (description.trim() || task.description),
          outputType: task.taskOutputType || undefined,
          priority: task.priority,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
          revisionRound: task.currentRevisionRound,
          revisionNote: isRevision ? (description.trim() || undefined) : undefined,
          revisionAuthor: currentUser.name,
        }).catch((e) => console.error("Notification delivery failed:", e));
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in deliverTaskAction:", err);
    return { success: false, error: err.message || "Gagal mendeliver task." };
  }
}

/**
 * REQUEST PREVIEW WORKFLOW (Flexible Routing / Multi-Select Reviewers):
 * Mengajukan task ke satu atau beberapa Reviewer (Target Users) beserta deskripsi request.
 * Menghentikan timer yang berjalan dan mengubah status menjadi "In Review".
 */
export async function requestTaskPreviewAction(
  input:
    | FormData
    | { taskId: string; targetUserId?: string; targetUserIds?: string[]; description?: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    let taskId: string;
    let targetUserIds: string[] = [];
    let description = "";

    if (input instanceof FormData) {
      taskId = input.get("taskId") as string;
      const rawTargets = input.get("targetUserIds") as string;
      const singleTarget = input.get("targetUserId") as string;
      if (rawTargets) {
        try {
          const parsed = JSON.parse(rawTargets);
          targetUserIds = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          targetUserIds = rawTargets.split(",").map((s) => s.trim()).filter(Boolean);
        }
      } else if (singleTarget) {
        targetUserIds = [singleTarget];
      }
      description = (input.get("description") as string) || "";
    } else if (input && typeof input === "object") {
      taskId = input.taskId;
      if (Array.isArray(input.targetUserIds) && input.targetUserIds.length > 0) {
        targetUserIds = input.targetUserIds;
      } else if (input.targetUserId) {
        targetUserIds = [input.targetUserId];
      }
      description = input.description || "";
    } else {
      return { success: false, error: "Data input tidak valid." };
    }

    if (!taskId) return { success: false, error: "Task ID diperlukan." };
    if (!targetUserIds || targetUserIds.length === 0) {
      return { success: false, error: "Minimal pilih satu Reviewer (Target User)." };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task tidak ditemukan." };

    // Reviewer tidak boleh pelaksana task itu sendiri
    targetUserIds = targetUserIds.filter((id) => id !== task.userId);
    if (targetUserIds.length === 0) {
      return { success: false, error: "Tidak dapat menunjuk pelaksana task sebagai reviewer." };
    }

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Akses ditolak: Hanya pelaksana task yang dapat mengajukan preview." };
    }

    const primaryReviewerId = targetUserIds[0];
    const reviewerIdsJson = JSON.stringify(targetUserIds);

    const now = new Date();
    const rawElapsed = task.timerActive && task.timerStartedAt
      ? Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000)
      : 0;
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    const isRevision = task.status === "Revision" || task.currentPhase === "REVISION";

    if (isRevision) {
      await prisma.taskRevision.updateMany({
        where: {
          taskId,
          round: task.currentRevisionRound,
          status: "PENDING",
        },
        data: {
          timerActive: false,
          timerStartedAt: null,
          status: "DELIVERED",
          deliveredAt: now,
        },
      });

      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            seconds: (activeRevision.seconds || 0) + elapsed,
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
          reviewerId: primaryReviewerId,
          reviewerIds: reviewerIdsJson,
          previewDescription: description.trim() || null,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
          reviewerId: primaryReviewerId,
          reviewerIds: reviewerIdsJson,
          previewDescription: description.trim() || null,
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    // Notifikasi real-time untuk setiap Reviewer yang dipilih
    const snippet = description.trim().length > 60 ? description.trim().slice(0, 57) + "..." : description.trim();
    const eventType = isRevision ? "REVISION_DELIVERED" : "PREVIEW_REQUESTED";
    const notifTitle = isRevision ? "Revisi Telah Diserahkan 🚀" : "Permintaan Preview Task 🔍";
    const notifMessage = isRevision
      ? `${currentUser.name} telah menyerahkan hasil revisi task "${task.title}" untuk di-review${snippet ? `: "${snippet}"` : "."}`
      : `${currentUser.name} meminta Anda me-review task "${task.title}"${snippet ? `: "${snippet}"` : "."}`;

    for (const rId of targetUserIds) {
      await createNotification({
        userId: rId,
        title: notifTitle,
        message: notifMessage,
        type: eventType,
        link: `/dashboard?tab=reviews&taskId=${task.id}`,
        taskId: task.id,
        actorName: currentUser.name,
        taskTitle: task.title,
        brief: isRevision ? undefined : (description.trim() || task.description),
        outputType: task.taskOutputType || undefined,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        revisionRound: task.currentRevisionRound,
        revisionNote: isRevision ? (description.trim() || undefined) : undefined,
        revisionAuthor: currentUser.name,
      }).catch((e) => console.error("Notification creation failed:", e));
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in requestTaskPreviewAction:", err);
    return { success: false, error: err.message || "Gagal mengajukan preview task." };
  }
}

/**
 * PULL-BACK REVISION WORKFLOW ("Mulai Revisi"):
 * Mengembalikan task dari status "In Review" kembali ke "On Progress",
 * membuka kunci stopwatch timer dan langsung mengaktifkan timer pengerjaan revisi,
 * sehingga user dapat segera mengerjakan revisi parsial tanpa menunggu seluruh reviewer selesai.
 * Catatan/feedback revisi sebelumnya tetap tersimpan utuh dan dapat dilihat sebagai acuan.
 */
export async function pullBackToRevisionAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });

    if (!task) return { success: false, error: "Task tidak ditemukan." };

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id
    ) {
      return {
        success: false,
        error: "Akses ditolak: Hanya pelaksana task yang dapat menarik kembali task untuk revisi.",
      };
    }

    const now = new Date();

    // Jika terdapat ronde revisi aktif yang belum disetujui, aktifkan status dan timernya
    const activeRevision = task.revisions[0];
    if (activeRevision && activeRevision.status !== "APPROVED") {
      await prisma.taskRevision.update({
        where: { id: activeRevision.id },
        data: {
          status: "IN_PROGRESS",
          timerActive: true,
          timerStartedAt: now,
        },
      });
    }

    // Ubah status dari "In Review" kembali menjadi "On Progress", set phase ke REVISION, dan buka kunci timer
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "On Progress",
        currentPhase: "REVISION",
        timerActive: true,
        timerStartedAt: now,
        completedAt: null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in pullBackToRevisionAction:", err);
    return { success: false, error: err.message || "Gagal memulai revisi." };
  }
}

/**
 * COMPLETE TASK (Tombol "Done" Langsung untuk Self-Assigned Tasks):
 * Menghentikan timer dan menandai task langsung berstatus "Done".
 */
export async function completeTaskAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task not found" };

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id &&
      task.createdById !== currentUser.id &&
      task.reviewerId !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized" };
    }

    const now = new Date();
    const rawElapsed = task.timerActive && task.timerStartedAt
      ? Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000)
      : 0;
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    if (task.status === "Revision" || task.currentPhase === "REVISION") {
      const activeRevision = task.revisions[0];
      if (activeRevision) {
        await prisma.taskRevision.update({
          where: { id: activeRevision.id },
          data: {
            seconds: (activeRevision.seconds || 0) + elapsed,
            timerActive: false,
            timerStartedAt: null,
            status: "APPROVED",
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "Done",
          completedAt: now,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    } else {
      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "Done",
          completedAt: now,
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    // Notifikasi jika task ditugaskan oleh orang lain
    if (task.createdById && task.createdById !== currentUser.id) {
      await createNotification({
        userId: task.createdById,
        title: "Task Selesai",
        message: `${currentUser.name} telah menyelesaikan task "${task.title}".`,
        type: "TASK_DONE",
        link: "/dashboard?tab=delivered",
        taskId: task.id,
      }).catch((e) => console.error("Notification creation failed:", e));
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in completeTaskAction:", err);
    return { success: false, error: err.message || "Gagal menyelesaikan task." };
  }
}

/**
 * REQUEST REVISION (Kirim Revisi dari Pembuat Task atau Reviewer Target):
 * Reviewer/Creator inputs revision feedback.
 * Increments round, creates a new TaskRevision, and sets task status to "Revision".
 */
export async function requestRevisionAction(
  input: FormData | { taskId: string; feedback: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    let taskId: string;
    let feedback: string;

    if (input instanceof FormData) {
      taskId = input.get("taskId") as string;
      feedback = input.get("feedback") as string;
    } else if (input && typeof input === "object") {
      taskId = input.taskId;
      feedback = input.feedback;
    } else {
      return { success: false, error: "Data input tidak valid." };
    }

    if (!feedback || feedback.trim().length === 0) {
      return { success: false, error: "Catatan revisi harus diisi." };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { createdAt: "asc" } } },
    });
    if (!task) return { success: false, error: "Task not found" };

    let assignedReviewerIds: string[] = [];
    if (task.reviewerIds) {
      try {
        const parsed = JSON.parse(task.reviewerIds);
        assignedReviewerIds = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        assignedReviewerIds = task.reviewerIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    if (assignedReviewerIds.length === 0) {
      if (task.reviewerId) assignedReviewerIds.push(task.reviewerId);
      else if (task.createdById) assignedReviewerIds.push(task.createdById);
    }
    const isAssignedReviewer = assignedReviewerIds.includes(currentUser.id);

    // Creator, management, admin, or assigned reviewer can request revisions
    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.createdById !== currentUser.id &&
      task.reviewerId !== currentUser.id &&
      !isAssignedReviewer &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized to request revision" };
    }

    // Determine target round:
    // If there is already a PENDING revision for this cycle, use that round number
    const pendingRevisions = task.revisions.filter((r) => r.status === "PENDING");
    let targetRound: number;
    if (pendingRevisions.length > 0) {
      targetRound = pendingRevisions[0].round;
    } else if (task.status === "In Review") {
      targetRound = (task.currentRevisionRound || 0) + 1;
    } else {
      targetRound = Math.max(task.currentRevisionRound || 1, 1);
    }

    // Upsert the revision note for this reviewer and round
    const existingUserRevision = task.revisions.find(
      (r) => r.round === targetRound && r.authorId === currentUser.id
    );

    if (existingUserRevision) {
      await prisma.taskRevision.update({
        where: { id: existingUserRevision.id },
        data: {
          feedback: feedback.trim(),
          status: "PENDING",
          authorName: currentUser.name,
        },
      });
    } else {
      await prisma.taskRevision.create({
        data: {
          taskId,
          round: targetRound,
          feedback: feedback.trim(),
          authorId: currentUser.id,
          authorName: currentUser.name,
          seconds: 0,
          timerActive: false,
          status: "PENDING",
        },
      });
    }

    // Check if other assigned reviewers still haven't submitted feedback
    const reviewedAuthors = new Set(
      task.revisions
        .filter((r) => r.round === targetRound)
        .map((r) => r.authorId)
        .filter(Boolean)
    );
    reviewedAuthors.add(currentUser.id);

    const hasPendingOtherReviewers =
      assignedReviewerIds.length > 1 &&
      assignedReviewerIds.some((id) => !reviewedAuthors.has(id));

    // Parallel review support:
    // Keep task.status = "In Review" if other assigned reviewers haven't reviewed yet,
    // so they are NOT locked out from approving or requesting revisions.
    // Transition to "Revision" once all assigned reviewers have submitted.
    const nextStatus = hasPendingOtherReviewers ? "In Review" : "Revision";

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: nextStatus,
        currentPhase: "REVISION",
        currentRevisionRound: targetRound,
        timerActive: false,
        timerStartedAt: null,
      },
    });

    // Integrated notification for assignee
    if (task.userId !== currentUser.id) {
      const snippet = feedback.trim().length > 60 ? feedback.trim().slice(0, 57) + "..." : feedback.trim();
      const waitingNote = hasPendingOtherReviewers ? " (Reviewer lain sedang meninjau)" : "";
      await createNotification({
        userId: task.userId,
        title: `Catatan Revisi dari ${currentUser.name} (Round #${targetRound})${waitingNote}`,
        message: `${currentUser.name} memberikan catatan revisi untuk "${task.title}": "${snippet}"`,
        type: "TASK_REVISION",
        link: "/dashboard?tab=active",
        taskId: task.id,
        actorName: currentUser.name,
        taskTitle: task.title,
        outputType: task.taskOutputType || undefined,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        revisionRound: targetRound,
        revisionNote: feedback.trim(),
        revisionAuthor: currentUser.name,
      }).catch((e) => console.error("Notification creation failed:", e));
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error in requestRevisionAction:", err);
    return { success: false, error: err.message || "Gagal meminta revisi." };
  }
}

/**
 * APPROVE TASK (Approve & Selesai):
 * Marks reviewer approval. If multiple reviewers are assigned, waits for all reviewers.
 * Transitions to Done when all approved (or Revision if any reviewer requested revision).
 */
export async function approveTaskAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { createdAt: "asc" } } },
    });
    if (!task) return { success: false, error: "Task not found" };

    let assignedReviewerIds: string[] = [];
    if (task.reviewerIds) {
      try {
        const parsed = JSON.parse(task.reviewerIds);
        assignedReviewerIds = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        assignedReviewerIds = task.reviewerIds.split(",").map((s) => s.trim()).filter(Boolean);
      }
    }
    if (assignedReviewerIds.length === 0) {
      if (task.reviewerId) assignedReviewerIds.push(task.reviewerId);
      else if (task.createdById) assignedReviewerIds.push(task.createdById);
    }
    const isAssignedReviewer = assignedReviewerIds.includes(currentUser.id);

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.createdById !== currentUser.id &&
      task.reviewerId !== currentUser.id &&
      !isAssignedReviewer &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized to approve this task" };
    }

    const now = new Date();
    const rawElapsed = task.timerActive && task.timerStartedAt
      ? Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000)
      : 0;
    const elapsed = Math.max(0, isNaN(rawElapsed) ? 0 : rawElapsed);

    // 1. Resolve all open review steps across all assigned reviewers:
    // Mark any open, pending, delivered, or in-progress revision records as APPROVED
    await prisma.taskRevision.updateMany({
      where: {
        taskId,
        status: { in: ["PENDING", "DELIVERED", "IN_PROGRESS"] },
      },
      data: {
        status: "APPROVED",
        timerActive: false,
        timerStartedAt: null,
      },
    });

    // 2. Set task status strictly to "Done"
    // Clear active preview request data, reset phase to INITIAL, stop timer, record completedAt
    // Strictly preserve currentRevisionRound without any increment
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "Done",
        currentPhase: "INITIAL",
        completedAt: now,
        previewDescription: null,
        timerActive: false,
        timerStartedAt: null,
        totalSeconds: (task.totalSeconds || 0) + elapsed,
      },
    });

    // 3. Trigger approval notifications
    if (task.userId !== currentUser.id) {
      await createNotification({
        userId: task.userId,
        title: "Task Disetujui & Selesai! 🎉",
        message: `${currentUser.name} telah menyetujui "${task.title}". Status resmi menjadi Done.`,
        type: "TASK_APPROVED",
        link: "/dashboard?tab=archive",
        taskId: task.id,
        actorName: currentUser.name,
        taskTitle: task.title,
        outputType: task.taskOutputType || undefined,
        priority: task.priority,
        dueDate: task.dueDate,
        estimatedHours: task.estimatedHours,
        revisionRound: task.currentRevisionRound,
        revisionNote: "Task telah melalui proses peninjauan dan secara resmi disetujui tanpa catatan revisi. Status resmi menjadi Done.",
        revisionAuthor: currentUser.name,
      }).catch((e) => console.error("Notification creation failed:", e));
    }

    if (task.createdById && task.createdById !== currentUser.id && task.createdById !== task.userId) {
      await createNotification({
        userId: task.createdById,
        title: "Task Selesai Disetujui 🎉",
        message: `Task "${task.title}" telah disetujui oleh ${currentUser.name} dan berstatus Done.`,
        type: "TASK_DONE",
        link: "/dashboard?tab=delegated",
        taskId: task.id,
      }).catch(() => {});
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    revalidatePath("/");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }

    return {
      success: true,
      message: "Task berhasil disetujui & berstatus Selesai (Done).",
    };
  } catch (err: any) {
    console.error("Error in approveTaskAction:", err);
    return { success: false, error: err.message || "Gagal menyetujui task." };
  }
}

export async function updateTaskStatusAction(taskId: string, newStatus: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Authentication required." };
    }

    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, error: "Task not found." };
    }

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id &&
      task.createdById !== currentUser.id
    ) {
      return { success: false, error: "Privacy constraint: You cannot modify other staff's tasks." };
    }

    const isDone = newStatus === "Done";

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: newStatus,
        completedAt: isDone ? new Date() : null,
        timerActive: isDone ? false : task.timerActive,
        timerStartedAt: isDone ? null : task.timerStartedAt,
      },
    });

    // Notifikasi terintegrasi sesuai perubahan status
    if (isDone) {
      if (task.createdById && task.createdById !== currentUser.id) {
        await createNotification({
          userId: task.createdById,
          title: "Task Selesai",
          message: `${currentUser.name} telah menyelesaikan task "${task.title}".`,
          type: "TASK_DONE",
          link: "/dashboard?tab=delivered",
          taskId: task.id,
        }).catch((e) => console.error(e));
      }
    } else if (newStatus === "In Review") {
      if (task.createdById && task.createdById !== currentUser.id) {
        await createNotification({
          userId: task.createdById,
          title: "Task Masuk Review",
          message: `${currentUser.name} telah mengajukan task "${task.title}" untuk di-review.`,
          type: "TASK_DELIVERED",
          link: "/dashboard?tab=delivered",
          taskId: task.id,
          actorName: currentUser.name,
          taskTitle: task.title,
          brief: task.description,
          outputType: task.taskOutputType || undefined,
          priority: task.priority,
          dueDate: task.dueDate,
          estimatedHours: task.estimatedHours,
        }).catch((e) => console.error(e));
      }
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) {
      revalidatePath(`/projects/${task.projectId}`);
    }

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTaskStatusAction:", err);
    return { success: false, error: err.message || "Gagal memperbarui status task." };
  }
}

export async function updateTaskAction(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const taskId = formData.get("taskId") as string;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string;
    const taskOutputTypeRaw = formData.get("taskOutputType") as string | null;
    const taskOutputType = taskOutputTypeRaw !== null ? taskOutputTypeRaw.trim() || null : undefined;
    const projectId = (formData.get("projectId") as string) || null;
    const folderIdRaw = formData.get("folderId") as string | null;
    const folderId = folderIdRaw !== null ? (folderIdRaw === "NONE" || !folderIdRaw ? null : folderIdRaw) : undefined;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const estimatedHours = parseFloat((formData.get("estimatedHours") as string) || "4");
    const assigneeId = (formData.get("assigneeId") as string) || null;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: "Task not found" };

    // Rule: Penerima task tidak boleh edit, edit hanya untuk pemberi task atau Management/Admin
    const isPemberiTask = Boolean(task.createdById && task.createdById === currentUser.id);
    if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN" && !isPemberiTask) {
      return { success: false, error: "Akses ditolak: Hanya pemberi task atau Management yang dapat mengedit task ini." };
    }

    const updatedUserId =
      assigneeId && assigneeId !== "KEEP"
        ? assigneeId === "ME"
          ? currentUser.id
          : assigneeId
        : task.userId;

    await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        ...(taskOutputType !== undefined ? { taskOutputType } : {}),
        ...(folderId !== undefined ? { folderId } : {}),
        projectId: projectId === "NONE" || !projectId ? null : projectId,
        priority: priority || task.priority,
        status: status || task.status,
        dueDate: dueDateStr ? new Date(dueDateStr) : null,
        estimatedHours: isNaN(estimatedHours) ? task.estimatedHours : estimatedHours,
        completedAt: status === "Done" ? new Date() : null,
        userId: updatedUserId,
      },
    });

    // Notifikasi jika task dialihkan ke orang lain
    if (updatedUserId !== task.userId && updatedUserId !== currentUser.id) {
      await createNotification({
        userId: updatedUserId,
        title: "Task Dialihkan ke Anda",
        message: `${currentUser.name} mengalihkan task "${title.trim()}" kepada Anda.`,
        type: "TASK_ASSIGNED",
        link: "/dashboard?tab=active",
        taskId: task.id,
        actorName: currentUser.name,
        taskTitle: title.trim(),
        brief: task.description,
        outputType: task.taskOutputType || undefined,
        priority: priority || task.priority,
        dueDate: dueDateStr ? new Date(dueDateStr) : task.dueDate,
        estimatedHours: isNaN(estimatedHours) ? task.estimatedHours : estimatedHours,
      }).catch((e) => console.error(e));
    }

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) revalidatePath(`/projects/${task.projectId}`);
    if (projectId && projectId !== task.projectId) revalidatePath(`/projects/${projectId}`);

    return { success: true };
  } catch (err: any) {
    console.error("Error in updateTaskAction:", err);
    return { success: false, error: err.message || "Gagal mengedit task." };
  }
}

export async function deleteTaskAction(taskId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: "Task not found" };

    // Rule: Penerima task tidak boleh hapus, hapus hanya untuk pemberi task atau Management/Admin
    const isPemberiTask = Boolean(task.createdById && task.createdById === currentUser.id);
    if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN" && !isPemberiTask) {
      return { success: false, error: "Akses ditolak: Hanya pemberi task atau Management yang dapat menghapus task ini." };
    }

    await prisma.task.delete({ where: { id: taskId } });

    revalidatePath("/dashboard");
    revalidatePath("/management");
    if (task.projectId) revalidatePath(`/projects/${task.projectId}`);

    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteTaskAction:", err);
    return { success: false, error: err.message || "Gagal menghapus task." };
  }
}

export async function createFolderAction(formData: FormData) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const name = formData.get("name") as string;
    const projectId = (formData.get("projectId") as string) || null;

    if (!name || name.trim().length === 0) {
      return { success: false, error: "Folder title is required." };
    }

    const folder = await prisma.taskFolder.create({
      data: {
        name: name.trim(),
        userId: currentUser.id,
        projectId: projectId === "NONE" || !projectId ? null : projectId,
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            taskOutputType: true,
            estimatedHours: true,
            dueDate: true,
          },
        },
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/projects");
    return { success: true, folder };
  } catch (err: any) {
    console.error("Error in createFolderAction:", err);
    return { success: false, error: err.message || "Gagal membuat folder." };
  }
}

export async function deleteFolderAction(folderId: string) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    const folder = await prisma.taskFolder.findUnique({
      where: { id: folderId },
    });
    if (!folder) return { success: false, error: "Folder not found" };

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      folder.userId !== currentUser.id
    ) {
      return { success: false, error: "Akses ditolak: Anda tidak memiliki wewenang untuk menghapus folder ini." };
    }

    await prisma.taskFolder.delete({
      where: { id: folderId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Error in deleteFolderAction:", err);
    return { success: false, error: err.message || "Gagal menghapus folder." };
  }
}

export async function setTaskFolderAction(taskId: string, folderId: string | null) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    await prisma.task.update({
      where: { id: taskId },
      data: { folderId: folderId === "NONE" ? null : folderId },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Error setting task folder:", err);
    return { success: false, error: err.message || "Gagal mengatur folder task." };
  }
}

export async function getStaffDashboardData(targetUserId?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return null;

  let userId = currentUser.id;
  if ((currentUser.role === "MANAGEMENT" || currentUser.role === "ADMIN") && targetUserId) {
    userId = targetUserId;
  }

  const isPrivileged =
    currentUser.role === "MANAGEMENT" ||
    currentUser.role === "ADMIN" ||
    (currentUser.position && currentUser.position.toLowerCase().includes("project manager"));

  // Parallel query execution with Promise.all for maximum speed & responsiveness
  const [
    activeTasks,
    archivedTasks,
    delegatedTasks,
    reviewRequests,
    projects,
    staffMembers,
    targetUser,
    allTasks,
    folders,
  ] = await Promise.all([
    // 1. Active tasks assigned to this user ("To Do", "On Progress", "In Review", "Revision")
    prisma.task.findMany({
      where: {
        userId,
        status: { in: ["To Do", "On Progress", "In Review", "Revision"] },
      },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        revisions: {
          orderBy: { round: "asc" },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: [
        { priority: "desc" },
        { dueDate: "asc" },
        { updatedAt: "desc" },
      ],
    }),

    // 2. Archived tasks ("Done") assigned to this user (capped at 30 most recent for high performance)
    prisma.task.findMany({
      where: {
        userId,
        status: "Done",
      },
      take: 30,
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        revisions: {
          orderBy: { round: "asc" },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { completedAt: "desc" },
    }),

    // 3. "Deliver by Me" (Tasks delegated/created by this user to other staff specialists)
    prisma.task.findMany({
      where: {
        createdById: userId,
        userId: { not: userId },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        revisions: {
          orderBy: { round: "asc" },
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    }),

    // 4. "Review Requests" (Tasks where this user is assigned as Target User / Reviewer)
    prisma.task.findMany({
      where: {
        OR: [
          { reviewerId: userId },
          { reviewerIds: { contains: userId } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        reviewer: {
          select: {
            id: true,
            name: true,
            position: true,
            department: true,
            avatarUrl: true,
          },
        },
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
          },
        },
        revisions: {
          orderBy: { round: "asc" },
        },
      },
      orderBy: [
        { updatedAt: "desc" },
        { createdAt: "desc" },
      ],
    }),

    // 5. Projects list for dropdown
    prisma.project.findMany({
      select: {
        id: true,
        name: true,
        clientName: true,
        code: true,
        status: true,
      },
      orderBy: { name: "asc" },
    }),

    // 6. Staff members list for "Assign To" / "Reviewer" dropdown
    prisma.user.findMany({
      select: {
        id: true,
        name: true,
        position: true,
        department: true,
        avatarUrl: true,
      },
      orderBy: { name: "asc" },
    }),

    // 7. Target User details
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
        bio: true,
      },
    }),

    // 8. Agency-Wide Project Tasks (for Admin / Project Manager)
    isPrivileged
      ? prisma.task.findMany({
          include: {
            project: {
              select: {
                id: true,
                name: true,
                clientName: true,
                code: true,
                status: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                position: true,
                department: true,
                avatarUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                name: true,
                position: true,
                department: true,
                avatarUrl: true,
              },
            },
            reviewer: {
              select: {
                id: true,
                name: true,
                position: true,
                department: true,
                avatarUrl: true,
              },
            },
            revisions: {
              orderBy: { round: "asc" },
            },
          },
          orderBy: [
            { updatedAt: "desc" },
            { createdAt: "desc" },
          ],
        })
      : Promise.resolve([]),

    // 9. Folders
    prisma.taskFolder.findMany({
      where: { userId },
      include: {
        project: {
          select: {
            id: true,
            name: true,
            clientName: true,
            code: true,
            status: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            taskOutputType: true,
            estimatedHours: true,
            dueDate: true,
            timerActive: true,
            currentRevisionRound: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return {
    user: targetUser,
    activeTasks,
    archivedTasks,
    delegatedTasks,
    reviewRequests,
    allTasks,
    folders,
    staffMembers,
    projects,
    stats: {
      activeCount: activeTasks.length,
      todoCount: activeTasks.filter((t) => t.status === "To Do").length,
      inProgressCount: activeTasks.filter((t) => t.status === "On Progress").length,
      inReviewCount: activeTasks.filter((t) => t.status === "In Review").length,
      revisionCount: activeTasks.filter((t) => t.status === "Revision").length,
      archivedCount: archivedTasks.length,
      delegatedCount: delegatedTasks.length,
      delegatedActiveCount: delegatedTasks.filter((t) => t.status !== "Done").length,
      reviewRequestsCount: reviewRequests.filter((t) => t.status === "In Review").length,
      urgentCount: activeTasks.filter((t) => t.priority === "URGENT" || t.priority === "HIGH").length,
      totalHours: activeTasks.reduce((acc, t) => acc + (t.estimatedHours || 0), 0),
    },
  };
}

/**
 * PRE-FETCH / CACHE REVIEWER MEMBERS (Colleagues list):
 * Provides fast candidate list of active staff members for MultiSelectReviewers.
 */
export async function getReviewerMembersAction() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        username: true,
        position: true,
        department: true,
        avatarUrl: true,
        role: true,
      },
      orderBy: { name: "asc" },
    });
    return users;
  } catch (err) {
    console.error("Error in getReviewerMembersAction:", err);
    return [];
  }
}

