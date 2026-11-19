"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  Download,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChatImageLightboxProps {
  src: string | null;
  alt?: string;
  onClose: () => void;
}

export function ChatImageLightbox({
  src,
  alt = "Pratinjau gambar",
  onClose,
}: ChatImageLightboxProps) {
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (!src) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    // Prevent background scrolling while lightbox is active
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [src, onClose]);

  if (!src) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Top Floating Controls */}
      <div
        className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-zinc-900/80 p-1.5 px-3 rounded-2xl border border-white/10 shadow-2xl backdrop-blur-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Zoom In/Out Toggle */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setIsZoomed((prev) => !prev)}
          className="h-8 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl gap-1.5"
          title={isZoomed ? "Perkecil (1x)" : "Perbesar"}
        >
          {isZoomed ? (
            <ZoomOut className="h-4 w-4" />
          ) : (
            <ZoomIn className="h-4 w-4" />
          )}
          <span>{isZoomed ? "Reset" : "Zoom"}</span>
        </Button>

        {/* Buka / Download Button */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          asChild
          className="h-8 px-2.5 text-xs text-white/80 hover:text-white hover:bg-white/10 rounded-xl gap-1.5"
          title="Buka gambar di tab baru atau unduh"
        >
          <a href={src} target="_blank" rel="noopener noreferrer" download>
            <Download className="h-4 w-4" />
            <span>Buka / Unduh</span>
          </a>
        </Button>

        {/* Close Button */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={onClose}
          className="h-8 w-8 p-0 text-white/80 hover:text-white hover:bg-rose-500/20 hover:text-rose-400 rounded-xl"
          title="Tutup (Esc)"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Main Image Container */}
      <div
        className="relative max-w-[95vw] max-h-[92vh] flex items-center justify-center overflow-auto p-2"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          onClick={() => setIsZoomed((prev) => !prev)}
          className={`rounded-xl object-contain shadow-2xl transition-all duration-200 cursor-zoom-in ${
            isZoomed
              ? "max-w-none scale-125 cursor-zoom-out"
              : "max-w-full max-h-[88vh]"
          }`}
        />
      </div>
    </div>
  );
}
