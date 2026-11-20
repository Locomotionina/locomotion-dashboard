import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const OUTPUT_DIR = path.join(process.cwd(), "public", "videos");
const FRAMES_DIR = path.join(process.cwd(), "public", "videos", "_frames");
const FINAL_MP4 = path.join(OUTPUT_DIR, "tutorial-locomotion.mp4");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
if (!fs.existsSync(FRAMES_DIR)) fs.mkdirSync(FRAMES_DIR, { recursive: true });

console.log("Generating Locomotion Dashboard Video Slides...");

const slides = [
  // 0. Intro Slide
  {
    id: 0,
    duration: 4,
    badge: "OFFICIAL STAFF GUIDE",
    badgeColor: "#38bdf8",
    title: "LOCOMOTION DASHBOARD",
    subtitle: "Tutorial & Panduan Lengkap Penggunaan Web",
    desc: "Panduan praktis workflow agensi: Sign up, Project Hub, Staff Workspace, Task Lifecycle, & Notifikasi Multidevice.",
    bullets: [
      { tag: "TARGET", text: "Khusus Rekan Tim & Spesialis Agensi Locomotion" },
      { tag: "DURASI", text: "6 Bagian Ringkas & Padat per Section Step" },
      { tag: "AKSES", text: "locomotiondashboardtracker.web.id" },
    ],
    footer: "Locomotion Agency Internal Knowledge Base • 2026",
  },

  // 1. Sign Up & Login
  {
    id: 1,
    duration: 6,
    badge: "SECTION 01",
    badgeColor: "#3b82f6",
    title: "1. Tutorial Sign Up & Log In Akun",
    subtitle: "Pendaftaran Akun Baru & Autentikasi Pengguna",
    desc: "Setiap anggota tim wajib memiliki akun personal untuk mencatat kapasitas kerja dan delegasi tugas.",
    bullets: [
      { tag: "LANGKAH 1", text: "Buka halaman pendaftaran di menu /register." },
      { tag: "LANGKAH 2", text: "Isi Nama Lengkap, Username unik, dan Password aman." },
      { tag: "LANGKAH 3", text: "Pilih Role / Divisi Spesialis Anda (Video Editor, Graphic Designer, Motion, Copywriter, 3D, Web, dll.)." },
      { tag: "LANGKAH 4", text: "Klik 'Daftar Akun', lalu login di /login dengan kredensial yang telah dibuat." },
    ],
    footer: "Tips: Simpan kredensial Anda dengan aman di password manager browser.",
  },

  // 2. Project & Brand Hub
  {
    id: 2,
    duration: 7,
    badge: "SECTION 02",
    badgeColor: "#06b6d4",
    title: "2. Pengenalan Project & Brand Hub",
    subtitle: "Monitoring Active Agency Engagements untuk Tier Staff",
    desc: "Halaman /projects merangkum seluruh proyek aktif agensi, client deliverables, dan timeline kerja.",
    bullets: [
      { tag: "HAK AKSES", text: "Tier Staff TIDAK perlu membuat project baru (Tombol 'New Project' khusus Management/Admin)." },
      { tag: "STATUS BRIEF", text: "Klik card project untuk membaca Brief Klien, Target Deadline, dan Goals kampanye." },
      { tag: "ASSETS LINK", text: "Akses link Pitch Deck, Creative Deck, dan Final Deliverables Folder langsung dari card." },
      { tag: "DISKUSI", text: "Buka detail proyek untuk melihat tim PIC bertugas dan berkirim pesan di chat proyek." },
    ],
    footer: "Staff fokus mengeksekusi task di dalam project yang ditugaskan.",
  },

  // 3. Staff Workspace
  {
    id: 3,
    duration: 7,
    badge: "SECTION 03",
    badgeColor: "#8b5cf6",
    title: "3. Dashboard Staff Workspace",
    subtitle: "Pusat Kendali Produktivitas Personal & Rekap Kerja",
    desc: "Halaman /dashboard adalah beranda utama tempat Anda mengelola seluruh tugas harian.",
    bullets: [
      { tag: "HEADER METRICS", text: "Ringkasan total: Task Aktif, To Do, On Progress, In Review, Revisi, Selesai, & Total Jam Kerja." },
      { tag: "TAB TASK AKTIF", text: "Daftar seluruh tugas yang sedang Anda kerjakan saat ini dengan prioritas warna." },
      { tag: "TAB ARSIP", text: "Histori seluruh tugas yang telah rampung lengkap dengan log durasi pengerjaan." },
      { tag: "TAB DELEGASI", text: "Pantau tugas yang Anda serahkan ke rekan tim spesialis lain beserta statusnya." },
    ],
    footer: "Gunakan filter status dan kategori untuk memprioritaskan tugas mendesak.",
  },

  // 4. Cara Membuat Task (Project & Workspace)
  {
    id: 4,
    duration: 8,
    badge: "SECTION 04 - PART 1",
    badgeColor: "#10b981",
    title: "4. Cara Membuat Task (Project & Workspace)",
    subtitle: "Metode Pembuatan Task di Dalam Project vs Workspace",
    desc: "Tugas dapat dibuat langsung dari halaman detail project atau dari dashboard utama staff.",
    bullets: [
      { tag: "METODE 1 (PROJECT)", text: "Buka /projects/[id] > Klik tombol '+ Add My Task for this Project' di atas PIC roster." },
      { tag: "AUTO LINKING", text: "Task otomatis terhubung ke proyek tersebut tanpa perlu memilih project secara manual." },
      { tag: "METODE 2 (WORKSPACE)", text: "Buka /dashboard > Klik tombol '+ Buat Task Baru' di header atas." },
      { tag: "PENGISIAN FORM", text: "Pilih Proyek (atau Non-Project), Judul Tugas, Tipe Output, Estimasi Jam, dan Tanggal Deadline." },
    ],
    footer: "Pastikan mengisi estimasi jam pengerjaan agar beban kerja terdistribusi seimbang.",
  },

  // 5. Cara Delegasi & Buat Folder
  {
    id: 5,
    duration: 8,
    badge: "SECTION 04 - PART 2",
    badgeColor: "#10b981",
    title: "4. Cara Delegasi Task & Membuat Folder",
    subtitle: "Kolaborasi Tim Lintas Divisi & Organisasi Workspace",
    desc: "Serahkan tugas spesialis ke rekan tim dan kelompokkan tugas dalam folder agar tertata rapi.",
    bullets: [
      { tag: "CARA DELEGASI", text: "Saat membuat task di /dashboard, ganti field 'Tugaskan Kepada' ke nama rekan tim yang dituju." },
      { tag: "NOTIFIKASI REKAN", text: "Rekan yang ditugaskan otomatis menerima notifikasi email & web push." },
      { tag: "BUAT FOLDER", text: "Di sidebar Folder /dashboard, klik tombol '+ Buat Folder Baru' dan beri nama folder." },
      { tag: "PENGELOMPOKAN", text: "Atur task ke dalam folder spesifik (misal: 'Revisi Brand A', 'Social Media Batch 1')." },
    ],
    footer: "Task yang didelegasikan tetap dapat Anda pantau progresnya di tab 'Deliver by Me'.",
  },

  // 6. Pengerjaan Task: Tombol Mulai & Jeda
  {
    id: 6,
    duration: 8,
    badge: "SECTION 05 - PART 1",
    badgeColor: "#f59e0b",
    title: "5. Pengerjaan Task: Tombol 'Mulai' & 'Jeda'",
    subtitle: "Manajemen Waktu Pengerjaan Real-time Akurat",
    desc: "Setiap jam kerja yang Anda alokasikan terekam otomatis demi transparansi kapasitas agensi.",
    bullets: [
      { tag: "WAJIB: KLIK MULAI", text: "Saat mulai bekerja, klik tombol hijau 'Mulai' pada card task. Timer detik live akan berjalan." },
      { tag: "AMBIL BREAK: JEDA", text: "Jika ingin istirahat, makan, atau ada meeting internal, klik tombol kuning 'Jeda'." },
      { tag: "LANJUTKAN TIMER", text: "Setelah selesai jeda, klik 'Lanjut'. Durasi kerja akan terakumulasi dari titik sebelumnya." },
      { tag: "ACTIVE PILL", text: "Indikator timer berjalan juga tampil di header navbar agar Anda selalu aware." },
    ],
    footer: "Jangan biarkan timer berjalan saat Anda meninggalkan meja kerja.",
  },

  // 7. Review Task: Link, Notifikasi Reviewer, Selesai
  {
    id: 7,
    duration: 9,
    badge: "SECTION 05 - PART 2",
    badgeColor: "#f59e0b",
    title: "5. Review Task: Link Deliverable & Selesai",
    subtitle: "Prosedur Pengajuan Review, Multi-Reviewer, & Tombol Selesai",
    desc: "Pastikan hasil kerja divalidasi oleh reviewer sebelum dinyatakan selesai secara resmi.",
    bullets: [
      { tag: "TARUH LINK TUGAS", text: "Buka card task > Masukkan link preview hasil kerja (Google Drive, Figma, Frame.io, YouTube)." },
      { tag: "WAJIB: BERITAHU", text: "Wajib klik tombol biru 'Beritahu Reviewer' agar reviewer mendapat notifikasi push instan." },
      { tag: "TAMBAH REVIEWER", text: "Anda dapat memilih lebih dari 1 reviewer rekan tim untuk cross-check hasil karya." },
      { tag: "TOMBOL SELESAI", text: "Setelah task di-approve dan disetujui, klik tombol 'Selesai' untuk memindahkan task ke arsip." },
    ],
    footer: "Fitur Task Chat tersedia di sisi kanan modal untuk diskusi revisi langsung.",
  },

  // 8. Notifikasi Laptop: Windows & Mac
  {
    id: 8,
    duration: 8,
    badge: "SECTION 06 - PART 1",
    badgeColor: "#ec4899",
    title: "6. Tutorial Menyalakan Notifikasi di Laptop",
    subtitle: "Setup Web Push di Browser Windows PC & macOS",
    desc: "Dapatkan pemberitahuan seketika saat ada task baru, revisi, atau pesan penting dari tim.",
    bullets: [
      { tag: "AKTIFKAN DI WEB", text: "Klik ikon Lonceng di Navbar atas atau buka /profile > Klik tombol 'Aktifkan Notifikasi'." },
      { tag: "IZIN BROWSER", text: "Saat Chrome/Edge memunculkan pop-up izin, pilih tombol 'Izinkan' (Allow)." },
      { tag: "WINDOWS SETUP", text: "Pastikan fitur 'Focus Assist / Do Not Disturb' di taskbar kanan bawah Windows tidak memblokir." },
      { tag: "MACOS SETUP", text: "Buka System Settings > Notifications > Google Chrome > Pastikan centang 'Allow Notifications'." },
    ],
    footer: "Gunakan tombol 'Kirim Tes Notifikasi' di halaman profil untuk memastikan push bekerja.",
  },

  // 9. Notifikasi HP: iOS & Android
  {
    id: 9,
    duration: 8,
    badge: "SECTION 06 - PART 2",
    badgeColor: "#ec4899",
    title: "6. Tutorial Menyalakan Notifikasi di Smartphone",
    subtitle: "PWA Install & Push Notifications di HP Android & iPhone",
    desc: "Pantau pekerjaan di mana saja langsung dari layar utama smartphone Anda.",
    bullets: [
      { tag: "ANDROID (CHROME)", text: "Buka Chrome > Buka web > Tekan Titik Tiga (⋮) > 'Tambahkan ke Layar Utama / Instal Aplikasi'." },
      { tag: "NOTIF ANDROID", text: "Buka app Locomotion dari beranda > Masuk Profil > Klik 'Aktifkan Notifikasi' > Pilih 'Izinkan'." },
      { tag: "IOS / IPHONE", text: "Wajib gunakan Safari (iOS 16.4+) > Tekan tombol Share (kotak panah atas) > 'Add to Home Screen'." },
      { tag: "NOTIF IPHONE", text: "Buka app dari Home Screen iPhone > Login > Masuk Profil > Klik 'Aktifkan Notifikasi'." },
    ],
    footer: "Pastikan izin notifikasi di Pengaturan HP untuk aplikasi browser sudah aktif (ON).",
  },

  // 10. Outro Slide
  {
    id: 10,
    duration: 5,
    badge: "SIAP BEKERJA!",
    badgeColor: "#38bdf8",
    title: "SELAMAT BERKARYA BERSAMA LOCOMOTION",
    subtitle: "Digital Agency Workload & Project Management Hub",
    desc: "Aplikasi internal dirancang untuk memaksimalkan kolaborasi, efisiensi waktu, dan transparansi tim.",
    bullets: [
      { tag: "WEBSITE", text: "https://www.locomotiondashboardtracker.web.id" },
      { tag: "BANTUAN", text: "Hubungi tim Management jika ada kendala akun atau peran divisi." },
      { tag: "DOWNLOAD", text: "Simpan video tutorial ini sebagai referensi onboarding tim agensi." },
    ],
    footer: "Locomotion Agency • All Rights Reserved",
  },
];

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case "<": return "&lt;";
      case ">": return "&gt;";
      case "&": return "&amp;";
      case "'": return "&apos;";
      case '"': return "&quot;";
    }
  });
}

