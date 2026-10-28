export const SESSION_COOKIE_NAME = "locomotion_session";

export interface SessionPayload {
  id: string;
  username: string;
  role: "ADMIN" | "MANAGEMENT" | "STAFF";
  iat?: number;
  exp?: number;
}

const DEFAULT_SECRET = "locomotion-secure-agency-session-secret-salt-2026";

function getSecret(): string {
  return process.env.SESSION_SECRET || process.env.AUTH_SECRET || DEFAULT_SECRET;
}

/**
 * URL-safe Base64 encoding compatible with both Web API & Node runtime
 */
function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * URL-safe Base64 decoding compatible with both Web API & Node runtime
 */
function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Imports the HMAC-SHA256 key using Web Crypto API (Edge & Node compatible)
 */
async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates a cryptographically signed session token: <payloadBase64Url>.<signatureBase64Url>
 */
export async function createSessionToken(
  payload: Omit<SessionPayload, "iat" | "exp">
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: SessionPayload = {
    ...payload,
    iat: now,
    exp: now + 7 * 24 * 60 * 60, // 7 days expiration
  };

  const enc = new TextEncoder();
  const jsonStr = JSON.stringify(fullPayload);
  const dataBase64 = toBase64Url(enc.encode(jsonStr));

  const key = await getCryptoKey(getSecret());
  const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(dataBase64));
  const sigBase64 = toBase64Url(new Uint8Array(sigBuffer));

  return `${dataBase64}.${sigBase64}`;
}

/**
 * Verifies and parses a signed session token.
 * Returns null if token is missing, tampered, expired, or invalid.
 */
export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  if (!token || typeof token !== "string") return null;

  const rawVal = token.includes("%") ? decodeURIComponent(token) : token;
  const parts = rawVal.split(".");

  // Signed token must have format: <data>.<signature>
  if (parts.length !== 2) {
    return null;
  }

  const [dataBase64, sigBase64] = parts;
  if (!dataBase64 || !sigBase64) {
    return null;
  }

  try {
    const enc = new TextEncoder();
    const dec = new TextDecoder();
    const key = await getCryptoKey(getSecret());

    const signatureBytes = fromBase64Url(sigBase64);
    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as unknown as BufferSource,
      enc.encode(dataBase64)
    );

    if (!isValid) {
      console.warn("[Security] Tampered or forged session token detected!");
      return null;
    }

    const payloadJson = dec.decode(fromBase64Url(dataBase64));
    const payload = JSON.parse(payloadJson) as SessionPayload;

    if (!payload?.id || !payload?.role) {
      return null;
    }

    // Check expiration if present
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    if (!["ADMIN", "MANAGEMENT", "STAFF"].includes(payload.role)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}
