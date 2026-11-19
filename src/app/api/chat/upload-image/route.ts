import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetId = (formData.get("targetId") as string) || "general";
    const context = (formData.get("context") as string) || "chat";

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File gambar tidak ditemukan." },
        { status: 400 }
      );
    }

    // Check size limit: 1 MB strict ceiling
    if (file.size > 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: "Ukuran file melebihi batas maksimal 1 MB." },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.type === "image/webp" ? "webp" : file.type === "image/png" ? "png" : "jpg";
    const fileName = `${context}_${targetId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;

    // 1. Try Supabase storage if server has key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (supabaseUrl && serviceKey) {
      try {
        const uploadUrl = `${supabaseUrl}/storage/v1/object/chat-images/${fileName}`;
        const uploadRes = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${serviceKey}`,
            apikey: serviceKey,
            "Content-Type": file.type || "image/webp",
          },
          body: buffer,
        });

        if (uploadRes.ok) {
          const publicUrl = `${supabaseUrl}/storage/v1/object/public/chat-images/${fileName}`;
          return NextResponse.json({ success: true, url: publicUrl });
        }
      } catch (err) {
        console.warn("Server Supabase Storage upload failed, falling back to local storage:", err);
      }
    }

    // 2. Local public storage fallback
    const uploadsDir = path.join(process.cwd(), "public", "uploads", "chat-images");
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const filePath = path.join(uploadsDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const publicUrl = `/uploads/chat-images/${fileName}`;
    return NextResponse.json({ success: true, url: publicUrl });
  } catch (error: any) {
    console.error("Error uploading chat image:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengunggah gambar." },
      { status: 500 }
    );
  }
}
