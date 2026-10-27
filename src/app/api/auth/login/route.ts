import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    let user = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (!user && cleanUsername === "admin") {
      user = await prisma.user.findFirst({
        where: { role: "ADMIN" },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    if (user.isSuspended) {
      return NextResponse.json(
        { error: "Akun Anda sedang ditangguhkan (On Hold). Silakan hubungi Admin (HRGA)." },
        { status: 403 }
      );
    }

    if (!user.isApproved && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Akun Anda belum disetujui (ACC) oleh Admin (HRGA)." },
        { status: 403 }
      );
    }

    const sessionPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
    };

    const serialized = Buffer.from(JSON.stringify(sessionPayload)).toString(
      "base64"
    );

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        username: user.username,
        role: user.role,
        department: user.department,
        position: user.position,
      },
    });

    response.cookies.set(SESSION_COOKIE_NAME, serialized, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
