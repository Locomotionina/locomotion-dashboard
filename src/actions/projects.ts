"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getProjects(filterStatus?: string) {
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
          userId: true,
          user: {
            select: {
              id: true,
              name: true,
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

  return {
    ...project,
    pics,
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
  if (!user) {
    return { success: false, error: "Authentication required." };
  }

  const projectId = formData.get("projectId") as string;
  const previewUrl = formData.get("previewUrl") as string;
  const pitchDeckUrl = formData.get("pitchDeckUrl") as string;
  const creativeDeckUrl = formData.get("creativeDeckUrl") as string;
  const finalAssetsUrl = formData.get("finalAssetsUrl") as string;

  if (!projectId) {
    return { success: false, error: "Project ID is required." };
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
  if (!user) {
    return { success: false, error: "Authentication required." };
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
  if (!user) return { success: false, error: "Unauthorized" };

  const projectId = formData.get("projectId") as string;
  const title = formData.get("title") as string;
  const url = formData.get("url") as string;
  const type = (formData.get("type") as string) || "OTHER";

  if (!projectId || !title || !url) {
    return { success: false, error: "Title and URL are required." };
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
  if (!user) return { success: false, error: "Unauthorized" };

  await prisma.projectDeliverable.delete({
    where: { id: deliverableId },
  });

  revalidatePath(`/projects/${projectId}`);
  return { success: true };
}
