import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Nama cookie session yang digunakan di lib/auth.ts
const SESSION_COOKIE_NAME = "locomotion_session";

interface SessionPayload {
  id: string;
  username: string;
  role: "ADMIN" | "MANAGEMENT" | "STAFF";
}

/**
 * Helper untuk membaca dan decode session payload dari cookie Base64
 * Kompatibel penuh dengan Next.js Edge Runtime dan Node.js runtime.
 */
function getSessionFromCookie(request: NextRequest): SessionPayload | null {
  const cookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie?.value) return null;

  try {
    const rawVal = cookie.value.includes("%")
      ? decodeURIComponent(cookie.value)
      : cookie.value;

    let decodedStr = "";
    if (typeof atob !== "undefined") {
      const binary = atob(rawVal);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      decodedStr = new TextDecoder().decode(bytes);
    } else if (typeof Buffer !== "undefined") {
      decodedStr = Buffer.from(rawVal, "base64").toString("utf-8");
    }

    if (!decodedStr) return null;

    const parsed = JSON.parse(decodedStr);
    if (!parsed || !parsed.id || !parsed.role) {
      return null;
    }

    if (!["ADMIN", "MANAGEMENT", "STAFF"].includes(parsed.role)) {
      return null;
    }

    return parsed as SessionPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = getSessionFromCookie(request);

  // 1. Endpoint API Publik untuk Auth (login, register, me)
  const isAuthApi = pathname.startsWith("/api/auth");
  if (isAuthApi) {
    return NextResponse.next();
  }

  // 2. Proteksi API Terproteksi (/api/reports, dll)
  if (pathname.startsWith("/api/")) {
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized. Silakan login terlebih dahulu." },
        { status: 401 }
      );
    }

    // Role Guard untuk API reports (Hanya Admin & Management)
    if (
      pathname.startsWith("/api/reports") &&
      session.role !== "ADMIN" &&
      session.role !== "MANAGEMENT"
    ) {
      return NextResponse.json(
        { error: "Forbidden. Hanya Management atau Admin yang berhak mengakses rute ini." },
        { status: 403 }
      );
    }
  }

  // 3. Rute Halaman Autentikasi Publik (/login, /register)
  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");
  if (isAuthPage) {
    if (session) {
      // Jika user sudah login, redirect langsung ke landing page sesuai perannya
      const redirectUrl =
        session.role === "ADMIN"
          ? "/admin/users"
          : session.role === "MANAGEMENT"
          ? "/management"
          : "/dashboard";
      return NextResponse.redirect(new URL(redirectUrl, request.url));
    }
    return NextResponse.next();
  }

  // 4. Root path ("/") redirect otomatis
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    const redirectUrl =
      session.role === "ADMIN"
        ? "/admin/users"
        : session.role === "MANAGEMENT"
        ? "/management"
        : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // 5. Rute yang MEMERLUKAN login (Protected Pages)
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/management") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/profile");

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 6. Role-Based Access Control (RBAC) Guard pada halaman
  if (session) {
    // A. Khusus ADMIN: Rute /admin dan /admin/*
    if (pathname.startsWith("/admin")) {
      if (session.role !== "ADMIN") {
        const fallbackUrl =
          session.role === "MANAGEMENT" ? "/management" : "/dashboard";
        return NextResponse.redirect(new URL(fallbackUrl, request.url));
      }
      // Jika user membuka /admin, langsung redirect ke /admin/users
      if (pathname === "/admin") {
        return NextResponse.redirect(new URL("/admin/users", request.url));
      }
    }

    // B. Khusus MANAGEMENT & ADMIN: Rute /management dan /management/*
    if (pathname.startsWith("/management")) {
      if (session.role !== "MANAGEMENT" && session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
    }
  }

  // 7. Teruskan session context via header agar terbaca downstream
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set("x-user-id", session.id);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-user-username", session.username);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Filter matcher agar middleware hanya mengecek rute halaman & API terkait,
 * tanpa membebani static assets, images, uploads, favicon, font, dan file aset.
 */
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)).*)",
  ],
};
