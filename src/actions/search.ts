"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export interface SearchTaskResult {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: Date | null;
  project: {
    id: string;
    name: string;
    code: string;
    clientName: string;
  } | null;
  user?: {
    id: string;
    name: string;
    position: string;
  } | null;
}

export interface SearchProjectResult {
  id: string;
  name: string;
  code: string;
  clientName: string;
  status: string;
}

export interface SearchStaffResult {
  id: string;
  name: string;
  username: string;
  position: string;
  department: string;
  avatarUrl: string | null;
}

export interface GlobalSearchResponse {
  tasks: SearchTaskResult[];
  projects: SearchProjectResult[];
  staff: SearchStaffResult[];
}

export async function globalSearchAction(query: string): Promise<GlobalSearchResponse> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { tasks: [], projects: [], staff: [] };
  }

  const q = query.trim();
  if (!q) {
    return { tasks: [], projects: [], staff: [] };
  }

  try {
    const [tasks, projects, staff] = await Promise.all([
      // 1. Search Tasks (by title, description, or project code)
      prisma.task.findMany({
        where: {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { project: { code: { contains: q } } },
            { project: { name: { contains: q } } },
          ],
        },
        select: {
          id: true,
          title: true,
          status: true,
          priority: true,
          dueDate: true,
          project: {
            select: {
              id: true,
              name: true,
              code: true,
              clientName: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              position: true,
            },
          },
        },
        take: 6,
        orderBy: { updatedAt: "desc" },
      }),

      // 2. Search Projects (by name, client name, or code)
      prisma.project.findMany({
        where: {
          OR: [
            { name: { contains: q } },
            { clientName: { contains: q } },
            { code: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          code: true,
          clientName: true,
          status: true,
        },
        take: 5,
        orderBy: { updatedAt: "desc" },
      }),

      // 3. Search Staff (by name, username, position, department)
      prisma.user.findMany({
        where: {
          isApproved: true,
          OR: [
            { name: { contains: q } },
            { username: { contains: q } },
            { position: { contains: q } },
            { department: { contains: q } },
          ],
        },
        select: {
          id: true,
          name: true,
          username: true,
          position: true,
          department: true,
          avatarUrl: true,
        },
        take: 5,
        orderBy: { name: "asc" },
      }),
    ]);

    return { tasks, projects, staff };
  } catch (error) {
    console.error("Global search error:", error);
    return { tasks: [], projects: [], staff: [] };
  }
}
