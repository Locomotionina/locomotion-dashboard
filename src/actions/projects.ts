"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { isValidDeliverableUrl } from "@/lib/security";
import { canManageDeliverables } from "@/lib/deliverables";
import { canDeleteProject } from "@/lib/departments";
import { sendPushToUser, PushNotificationPayload } from "@/lib/push";

export { canDeleteProject };

export async function getProjects(filterStatus?: string) {
  const currentUser = await getCurrentUser();
  const whereClause: any = {};
  if (filterStatus && filterStatus !== "ALL") {
    whereClause.status = filterStatus;
  }

  const projects = await prisma.project.findMany({
    where: whereClause,
    include: {
      deliverables: true,
      tasks: {
        select: {
          id: true,
          status: true,
          taskOutputType: true,
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
              username: true,
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
      },
      _count: {
        select: {
          tasks: true,
          deliverables: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Calculate unread mentions and replies for the current logged-in user
  const unreadMentionCounts = new Map<string, number>();

  if (currentUser) {
    try {
      // 1. Fetch user's chat read timestamps for all projects
      const chatReads = await prisma.projectChatRead.findMany({
        where: { userId: currentUser.id },
        select: { projectId: true, lastReadAt: true },
      });
      const readMap = new Map<string, Date>();
      for (const r of chatReads) {
        readMap.set(r.projectId, r.lastReadAt);
      }

      // 2. Query all messages mentioning or replying to currentUser (excluding messages sent by currentUser)
      const relevantMessages = await prisma.projectMessage.findMany({
        where: {
          userId: { not: currentUser.id },
          OR: [
            { mentionedUserIds: { has: currentUser.id } },
            { replyTo: { userId: currentUser.id } },
          ],
        },
        select: {
          projectId: true,
          createdAt: true,
        },
      });

      for (const msg of relevantMessages) {
        const lastRead = readMap.get(msg.projectId);
        if (!lastRead || msg.createdAt > lastRead) {
          unreadMentionCounts.set(
            msg.projectId,
            (unreadMentionCounts.get(msg.projectId) || 0) + 1
          );
        }
      }
    } catch (e) {
      console.error("Failed to compute unreadMentionCounts:", e);
    }
  }

  return projects.map((p) => {
    // Single-pass O(N) calculation for PICs and status tallies
    const picMap = new Map<string, any>();
    let activeTasksCount = 0;
    let doneTasksCount = 0;

    for (const t of p.tasks) {
      if (t.status === "Done") {
        doneTasksCount++;
      } else {
        activeTasksCount++;
      }

      if (t.user) {
        let entry = picMap.get(t.user.id);
        if (!entry) {
          entry = {
            ...t.user,
            taskCount: 0,
            activeTaskCount: 0,
          };
          picMap.set(t.user.id, entry);
        }
        entry.taskCount++;
        if (t.status !== "Done") {
          entry.activeTaskCount++;
        }
      }
    }

    return {
      ...p,
      pics: Array.from(picMap.values()),
      activeTasksCount,
      doneTasksCount,
      unreadMentionCount: unreadMentionCounts.get(p.id) || 0,
    };
  });
}

export async function getProjectById(id: string) {
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      deliverables: {
        orderBy: { createdAt: "desc" },
      },
      tasks: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              username: true,
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
              position: true,
              department: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
    },
  });

  if (!project) return null;

  // Automated PIC Display:
  // Query and aggregate all staff members currently working on this project via their linked tasks
  const picMap = new Map();
  project.tasks.forEach((task) => {
    if (task.user) {
      if (!picMap.has(task.user.id)) {
        picMap.set(task.user.id, {
          ...task.user,
          totalTasks: 0,
          activeTasks: 0,
          doneTasks: 0,
          tasks: [],
        });
      }
      const pic = picMap.get(task.user.id);
      pic.totalTasks += 1;
      if (task.status === "Done") {
        pic.doneTasks += 1;
      } else {
        pic.activeTasks += 1;
      }
      pic.tasks.push({
        id: task.id,
        title: task.title,
        description: task.description,
        taskOutputType: task.taskOutputType,
        estimatedHours: task.estimatedHours,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        userId: task.userId,
        createdById: task.createdById,
        reviewerId: task.reviewerId,
        previewDescription: task.previewDescription,
        user: task.user,
        createdBy: task.createdBy,
        reviewer: task.reviewer,
      });
    }
  });

  const pics = Array.from(picMap.values()).sort(
    (a, b) => b.activeTasks - a.activeTasks
  );

  let unreadMentionCount = 0;
  const currentUser = await getCurrentUser();
  if (currentUser) {
    try {
      const chatRead = await prisma.projectChatRead.findUnique({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId: id,
          },
        },
        select: { lastReadAt: true },
      });

      unreadMentionCount = await prisma.projectMessage.count({
        where: {
          projectId: id,
          userId: { not: currentUser.id },
          ...(chatRead?.lastReadAt ? { createdAt: { gt: chatRead.lastReadAt } } : {}),
          OR: [
            { mentionedUserIds: { has: currentUser.id } },
            { replyTo: { userId: currentUser.id } },
          ],
        },
      });
    } catch (e) {
      console.error("Failed to compute project unreadMentionCount:", e);
    }
  }

  return {
    ...project,
    pics,
    unreadMentionCount,
  };
}

export async function createProjectAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "MANAGEMENT" && user.role !== "ADMIN")) {
    return {
      success: false,
      error: "Unauthorized. Only Management or Admin users can create agency projects.",
    };
  }

  const name = formData.get("name") as string;
  const clientName = formData.get("clientName") as string;
  const code = formData.get("code") as string;
  const category = (formData.get("category") as string) || "Digital Campaign";
  const priority = (formData.get("priority") as string) || "HIGH";
  const status = (formData.get("status") as string) || "ACTIVE";
  const brief = formData.get("brief") as string;
  const goals = formData.get("goals") as string;
  const description = formData.get("description") as string;
  const startDateStr = formData.get("startDate") as string;
  const deadlineStr = formData.get("deadline") as string;

  // URL fields
  const previewUrl = formData.get("previewUrl") as string;
  const pitchDeckUrl = formData.get("pitchDeckUrl") as string;
  const creativeDeckUrl = formData.get("creativeDeckUrl") as string;
  const finalAssetsUrl = formData.get("finalAssetsUrl") as string;

  if (!name || !clientName || !code) {
    return {
      success: false,
      error: "Project Name, Client Name, and Project Code are required.",
    };
  }

  // Ensure code uniqueness
  const existing = await prisma.project.findUnique({
    where: { code: code.trim().toUpperCase() },
  });

  if (existing) {
    return {
      success: false,
      error: "Project Code is already in use. Please use a unique code.",
    };
  }

  const project = await prisma.project.create({
    data: {
      name,
      clientName,
      code: code.trim().toUpperCase(),
      category,
      priority,
      status,
      brief: brief || "No client brief specified yet.",
      goals: goals || "Define project milestones and core deliverables.",
      description: description || "Locomotion digital agency project.",
      startDate: startDateStr ? new Date(startDateStr) : null,
      deadline: deadlineStr ? new Date(deadlineStr) : null,
      budget: null,
      previewUrl: previewUrl || null,
      pitchDeckUrl: pitchDeckUrl || null,
      creativeDeckUrl: creativeDeckUrl || null,
      finalAssetsUrl: finalAssetsUrl || null,
      createdById: user.id,
    },
  });

  revalidatePath("/projects");
  revalidatePath("/");
  return { success: true, projectId: project.id };
}

