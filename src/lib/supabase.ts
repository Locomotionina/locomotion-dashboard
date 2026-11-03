import { createClient, SupabaseClient } from "@supabase/supabase-js";

export const LOCOMOTION_PRESENCE_CHANNEL = "room:management_presence";

let supabaseBrowserClient: SupabaseClient | null = null;

export interface RealtimePresencePayload {
  userId: string;
  username: string;
  name: string;
  avatarUrl?: string | null;
  role: string;
  department: string;
  onlineAt: string;
  activeTaskId?: string | null;
  activeTaskTitle?: string | null;
  isTimerActive?: boolean;
}

/**
 * Returns a client-side Supabase client if NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are configured.
 * Reuses the singleton instance in the browser.
 */
export function getSupabaseBrowserClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (supabaseBrowserClient) {
    return supabaseBrowserClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://bccuecstegfnpbwzgqtx.supabase.co";
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  try {
    supabaseBrowserClient = createClient(supabaseUrl, supabaseAnonKey, {
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
        timeout: 20000,
      },
    });
    return supabaseBrowserClient;
  } catch (err) {
    console.error("Failed to initialize Supabase Realtime client:", err);
    return null;
  }
}
