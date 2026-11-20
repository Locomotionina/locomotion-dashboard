"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Play,
  Pause,
  Download,
  CheckCircle2,
  Clock,
  FolderKanban,
  CheckSquare,
  Users,
  Bell,
  Smartphone,
  Laptop,
  ArrowRight,
  ShieldAlert,
  PlayCircle,
  FolderPlus,
  Send,
  Eye,
  Sparkles,
  ChevronRight,
  HelpCircle,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface VideoChapter {
  id: string;
  time: number; // in seconds
  label: string;
  section: string;
  badge: string;
}

const CHAPTERS: VideoChapter[] = [
  { id: "intro", time: 0, label: "Pengenalan Agensi", section: "Intro", badge: "00:00" },
  { id: "sec1", time: 4, label: "Sign Up & Login Akun", section: "Section 1", badge: "00:04" },
  { id: "sec2", time: 10, label: "Project & Brand Hub (Tier Staff)", section: "Section 2", badge: "00:10" },
  { id: "sec3", time: 17, label: "Dashboard Staff Workspace", section: "Section 3", badge: "00:17" },
  { id: "sec4a", time: 24, label: "Cara Buat Task di Project & Workspace", section: "Section 4.1", badge: "00:24" },
  { id: "sec4b", time: 32, label: "Delegasi Task & Buat Folder", section: "Section 4.2", badge: "00:32" },
  { id: "sec5a", time: 40, label: "Pengerjaan Task: Tombol Mulai & Jeda", section: "Section 5.1", badge: "00:40" },
  { id: "sec5b", time: 48, label: "Review Deliverable, Reviewer & Selesai", section: "Section 5.2", badge: "00:48" },
  { id: "sec6a", time: 57, label: "Notifikasi di Laptop (Windows & Mac)", section: "Section 6.1", badge: "00:57" },
  { id: "sec6b", time: 65, label: "Notifikasi di HP (Android & iOS)", section: "Section 6.2", badge: "01:05" },
];