export async function updateProjectUrlsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManageDeliverables(user.position, user.department)) {
    return {
      success: false,
      error:
        "Akses ditolak: Hanya Project Manager, Associate Project Manager, Business Development Head, Sales Executive, Account Executive, dan Social Media (Project/Production) yang berwenang mengubah URL project.",
    };
  }

  const projectId = formData.get("projectId") as string;
  const previewUrl = formData.get("previewUrl") as string;
  const pitchDeckUrl = formData.get("pitchDeckUrl") as string;
  const creativeDeckUrl = formData.get("creativeDeckUrl") as string;
  const finalAssetsUrl = formData.get("finalAssetsUrl") as string;

  if (!projectId) {
    return { success: false, error: "Project ID is required." };
  }

  // Validate all URLs to prevent script injection (javascript: protocols)
  const urlFields = [
    { name: "Preview Link", val: previewUrl },
    { name: "Pitch Deck Link", val: pitchDeckUrl },
    { name: "Creative Deck Link", val: creativeDeckUrl },
    { name: "Final Assets Link", val: finalAssetsUrl },
  ];

  for (const field of urlFields) {
    if (field.val && field.val.trim().length > 0 && !isValidDeliverableUrl(field.val)) {
      return {
        success: false,
        error: `Format URL untuk ${field.name} tidak valid atau menggunakan protokol berbahaya.`,
      };
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      previewUrl: previewUrl || null,
      pitchDeckUrl: pitchDeckUrl || null,
      creativeDeckUrl: creativeDeckUrl || null,
      finalAssetsUrl: finalAssetsUrl || null,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true, message: "Project URLs updated." };
}

