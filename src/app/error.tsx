"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center mb-6 shadow-sm border border-destructive/20">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2">
        Terjadi Kesalahan Sistem
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base leading-relaxed">
        Sistem mengalami kendala saat memuat halaman ini. Silakan coba muat ulang atau kembali ke halaman utama.
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => reset()} variant="outline" className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Coba Lagi
        </Button>
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
