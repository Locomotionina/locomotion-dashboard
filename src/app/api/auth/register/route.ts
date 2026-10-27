import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, SESSION_COOKIE_NAME } from "@/lib/auth";
import { getTierFromPosition } from "@/lib/departments";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, username, password, position, department } = body;

    if (!name || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters" },
        { status: 400 }
      );
    }

    if (!username || username.trim().length < 3) {
      return NextResponse.json(
        { error: "Username must be at least 3 characters" },
        { status: 400 }
      );
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findUnique({
      where: { username: cleanUsername },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const assignedRole = getTierFromPosition(position || "");

    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        username: cleanUsername,
        password: hashedPassword,
        role: assignedRole,
        position: position?.trim() || "Content Strategist",
        department: department?.trim() || "PROJECT/PRODUCTION",
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          name
        )}&backgroundColor=4f46e5`,
      },
    });

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
