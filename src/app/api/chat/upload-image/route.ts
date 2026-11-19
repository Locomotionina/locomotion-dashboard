import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized. Silakan login terlebih dahulu." },
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

    // 1. Try Supabase Storage upload if service key or valid anon key is configured
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const rawKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = rawKey?.trim();

    if (supabaseUrl && serviceKey) {
      try {
        const supabase = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        });

        const { data, error } = await supabase.storage
          .from("chat-images")
          .upload(fileName, buffer, {
            contentType: file.type || "image/webp",
            upsert: true,
          });

        if (!error && data?.path) {
          const { data: urlData } = supabase.storage
            .from("chat-images")
            .getPublicUrl(data.path);

          if (urlData?.publicUrl) {
            return NextResponse.json({ success: true, url: urlData.publicUrl });
          }
        } else if (error) {
          console.warn("[UploadImage] Supabase Storage upload error:", error.message);
        }
      } catch (err: any) {
        console.warn("[UploadImage] Supabase Storage exception:", err.message);
      }
    }

    // 2. High-performance Database Storage fallback (/api/chat/images/[id])
    try {
      const chatFile = await prisma.chatFile.create({
        data: {
          fileName,
          mimeType: file.type || "image/webp",
          fileSize: buffer.length,
          data: buffer,
        },
        select: { id: true },
      });

      // Best-effort local filesystem caching (ignored on read-only serverless environments)
      try {
        const uploadsDir = path.join(process.cwd(), "public", "uploads", "chat-images");
        if (!fs.existsSync(uploadsDir)) {
          fs.mkdirSync(uploadsDir, { recursive: true });
        }
        const filePath = path.join(uploadsDir, fileName);
        fs.writeFileSync(filePath, buffer);
      } catch {
        // Filesystem is read-only (e.g. Vercel) - safely ignore since DB has the binary
      }

      return NextResponse.json({
        success: true,
        url: `/api/chat/images/${chatFile.id}`,
      });
    } catch (dbErr: any) {
      console.warn("[UploadImage] DB storage fallback error, using base64 data URL:", dbErr.message);

      // 3. Fail-safe Base64 Data URL fallback (ensures upload NEVER fails)
      const mime = file.type || "image/webp";
      const base64Url = `data:${mime};base64,${buffer.toString("base64")}`;
      return NextResponse.json({
        success: true,
        url: base64Url,
      });
    }
  } catch (error: any) {
    console.error("Error uploading chat image:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengunggah gambar." },
      { status: 500 }
    );
  }
}
