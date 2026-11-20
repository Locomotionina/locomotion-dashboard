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

    // 1. Upload directly to Supabase Storage bucket 'chat-images'
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bccuecstegfnpbwzgqtx.supabase.co";
    const rawKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceKey = rawKey?.trim();

    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Konfigurasi Supabase Storage belum lengkap (kunci API anon/service role diperlukan). Base64 tidak diizinkan demi efisiensi egress database.",
        },
        { status: 500 }
      );
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, buffer, {
        contentType: file.type || "image/webp",
        cacheControl: "31536000",
        upsert: true,
      });

    if (error || !data?.path) {
      console.error("[UploadImage] Supabase Storage upload error:", error?.message);
      return NextResponse.json(
        {
          success: false,
          error: `Gagal mengunggah gambar ke Supabase Storage: ${error?.message || "Kesalahan penyimpanan."}`,
        },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from("chat-images")
      .getPublicUrl(data.path);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { success: false, error: "Gagal mendapatkan URL CDN publik dari Supabase Storage." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, url: urlData.publicUrl });
  } catch (error: any) {
    console.error("Error uploading chat image:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Gagal mengunggah gambar." },
      { status: 500 }
    );
  }
}
