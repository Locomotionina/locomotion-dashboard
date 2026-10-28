"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { SessionUser } from "@/lib/auth";
import {
  updateProfileAction,
  requestPasswordResetAction,
  uploadAvatarAction,
} from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff,
  Sparkles,
  Camera,
  Upload,
  Image as ImageIcon,
} from "lucide-react";

interface PendingProfileRequest {
  id: string;
  requestedName: string;
  requestedUsername: string;
  requestedAvatarUrl: string | null;
  createdAt: Date;
}

interface PendingPasswordRequest {
  id: string;
  createdAt: Date;
}

interface ProfileFormProps {
  user: SessionUser;
  pendingProfileRequest?: PendingProfileRequest | null;
  pendingPasswordRequest?: PendingPasswordRequest | null;
}

export function ProfileForm({
  user,
  pendingProfileRequest,
  pendingPasswordRequest,
}: ProfileFormProps) {
  const router = useRouter();

  // Profile Form State
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string>(user.avatarUrl || "");

  // Avatar Upload State (Strict 400KB Limit)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const MAX_FILE_SIZE = 400 * 1024; // 400 KB

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploadSuccess(null);

    // Validate MIME type (JPG, PNG, WebP, GIF)
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setUploadError("Format file tidak valid. Harap pilih file gambar (JPG, PNG, WebP, GIF).");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Validate File Size: Max 400KB
    if (file.size > MAX_FILE_SIZE) {
      const sizeKb = (file.size / 1024).toFixed(1);
      setUploadError(`Ukuran file terlalu besar (${sizeKb} KB). Batas maksimal foto profil adalah 400 KB.`);
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Instant local preview
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Upload via Server Action
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await uploadAvatarAction(formData);
      if (!res.success) {
        setUploadError(res.error || "Gagal mengunggah foto profil.");
        setPreviewUrl(null);
      } else {
        setAvatarUrl(res.url!);
        setUploadSuccess("Foto profil berhasil diunggah! Jangan lupa klik simpan perubahan.");
      }
    } catch {
      setUploadError("Terjadi kesalahan koneksi saat mengunggah foto.");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Password Reset State
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const isStaff = user.role !== "MANAGEMENT" && user.role !== "ADMIN";

  // Handle Profile Update Submission
  const handleProfileSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(null);
    setProfileError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("avatarUrl", avatarUrl);

    const res = await updateProfileAction(formData);

    if (!res.success) {
      setProfileError(res.error || "Gagal memperbarui profil.");
    } else {
      setProfileSuccess(res.message || "Profil berhasil diajukan!");
      router.refresh();
    }
    setProfileLoading(false);
  };

  // Handle Password Reset Request Submission
  const handlePasswordSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError("Password minimal harus 6 karakter.");
      setPasswordLoading(false);
      return;
    }

    const res = await requestPasswordResetAction(newPassword);

    if (!res.success) {
      setPasswordError(res.error || "Gagal mengajukan reset password.");
    } else {
      setPasswordSuccess(res.message || "Permintaan reset password berhasil dikirim!");
      setNewPassword("");
      router.refresh();
    }
    setPasswordLoading(false);
  };

  // Quick preset avatar generator
  const setPresetAvatar = (seed: string) => {
    const url = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(seed)}&backgroundColor=263bb8`;
    setAvatarUrl(url);
  };

  return (
    <div className="space-y-8">
      {/* ------------------------------------------------------------- */}
      {/* SECTION 1: EDIT PROFILE (FOTO PROFIL, NAMA, USERNAME) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground">
              Informasi Profil
            </h3>
            {isStaff ? (
              <Badge variant="cyan" className="text-[11px] gap-1">
                <ShieldCheck className="h-3 w-3" />
                <span>Persetujuan Admin Diperlukan</span>
              </Badge>
            ) : (
              <Badge variant="purple" className="text-[11px]">
                Akses Project Manager / Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sesuai kebijakan agensi, Anda dapat mengubah foto profil, nama lengkap, dan username.
            {isStaff && " Setiap perubahan harus disetujui (di-ACC) terlebih dahulu oleh Project Manager."}
          </p>
        </div>

        {/* Pending Profile Request Banner */}
        {pendingProfileRequest && isStaff && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              <span>Permintaan Perubahan Profil Sedang Menunggu Persetujuan Admin (Pending)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-background/60 border border-border/60">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 border border-border">
                  <AvatarImage src={pendingProfileRequest.requestedAvatarUrl || ""} />
                  <AvatarFallback>{pendingProfileRequest.requestedName[0]}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-[10px] text-muted-foreground">Foto Baru</p>
                  <p className="font-semibold text-foreground truncate max-w-[120px]">
                    {pendingProfileRequest.requestedAvatarUrl ? "Kustom" : "Default"}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Nama Baru yang Diajukan</p>
                <p className="font-bold text-foreground">{pendingProfileRequest.requestedName}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground">Username Baru yang Diajukan</p>
                <p className="font-bold text-foreground font-mono">@{pendingProfileRequest.requestedUsername}</p>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground italic">
              * Perubahan akan aktif setelah disetujui oleh Project Manager. Anda dapat mengirimkan perubahan baru untuk menggantikan permintaan di atas.
            </p>
          </div>
        )}

        {profileSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-fade-up">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{profileSuccess}</span>
          </div>
        )}

        {profileError && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 animate-fade-up">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{profileError}</span>
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-4">
          {/* Avatar Upload & Configuration (Limit 400KB) */}
          <div className="p-4 rounded-2xl border border-border/80 bg-secondary/30 space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Camera className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span>Foto Profil</span>
              </Label>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Maksimal 400 KB
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
              {/* Avatar Preview */}
              <div className="relative group shrink-0">
                <Avatar className="h-20 w-20 border-2 border-border/80 shadow-md ring-2 ring-primary/20">
                  <AvatarImage src={previewUrl || avatarUrl || user.avatarUrl || ""} className="object-cover" />
                  <AvatarFallback className="text-xl font-bold bg-primary/10 text-primary">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
                {uploading && (
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-xs rounded-full flex flex-col items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                  </div>
                )}
              </div>

              {/* Controls */}
              <div className="space-y-3 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={uploading}
                  />

                  <Button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    variant="outline"
                    className="h-9 px-4 rounded-xl text-xs font-semibold gap-2 border-blue-500/30 hover:border-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                  >
                    {uploading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Mengunggah...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-3.5 w-3.5" />
                        <span>Pilih & Upload Foto Baru</span>
                      </>
                    )}
                  </Button>

                  {(avatarUrl || previewUrl) && (
                    <Button
                      type="button"
                      onClick={() => {
                        setAvatarUrl("");
                        setPreviewUrl(null);
                        setUploadSuccess(null);
                        setUploadError(null);
                      }}
                      variant="ghost"
                      className="h-9 px-3 rounded-xl text-xs text-rose-600 hover:bg-rose-500/10 hover:text-rose-700"
                    >
                      Hapus Foto
                    </Button>
                  )}
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Format gambar yang didukung: <span className="font-semibold text-foreground">JPG, PNG, WebP, GIF</span>.
                  Ukuran file dibatasi <span className="font-semibold text-blue-600 dark:text-blue-400 underline">maksimal 400 KB</span>.
                </p>

                {/* Upload Feedback Message */}
                {uploadError && (
                  <div className="flex items-center gap-2 p-2.5 text-xs rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="flex items-center gap-2 p-2.5 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{uploadSuccess}</span>
                  </div>
                )}

                {/* Optional Custom URL or Presets */}
                <div className="pt-2 border-t border-border/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground font-medium">Atau gunakan URL / Avatar Presets:</span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          setPresetAvatar(user.name);
                          setPreviewUrl(null);
                          setUploadSuccess(null);
                          setUploadError(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border/60"
                      >
                        Initials
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl(`https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(user.username)}`);
                          setPreviewUrl(null);
                          setUploadSuccess(null);
                          setUploadError(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border/60"
                      >
                        Bottts
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl(`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.username)}`);
                          setPreviewUrl(null);
                          setUploadSuccess(null);
                          setUploadError(null);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-secondary hover:bg-secondary/80 text-foreground transition-colors border border-border/60"
                      >
                        Avataaars
                      </button>
                    </div>
                  </div>

                  <Input
                    id="avatarUrl"
                    name="avatarUrl"
                    value={avatarUrl}
                    onChange={(e) => {
                      setAvatarUrl(e.target.value);
                      setPreviewUrl(null);
                    }}
                    placeholder="https://example.com/foto-anda.png atau URL avatar"
                    className="h-8 rounded-xl text-xs bg-background"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name" className="text-xs font-semibold">
                Nama Lengkap
              </Label>
              <Input
                id="name"
                name="name"
                defaultValue={user.name}
                required
                className="h-10 rounded-xl text-sm bg-background/60"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="username" className="text-xs font-semibold">
                Username
              </Label>
              <Input
                id="username"
                name="username"
                defaultValue={user.username}
                required
                className="h-10 rounded-xl text-sm bg-background/60 font-mono"
              />
            </div>
          </div>

          <div className="pt-1">
            <Button
              type="submit"
              disabled={profileLoading}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition-all border-0"
            >
              {profileLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  <span>Memproses...</span>
                </>
              ) : isStaff ? (
                <span>Ajukan Perubahan Profil ke Admin</span>
              ) : (
                <span>Simpan Perubahan Profil</span>
              )}
            </Button>
          </div>
        </form>
      </div>

      <hr className="border-border/60" />

      {/* ------------------------------------------------------------- */}
      {/* SECTION 2: RESET PASSWORD (DENGAN APPROVAL ADMIN UNTUK STAF) */}
      {/* ------------------------------------------------------------- */}
      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <KeyRound className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <span>Ganti / Reset Password</span>
            </h3>
            {isStaff ? (
              <Badge variant="warning" className="text-[11px] gap-1">
                <Clock className="h-3 w-3" />
                <span>Approval Admin Diperlukan</span>
              </Badge>
            ) : (
              <Badge variant="cyan" className="text-[11px]">
                Langsung Aktif
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isStaff
              ? "Sesuai prosedur keamanan agensi, permohonan reset password staf harus disetujui (di-ACC) oleh Project Manager sebelum dapat digunakan."
              : "Sebagai Project Manager / Admin, kata sandi baru Anda akan langsung diperbarui seketika."}
          </p>
        </div>

        {/* Pending Password Reset Request Banner */}
        {pendingPasswordRequest && isStaff && (
          <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 space-y-2 animate-fade-in text-xs">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
              <Clock className="h-4 w-4 shrink-0 animate-pulse" />
              <span>Permintaan Reset Password Sedang Menunggu Persetujuan Admin (Pending)</span>
            </div>
            <p className="text-muted-foreground leading-relaxed">
              Anda telah mengajukan reset password baru pada{" "}
              <strong className="text-foreground">
                {new Date(pendingPasswordRequest.createdAt).toLocaleString("id-ID", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>
              . Kata sandi baru akan mulai berlaku setelah Project Manager menyetujui permintaan ini.
            </p>
          </div>
        )}

        {passwordSuccess && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 animate-fade-up">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{passwordSuccess}</span>
          </div>
        )}

        {passwordError && (
          <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 animate-fade-up">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-4 max-w-md">
          <div className="space-y-1">
            <Label htmlFor="newPasswordInput" className="text-xs font-semibold">
              Kata Sandi Baru
            </Label>
            <div className="relative">
              <Input
                id="newPasswordInput"
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                minLength={6}
                required
                className="h-10 rounded-xl pr-10 text-sm bg-background/60"
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
            <p className="text-[11px] text-muted-foreground">
              Gunakan kombinasi huruf, angka, atau simbol untuk keamanan akun Anda.
            </p>
          </div>

          <div>
            <Button
              type="submit"
              disabled={passwordLoading || !newPassword}
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-semibold text-xs shadow-sm transition-all border-0"
            >
              {passwordLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
                  <span>Memproses...</span>
                </>
              ) : isStaff ? (
                <span>Ajukan Reset Password ke Admin</span>
              ) : (
                <span>Perbarui Password Langsung</span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
