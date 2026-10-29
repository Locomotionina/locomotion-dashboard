"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { completeOnboardingAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Clock,
  ShieldCheck,
  FolderKanban,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  X,
  Flame,
  Zap,
  CheckSquare,
  Lock,
} from "lucide-react";

interface OnboardingModalProps {
  isOpenInitially: boolean;
  userName: string;
}

interface OnboardingSlide {
  tag: string;
  tagColor: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";
  title: string;
  subtitle: string;
  description: string;
  highlights: { icon: any; title: string; desc: string }[];
  imageSrc: string;
  imageAlt: string;
}

export function OnboardingModal({ isOpenInitially, userName }: OnboardingModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMandatory, setIsMandatory] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpenInitially) {
      setIsOpen(true);
      setIsMandatory(true);
    }

    const handleOpenCustom = () => {
      setIsOpen(true);
      setIsMandatory(false);
      setCurrentSlide(0);
    };

    window.addEventListener("open-onboarding", handleOpenCustom);
    return () => window.removeEventListener("open-onboarding", handleOpenCustom);
  }, [isOpenInitially]);

  const slides: OnboardingSlide[] = [
    {
      tag: "Pengenalan Awal",
      tagColor: "blue",
      title: "Selamat Datang di Locomotion Dashboard",
      subtitle: `Halo ${userName}! Platform kerja internal terpadu agensi kita.`,
      description:
        "Sistem ini dirancang untuk memastikan seluruh alur kerja proyek, penugasan kreatif, dan jam kerja tercatat rapi tanpa ada brief yang tenggelam di grup chat.",
      highlights: [
        {
          icon: ShieldCheck,
          title: "Akun Resmi Terintegrasi",
          desc: "Setiap anggota tim memiliki hak akses sesuai peran dan departemen.",
        },
        {
          icon: Zap,
          title: "Semua Terpusat",
          desc: "Tugas harian, brief, aset proyek, hingga review tersimpan di satu sistem.",
        },
      ],
      imageSrc: "/screenshots/01_login.png",
      imageAlt: "Halaman Login",
    },
    {
      tag: "Workspace Harian",
      tagColor: "indigo" as any,
      title: "Meja Kerja Personal Staf (/dashboard)",
      subtitle: "Fokus pada apa yang perlu Anda selesaikan hari ini.",
      description:
        "Di halaman dashboard personal, Anda dapat melihat seluruh kartu penugasan dengan tahapan alur kerja yang jelas dan transparan.",
      highlights: [
        {
          icon: CheckSquare,
          title: "4 Status Alur Kerja",
          desc: "To Do → On Progress → In Review → Done.",
        },
        {
          icon: Flame,
          title: "Prioritas & Tenggat Waktu",
          desc: "Ketahui tugas yang mendesak (Urgent/High) dan batas akhir deadline.",
        },
      ],
      imageSrc: "/screenshots/02_dashboard_tasks.png",
      imageAlt: "Dashboard Workspace Staf",
    },
    {
      tag: "Pencatatan Presisi",
      tagColor: "emerald",
      title: "Live Timer & Telemetri Revisi",
      subtitle: "Bukan untuk memata-matai, melainkan menghargai jam kerja Anda.",
      description:
        "Gunakan Stopwatch Timer terintegrasi saat mulai mengeksekusi tugas. Waktu revisi tercatat terpisah untuk membuktikan effort Anda kepada manajemen dan klien.",
      highlights: [
        {
          icon: Clock,
          title: "Start & Pause Fleksibel",
          desc: "Mulai timer saat fokus di software, jeda saat istirahat makan siang.",
        },
        {
          icon: ShieldCheck,
          title: "Perlindungan Revisi (Round 1, 2...)",
          desc: "Waktu revisi dipisah dari durasi awal agar revisi berlebih dari klien terdokumentasi.",
        },
      ],
      imageSrc: "/screenshots/02_dashboard_tasks.png",
      imageAlt: "Live Stopwatch Timer",
    },
    {
      tag: "Hub Aset Terpusat",
      tagColor: "purple",
      title: "Katalog Proyek & PIC Roster (/projects)",
      subtitle: "Tak perlu lagi bolak-balik bertanya link di grup chat.",
      description:
        "Temukan seluruh dokumen resmi proyek mulai dari Pitch Deck, Creative Deck, Preview Link, hingga Final Assets di satu tempat.",
      highlights: [
        {
          icon: FolderKanban,
          title: "Akses Cepat Dokumen Brief",
          desc: "Semua link Google Drive / Figma / Deck terarsip rapi per proyek.",
        },
        {
          icon: Zap,
          title: "Automated PIC Roster",
          desc: "Ketahui siapa penanggung jawab divisi lain (desain, video, copy) di proyek tersebut.",
        },
      ],
      imageSrc: "/screenshots/05_project_detail.png",
      imageAlt: "Detail Proyek & Deliverables",
    },
    {
      tag: "Transparansi Kapasitas",
      tagColor: "rose",
      title: "Management Workload Radar (/management)",
      subtitle: "Mencegah burnout dengan distribusi tugas yang seimbang.",
      description:
        "Project Manager dan Lead memantau kapasitas tim secara real-time agar tidak ada anggota tim yang kelebihan beban tugas secara tidak adil.",
      highlights: [
        {
          icon: BarChart3,
          title: "3 Tingkat Kapasitas",
          desc: "Available (0-1 task), Optimal Flow (2-4 tasks), dan Overloaded (5+ tasks).",
        },
        {
          icon: ShieldCheck,
          title: "Perlindungan Beban Kerja",
          desc: "Jika status Anda Overloaded, PM akan menahan brief baru ke meja Anda.",
        },
      ],
      imageSrc: "/screenshots/03_management_radar.png",
      imageAlt: "Workload Radar",
    },
    {
      tag: "Komitmen Bersama",
      tagColor: "amber",
      title: "3 Kebiasaan Emas Harian (Golden Rules)",
      subtitle: "Hanya butuh 3 langkah sederhana setiap hari:",
      description:
        "Mari sepakati 3 kebiasaan harian ini agar kerja sama seluruh tim agensi tetap produktif, transparan, dan saling mendukung:",
      highlights: [
        {
          icon: CheckCircle2,
          title: "1. Pagi Hari (Jam Masuk)",
          desc: "Buka /dashboard, tinjau daftar tugas prioritas di kolom 'To Do'.",
        },
        {
          icon: Clock,
          title: "2. Saat Eksekusi",
          desc: "Klik Start Timer saat mulai kerja, lalu pindahkan ke 'In Review' beserta link draft.",
        },
        {
          icon: Lock,
          title: "3. Sore Hari (Jam Pulang)",
          desc: "Pastikan tidak ada timer tugas yang tertinggal berjalan semalaman.",
        },
      ],
      imageSrc: "/screenshots/06_profile.png",
      imageAlt: "Aturan Main Harian",
    },
  ];

  const current = slides[currentSlide];
  const isLastSlide = currentSlide === slides.length - 1;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await fetch("/api/auth/complete-onboarding", { method: "POST" });
      await completeOnboardingAction();
    } catch (err) {
      console.error("Gagal menyelesaikan onboarding:", err);
    } finally {
      setIsSubmitting(false);
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col bg-card border border-border/80 rounded-3xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header Bar */}
        <div className="px-6 py-4 border-b border-border/60 flex items-center justify-between bg-secondary/30">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-sm text-sm">
              L
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Panduan Sistem Agensi</p>
              <p className="text-[10px] text-muted-foreground">
                Langkah {currentSlide + 1} dari {slides.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Slide Progress Dots */}
            <div className="hidden sm:flex items-center gap-1.5">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentSlide
                      ? "w-6 bg-blue-600 dark:bg-blue-400"
                      : "w-2 bg-border hover:bg-muted-foreground/40"
                  }`}
                  title={`Ke Slide ${idx + 1}`}
                />
              ))}
            </div>

            {!isMandatory && (
              <button
                onClick={() => setIsOpen(false)}
                className="h-8 w-8 rounded-xl hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition"
                title="Tutup Panduan"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar (Visual Header) */}
        <div className="h-1 w-full bg-secondary">
          <div
            className="h-full bg-blue-600 dark:bg-blue-500 transition-all duration-300"
            style={{ width: `${((currentSlide + 1) / slides.length) * 100}%` }}
          />
        </div>

        {/* Slide Content Body */}
        <div className="p-6 sm:p-8 flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Narrative & Highlights */}
            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1.5">
                <Badge variant="cyan" className="text-[10px] uppercase font-bold tracking-wider">
                  {current.tag}
                </Badge>
                <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight leading-tight">
                  {current.title}
                </h2>
                <p className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {current.subtitle}
                </p>
              </div>

              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {current.description}
              </p>

              {/* Highlight Cards */}
              <div className="space-y-2.5 pt-1">
                {current.highlights.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-secondary/40 border border-border/50 flex items-start gap-3"
                    >
                      <div className="h-8 w-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-foreground">{h.title}</h4>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">
                          {h.desc}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right Column: Screenshot Visual Mockup */}
            <div className="lg:col-span-6">
              <div className="rounded-2xl border border-border/80 bg-secondary/20 p-2 shadow-xl overflow-hidden relative group">
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden border border-border/60 bg-background">
                  <img
                    src={current.imageSrc}
                    alt={current.imageAlt}
                    className="w-full h-full object-cover object-top transition duration-300 group-hover:scale-[1.02]"
                  />
                </div>
                <div className="text-center pt-2">
                  <span className="text-[10px] text-muted-foreground font-mono">
                    Pratinjau antarmuka: {current.imageAlt}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Navigation Bar */}
        <div className="px-6 py-4 border-t border-border/60 flex items-center justify-between bg-secondary/20">
          <Button
            size="sm"
            variant="outline"
            disabled={currentSlide === 0}
            onClick={handlePrev}
            className="text-xs h-9 rounded-xl gap-1.5"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Sebelumnya</span>
          </Button>

          <div className="flex items-center gap-2">
            {!isLastSlide ? (
              <Button
                size="sm"
                onClick={handleNext}
                className="text-xs h-9 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold gap-1.5 shadow-sm"
              >
                <span>Lanjut</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            ) : (
              <Button
                size="sm"
                disabled={isSubmitting}
                onClick={handleComplete}
                className="text-xs h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-600/20"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Saya Paham & Siap Mulai 🚀</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
