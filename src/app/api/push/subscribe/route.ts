import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendPushToUser } from "@/lib/push";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { subscription, userAgent, sendTestNotification } = body;

    if (!subscription || !subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid push subscription object. Required: endpoint, keys.p256dh, keys.auth" },
        { status: 400 }
      );
    }

    // Upsert subscription linked to user (supports multiple devices per user)
    const saved = await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      update: {
        userId: user.id,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || req.headers.get("user-agent") || null,
        updatedAt: new Date(),
      },
      create: {
        userId: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: userAgent || req.headers.get("user-agent") || null,
      },
    });

    // Optionally send test notification right after subscription
    if (sendTestNotification) {
      await sendPushToUser(user.id, {
        title: "Locomotion Tracker 🚀",
        body: `Notifikasi HP aktif untuk ${user.name}! Anda akan menerima update task secara real-time.`,
        url: "/dashboard",
        type: "WELCOME",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Push subscription registered successfully",
      id: saved.id,
    });
  } catch (err: any) {
    console.error("[Push API] Failed to save subscription:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { endpoint } = body;

    if (!endpoint) {
      return NextResponse.json({ error: "Subscription endpoint required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: {
        endpoint: endpoint,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Push subscription removed successfully",
    });
  } catch (err: any) {
    console.error("[Push API] Failed to remove subscription:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const count = await prisma.pushSubscription.count({
      where: { userId: user.id },
    });

    return NextResponse.json({
      subscribed: count > 0,
      deviceCount: count,
      publicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || null,
    });
  } catch (err: any) {
    console.error("[Push API] Failed to get subscriptions count:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
