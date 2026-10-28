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
  const projectId = (formData.get("projectId") as string) || null;
  const priority = (formData.get("priority") as string) || "MEDIUM";
  const status = (formData.get("status") as string) || "To Do";
  const dueDateStr = formData.get("dueDate") as string;
  const estimatedHours = parseFloat((formData.get("estimatedHours") as string) || "4");
  const assigneeId = (formData.get("assigneeId") as string) || "ME";

  if (!title || title.trim().length === 0) {
    return { success: false, error: "Task title is required." };
  }

  const targetUserId = assigneeId && assigneeId !== "ME" ? assigneeId : currentUser.id;

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description: description?.trim() || null,
      priority,
      status,
      dueDate: dueDateStr ? new Date(dueDateStr) : null,
      estimatedHours: isNaN(estimatedHours) ? 4.0 : estimatedHours,
      userId: targetUserId,
      createdById: currentUser.id,
      projectId: projectId === "NONE" || !projectId ? null : projectId,
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
 * and transitions task to "In Review" status.
 */
export async function deliverTaskAction(
  input: string | FormData | { taskId: string; description?: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    let taskId: string;
    let description = "";

    if (typeof input === "string") {
      taskId = input;
    } else if (input instanceof FormData) {
      taskId = input.get("taskId") as string;
      description = (input.get("description") as string) || "";
    } else if (input && typeof input === "object") {
      taskId = input.taskId;
      description = input.description || "";
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

    if (task.status === "Revision" || task.currentPhase === "REVISION") {
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

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
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
          previewDescription: description.trim() || null,
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    // Notifikasi terintegrasi untuk pembuat/pengirim task bahwa task sudah di-deliver
    if (task.createdById && task.createdById !== currentUser.id) {
      const snippet = description.trim().length > 60 ? description.trim().slice(0, 57) + "..." : description.trim();
      await createNotification({
        userId: task.createdById,
        title: "Task Telah Di-Deliver 🚀",
        message: `${currentUser.name} telah men-deliver task "${task.title}" untuk di-review${snippet ? `: "${snippet}"` : "."}`,
        type: "TASK_DELIVERED",
        link: "/dashboard?tab=delivered",
        taskId: task.id,
      }).catch((e) => console.error("Notification delivery failed:", e));
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
 * REQUEST PREVIEW WORKFLOW (Untuk Self-Assigned Tasks):
 * Mengajukan task ke Target User (Reviewer) beserta deskripsi request.
 * Menghentikan timer yang berjalan dan mengubah status menjadi "In Review".
 */
export async function requestTaskPreviewAction(
  input: FormData | { taskId: string; targetUserId: string; description?: string }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Unauthorized" };

    let taskId: string;
    let targetUserId: string;
    let description = "";

    if (input instanceof FormData) {
      taskId = input.get("taskId") as string;
      targetUserId = input.get("targetUserId") as string;
      description = (input.get("description") as string) || "";
    } else if (input && typeof input === "object") {
      taskId = input.taskId;
      targetUserId = input.targetUserId;
      description = input.description || "";
    } else {
      return { success: false, error: "Data input tidak valid." };
    }

    if (!taskId) return { success: false, error: "Task ID diperlukan." };
    if (!targetUserId) return { success: false, error: "Target User (Reviewer) harus dipilih." };

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { revisions: { orderBy: { round: "desc" }, take: 1 } },
    });
    if (!task) return { success: false, error: "Task tidak ditemukan." };

    // Reviewer tidak boleh pelaksana task itu sendiri
    if (targetUserId === task.userId) {
      return { success: false, error: "Tidak dapat menunjuk pelaksana task sebagai reviewer." };
    }

    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Akses ditolak: Hanya pelaksana task yang dapat mengajukan preview." };
    }

    const reviewer = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!reviewer) return { success: false, error: "Reviewer tidak ditemukan." };

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
            status: "DELIVERED",
            deliveredAt: now,
          },
        });
      }

      await prisma.task.update({
        where: { id: taskId },
        data: {
          status: "In Review",
          reviewerId: targetUserId,
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
          reviewerId: targetUserId,
          previewDescription: description.trim() || null,
          initialSeconds: (task.initialSeconds || 0) + elapsed,
          totalSeconds: (task.totalSeconds || 0) + elapsed,
          timerActive: false,
          timerStartedAt: null,
        },
      });
    }

    // Notifikasi real-time untuk Target User (Reviewer)
    const snippet = description.trim().length > 60 ? description.trim().slice(0, 57) + "..." : description.trim();
    await createNotification({
      userId: targetUserId,
      title: "Permintaan Preview Task 🔍",
      message: `${currentUser.name} meminta Anda me-review task "${task.title}"${snippet ? `: "${snippet}"` : "."}`,
      type: "TASK_DELIVERED",
      link: `/dashboard?tab=reviews&taskId=${task.id}`,
      taskId: task.id,
    }).catch((e) => console.error("Notification creation failed:", e));

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

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: "Task not found" };

    // Creator, management, admin, or assigned reviewer can request revisions
    if (
      currentUser.role !== "MANAGEMENT" &&
      currentUser.role !== "ADMIN" &&
      task.createdById !== currentUser.id &&
      task.reviewerId !== currentUser.id &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized to request revision" };
    }

    const nextRound = (task.currentRevisionRound || 0) + 1;

    // Create new revision record
    await prisma.taskRevision.create({
      data: {
        taskId,
        round: nextRound,
        feedback: feedback.trim(),
        seconds: 0,
        timerActive: false,
        status: "PENDING",
      },
    });

    // Update task to Revision status
    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "Revision",
        currentPhase: "REVISION",
        currentRevisionRound: nextRound,
        timerActive: false,
        timerStartedAt: null,
      },
    });

    // Notifikasi terintegrasi untuk penerima/pelaksana task bahwa revisi diminta
    if (task.userId !== currentUser.id) {
      const snippet = feedback.trim().length > 60 ? feedback.trim().slice(0, 57) + "..." : feedback.trim();
      const isReviewerAction = task.reviewerId === currentUser.id;
      await createNotification({
        userId: task.userId,
        title: `Revisi Diminta${isReviewerAction ? " oleh Reviewer" : ""} (Round #${nextRound})`,
        message: `${currentUser.name} meminta revisi untuk "${task.title}": "${snippet}"`,
        type: "TASK_REVISION",
        link: "/dashboard?tab=active",
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
    console.error("Error in requestRevisionAction:", err);
    return { success: false, error: err.message || "Gagal meminta revisi." };
  }
}

/**
 * APPROVE TASK (Approve & Selesai):
 * Marks task as Done and records completion.
 */
export async function approveTaskAction(taskId: string) {
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
      task.createdById !== currentUser.id &&
      task.reviewerId !== currentUser.id &&
      task.userId !== currentUser.id
    ) {
      return { success: false, error: "Unauthorized to approve this task" };
    }

    const activeRevision = task.revisions[0];
    if (activeRevision) {
      await prisma.taskRevision.update({
        where: { id: activeRevision.id },
        data: { status: "APPROVED" },
      });
    }

    await prisma.task.update({
      where: { id: taskId },
      data: {
        status: "Done",
        completedAt: new Date(),
        timerActive: false,
        timerStartedAt: null,
      },
    });

    // Notifikasi terintegrasi untuk spesialis pelaksana bahwa hasil kerjanya disetujui
    if (task.userId !== currentUser.id) {
      const isReviewer = task.reviewerId === currentUser.id;
      await createNotification({
        userId: task.userId,
        title: "Task Disetujui & Selesai! 🎉",
        message: `${currentUser.name} telah menyetujui ${isReviewer ? "preview" : "deliverable"} "${task.title}". Status resmi menjadi Done.`,
        type: "TASK_APPROVED",
        link: "/dashboard?tab=archive",
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
    const projectId = (formData.get("projectId") as string) || null;
    const priority = formData.get("priority") as string;
    const status = formData.get("status") as string;
    const dueDateStr = formData.get("dueDate") as string;
    const estimatedHours = parseFloat((formData.get("estimatedHours") as string) || "4");
    const assigneeId = (formData.get("assigneeId") as string) || null;

    const task = await prisma.task.findUnique({ where: { id: taskId } });
    if (!task) return { success: false, error: "Task not found" };

    // Rule: Penerima task tidak boleh edit, edit hanya untuk pemberi task
    const isPemberiTask = !task.createdById || task.createdById === currentUser.id;
    if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN" && !isPemberiTask) {
      return { success: false, error: "Akses ditolak: Hanya pemberi task yang dapat mengedit task ini." };
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

    // Rule: Penerima task tidak boleh hapus, hapus hanya untuk pemberi task
    const isPemberiTask = !task.createdById || task.createdById === currentUser.id;
    if (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN" && !isPemberiTask) {
      return { success: false, error: "Akses ditolak: Hanya pemberi task yang dapat menghapus task ini." };
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
        reviewerId: userId,
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
  ]);

  return {
    user: targetUser,
    activeTasks,
    archivedTasks,
    delegatedTasks,
    reviewRequests,
    allTasks,
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
