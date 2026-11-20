import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface CompressedImageResult {
  blob: Blob;
  file: File;
  width: number;
  height: number;
  size: number;
  previewUrl: string;
  mimeType: string;
}

export interface CompressImageOptions {
  maxDimension?: number;
  targetSizeKB?: number;
  hardCeilingKB?: number;
  fileName?: string;
}

/**
 * Format bytes to readable string (e.g. "285 KB", "1.2 MB")
 */
export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const kb = bytes / 1024;
  if (kb < 1000) {
    return `${Math.round(kb)} KB`;
  }
  return `${(kb / 1024).toFixed(1)} MB`;
}

/**
 * Converts HTMLCanvasElement to Blob with Promise wrapper
 */
function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b), type, quality);
  });
}

/**
 * Client-side image compressor using HTML5 Canvas.
 * - Scales dimensions proportionally to fit within 1280px max width/height
 * - Iteratively steps down WebP/JPEG quality (0.82 down to 0.40) until size <= 450 KB
 * - Enforces strict hard ceiling of < 1 MB
 */
export async function compressImage(
  fileOrBlob: File | Blob,
  options: CompressImageOptions = {}
): Promise<CompressedImageResult> {
  const maxDimension = options.maxDimension || 1280;
  const targetSizeBytes = (options.targetSizeKB || 450) * 1024;
  const hardCeilingBytes = (options.hardCeilingKB || 980) * 1024;

  // Validate format
  const supportedTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "image/avif",
  ];
  if (fileOrBlob.type && !supportedTypes.includes(fileOrBlob.type.toLowerCase())) {
    throw new Error(
      "Format gambar tidak didukung. Mohon gunakan format PNG, JPG, JPEG, atau WebP."
    );
  }

  // Load into Image element
  const objectUrl = URL.createObjectURL(fileOrBlob);
  const img = new Image();

  try {
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () =>
        reject(new Error("Gagal membaca file gambar. File mungkin rusak."));
      img.src = objectUrl;
    });

    const origWidth = img.naturalWidth || img.width;
    const origHeight = img.naturalHeight || img.height;

    if (!origWidth || !origHeight) {
      throw new Error("Dimensi gambar tidak valid.");
    }

    // Calculate proportional dimensions
    let targetWidth = origWidth;
    let targetHeight = origHeight;

    if (origWidth > maxDimension || origHeight > maxDimension) {
      if (origWidth >= origHeight) {
        targetWidth = maxDimension;
        targetHeight = Math.round((origHeight * maxDimension) / origWidth);
      } else {
        targetHeight = maxDimension;
        targetWidth = Math.round((origWidth * maxDimension) / origHeight);
      }
    }

    // Setup canvas
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Gagal menginisialisasi canvas untuk kompresi.");
    }

    // High quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

    // Iterative quality reduction (targeting <= targetSizeBytes, ceiling <= hardCeilingBytes)
    const qualities = [0.82, 0.72, 0.62, 0.52, 0.45, 0.38, 0.30];
    let selectedBlob: Blob | null = null;
    let mimeType = "image/webp";

    // 1. Try webp first
    for (const q of qualities) {
      const b = await canvasToBlob(canvas, "image/webp", q);
      if (b) {
        selectedBlob = b;
        mimeType = "image/webp";
        if (b.size <= targetSizeBytes) {
          break;
        }
      }
    }

    // Fallback to jpeg if webp not supported by browser
    if (!selectedBlob || selectedBlob.type !== "image/webp") {
      mimeType = "image/jpeg";
      for (const q of qualities) {
        const b = await canvasToBlob(canvas, "image/jpeg", q);
        if (b) {
          selectedBlob = b;
          if (b.size <= targetSizeBytes) {
            break;
          }
        }
      }
    }

    // If still > targetSizeBytes after lowest quality, scale down canvas resolution
    if (selectedBlob && selectedBlob.size > targetSizeBytes) {
      let scale = 0.85;
      for (let attempt = 0; attempt < 6 && selectedBlob.size > targetSizeBytes; attempt++) {
        const downWidth = Math.round(targetWidth * scale);
        const downHeight = Math.round(targetHeight * scale);
        const downCanvas = document.createElement("canvas");
        downCanvas.width = downWidth;
        downCanvas.height = downHeight;
        const downCtx = downCanvas.getContext("2d");
        if (downCtx) {
          downCtx.imageSmoothingEnabled = true;
          downCtx.imageSmoothingQuality = "high";
          downCtx.drawImage(canvas, 0, 0, downWidth, downHeight);
          const downBlob = await canvasToBlob(downCanvas, mimeType, 0.45);
          if (downBlob && downBlob.size < selectedBlob.size) {
            selectedBlob = downBlob;
            targetWidth = downWidth;
            targetHeight = downHeight;
          }
        }
        scale *= 0.85;
      }
    }

    // Safety guarantee against hard ceiling
    if (selectedBlob && selectedBlob.size > hardCeilingBytes) {
      let aggressiveQuality = 0.35;
      while (selectedBlob.size > hardCeilingBytes && aggressiveQuality >= 0.15) {
        targetWidth = Math.round(targetWidth * 0.8);
        targetHeight = Math.round(targetHeight * 0.8);
        const downCanvas = document.createElement("canvas");
        downCanvas.width = targetWidth;
        downCanvas.height = targetHeight;
        const downCtx = downCanvas.getContext("2d");
        if (downCtx) {
          downCtx.imageSmoothingEnabled = true;
          downCtx.imageSmoothingQuality = "medium";
          downCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
          const downBlob = await canvasToBlob(downCanvas, mimeType, aggressiveQuality);
          if (downBlob) {
            selectedBlob = downBlob;
          }
        }
        aggressiveQuality -= 0.1;
      }
    }

    if (!selectedBlob) {
      throw new Error("Gagal mengompresi gambar.");
    }

    // Check hard ceiling
    if (selectedBlob.size > hardCeilingBytes) {
      throw new Error(
        `Ukuran gambar (${formatFileSize(selectedBlob.size)}) melebihi batas maksimal ${formatFileSize(hardCeilingBytes)}.`
      );
    }

    const extension = mimeType === "image/webp" ? "webp" : "jpg";
    const fileName = options.fileName || `chat-${Date.now()}.${extension}`;
    const compressedFile = new File(
      [selectedBlob],
      fileName,
      { type: mimeType, lastModified: Date.now() }
    );

    const previewUrl = URL.createObjectURL(selectedBlob);

    return {
      blob: selectedBlob,
      file: compressedFile,
      width: targetWidth,
      height: targetHeight,
      size: selectedBlob.size,
      previewUrl,
      mimeType,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Uploads compressed image blob directly to Supabase Storage or server fallback
 * Path: chat-images/[project_or_task_id]/[timestamp]-[random].webp
 */
export async function uploadChatImage(
  blob: Blob,
  targetId: string,
  context: "project" | "task"
): Promise<string> {
  const extension = blob.type === "image/webp" ? "webp" : "jpg";
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const filePath = `${context}_${targetId}/${Date.now()}-${randomSuffix}.${extension}`;

  // 1. Try direct Supabase Storage upload
  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from("chat-images")
        .upload(filePath, blob, {
          contentType: blob.type || "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from("chat-images")
          .getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Direct Supabase Storage upload failed, falling back to API:", err);
    }
  }

  // 2. Server API fallback
  const formData = new FormData();
  formData.append("file", blob, `chat-${Date.now()}.${extension}`);
  formData.append("targetId", targetId);
  formData.append("context", context);

  const res = await fetch("/api/chat/upload-image", {
    method: "POST",
    body: formData,
  });

  const json = await res.json();
  if (!res.ok || !json.url) {
    throw new Error(json.error || "Gagal mengunggah gambar ke penyimpanan.");
  }

  return json.url;
}

/**
 * Uploads compressed avatar image directly to Supabase Storage 'avatars' bucket
 */
export async function uploadAvatarToStorage(
  blob: Blob,
  targetUserId: string
): Promise<string> {
  const extension = blob.type === "image/webp" ? "webp" : blob.type === "image/png" ? "png" : "jpg";
  const fileName = `${targetUserId}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;

  const supabase = getSupabaseBrowserClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.storage
        .from("avatars")
        .upload(fileName, blob, {
          contentType: blob.type || "image/webp",
          cacheControl: "31536000",
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: urlData } = supabase.storage
          .from("avatars")
          .getPublicUrl(data.path);
        if (urlData?.publicUrl) {
          return urlData.publicUrl;
        }
      }
    } catch (err) {
      console.warn("Direct Supabase Storage avatar upload failed, falling back to Server Action:", err);
    }
  }

  // Fallback to Server Action
  const formData = new FormData();
  formData.append("file", blob, fileName);
  formData.append("targetUserId", targetUserId);

  const { uploadAvatarAction } = await import("@/actions/auth");
  const res = await uploadAvatarAction(formData);
  if (!res.success || !res.url) {
    throw new Error(res.error || "Gagal mengunggah foto profil.");
  }

  return res.url;
}
