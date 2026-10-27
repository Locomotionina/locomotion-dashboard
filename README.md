# 🚀 Locomotion Dashboard

> **Modern Agency Management & Creative Task Orchestration Platform**  
> Built with Next.js 14 (App Router), TypeScript, Prisma ORM, Tailwind CSS, and Radix UI.

---

![Locomotion Dashboard Banner](public/banner_screen.webp)

## 📌 Overview

**Locomotion Dashboard** adalah sistem manajemen operasional internal yang dirancang khusus untuk agensi kreatif, media, dan produksi. Platform ini mengintegrasikan alur kerja proyek dari pitching hingga delivery akhir dengan sistem pelacakan waktu (live timer), telemetri revisi multi-round, sistem delegasi tugas, serta hierarki hak akses berjenjang (3-Tier Role Hierarchy).

---

## ✨ Fitur Utama

### 1. 👥 Hierarki & Manajemen Hak Akses (3-Tier RBAC)
- **Admin**:
  - Mengelola persetujuan pendaftaran user baru (*user approval flow*).
  - Mengatur peran (*role*), jabatan (*position*), dan departemen.
  - Memproses permintaan pembaruan profil dan reset kata sandi.
  - Menangguhkan (*suspend*) atau mengaktifkan kembali akun.
- **Management (CEO, Dewan Komisaris, Department Leads)**:
  - Monitoring seluruh alur kerja proyek & beban kerja staf lintas departemen.
  - Review hasil pekerjaan staf, menyetujui, atau meminta revisi (*feedback round*).
  - Evaluasi performa dan ringkasan rekapitulasi waktu kerja staf.
- **Staff (Creative, Project Management, BD, Admin)**:
  - Dashboard personal untuk memantau tugas harian (*To Do, On Progress, In Review, Revision, Done*).
  - Melakukan submit hasil tugas dengan catatan dan tautan pratinjau.
  - Mengajukan pembaruan avatar dan profil ke manajemen.

### 2. ⏱️ Live Task Timer & Revision Telemetry
- **Pelacakan Waktu Presisi**: Stopwatch terintegrasi untuk mencatat durasi pengerjaan awal (*initial hours*).
- **Revision Tracking**: Pencatatan durasi dan feedback per putaran revisi (*Round 1, Round 2, dst.*).
- **Status Alur Kerja Lengkap**:
  $$\text{To Do} \longrightarrow \text{On Progress} \longrightarrow \text{In Review} \longrightarrow \text{Revision / Done}$$
- **Telemetry Breakdown**: Visualisasi breakdown perbandingan waktu pengerjaan awal vs waktu revisi.

### 3. 📁 Manajemen Proyek & Deliverables Hub
- **Status & Prioritas Proyek**: Pitching, Active, In Review, Delivered, On Hold dengan prioritas Low hingga Urgent.
- **Deliverables Management**: Manajemen link aset terpusat (Pitch Deck, Creative Deck, Preview URL, Final Assets).
- **Automated PIC Roster**: Daftar penanggung jawab otomatis berdasarkan tugas aktif di dalam proyek.
- **Kalender Interaktif**: Range picker rentang waktu mulai hingga tenggat waktu (*deadline*).

### 4. 📊 Rekapitulasi & Ekspor Laporan
- Ringkasan jam kerja staf dan status deliverable per periode.
- Ekspor laporan kerja dan performa staf langsung ke format laporan terstruktur.

### 5. 🔍 Navigasi & Notifikasi
- **Global Search**: Pencarian instan untuk staf, nama proyek, dan judul tugas.
- **Notification Center**: Notifikasi real-time untuk penugasan baru, revisi, dan persetujuan.
- **Dark Mode Support**: Dukungan tema Gelap (Dark) dan Terang (Light) terintegrasi.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router & Server Actions)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database ORM**: [Prisma ORM](https://www.prisma.io/) (SQLite default, kompatibel dengan PostgreSQL / MySQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [Radix UI](https://www.radix-ui.com/) & [Lucide Icons](https://lucide.dev/)
- **Authentication**: Session-based Cookie Auth & Bcrypt.js

---

## 📂 Struktur Proyek

```text
locomotion-dashboard/
├── prisma/
│   ├── schema.prisma         # Skema database & relasi model
│   └── seed.ts               # Seeder akun eksekutif (CEO & Komisaris)
├── public/                   # Asset statis, logo, banner, dan folder uploads
│   └── uploads/              # Penyimpanan foto profil / avatar staf
├── scripts/
│   ├── seed-new-users.js     # Script seeding akun awal (Admin, Management, Staff)
│   ├── reset-users.js        # Script reset database user
│   └── test-flow.ts          # Script testing otomasi alur kerja
├── src/
│   ├── actions/              # Next.js Server Actions (Auth, Tasks, Projects, etc.)
│   ├── app/                  # Next.js App Router (Dashboard, Management, Projects, Admin)
│   ├── components/           # Reusable UI & Layout Components
│   └── lib/                  # Utilities, Prisma Client instance, Auth helper
├── .env.example              # Template konfigurasi environment
├── next.config.mjs           # Konfigurasi Next.js
├── tailwind.config.ts        # Konfigurasi Tailwind CSS
└── package.json              # Daftar dependencies & npm scripts
```

---

## 🚀 Panduan Memulai (Getting Started)

### 1. Prasyarat
Pastikan komputer / server Anda telah terinstall:
- **Node.js** v18.17.0 atau lebih baru
- **npm**, **pnpm**, atau **yarn**
- **Git**

### 2. Kloning Repositori
```bash
git clone git@github.com:keliksa30/locomotion-dashboard.git
cd locomotion-dashboard
```

### 3. Install Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```
Secara default, aplikasi menggunakan SQLite lokal:
```env
DATABASE_URL="file:./dev.db"
```

### 5. Setup Database & Seeding
Jalankan migrasi database dan generate Prisma client:
```bash
npx prisma db push
```

Jalankan script seed untuk membuat data akun awal:
```bash
# Seed akun Admin, Management, dan Staff percontohan:
node scripts/seed-new-users.js

# (Opsional) Seed akun eksekutif Komisaris & CEO:
npx tsx prisma/seed.ts
```

### 6. Jalankan Server Development
```bash
npm run dev
```
Buka browser dan akses [http://localhost:3000](http://localhost:3000).

---

## 🔑 Akun Default untuk Pengujian

Setelah menjalankan script seeder, berikut akun default yang dapat digunakan:

| Username | Role | Jabatan / Departemen | Password Default |
| :--- | :--- | :--- | :--- |
| `admin` | MANAGEMENT / ADMIN | High Management (Administration) | `admin123` |
| `ceo` | MANAGEMENT | Chief Executive Officer | `admin123` |
| `komisaris` | MANAGEMENT | Dewan Komisaris | `admin123` |
| `stafftesting` | STAFF | Creative Head (Creative) | `admin123` |

> ⚠️ **Catatan Keamanan**: Harap segera perbarui kata sandi akun default pada menu Profile setelah melakukan deployment ke lingkungan produksi.

---

## 📜 Script NPM yang Tersedia

- `npm run dev` : Menjalankan server Next.js mode pengembangan (`localhost:3000`).
- `npm run build` : Melakukan kompilasi dan optimasi build untuk production.
- `npm run start` : Menjalankan server hasil build production.
- `npm run lint` : Memeriksa standar kode dengan ESLint.

---

## 📄 Lisensi

Proyek ini dilindungi di bawah lisensi internal / proprietary milik **Locomotion Agency**.