// Generate SVG for each slide
for (const s of slides) {
  const bulletsHtml = s.bullets
    .map((b, idx) => {
      const yPos = 490 + idx * 85;
      return `
      <g transform="translate(180, ${yPos})">
        <rect width="180" height="42" rx="8" fill="#1e293b" stroke="#334155" stroke-width="1.5"/>
        <text x="90" y="27" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" font-weight="bold" fill="${s.badgeColor}" text-anchor="middle">${escapeXml(b.tag)}</text>
        <text x="210" y="28" font-family="DejaVu Sans, Arial, sans-serif" font-size="22" fill="#f1f5f9">${escapeXml(b.text)}</text>
      </g>
      `;
    })
    .join("\n");

  const svgContent = `
<svg width="1920" height="1080" viewBox="0 0 1920 1080" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0b0f19"/>
      <stop offset="50%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#020617"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${s.badgeColor}" stop-opacity="0.8"/>
      <stop offset="100%" stop-color="#6366f1" stop-opacity="0.8"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#000" flood-opacity="0.5"/>
    </filter>
  </defs>

  <!-- Deep Slate Background -->
  <rect width="1920" height="1080" fill="url(#bgGrad)"/>

  <!-- Subtle Grid Accent -->
  <line x1="0" y1="120" x2="1920" y2="120" stroke="#1e293b" stroke-width="1"/>
  <line x1="0" y1="960" x2="1920" y2="960" stroke="#1e293b" stroke-width="1"/>
  <circle cx="1750" cy="180" r="300" fill="${s.badgeColor}" opacity="0.04" filter="blur(50px)"/>
  <circle cx="200" cy="880" r="250" fill="#6366f1" opacity="0.04" filter="blur(50px)"/>

  <!-- Top Agency Header -->
  <g transform="translate(140, 60)">
    <rect width="36" height="36" rx="8" fill="${s.badgeColor}"/>
    <text x="18" y="25" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="bold" fill="#0f172a" text-anchor="middle">L</text>
    <text x="50" y="26" font-family="DejaVu Sans, Arial, sans-serif" font-size="20" font-weight="bold" fill="#f8fafc" letter-spacing="1">LOCOMOTION AGENCY</text>
    <text x="320" y="26" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" fill="#64748b">| Internal Workflow Onboarding Video</text>
  </g>

  <!-- Section Badge -->
  <g transform="translate(140, 170)">
    <rect width="240" height="40" rx="20" fill="#1e293b" stroke="${s.badgeColor}" stroke-width="1.5"/>
    <circle cx="24" cy="20" r="6" fill="${s.badgeColor}"/>
    <text x="40" y="26" font-family="DejaVu Sans, Arial, sans-serif" font-size="15" font-weight="bold" fill="${s.badgeColor}">${escapeXml(s.badge)}</text>
  </g>

  <!-- Main Card -->
  <g transform="translate(140, 235)" filter="url(#shadow)">
    <rect width="1640" height="680" rx="24" fill="#0f172a" fill-opacity="0.8" stroke="#1e293b" stroke-width="2"/>
    <rect x="0" y="0" width="1640" height="4" fill="url(#glowGrad)"/>

    <!-- Title & Subtitle -->
    <text x="40" y="70" font-family="DejaVu Sans, Arial, sans-serif" font-size="44" font-weight="bold" fill="#ffffff">${escapeXml(s.title)}</text>
    <text x="40" y="115" font-family="DejaVu Sans, Arial, sans-serif" font-size="24" font-weight="600" fill="${s.badgeColor}">${escapeXml(s.subtitle)}</text>
    <text x="40" y="160" font-family="DejaVu Sans, Arial, sans-serif" font-size="18" fill="#94a3b8">${escapeXml(s.desc)}</text>

    <!-- Divider Line -->
    <line x1="40" y1="195" x2="1600" y2="195" stroke="#1e293b" stroke-width="1.5"/>
  </g>

  <!-- Bullet Items -->
  ${bulletsHtml}

  <!-- Footer Bar -->
  <g transform="translate(140, 995)">
    <text x="0" y="0" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" fill="#64748b">${escapeXml(s.footer)}</text>
    <text x="1640" y="0" font-family="DejaVu Sans, Arial, sans-serif" font-size="16" fill="#64748b" text-anchor="end">Slide ${s.id + 1} of ${slides.length}</text>
  </g>
</svg>
`;

  const svgPath = path.join(FRAMES_DIR, `slide_${String(s.id).padStart(2, "0")}.svg`);
  const pngPath = path.join(FRAMES_DIR, `slide_${String(s.id).padStart(2, "0")}.png`);

  fs.writeFileSync(svgPath, svgContent);
  execSync(`convert -density 150 "${svgPath}" "${pngPath}"`);
  console.log(`Rendered frame ${s.id}: ${pngPath}`);
}

