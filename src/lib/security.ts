/**
 * Server-Side Security & Data Validation Library
 * Enforces server-authoritative verification for file uploads, URLs, and permissions.
 */

export interface ImageInspectionResult {
  isValid: boolean;
  mime: string;
  ext: string;
  error?: string;
}

/**
 * Validates file buffer by inspecting its raw binary code (Magic Bytes / File Signature).
 * Never trusts client-supplied MIME types or file extensions.
 */
export function validateImageMagicBytes(buffer: Buffer): ImageInspectionResult {
  if (!buffer || buffer.length < 12) {
    return {
      isValid: false,
      mime: "",
      ext: "",
      error: "File terlalu kecil atau data biner tidak lengkap.",
    };
  }

  // 1. JPEG / JPG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    // Secondary check: verify does not contain dangerous PHP / Script polyglot tags
    if (containsExecutablePayload(buffer)) {
      return {
        isValid: false,
        mime: "",
        ext: "",
        error: "File ditolak: Terdeteksi script/kode berbahaya di dalam biner gambar.",
      };
    }
    return { isValid: true, mime: "image/jpeg", ext: "jpg" };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    if (containsExecutablePayload(buffer)) {
      return {
        isValid: false,
        mime: "",
        ext: "",
        error: "File ditolak: Terdeteksi script/kode berbahaya di dalam biner gambar.",
      };
    }
    return { isValid: true, mime: "image/png", ext: "png" };
  }

  // 3. GIF: GIF87a (47 49 46 38 37 61) or GIF89a (47 49 46 38 39 61)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    if (containsExecutablePayload(buffer)) {
      return {
        isValid: false,
        mime: "",
        ext: "",
        error: "File ditolak: Terdeteksi script/kode berbahaya di dalam biner gambar.",
      };
    }
    return { isValid: true, mime: "image/gif", ext: "gif" };
  }

  // 4. WebP: 'RIFF' .... 'WEBP'
  // Offset 0-3: 52 49 46 46 (RIFF)
  // Offset 8-11: 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    if (containsExecutablePayload(buffer)) {
      return {
        isValid: false,
        mime: "",
        ext: "",
        error: "File ditolak: Terdeteksi script/kode berbahaya di dalam biner gambar.",
      };
    }
    return { isValid: true, mime: "image/webp", ext: "webp" };
  }

  return {
    isValid: false,
    mime: "",
    ext: "",
    error:
      "Format file tidak valid. Server hanya menerima gambar biner berformat JPG, JPEG, PNG, WebP, atau GIF yang valid.",
  };
}

/**
 * Defensive check for polyglot web shells, embedded PHP, or HTML/JS execution vectors in file binaries.
 */
function containsExecutablePayload(buffer: Buffer): boolean {
  // Convert first 4096 bytes and last 4096 bytes to string for pattern searching
  const headSize = Math.min(buffer.length, 4096);
  const headStr = buffer.subarray(0, headSize).toString("latin1").toLowerCase();

  const tailStart = Math.max(0, buffer.length - 2048);
  const tailStr = buffer.subarray(tailStart).toString("latin1").toLowerCase();

  const sample = headStr + " " + tailStr;

  const dangerousPatterns = [
    "<?php",
    "<?=",
    "<script",
    "</script>",
    "javascript:",
    "onload=",
    "onerror=",
    "eval(",
    "base64_decode(",
    "system(",
    "shell_exec(",
    "<!entity",
  ];

  return dangerousPatterns.some((pattern) => sample.includes(pattern));
}

/**
 * Server-side validation for avatar URLs.
 * Strictly permits HTTPS/HTTP web URLs or validated Base64 Data URLs with image MIME types.
 * Blocks javascript:, vbscript:, data:text/html, etc.
 */
export function isValidAvatarUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // 1. Data URLs must strictly match image base64
  if (trimmed.startsWith("data:")) {
    const dataUrlRegex = /^data:image\/(jpeg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/;
    return dataUrlRegex.test(trimmed);
  }

  // 2. HTTP/HTTPS URLs
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Validates external web deliverables URLs.
 * Strictly allows only https:// or http:// protocols.
 */
export function isValidDeliverableUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim();
  if (trimmed.length === 0) return false;

  // Block javascript, data, file, etc.
  if (/^(javascript|vbscript|data|file|about):/i.test(trimmed)) {
    return false;
  }

  try {
    const normalized = trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
    const parsed = new URL(normalized);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}
