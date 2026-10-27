import { NextResponse } from "next/server";
import { getCurrentUser, SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({ authenticated: true, user });
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: "Logged out" });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