// Generate concat demuxer text file for ffmpeg
let concatContent = "";
for (const s of slides) {
  const pngPath = path.join(FRAMES_DIR, `slide_${String(s.id).padStart(2, "0")}.png`);
  concatContent += `file '${pngPath}'\nduration ${s.duration}\n`;
}
// Repeat last frame for ffmpeg concat demuxer requirement
const lastPng = path.join(FRAMES_DIR, `slide_${String(slides.length - 1).padStart(2, "0")}.png`);
concatContent += `file '${lastPng}'\n`;

const concatFile = path.join(FRAMES_DIR, "concat.txt");
fs.writeFileSync(concatFile, concatContent);

console.log("Stitching video with ffmpeg at 1080p60...");
// ffmpeg command with 1080p, silent stereo audio track, H.264 video, faststart for streaming
const totalSeconds = slides.reduce((acc, s) => acc + s.duration, 0);

const ffmpegCmd = [
  "ffmpeg -y",
  `-f concat -safe 0 -i "${concatFile}"`,
  `-f lavfi -i anullsrc=r=44100:cl=stereo -t ${totalSeconds}`,
  `-vf "scale=1920:1080"`,
  "-c:v libx264 -pix_fmt yuv420p -r 30",
  "-c:a aac -b:a 128k",
  "-movflags +faststart",
  `"${FINAL_MP4}"`
].join(" ");

execSync(ffmpegCmd);

const stats = fs.statSync(FINAL_MP4);
console.log(`✅ SUCCESS: Video generated at ${FINAL_MP4} (Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB, Duration: ~${totalSeconds}s)`);
