"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Bell,
  BellRing,
  BellOff,
  Smartphone,
  Share,
  PlusSquare,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  X,
  ExternalLink,
  ShieldCheck,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return buffer;
}

export function checkIsIos(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function checkIsStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    (typeof document !== "undefined" && document.referrer.includes("android-app://"))
  );
}

interface ToastState {
  message: string;
  type: "success" | "error" | "info";
}

// In-memory tracker to prevent redundant background re-binding requests in the same session
let lastSyncedKey = "";
let isSyncing = false;

/**
 * Background auto-sync function: silently re-binds active device PushSubscription to current user
 */
export async function silentSyncSubscription(subscription: PushSubscription, userId?: string) {
  const syncKey = `${userId || "active-session"}:${subscription.endpoint}`;
  if (isSyncing || lastSyncedKey === syncKey) {
    return;
  }
  isSyncing = true;

  try {
    const res = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        sendTestNotification: false,
      }),
    });

    if (res.ok) {
      lastSyncedKey = syncKey;
    }
  } catch (err) {
    console.debug("[Push] Silent re-binding error:", err);
  } finally {
    isSyncing = false;
  }
}

/**
 * Headless component to automatically sync / re-bind push subscriptions on login or session load
 */
export function PushNotificationAutoSync({ userId }: { userId?: string }) {
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !("Notification" in window) ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    if (Notification.permission !== "granted") {
      return;
    }

    let isMounted = true;

    navigator.serviceWorker.ready
      .then(async (reg) => {
        if (!isMounted) return;
        const sub = await reg.pushManager.getSubscription();
        if (sub && isMounted) {
          silentSyncSubscription(sub, userId);
        }
      })
      .catch((err) => {
        console.debug("[Push] Auto-sync ready error:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [userId]);

  return null;
}

export function usePushNotifications(userId?: string) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showBlockedDialog, setShowBlockedDialog] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((message: string, type: "success" | "error" | "info" = "info") => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, 5000);
  }, []);

  // Check the local device/browser actual push subscription state
  const checkLocalSubscription = useCallback(async () => {
    if (typeof window === "undefined") return;

    const ios = checkIsIos();
    const standalone = checkIsStandalone();
    setIsIos(ios);
    setIsStandalone(standalone);

    const supported =
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
    setIsSupported(supported);

    if (!supported) {
      setIsSubscribed(false);
      return;
    }

    const currentPerm = Notification.permission;
    setPermission(currentPerm);

    if (currentPerm !== "granted") {
      setIsSubscribed(false);
      return;
    }

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      const active = !!sub;
      setIsSubscribed(active);

      // Silently re-bind subscription to active user session in background
      if (active && sub) {
        silentSyncSubscription(sub, userId);
      }
    } catch (err) {
      console.warn("[Push] Error checking local push subscription:", err);
      setIsSubscribed(false);
    }
  }, [userId]);

  // Initial check & register service worker
  useEffect(() => {
    if (typeof window === "undefined") return;

    checkLocalSubscription();

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then(() => {
          checkLocalSubscription();
        })
        .catch((err) => {
          console.warn("[PWA] Service worker registration error:", err);
        });
    }

    // Listen for browser permission changes
    if (
      typeof navigator !== "undefined" &&
      "permissions" in navigator &&
      navigator.permissions.query
    ) {
      navigator.permissions
        .query({ name: "notifications" as PermissionName })
        .then((permStatus) => {
          permStatus.onchange = () => {
            if ("Notification" in window) {
              setPermission(Notification.permission);
              if (Notification.permission !== "granted") {
                setIsSubscribed(false);
              } else {
                checkLocalSubscription();
              }
            }
          };
        })
        .catch(() => {});
    }
  }, [checkLocalSubscription]);

  const subscribe = async () => {
    // Check iOS Safari outside standalone mode
    if (isIos && !isStandalone) {
      setShowIosGuide(true);
      return;
    }

    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      showToast("Browser ini tidak mendukung native Web Push notifications.", "error");
      return;
    }

    try {
      setLoading(true);

      const currentPerm = await Notification.requestPermission();
      setPermission(currentPerm);

      if (currentPerm === "denied") {
        setShowBlockedDialog(true);
        showToast(
          "Izin notifikasi diblokir. Harap aktifkan izin notifikasi di pengaturan browser Anda.",
          "error"
        );
        setLoading(false);
        return;
      }

      if (currentPerm !== "granted") {
        setLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      let vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

      // Fallback 1: Fetch from backend API dynamically if not present at build-time
      if (!vapidPublicKey) {
        try {
          const res = await fetch("/api/push/subscribe");
          if (res.ok) {
            const data = await res.json();
            if (data.publicKey) {
              vapidPublicKey = data.publicKey;
            }
          }
        } catch {
          // ignore network failure
        }
      }

      // Fallback 2: Default to the generated project VAPID key
      if (!vapidPublicKey) {
        vapidPublicKey =
          "BGeFi3XoBjv7MbKeJ9GED-oRxcJkEKfqggTokUIT9vWSW2bcWQ1EXOG42NbGkjbQM5HjF21yi9ro3XQYte_xXeg";
      }

      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // Save subscription to backend and request welcome test notification
      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          userAgent: navigator.userAgent,
          sendTestNotification: true,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || "Gagal menyimpan subscription push.");
      }

      lastSyncedKey = `${userId || "active-session"}:${subscription.endpoint}`;
      setIsSubscribed(true);
      showToast(
        "Notifikasi berhasil diaktifkan! Notifikasi tes telah dikirim ke perangkat Anda. 🔔",
        "success"
      );
    } catch (err: any) {
      console.error("[Push] Subscribe error:", err);
      showToast(err.message || "Gagal mengaktifkan notifikasi push.", "error");
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    try {
      setLoading(true);

      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();

        if (subscription) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();

          await fetch("/api/push/subscribe", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
        }
      }

      lastSyncedKey = "";
      setIsSubscribed(false);
      showToast("Notifikasi dinonaktifkan untuk perangkat ini.", "info");
    } catch (err: any) {
      console.error("[Push] Unsubscribe error:", err);
      showToast(err.message || "Gagal menonaktifkan notifikasi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      setTesting(true);
      const res = await fetch("/api/push/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Uji Notifikasi Locomotion 🚀",
          message: "Native Push Notifications berfungsi dengan sempurna di perangkat ini!",
          url: "/dashboard",
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Gagal mengirim notifikasi tes.");
      }

      showToast("Notifikasi tes terkirim! Periksa banner/notifikasi perangkat Anda.", "success");
    } catch (err: any) {
      console.error("[Push] Test notification error:", err);
      showToast(err.message || "Gagal mengirim notifikasi tes.", "error");
    } finally {
      setTesting(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    permission,
    loading,
    testing,
    isIos,
    isStandalone,
    showIosGuide,
    setShowIosGuide,
    showBlockedDialog,
    setShowBlockedDialog,
    subscribe,
    unsubscribe,
    sendTestNotification,
    toast,
    setToast,
  };
}

export function BlockedGuideDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-card border border-border shadow-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <BellOff className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Notifikasi Diblokir oleh Browser
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Izin notifikasi dinonaktifkan di pengaturan browser perangkat ini.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium">
          Browser memblokir permintaan notifikasi. Untuk mengaktifkannya, ubah pengaturan izin situs pada browser Anda.
        </div>

        <div className="space-y-3 my-2 text-xs text-foreground/90">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground">Buka Setelan Situs di Address Bar</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Klik ikon <strong>Gembok / Setelan Situs</strong> di sebelah kiri bilah alamat URL (address bar) browser Anda.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
              2
            </span>
            <div>
              <p className="font-semibold text-foreground">Ubah Izin Notifikasi Menjadi &quot;Izinkan&quot;</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Cari menu <strong>Notifikasi (Notifications)</strong> dan ubah dari <em>Blokir / Deny</em> menjadi <strong>Izinkan / Allow</strong>.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white font-bold text-xs">
              3
            </span>
            <div>
              <p className="font-semibold text-foreground">Muat Ulang (Refresh) Halaman</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Muat ulang halaman ini agar izin baru segera diterapkan oleh sistem.
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} className="rounded-xl px-5 text-xs font-semibold">
            Saya Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function IosGuideDialog({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md w-full rounded-2xl p-6 bg-card border border-border shadow-2xl">
        <DialogHeader className="text-left">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-9 w-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Aktifkan Notifikasi di iPhone
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Apple mewajibkan aplikasi ditambahkan ke Home Screen untuk menerima Push Alerts.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs text-blue-800 dark:text-blue-300 font-medium">
          Untuk iPhone: ketuk ikon Share di Safari lalu pilih &apos;Add to Home Screen&apos; terlebih dahulu untuk mengaktifkan notifikasi.
        </div>

        <div className="space-y-3.5 my-2 text-xs text-foreground/90">
          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              1
            </span>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                Buka Safari & Ketuk Ikon Share <Share className="h-3.5 w-3.5 text-blue-500" />
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Di bagian bawah layar Safari, ketuk tombol <strong>Share</strong> (ikon kotak dengan panah ke atas).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              2
            </span>
            <div>
              <p className="font-semibold text-foreground flex items-center gap-1.5">
                Pilih &quot;Add to Home Screen&quot; <PlusSquare className="h-3.5 w-3.5 text-blue-500" />
              </p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Gulir ke bawah pada menu Share lalu pilih opsi <strong>&quot;Add to Home Screen&quot;</strong> (Tambah ke Layar Utama).
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-xl bg-secondary/50 border border-border/70">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white font-bold text-xs">
              3
            </span>
            <div>
              <p className="font-semibold text-foreground">Buka App Locomotion & Aktifkan</p>
              <p className="text-muted-foreground mt-0.5 leading-relaxed">
                Buka ikon <strong>Locomotion</strong> dari Home Screen iPhone Anda, lalu klik tombol <strong>Izinkan Notifikasi</strong>.
              </p>
            </div>
          </div>
        </div>

        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-700 dark:text-amber-400">
          <strong>Catatan:</strong> Fitur Push Notification di iOS memerlukan iOS versi 16.4 atau lebih baru.
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={onClose} className="rounded-xl px-5 text-xs font-semibold">
            Saya Mengerti
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function ToastBanner({
  toast,
  onClose,
}: {
  toast: ToastState | null;
  onClose: () => void;
}) {
  if (!toast) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-card/95 backdrop-blur-md border border-border shadow-2xl text-xs max-w-sm animate-in fade-in slide-in-from-bottom-4">
      {toast.type === "success" && (
        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
      )}
      {toast.type === "error" && (
        <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
      )}
      {toast.type === "info" && (
        <Bell className="h-4 w-4 text-blue-500 shrink-0" />
      )}
      <span className="flex-1 text-foreground font-medium leading-relaxed">
        {toast.message}
      </span>
      <button
        onClick={onClose}
        aria-label="Tutup notifikasi"
        className="p-1 text-muted-foreground hover:text-foreground rounded-md transition-colors"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

/**
 * Universal Navbar push notification button with device-agnostic states and subtle active indicator
 */
export function PushNotificationButton({ userId }: { userId?: string } = {}) {
  const {
    isSubscribed,
    permission,
    loading,
    testing,
    isIos,
    isStandalone,
    showIosGuide,
    setShowIosGuide,
    showBlockedDialog,
    setShowBlockedDialog,
    subscribe,
    sendTestNotification,
    toast,
    setToast,
  } = usePushNotifications(userId);

  const isBlocked = permission === "denied";

  return (
    <>
      <div className="relative inline-flex items-center">
        {isBlocked ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowBlockedDialog(true)}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 transition-all"
            title="Izin notifikasi diblokir oleh browser. Klik untuk melihat panduan mengaktifkannya."
          >
            <BellOff className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Notifikasi Diblokir</span>
            <span className="sm:hidden">Diblokir</span>
          </Button>
        ) : isSubscribed ? (
          <Button
            variant="outline"
            size="sm"
            onClick={sendTestNotification}
            disabled={testing || loading}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition-all"
            title="Notifikasi Aktif di perangkat ini. Klik untuk kirim notifikasi pengujian."
          >
            {testing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <span className="relative flex h-2 w-2 mr-1 sm:mr-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
            <BellRing className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="hidden sm:inline">Notifikasi Aktif</span>
            <span className="sm:hidden">Aktif</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={subscribe}
            disabled={loading}
            className="h-8 px-2 sm:px-2.5 rounded-xl text-xs font-medium border-blue-500/30 bg-blue-500/5 text-blue-600 dark:text-blue-400 hover:bg-blue-500/15 transition-all"
            title={
              isIos && !isStandalone
                ? "Untuk iPhone: ketuk ikon Share di Safari lalu pilih 'Add to Home Screen' terlebih dahulu untuk mengaktifkan notifikasi."
                : "Izinkan notifikasi push di perangkat ini"
            }
          >
            {loading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin sm:mr-1.5" />
            ) : (
              <Bell className="h-3.5 w-3.5 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">Izinkan Notifikasi</span>
            <span className="sm:hidden">Izinkan Notif</span>
          </Button>
        )}
      </div>

      <BlockedGuideDialog
        isOpen={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
      />
      <IosGuideDialog isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/**
 * Clean User Profile Dropdown Item for Push Notifications
 */
export function PushNotificationMenuItem({ userId }: { userId?: string } = {}) {
  const {
    isSubscribed,
    permission,
    loading,
    testing,
    showIosGuide,
    setShowIosGuide,
    showBlockedDialog,
    setShowBlockedDialog,
    subscribe,
    sendTestNotification,
    toast,
    setToast,
  } = usePushNotifications(userId);

  const isBlocked = permission === "denied";

  const handleClick = () => {
    if (isBlocked) {
      setShowBlockedDialog(true);
    } else if (isSubscribed) {
      sendTestNotification();
    } else {
      subscribe();
    }
  };

  return (
    <>
      <div
        className="px-2 py-1.5 flex items-center justify-between gap-2 text-xs hover:bg-secondary/60 rounded-lg cursor-pointer transition-colors"
        onClick={handleClick}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Bell className="h-4 w-4 text-blue-500 shrink-0" />
          <span className="font-medium text-foreground truncate">Notifikasi</span>
        </div>
        {isBlocked ? (
          <span className="text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold shrink-0">
            <BellOff className="h-2.5 w-2.5" />
            Diblokir
          </span>
        ) : isSubscribed ? (
          <span
            className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1.5 font-semibold shrink-0"
            title="Klik untuk tes notifikasi push"
          >
            {testing ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
            )}
            Notifikasi Aktif
          </span>
        ) : (
          <span className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 font-semibold shrink-0">
            {loading ? (
              <Loader2 className="h-2.5 w-2.5 animate-spin" />
            ) : (
              <Bell className="h-2.5 w-2.5" />
            )}
            Izinkan Notifikasi
          </span>
        )}
      </div>

      <BlockedGuideDialog
        isOpen={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
      />
      <IosGuideDialog isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </>
  );
}

/**
 * Dedicated Card component for Profile Settings
 */
export function PushNotificationProfileCard() {
  const {
    isSubscribed,
    permission,
    loading,
    testing,
    isIos,
    isStandalone,
    showIosGuide,
    setShowIosGuide,
    showBlockedDialog,
    setShowBlockedDialog,
    subscribe,
    unsubscribe,
    sendTestNotification,
    toast,
    setToast,
  } = usePushNotifications();

  const isBlocked = permission === "denied";

  return (
    <Card className="rounded-2xl border-border/80 shadow-sm overflow-hidden">
      <CardHeader className="pb-3 border-b border-border/50 bg-secondary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Bell className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground">
                Web Push Notifications
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground">
                Terima pemberitahuan instan di perangkat Anda untuk delegasi task, preview, dan persetujuan.
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={isBlocked ? "destructive" : isSubscribed ? "purple" : "secondary"}
            className="text-xs font-semibold"
          >
            {isBlocked
              ? "Diblokir Browser"
              : isSubscribed
              ? "Notifikasi Aktif"
              : "Belum Aktif"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4 text-xs">
        {isBlocked && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-800 dark:text-rose-300">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
              Notifikasi Diblokir oleh Browser
            </p>
            <p className="text-[11px] leading-relaxed">
              Izin notifikasi dinonaktifkan di pengaturan browser Anda. Untuk mengaktifkannya, klik ikon gembok atau setelan situs pada bilah alamat browser, ubah izin Notifikasi ke &quot;Izinkan&quot;, lalu muat ulang halaman.
            </p>
          </div>
        )}

        {isIos && !isStandalone && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-800 dark:text-amber-300">
            <p className="font-semibold flex items-center gap-1.5 mb-1">
              <Share className="h-3.5 w-3.5 text-amber-600" />
              Untuk Pengguna iPhone / iPad:
            </p>
            <p className="text-[11px] leading-relaxed">
              Ketuk ikon <strong>Share</strong> di Safari lalu pilih <strong>&apos;Add to Home Screen&apos;</strong> terlebih dahulu untuk mengaktifkan notifikasi.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
            <p className="text-[11px] text-muted-foreground">Status Push</p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              {isBlocked
                ? "Diblokir"
                : isSubscribed
                ? "Aktif di Perangkat Ini"
                : "Belum Diaktifkan"}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
            <p className="text-[11px] text-muted-foreground">Izin Browser</p>
            <p className="text-xs font-bold text-foreground mt-0.5 capitalize">
              {permission}
            </p>
          </div>
          <div className="p-3 rounded-xl bg-secondary/40 border border-border/60">
            <p className="text-[11px] text-muted-foreground">Mode Tampilan</p>
            <p className="text-xs font-bold text-foreground mt-0.5">
              {isStandalone ? "Standalone (PWA)" : "Browser Tab"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-2">
          {isBlocked ? (
            <Button
              onClick={() => setShowBlockedDialog(true)}
              variant="outline"
              className="rounded-xl px-4 text-xs font-semibold border-rose-500/30 text-rose-600 hover:bg-rose-500/10"
            >
              <BellOff className="h-3.5 w-3.5 mr-1.5" />
              Notifikasi Diblokir (Panduan)
            </Button>
          ) : !isSubscribed ? (
            <Button
              onClick={subscribe}
              disabled={loading}
              className="rounded-xl px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <BellRing className="h-3.5 w-3.5 mr-1.5" />
              )}
              Izinkan Notifikasi
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={sendTestNotification}
                disabled={testing}
                className="rounded-xl px-4 text-xs font-semibold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                ) : (
                  <Send className="h-3.5 w-3.5 mr-1.5" />
                )}
                Kirim Notifikasi Pengujian
              </Button>
              <Button
                variant="ghost"
                onClick={unsubscribe}
                disabled={loading}
                className="rounded-xl px-4 text-xs text-rose-500 hover:bg-rose-500/10"
              >
                <BellOff className="h-3.5 w-3.5 mr-1.5" />
                Nonaktifkan di Perangkat Ini
              </Button>
            </>
          )}

          {isIos && !isStandalone && (
            <Button
              variant="outline"
              onClick={() => setShowIosGuide(true)}
              className="rounded-xl px-3 text-xs"
            >
              Panduan iPhone
            </Button>
          )}
        </div>
      </CardContent>

      <BlockedGuideDialog
        isOpen={showBlockedDialog}
        onClose={() => setShowBlockedDialog(false)}
      />
      <IosGuideDialog isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />
      <ToastBanner toast={toast} onClose={() => setToast(null)} />
    </Card>
  );
}
