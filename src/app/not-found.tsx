import Link from "next/link";
import { FileQuestion, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4 py-12">
      <div className="w-16 h-16 rounded-2xl bg-muted/80 flex items-center justify-center mb-6 text-muted-foreground shadow-sm border border-border/50">
        <FileQuestion className="w-8 h-8 text-blue-600 dark:text-blue-400" />
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl mb-2">
        404 - Halaman Tidak Ditemukan
      </h1>
      <p className="text-muted-foreground max-w-md mb-8 text-sm sm:text-base leading-relaxed">
        Halaman atau rute yang Anda tuju tidak ditemukan atau telah dipindahkan.
      </p>
      <div className="flex items-center gap-3">
        <Link href="/">
          <Button className="gap-2">
            <Home className="w-4 h-4" />
            Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
