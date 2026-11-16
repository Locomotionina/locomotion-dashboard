import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let customMessage = "Ini adalah pengujian notifikasi push dari Locomotion Dashboard Tracker.";
    let customTitle = "Locomotion Test Push 🔔";
    let targetUrl = "/dashboard";

    try {
      const body = await req.json();
      if (body?.title) customTitle = body.title;
      if (body?.message) customMessage = body.message;
      if (body?.url) targetUrl = body.url;
    } catch {
      // Body is optional
    }

    const result = await sendPushToUser(user.id, {
      title: customTitle,
      body: customMessage,
      url: targetUrl,
      type: "TEST",
    });

    if (result.sentCount === 0) {
      return NextResponse.json({
        success: false,
        message: "Tidak ada perangkat terdaftar untuk notifikasi push pada akun ini.",
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim notifikasi ke ${result.sentCount} perangkat.`,
      result,
    });
  } catch (err: any) {
    console.error("[Push API Test] Error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
