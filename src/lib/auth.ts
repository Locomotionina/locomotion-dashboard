import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export const SESSION_COOKIE_NAME = "locomotion_session";

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
  avatarUrl: string | null;
  bio: string | null;
}

/**
 * Retrieves the currently logged-in user from the session cookie.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return null;
  }

  try {
    const rawVal = sessionCookie.value.includes("%")
      ? decodeURIComponent(sessionCookie.value)
      : sessionCookie.value;
    const parsed = JSON.parse(
      Buffer.from(rawVal, "base64").toString("utf-8")
    );

    if (!parsed?.id) return null;

    const user = await prisma.user.findUnique({
      where: { id: parsed.id },
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
      },
    });

    if (!user) return null;

    // Block suspended users from accessing the system
    if (user.isSuspended) {
      return null;
    }

    // Unapproved users (except Admin) cannot access the system
    if (!user.isApproved && user.role !== "ADMIN") {
      return null;
    }

    return user as SessionUser;
  } catch (err) {
    console.error("Failed to parse session cookie:", err);
    return null;
  }
}

/**
 * Creates a session cookie for the given user.
 */
export function setSessionCookie(user: { id: string; username: string; role: string }) {
  const cookieStore = cookies();
  const serialized = Buffer.from(JSON.stringify(user)).toString("base64");
  
  cookieStore.set(SESSION_COOKIE_NAME, serialized, {
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