export default function TutorialPage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState<string>("all");

  const handleSeek = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seconds;
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTogglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 space-y-10 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <Badge variant="outline" className="border-sky-500/30 text-sky-400 bg-sky-500/10 gap-1.5 px-2.5 py-0.5">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Onboarding & Tutorial Hub
            </Badge>
            <span className="text-xs text-muted-foreground">Version 2.0</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-2 text-foreground">
            Video Tutorial & Panduan Penggunaan Web
          </h1>
          <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
            Panduan lengkap langkah demi langkah bagi seluruh anggota tim agensi Locomotion. Tonton video per-chapter atau baca dokumentasi interaktif di bawah.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <a
            href="/videos/tutorial-locomotion.mp4"
            download="tutorial-locomotion-agency.mp4"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download Video Asset (.mp4)
          </a>
        </div>
      </div>

      {/* Main Video Player Card */}
      <Card className="overflow-hidden border-border/60 bg-slate-950/70 shadow-2xl backdrop-blur">
        <CardHeader className="bg-slate-900/60 border-b border-border/40 py-3.5 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-rose-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-xs font-medium text-slate-400 ml-2">Locomotion Video Player • 1080p HD</span>
            </div>
            <div className="text-xs font-mono text-slate-400">
              Durasi Total: 01:18 (10 Slide Section)
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative aspect-video w-full bg-black group">
            <video
              ref={videoRef}
              src="/videos/tutorial-locomotion.mp4"
              controls
              playsInline
              className="w-full h-full object-contain"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          </div>

          {/* Quick Chapter Selector Bar */}
          <div className="p-4 sm:p-5 bg-slate-900/40 border-t border-border/40">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <PlayCircle className="w-4 h-4 text-sky-400" />
                Lompat ke Chapter / Bagian Tertentu:
              </span>
              <span className="text-[11px] text-muted-foreground hidden sm:inline">
                Klik tombol untuk memutar langsung pada detik yang dipilih
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              {CHAPTERS.map((ch) => {
                const isActive = currentTime >= ch.time && currentTime < ch.time + 8;
                return (
                  <button
                    key={ch.id}
                    onClick={() => handleSeek(ch.time)}
                    className={`flex flex-col text-left p-2.5 rounded-xl border text-xs transition ${
                      isActive
                        ? "bg-sky-500/15 border-sky-500/50 text-sky-300"
                        : "bg-slate-800/40 border-border/40 hover:bg-slate-800 text-slate-300 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full mb-1">
                      <span className="text-[10px] font-mono text-muted-foreground">{ch.badge}</span>
                      <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-950/60 font-semibold text-slate-400">
                        {ch.section}
                      </span>
                    </div>
                    <span className="font-semibold line-clamp-1">{ch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Structured Written Guides per Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              Dokumentasi Lengkap 6 Bagian Tutorial
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Rangkuman praktis alur kerja harian untuk dibagikan ke rekan tim baru atau referensi cepat.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Section 1 */}
          <Card className="border-border/60 bg-card hover:border-sky-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-sky-500/10 text-sky-400 border-sky-500/20 font-bold">SECTION 01</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(4)} className="h-7 text-xs gap-1 text-sky-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:04)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                1. Tutorial Sign Up Hingga Log In Akun
              </CardTitle>
              <CardDescription className="text-xs">
                Membuat akun personal untuk melacak kapasitas kerja tim
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">1</div>
                <div>
                  <strong className="text-foreground">Pendaftaran:</strong> Buka halaman <Link href="/register" className="text-sky-400 underline">/register</Link>, masukkan Nama Lengkap, Username unik, dan Password aman.
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">2</div>
                <div>
                  <strong className="text-foreground">Pilih Divisi / Spesialisasi:</strong> Pilih peran Anda (Video Editor, Motion Designer, Graphic Designer, Copywriter, 3D Artist, Web Dev, dll.).
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">3</div>
                <div>
                  <strong className="text-foreground">Login Akun:</strong> Masuk ke <Link href="/login" className="text-sky-400 underline">/login</Link> dengan username & password Anda untuk langsung menuju dashboard.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 2 */}
          <Card className="border-border/60 bg-card hover:border-cyan-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 font-bold">SECTION 02</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(10)} className="h-7 text-xs gap-1 text-cyan-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:10)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                2. Project & Brand Hub (Tier Staff)
              </CardTitle>
              <CardDescription className="text-xs">
                Monitoring active engagement tanpa perlu membuat project
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
                <strong>Catatan Penting Hak Akses:</strong> Tombol <em>&ldquo;New Project&rdquo;</em> hanya diperuntukkan bagi <strong>Tier Management / Admin</strong>. Tier Staff tidak perlu membuat project baru.
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">•</div>
                <div>
                  <strong className="text-foreground">Cek Brief & Deliverable:</strong> Klik pada card project untuk membuka ringkasan Brief, Klien, Target Deadline, Pitch Deck URL, dan Assets Folder.
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">•</div>
                <div>
                  <strong className="text-foreground">Kolaborasi Tim:</strong> Buka halaman <Link href="/projects" className="text-cyan-400 underline">/projects</Link> untuk melihat daftar PIC yang sedang bertugas dan obrolan di Project Chat.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 3 */}
          <Card className="border-border/60 bg-card hover:border-purple-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20 font-bold">SECTION 03</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(17)} className="h-7 text-xs gap-1 text-purple-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:17)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                3. Dashboard Staff Workspace
              </CardTitle>
              <CardDescription className="text-xs">
                Pusat manajemen seluruh tugas harian spesialis Anda
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">1</div>
                <div>
                  <strong className="text-foreground">Top Metrics Bar:</strong> Memantau hitungan task aktif, To Do, On Progress, In Review, Revisi, hingga total jam kerja Anda.
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">2</div>
                <div>
                  <strong className="text-foreground">Tab Task Aktif & Arsip:</strong> Pindah tab dengan mudah antara tugas yang perlu dikerjakan dan riwayat tugas yang sudah selesai (*Done*).
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">3</div>
                <div>
                  <strong className="text-foreground">Tab Delegasi & Review:</strong> Melacak task yang Anda limpahkan ke rekan lain serta task rekan yang meminta Anda sebagai reviewer.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 4 */}
          <Card className="border-border/60 bg-card hover:border-emerald-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 font-bold">SECTION 04</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(24)} className="h-7 text-xs gap-1 text-emerald-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:24)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                4. Cara Membuat Task, Delegasi & Folder
              </CardTitle>
              <CardDescription className="text-xs">
                4 alur pembuatan tugas sesuai kebutuhan alokasi kerja
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5 text-xs text-muted-foreground">
              <div className="p-2 rounded bg-slate-900/50 border border-border/40">
                <strong className="text-emerald-400 font-semibold">A. Di Dalam Project:</strong> Buka <code>/projects/[id]</code>, klik tombol <em>&ldquo;+ Add My Task for this Project&rdquo;</em> di atas roster PIC. Project otomatis ter-link.
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-border/40">
                <strong className="text-emerald-400 font-semibold">B. Di Staff Workspace:</strong> Buka <code>/dashboard</code>, klik tombol <em>&ldquo;+ Buat Task Baru&rdquo;</em>. Pilih Project (atau Non-Project), Judul, Output, Estimasi Jam, dan Deadline.
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-border/40">
                <strong className="text-emerald-400 font-semibold">C. Delegasi ke Rekan Tim:</strong> Pada form buat task, ganti kolom <em>&ldquo;Tugaskan Kepada&rdquo;</em> ke rekan spesialis lain. Task akan masuk ke tab Delegasi Anda dan rekan menerima notifikasi.
              </div>
              <div className="p-2 rounded bg-slate-900/50 border border-border/40">
                <strong className="text-emerald-400 font-semibold">D. Membuat Folder Task:</strong> Klik tombol <em>&ldquo;+ Buat Folder Baru&rdquo;</em> di panel folder dashboard untuk mengelompokkan task harian Anda.
              </div>
            </CardContent>
          </Card>

          {/* Section 5 */}
          <Card className="border-border/60 bg-card hover:border-amber-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 font-bold">SECTION 05</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(40)} className="h-7 text-xs gap-1 text-amber-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:40)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                5. Tutorial Pengerjaan Task, Review & Selesai
              </CardTitle>
              <CardDescription className="text-xs">
                Timer presisi, alur review deliverable, dan arsip tugas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center shrink-0 text-[10px]">▶</div>
                <div>
                  <strong className="text-foreground">Wajib Tombol &ldquo;Mulai&rdquo; & &ldquo;Jeda&rdquo;:</strong> Saat mulai bekerja, wajib klik <strong>Mulai</strong> agar durasi jam terekam. Saat istirahat, klik <strong>Jeda</strong> (bisa dilanjutkan kembali kapan saja).
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 font-bold flex items-center justify-center shrink-0 text-[10px]">🔗</div>
                <div>
                  <strong className="text-foreground">Review Deliverable:</strong> Taruh link tugas (Google Drive / Figma / YouTube / Frame.io) di kolom deliverable.
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center shrink-0 text-[10px]">🔔</div>
                <div>
                  <strong className="text-foreground">Wajib Klik &ldquo;Beritahu Reviewer&rdquo;:</strong> Tekan tombol ini agar reviewer menerima push notifikasi instan. Anda juga bisa menambahkan <strong>lebih dari 1 reviewer</strong> (Multi-Reviewer).
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="w-5 h-5 rounded-full bg-slate-800 text-slate-200 font-bold flex items-center justify-center shrink-0 text-[10px]">✔</div>
                <div>
                  <strong className="text-foreground">Tombol &ldquo;Selesai&rdquo;:</strong> Ketika hasil sudah disetujui (Approved) atau tuntas, tekan <strong>Selesai</strong> untuk mengarsipkan task.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Section 6 */}
          <Card className="border-border/60 bg-card hover:border-pink-500/40 transition">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <Badge className="bg-pink-500/10 text-pink-400 border-pink-500/20 font-bold">SECTION 06</Badge>
                <Button variant="ghost" size="sm" onClick={() => handleSeek(57)} className="h-7 text-xs gap-1 text-pink-400">
                  <Play className="w-3 h-3 fill-current" /> Putar Video (00:57)
                </Button>
              </div>
              <CardTitle className="text-base font-bold text-foreground mt-1">
                6. Tutorial Menyalakan Notifikasi Multi-Device
              </CardTitle>
              <CardDescription className="text-xs">
                Setup notifikasi instan di Laptop dan Smartphone
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs text-muted-foreground">
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border/40">
                <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                  <Laptop className="w-4 h-4 text-pink-400" />
                  Laptop (Windows & macOS):
                </div>
                <p>Klik tombol Lonceng di navbar atau buka <Link href="/profile" className="text-pink-400 underline">/profile</Link> &gt; Klik <em>&ldquo;Aktifkan Notifikasi&rdquo;</em> &gt; Klik <strong>Izinkan (Allow)</strong> pada dialog browser. Pastikan <em>Focus Assist (Do Not Disturb)</em> di laptop dalam keadaan mati.</p>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-border/40">
                <div className="flex items-center gap-2 text-foreground font-semibold mb-1">
                  <Smartphone className="w-4 h-4 text-pink-400" />
                  Smartphone (Android & iOS):
                </div>
                <p><strong>Android:</strong> Buka Chrome &gt; Titik tiga (⋮) &gt; <em>Tambahkan ke Layar Utama</em> &gt; Buka app dari beranda &gt; Buka Profil &gt; Aktifkan Notifikasi.</p>
                <p className="mt-1"><strong>iOS (iPhone):</strong> Wajib buka via <strong>Safari</strong> &gt; Tekan tombol Share (kotak panah atas) &gt; <em>Add to Home Screen</em> &gt; Buka app Locomotion di beranda &gt; Buka Profil &gt; Aktifkan Notifikasi.</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Call to Action Card */}
      <Card className="border-border/60 bg-gradient-to-r from-blue-900/30 via-indigo-900/20 to-slate-900/40 p-6 sm:p-8 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div className="space-y-1">
            <h3 className="text-lg sm:text-xl font-bold text-foreground">
              Siap Memulai Hari Kerja Anda?
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-xl">
              Kembali ke dashboard workspace Anda untuk memeriksa task aktif atau berkoordinasi dengan rekan agensi Anda.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition shadow-md"
            >
              <CheckSquare className="w-4 h-4" />
              Buka Staff Workspace
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
