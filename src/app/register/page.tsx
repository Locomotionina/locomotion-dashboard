"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { registerAction } from "@/actions/auth";
import {
  DEPARTMENT_POSITIONS,
  DEPARTMENTS,
  getTierFromPosition,
  getTierBadgeLabel,
} from "@/lib/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Cascading dropdown state
  const defaultDept = DEPARTMENTS[0] || "OPERATIONS";
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedPosition, setSelectedPosition] = useState<string>(
    DEPARTMENT_POSITIONS[defaultDept]?.[0] || "HRGA"
  );

  const currentTier = getTierFromPosition(selectedPosition);

  // Default to light mode on registration screen
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const dept = e.target.value;
    setSelectedDept(dept);
    // Automatically set position to the first item of the selected department
    if (DEPARTMENT_POSITIONS[dept]) {
      setSelectedPosition(DEPARTMENT_POSITIONS[dept][0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("department", selectedDept);
    formData.set("position", selectedPosition);

    const result = await registerAction(formData);

    if (!result.success) {
      setError(result.error || "Pendaftaran gagal. Silakan periksa kembali data Anda.");
      setLoading(false);
    } else {
      setLoading(false);
      setIsSuccess(true);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-6 px-3 sm:px-6 animate-fade-up">
      {/* Main Two-Column Card */}
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-3 sm:p-5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Left Column: Interactive Clean Banner Image with Hover Motion */}
          <div className="group relative min-h-[300px] md:min-h-[580px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-border/40 cursor-pointer">
            <Image
              src="/banner_screen.webp"
              alt="Locomotion Visual"
              fill
              className="object-cover rounded-2xl transition-all duration-700 ease-out group-hover:scale-[1.06] group-hover:-translate-y-1.5 group-hover:rotate-[0.5deg]"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Right Column: Clean Registration Form or Success Approval Notice */}
          <div className="flex flex-col justify-between p-4 sm:p-8">
            <div>
              {/* Brand Header */}
              <div className="flex items-center gap-2.5 mb-6">
                <div className="h-8 w-8 rounded-xl overflow-hidden bg-blue-600 dark:bg-blue-500 flex items-center justify-center shrink-0 shadow-sm border border-blue-500/30">
                  <Image
                    src="/logo.svg"
                    alt="Locomotion"
                    width={32}
                    height={32}
                    className="h-full w-full object-cover"
                  />
                </div>
                <span className="font-bold text-base tracking-tight text-foreground">
                  Locomotion
                </span>
              </div>

              {isSuccess ? (
                /* Success Screen Waiting for Superuser Approval */
                <div className="py-6 space-y-5 animate-fade-in text-center">
                  <div className="h-16 w-16 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto border border-amber-500/30 shadow-md">
                    <Clock className="h-8 w-8" />
                  </div>

                  <div className="space-y-2">
                    <h2 className="text-2xl font-black text-foreground">
                      Pendaftaran Berhasil!
                    </h2>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-sm mx-auto">
                      Akun Anda telah dibuat. Demi keamanan, registrasi harus terlebih dahulu disetujui (<strong className="text-foreground">di-ACC</strong>) oleh <strong className="text-blue-600 dark:text-blue-400">Superuser / Admin</strong> sebelum dapat digunakan untuk login ke website.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-border/80 bg-secondary/50 p-4 text-left text-xs space-y-1.5 max-w-sm mx-auto">
                    <div className="flex items-center gap-1.5 text-foreground font-semibold">
                      <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span>Status Akun: Menunggu Persetujuan Admin</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Silakan hubungi administrator agensi Anda untuk mempercepat aktivasi akun.
                    </p>
                  </div>

                  <div className="pt-2">
                    <Button
                      asChild
                      className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm shadow-sm transition-all border-0"
                    >
                      <Link href="/login">
                        <span>Ke Halaman Login</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Link>
                    </Button>
                  </div>
                </div>
              ) : (
                /* Registration Form */
                <>
                  <div className="space-y-1 mb-6">
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                      Create Account
                    </h1>
                    <p className="text-xs text-muted-foreground">
                      Fill in your details below to register.
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-3.5">
                    {error && (
                      <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 animate-fade-up">
                        <AlertCircle className="h-4 w-4 shrink-0" />
                        <span>{error}</span>
                      </div>
                    )}

                    {/* Nama Lengkap */}
                    <div className="space-y-1">
                      <Label htmlFor="name" className="text-xs font-semibold">
                        Nama Lengkap
                      </Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="e.g. Alex Morgan"
                        required
                        className="h-10 rounded-xl text-sm border-border/80 bg-background/60 focus:bg-background"
                      />
                    </div>

                    {/* Username & Email in 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="username" className="text-xs font-semibold">
                          Username
                        </Label>
                        <Input
                          id="username"
                          name="username"
                          placeholder="e.g. alex.creative"
                          required
                          className="h-10 rounded-xl text-sm border-border/80 bg-background/60 focus:bg-background"
                        />
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="email" className="text-xs font-semibold">
                          Email
                        </Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="e.g. alex@locomotion.agency"
                          required
                          className="h-10 rounded-xl text-sm border-border/80 bg-background/60 focus:bg-background"
                        />
                      </div>
                    </div>

                    {/* Departemen & Dynamic Roll-down Position in 2 columns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label htmlFor="department" className="text-xs font-semibold">
                          Departemen
                        </Label>
                        <select
                          id="department"
                          value={selectedDept}
                          onChange={handleDepartmentChange}
                          className="flex h-10 w-full rounded-xl border border-border/80 bg-background/60 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
                        >
                          {DEPARTMENTS.map((dept) => (
                            <option key={dept} value={dept}>
                              {dept}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1">
                        <Label htmlFor="position" className="text-xs font-semibold">
                          Posisi / Role
                        </Label>
                        <select
                          id="position"
                          value={selectedPosition}
                          onChange={(e) => setSelectedPosition(e.target.value)}
                          className="flex h-10 w-full rounded-xl border border-border/80 bg-background/60 px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring text-foreground font-medium"
                        >
                          {(DEPARTMENT_POSITIONS[selectedDept] || []).map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Automatic Account Level Indicator (Computed Dynamically) */}
                    <div className="flex items-center justify-between text-xs px-3 py-2 rounded-xl border border-border/60 bg-secondary/35">
                      <span className="text-muted-foreground font-medium text-[11px]">
                        Tingkat Akses Otomatis:
                      </span>
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] tracking-wide border shadow-xs transition-colors ${
                          currentTier === "ADMIN"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                            : currentTier === "MANAGEMENT"
                            ? "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
                        }`}
                      >
                        {getTierBadgeLabel(currentTier)}
                      </span>
                    </div>

                    {/* Password with Eye Toggle */}
                    <div className="space-y-1">
                      <Label htmlFor="password" className="text-xs font-semibold">
                        Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="At least 6 characters"
                          minLength={6}
                          required
                          className="h-10 rounded-xl pl-3 pr-10 text-sm border-border/80 bg-background/60 focus:bg-background"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Solid Action Buttons (No Gradients) */}
                    <div className="space-y-2.5 pt-3">
                      <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-sm shadow-sm transition-all border-0"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            <span>Mendaftarkan akun...</span>
                          </>
                        ) : (
                          <>
                            <span>Daftar Sekarang</span>
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </>
                        )}
                      </Button>

                      <Button
                        asChild
                        variant="outline"
                        className="w-full h-11 rounded-xl border-border/80 bg-secondary/50 hover:bg-secondary text-foreground font-semibold text-sm transition-all"
                      >
                        <Link href="/login">
                          <span>Sudah punya akun? Masuk</span>
                        </Link>
                      </Button>
                    </div>
                  </form>
                </>
              )}
            </div>

            {/* Bottom Footer Link */}
            {!isSuccess && (
              <div className="mt-5 pt-3.5 border-t border-border/50 text-center text-xs text-muted-foreground">
                Sudah memiliki akun agensi?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline ml-1"
                >
                  Masuk di sini
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
