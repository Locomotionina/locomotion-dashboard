import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = sessionCookie ? await verifySessionToken(sessionCookie) : null;

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
      return NextResponse.redirect(new URL(redirectUrl, request.nextUrl));
    }
    return NextResponse.next();
  }

  // 4. Root path ("/") redirect otomatis
  if (pathname === "/") {
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    const redirectUrl =
      session.role === "ADMIN"
        ? "/admin/users"
        : session.role === "MANAGEMENT"
        ? "/management"
        : "/dashboard";
    return NextResponse.redirect(new URL(redirectUrl, request.nextUrl));
  }

  // 5. Rute yang MEMERLUKAN login (Protected Pages)
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/management") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/profile");

  if (isProtectedRoute && !session) {
    const loginUrl = new URL("/login", request.nextUrl);
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
        return NextResponse.redirect(new URL(fallbackUrl, request.nextUrl));
      }
      // Jika user membuka /admin, langsung redirect ke /admin/users
      if (pathname === "/admin") {
        return NextResponse.redirect(new URL("/admin/users", request.nextUrl));
      }
    }

    // B. Khusus MANAGEMENT & ADMIN: Rute /management dan /management/*
    if (pathname.startsWith("/management")) {
      if (session.role !== "MANAGEMENT" && session.role !== "ADMIN") {
        return NextResponse.redirect(new URL("/dashboard", request.nextUrl));
      }
    }
  }

  // 7. Teruskan session context via header agar terbaca downstream
  const requestHeaders = new Headers(request.headers);
  if (session) {
    requestHeaders.set("x-user-id", session.id);
    requestHeaders.set("x-user-role", session.role);
    requestHeaders.set("x-user-username", session.username);
  } else {
    requestHeaders.delete("x-user-id");
    requestHeaders.delete("x-user-role");
    requestHeaders.delete("x-user-username");
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

/**
 * Filter matcher agar middleware hanya mengecek rute halaman & API terkait,
 * tanpa membebani internal Next.js assets (_next), static assets, uploads, favicon, font, dan file aset.
 */
export const config = {
  matcher: [
    "/((?!_next|favicon.ico|icon.svg|uploads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ico)).*)",
  ],
};