export async function updateCategoryUrlsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManageDeliverables(user.position, user.department)) {
    return {
      success: false,
      error:
        "Akses ditolak: Hanya Project Manager, Associate Project Manager, Business Development Head, Sales Executive, Account Executive, dan Social Media (Project/Production) yang berwenang mengubah deliverables project.",
    };
  }

  const projectId = formData.get("projectId") as string;
  const categoryKey = formData.get("categoryKey") as string;
  const payload = formData.get("payload") as string;

  if (!projectId || !categoryKey) {
    return { success: false, error: "Project ID and Category Key are required." };
  }

  const allowedKeys = ["previewUrl", "pitchDeckUrl", "creativeDeckUrl", "finalAssetsUrl"];
  if (!allowedKeys.includes(categoryKey)) {
    return { success: false, error: "Invalid category key." };
  }

  let valueToStore: string | null = null;
  if (payload) {
    try {
      const parsed = JSON.parse(payload);
      if (Array.isArray(parsed)) {
        // Validate each item's URL to prevent javascript: or malformed URLs
        for (const item of parsed) {
          if (item && item.url && item.url.trim().length > 0) {
            if (!isValidDeliverableUrl(item.url)) {
              return {
                success: false,
                error: `URL "${item.url}" tidak valid atau menggunakan protokol yang tidak diizinkan.`,
              };
            }
          }
        }

        const hasAnyContent = parsed.some(
          (item: any) =>
            (item.url && item.url.trim().length > 0) ||
            (item.label && item.label.trim().length > 0)
        );
        if (hasAnyContent) {
          valueToStore = JSON.stringify(parsed);
        }
      }
    } catch {
      if (!isValidDeliverableUrl(payload)) {
        return { success: false, error: "URL tidak valid atau berbahaya." };
      }
      valueToStore = payload;
    }
  }

  await prisma.project.update({
    where: { id: projectId },
    data: {
      [categoryKey]: valueToStore,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return { success: true, message: "Category URLs updated." };
}

export async function updateProjectDescriptionsAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "MANAGEMENT" && user.role !== "ADMIN")) {
    return {
      success: false,
      error: "Unauthorized: Management or Admin role is required to edit project descriptions.",
    };
  }

  const projectId = formData.get("projectId") as string;
  const brief = formData.get("brief") as string;
  const goals = formData.get("goals") as string;
  const description = formData.get("description") as string;

  if (!projectId) {
    return { success: false, error: "Project ID is required." };
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: {
      brief: brief ?? "",
      goals: goals ?? "",
      description: description ?? "",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {
    success: true,
    message: "Project descriptions updated successfully.",
    project: {
      brief: updatedProject.brief,
      goals: updatedProject.goals,
      description: updatedProject.description,
    },
  };
}

export async function updateProjectMetadataAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || (user.role !== "MANAGEMENT" && user.role !== "ADMIN")) {
    return {
      success: false,
      error: "Unauthorized: Only users with the Management role (or Admin) can edit project details.",
    };
  }

  const projectId = formData.get("projectId") as string;
  const name = formData.get("name") as string;
  const code = formData.get("code") as string;
  const clientName = formData.get("clientName") as string;
  const category = formData.get("category") as string;
  const status = formData.get("status") as string;
  const priority = formData.get("priority") as string;
  const brief = formData.get("brief") as string;
  const goals = formData.get("goals") as string;
  const description = formData.get("description") as string;
  const startDateStr = formData.get("startDate") as string | null;
  const deadlineStr = formData.get("deadline") as string | null;

  if (!projectId || !name || !code || !clientName) {
    return {
      success: false,
      error: "Project Title, Code, and Client Name are required.",
    };
  }

  const cleanCode = code.trim().toUpperCase();

  // Ensure code uniqueness if changed
  const existingWithCode = await prisma.project.findFirst({
    where: {
      code: cleanCode,
      id: { not: projectId },
    },
  });

  if (existingWithCode) {
    return {
      success: false,
      error: `Project code '${cleanCode}' is already in use by another project.`,
    };
  }

  const updateData: any = {
    name: name.trim(),
    code: cleanCode,
    clientName: clientName.trim(),
    category: category?.trim() || "Digital Campaign",
    status: status || "ACTIVE",
    priority: priority || "HIGH",
  };

  if (brief !== null && brief !== undefined) updateData.brief = brief;
  if (goals !== null && goals !== undefined) updateData.goals = goals;
  if (description !== null && description !== undefined) updateData.description = description;

  if (startDateStr !== null && startDateStr !== undefined) {
    updateData.startDate = startDateStr.trim() ? new Date(startDateStr.trim()) : null;
  }
  if (deadlineStr !== null && deadlineStr !== undefined) {
    updateData.deadline = deadlineStr.trim() ? new Date(deadlineStr.trim()) : null;
  }

  const updated = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  revalidatePath(`/projects/${projectId}`);
  revalidatePath("/projects");
  return {
    success: true,
    message: "Project metadata and details updated successfully.",
    project: updated,
  };
}

