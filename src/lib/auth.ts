import { cookies } from "next/headers";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  verifySessionToken,
  type SessionPayload,
} from "@/lib/session";

export { SESSION_COOKIE_NAME };

export interface SessionUser {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: "STAFF" | "MANAGEMENT" | "ADMIN";
  position: string;
  department: string;
  isApproved?: boolean;
  isSuspended?: boolean;
  hasCompletedOnboarding?: boolean;
  avatarUrl: string | null;
  bio: string | null;
}

/**
 * Retrieves the currently logged-in user from the signed session cookie.
 * Wrapped in React cache to eliminate redundant database round-trips
 * during a single request lifecycle (e.g. layout + page + actions).
 */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const payload = await verifySessionToken(sessionCookie.value);
    if (!payload?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        role: true,
        position: true,
        department: true,
        isApproved: true,
        isSuspended: true,
        avatarUrl: true,
        bio: true,
        hasCompletedOnboarding: true,
      },
    });

    if (!user) return null;

    // Block suspended users from accessing the system
    if (user.isSuspended) {
      return null;
    }

    // Unapproved users cannot access the system
    if (!user.isApproved) {
      return null;
    }

    return user as SessionUser;
  } catch (err) {
    console.error("Failed to parse session cookie:", err);
    return null;
  }
});

/**
 * Creates a cryptographically signed session cookie for the given user.
 */
export async function setSessionCookie(user: {
  id: string;
  username: string;
  role: "ADMIN" | "MANAGEMENT" | "STAFF";
}) {
  const cookieStore = cookies();
  const token = await createSessionToken(user);

  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

/**
 * Clears the session cookie.
 */
export function clearSessionCookie() {
  const cookieStore = cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Password verification helper.
 */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  return bcrypt.compare(plain, hashed);
}

/**
 * Hash password helper.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