export async function addDeliverableAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user || !canManageDeliverables(user.position, user.department)) {
    return {
      success: false,
      error:
        "Akses ditolak: Hanya Project Manager, Associate Project Manager, Business Development Head, Sales Executive, Account Executive, dan Social Media (Project/Production) yang berwenang menambahkan deliverable.",
    };
  }

  const projectId = formData.get("projectId") as string;
  const title = (formData.get("title") as string)?.trim();
  const url = (formData.get("url") as string)?.trim();
  const type = (formData.get("type") as string) || "OTHER";

  if (!projectId || !title || !url) {
    return { success: false, error: "Title and URL are required." };
  }

  // Validate deliverable URL strictly on the server
  if (!isValidDeliverableUrl(url)) {
    return {
      success: false,
      error: "URL Deliverable tidak valid atau menggunakan protokol yang dilarang.",
    };
  }

  await prisma.projectDeliverable.create({
    data: {
      projectId,
      title,
      url,
      type,
      status: "ACTIVE",
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

export async function deleteDeliverableAction(deliverableId: string, projectId: string) {
  const user = await getCurrentUser();
  if (!user || !canManageDeliverables(user.position, user.department)) {
    return {
      success: false,
      error:
        "Akses ditolak: Hanya Project Manager, Associate Project Manager, Business Development Head, Sales Executive, Account Executive, dan Social Media (Project/Production) yang berwenang menghapus deliverable.",
    };
  }

  await prisma.projectDeliverable.delete({
    where: { id: deliverableId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}

/**
 * Deletes a project record after bulk-updating all associated tasks to "Done".
 * Strictly authorized ONLY for:
 * - Account Executive (AE)
 * - Project Manager (PM)
 */
export async function deleteProjectAction(projectId: string) {
  try {
    const user = await getCurrentUser();
    if (!user || !canDeleteProject(user)) {
      return {
        success: false,
        error:
          "Akses ditolak: Hanya Account Executive (AE) dan Project Manager (PM) yang berwenang menghapus project.",
      };
    }

    if (!projectId || typeof projectId !== "string") {
      return { success: false, error: "Project ID tidak valid." };
    }

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tasks: {
          select: { id: true, userId: true, title: true, status: true },
        },
      },
    });

    if (!project) {
      return { success: false, error: "Project tidak ditemukan atau sudah dihapus." };
    }

    const now = new Date();

    // 1. Bulk-update all tasks associated with this project to "Done" across all assigned users' accounts
    await prisma.task.updateMany({
      where: { projectId: projectId },
      data: {
        status: "Done",
        completedAt: now,
        timerActive: false,
        timerStartedAt: null,
      },
    });

    // Also update any pending task revisions associated with these tasks to "APPROVED"
    await prisma.taskRevision.updateMany({
      where: {
        task: { projectId: projectId },
        status: "PENDING",
      },
      data: {
        status: "APPROVED",
      },
    });

    // Notify assigned team members if any active tasks were auto-completed
    for (const task of project.tasks) {
      if (task.userId && task.status !== "Done") {
        await prisma.notification
          .create({
            data: {
              userId: task.userId,
              title: "Task Selesai Otomatis (Project Dihapus)",
              message: `Task "${task.title}" otomatis diubah menjadi DONE karena project "${project.name}" telah dihapus oleh ${user.name}.`,
              type: "TASK_DONE",
            },
          })
          .catch(() => {});
      }
    }

    // 2. Delete project deliverables and the project record itself
    await prisma.projectDeliverable.deleteMany({
      where: { projectId: projectId },
    });

    await prisma.project.delete({
      where: { id: projectId },
    });

    revalidatePath("/projects");
    revalidatePath("/dashboard");
    revalidatePath("/management");
    revalidatePath("/");

    return {
      success: true,
      message: `Project "${project.name}" berhasil dihapus dan seluruh task terkait telah diubah statusnya menjadi DONE.`,
    };
  } catch (error: any) {
    console.error("Failed to delete project:", error);
    return {
      success: false,
      error: error.message || "Terjadi kesalahan internal saat menghapus project.",
    };
  }
}

/**
 * Upsert read status for the current user on a specific project chat.
 */
export async function markProjectChatAsReadAction(projectId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || !projectId) {
    return { success: false, error: "Unauthorized or missing projectId" };
  }

  try {
    const now = new Date();
    await prisma.projectChatRead.upsert({
      where: {
        userId_projectId: {
          userId: currentUser.id,
          projectId,
        },
      },
      create: {
        userId: currentUser.id,
        projectId,
        lastReadAt: now,
      },
      update: {
        lastReadAt: now,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to mark project chat as read:", err);
    return { success: false, error: err.message || "Failed to mark chat as read." };
  }
}

/**
 * Fetch all chat messages for a specific project ordered by creation time ascending,
 * including quote replies, tagged assignees list, and auto-clearing unread badge.
 */
/**
 * Fetch all chat messages for a specific project ordered by creation time ascending,
 * including quote replies, tagged assignees list, and auto-clearing unread badge.
 * Optimized with Promise.all and lightweight background polling mode.
 */
export async function getProjectMessagesAction(
  projectId: string,
  isPoll = false
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      success: false,
      error: "Unauthorized",
      messages: [],
      assignees: [],
      unreadMentionCount: 0,
    };
  }

  if (!projectId) {
    return {
      success: false,
      error: "Project ID is required.",
      messages: [],
      assignees: [],
      unreadMentionCount: 0,
    };
  }

  try {
    // If this is a background polling tick, run ONLY the messages query
    if (isPoll) {
      const messages = await prisma.projectMessage.findMany({
        where: { projectId },
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
        unreadMentionCount: 0,
        assignees: [],
        messages: messages.map((m) => ({
          id: m.id,
          projectId: m.projectId,
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
    }

    // Full load: Execute queries in parallel for high speed
    const [chatRead, messages, projectTasks] = await Promise.all([
      prisma.projectChatRead.findUnique({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId,
          },
        },
        select: { lastReadAt: true },
      }),
      prisma.projectMessage.findMany({
        where: { projectId },
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
      prisma.task.findMany({
        where: { projectId },
        select: {
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
        },
      }),
    ]);

    // Calculate unread mentions in-memory without extra DB roundtrip
    const lastRead = chatRead?.lastReadAt;
    let unreadMentionCount = 0;
    for (const m of messages) {
      if (m.userId !== currentUser.id) {
        const isUnread = !lastRead || m.createdAt > lastRead;
        const isTagged =
          (Array.isArray(m.mentionedUserIds) &&
            m.mentionedUserIds.includes(currentUser.id)) ||
          m.replyTo?.userId === currentUser.id;
        if (isUnread && isTagged) {
          unreadMentionCount++;
        }
      }
    }

    // Auto-clear read status asynchronously (non-blocking)
    prisma.projectChatRead
      .upsert({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId,
          },
        },
        create: {
          userId: currentUser.id,
          projectId,
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
      })
      .catch((e) => console.error("Async chat read update error:", e));

    // Compile unique assignees
    const assigneesMap = new Map<string, any>();
    for (const t of projectTasks) {
      if (t.user && t.user.id !== currentUser.id) {
        assigneesMap.set(t.user.id, t.user);
      }
    }

    return {
      success: true,
      unreadMentionCount,
      assignees: Array.from(assigneesMap.values()),
      messages: messages.map((m) => ({
        id: m.id,
        projectId: m.projectId,
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
    console.error("Failed to get project messages:", err);
    return {
      success: false,
      error: err.message || "Failed to retrieve messages.",
      messages: [],
      assignees: [],
      unreadMentionCount: 0,
    };
  }
}

/**
 * Send a new project chat message with optional reply_to_id and mentioned_user_ids,
 * highly optimized with parallel pre-flight queries and non-blocking background notifications.
 */
export async function sendProjectMessageAction(
  projectId: string,
  content: string,
  replyToId?: string | null,
  mentionedUserIds: string[] = []
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Unauthorized. Silakan login terlebih dahulu." };
  }

  const trimmed = (content || "").trim();
  if (!trimmed) {
    return { success: false, error: "Pesan tidak boleh kosong." };
  }

  if (!projectId) {
    return { success: false, error: "Project ID is required." };
  }

  try {
    // 1. Parallel pre-checks for maximum responsiveness
    const [project, replyToMessage, projectTasks] = await Promise.all([
      prisma.project.findUnique({
        where: { id: projectId },
        select: { id: true, name: true, code: true },
      }),
      replyToId
        ? prisma.projectMessage.findUnique({
            where: { id: replyToId },
            select: {
              id: true,
              userId: true,
              content: true,
              user: { select: { name: true } },
            },
          })
        : Promise.resolve(null),
      prisma.task.findMany({
        where: { projectId },
        select: {
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
        },
      }),
    ]);

    if (!project) {
      return { success: false, error: "Project tidak ditemukan." };
    }

    const assigneeMap = new Map<string, any>();
    for (const t of projectTasks) {
      if (t.user && t.user.id !== currentUser.id) {
        assigneeMap.set(t.user.id, t.user);
      }
    }

    // 2. Validate and sanitize mentioned_user_ids (only valid project assignees)
    const finalMentionedUserIds = new Set<string>();
    if (Array.isArray(mentionedUserIds)) {
      for (const id of mentionedUserIds) {
        if (assigneeMap.has(id)) {
          finalMentionedUserIds.add(id);
        }
      }
    }

    const lowerContent = trimmed.toLowerCase();
    assigneeMap.forEach((user, id) => {
      if (user.name && lowerContent.includes(`@${user.name.toLowerCase()}`)) {
        finalMentionedUserIds.add(id);
      }
    });
    const sanitizedMentionedUserIds = Array.from(finalMentionedUserIds);

    // 3. Insert message into project_messages
    const newMessage = await prisma.projectMessage.create({
      data: {
        projectId,
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
            user: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    // 4. Fire-and-forget: Auto-mark read status for sender in background
    prisma.projectChatRead
      .upsert({
        where: {
          userId_projectId: {
            userId: currentUser.id,
            projectId,
          },
        },
        create: {
          userId: currentUser.id,
          projectId,
          lastReadAt: new Date(),
        },
        update: {
          lastReadAt: new Date(),
        },
      })
      .catch((e) => console.error("Async sender read upsert error:", e));

    // 5. Fire-and-forget: Targeted Web Push & In-App Notifications in background
    const recipientIds = Array.from(
      new Set([
        ...Array.from(assigneeMap.keys()),
        ...(replyToMessage && replyToMessage.userId !== currentUser.id ? [replyToMessage.userId] : []),
      ])
    );

    if (recipientIds.length > 0) {
      const truncated = trimmed.length > 70 ? `${trimmed.substring(0, 67)}...` : trimmed;
      const targetUrl = `/projects?projectId=${projectId}`;

      // Batch in-app notifications in one single query
      const notificationsData = recipientIds.map((recipientId) => {
        const isMentionedOrReplied =
          sanitizedMentionedUserIds.includes(recipientId) ||
          (replyToMessage && replyToMessage.userId === recipientId);

        const pushTitle = isMentionedOrReplied
          ? `🔔 ${currentUser.name} menyebutmu • ${project.name}`
          : `💬 Chat Project • ${project.name}`;

        return {
          userId: recipientId,
          title: pushTitle,
          message: `${currentUser.name}: ${truncated}`,
          type: isMentionedOrReplied ? "PROJECT_CHAT_MENTION" : "PROJECT_CHAT",
          link: targetUrl,
        };
      });

      prisma.notification
        .createMany({ data: notificationsData })
        .catch((err) => console.error("Async notification createMany error:", err));

      // Dispatch Web Push in background
      for (const recipientId of recipientIds) {
        const isMentionedOrReplied =
          sanitizedMentionedUserIds.includes(recipientId) ||
          (replyToMessage && replyToMessage.userId === recipientId);

        const pushTitle = isMentionedOrReplied
          ? `🔔 ${currentUser.name} menyebutmu • ${project.name}`
          : `💬 Chat Project • ${project.name}`;

        sendPushToUser(recipientId, {
          title: pushTitle,
          body: `${currentUser.name}: ${truncated}`,
          url: targetUrl,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `project-chat-${projectId}`,
          type: "PROJECT_CHAT",
        }).catch((err) => console.error("Async WebPush error:", err));
      }
    }

    return {
      success: true,
      message: {
        id: newMessage.id,
        projectId: newMessage.projectId,
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
    console.error("Failed to send project message:", err);
    return { success: false, error: err.message || "Failed to send message." };
  }
}

