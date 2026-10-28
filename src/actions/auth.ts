"use server";

import { prisma } from "@/lib/prisma";
import {
  setSessionCookie,
  clearSessionCookie,
  verifyPassword,
  hashPassword,
  getCurrentUser,
} from "@/lib/auth";
import { getTierFromPosition } from "@/lib/departments";
import { revalidatePath } from "next/cache";
import { validateImageMagicBytes, isValidAvatarUrl } from "@/lib/security";

export type UserRole = "ADMIN" | "MANAGEMENT" | "STAFF";

export interface SessionUserData {
  id: string;
  name: string;
  username: string;
  email?: string | null;
  role: UserRole;
  position: string;
  department: string;
}

export async function loginAction(formData: FormData) {
  const username = formData.get("username") as string;
  const password = formData.get("password") as string;

  if (!username || !password) {
    return { success: false, error: "Username and password are required." };
  }

  const cleanUsername = username.trim().toLowerCase();

  let user = await prisma.user.findUnique({
    where: { username: cleanUsername },
  });

  if (!user && cleanUsername === "admin") {
    user = await prisma.user.findFirst({
      where: { role: "ADMIN" },
    });
  }

  if (!user) {
    return { success: false, error: "Invalid username or password." };
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    return { success: false, error: "Invalid username or password." };
  }

  // Check suspension status (Hold)
  if (user.isSuspended) {
    return {
      success: false,
      error: "Akun Anda sedang ditangguhkan (On Hold). Silakan hubungi Admin (HRGA) untuk informasi lebih lanjut.",
    };
  }

  // Check approval status (Admin role bypasses approval)
  if (!user.isApproved && user.role !== "ADMIN") {
    return {
      success: false,
      error: "Akun Anda belum disetujui (ACC) oleh Admin (HRGA). Silakan hubungi Admin untuk aktivasi akun Anda.",
    };
  }

  await setSessionCookie({
    id: user.id,
    username: user.username,
    role: user.role as "ADMIN" | "MANAGEMENT" | "STAFF",
  });

  revalidatePath("/", "layout");
  return {
    success: true,
    role: user.role as "ADMIN" | "MANAGEMENT" | "STAFF",
    user: {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role as "ADMIN" | "MANAGEMENT" | "STAFF",
      position: user.position,
      department: user.department,
    },
  };
}

export async function registerAction(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;
  const position = (formData.get("position") as string)?.trim() || "Content Strategist";
  const department = (formData.get("department") as string)?.trim() || "PROJECT/PRODUCTION";

  if (!name || name.length < 2) {
    return { success: false, error: "Full Name must be at least 2 characters." };
  }

  if (!username || username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters." };
  }

  // Username regex: alphanumeric, dots, hyphens, underscores
  const usernameRegex = /^[a-z0-9_.-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      success: false,
      error: "Username may only contain letters, numbers, dots, hyphens, and underscores.",
    };
  }

  if (!email || !email.includes("@")) {
    return { success: false, error: "Please enter a valid email address." };
  }

  if (!password || password.length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const existing = await prisma.user.findUnique({
    where: { username },
  });

  if (existing) {
    return { success: false, error: "Username is already registered. Please choose another." };
  }

  const existingEmail = await prisma.user.findFirst({
    where: { email },
  });

  if (existingEmail) {
    return { success: false, error: "Email is already registered. Please choose another." };
  }

  const hashedPassword = await hashPassword(password);
  // Automatically cross-reference selected Position to assign Account Access Tier (ADMIN, MANAGEMENT, or STAFF)
  const role = getTierFromPosition(position);

  const newUser = await prisma.user.create({
    data: {
      name,
      username,
      email,
      password: hashedPassword,
      role,
      position,
      department,
      isApproved: role === "ADMIN", // Admin accounts don't block themselves; Management and Staff require approval
      isSuspended: false,
      avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}&backgroundColor=263bb8`,
    },
  });

  // Notify active Admins (HRGA) about the new registration
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
  });
  for (const a of admins) {
    await prisma.notification.create({
      data: {
        userId: a.id,
        title: "Pendaftaran Pengguna Baru",
        message: `${name} (@${username}) mendaftar sebagai ${position} (${department}) dan membutuhkan persetujuan Anda.`,
        link: "/admin/users",
      },
    });
  }

  revalidatePath("/admin/users");
  revalidatePath("/management");
  return {
    success: true,
    pendingApproval: true,
    message: "Registrasi berhasil! Akun Anda telah dibuat dan sedang menunggu persetujuan (ACC) dari Admin (HRGA) sebelum dapat digunakan untuk login.",
    user: {
      id: newUser.id,
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role as "ADMIN" | "MANAGEMENT" | "STAFF",
      position: newUser.position,
      department: newUser.department,
    },
  };
}

export async function approveUserAction(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Hanya Admin (HRGA) yang memiliki wewenang untuk menyetujui akun pendaftaran baru." };
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data: { isApproved: true },
  });

  await prisma.notification.create({
    data: {
      userId: user.id,
      title: "Akun Disetujui",
      message: "Akun Anda telah disetujui oleh Admin (HRGA). Selamat datang di Locomotion Agency!",
      link: "/dashboard",
    },
  });

  revalidatePath("/admin/users");
  revalidatePath("/management");
  return { success: true };
}

export async function rejectUserAction(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Hanya Admin (HRGA) yang memiliki wewenang untuk menolak pendaftaran akun." };
  }

  await prisma.user.delete({
    where: { id: userId },
  });

  revalidatePath("/admin/users");
  revalidatePath("/management");
  return { success: true };
}

export async function toggleSuspendUserAction(targetUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Hanya Admin (HRGA) yang dapat menangguhkan atau mengaktifkan akun pengguna." };
  }

  if (targetUserId === currentUser.id) {
    return { success: false, error: "Anda tidak dapat menangguhkan akun Anda sendiri." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  const newSuspendedState = !target.isSuspended;

  const updated = await prisma.user.update({
    where: { id: targetUserId },
    data: { isSuspended: newSuspendedState },
  });

  revalidatePath("/admin/users");
  return {
    success: true,
    isSuspended: updated.isSuspended,
    message: updated.isSuspended
      ? `Akun ${target.name} (@${target.username}) berhasil ditangguhkan (On Hold). Pengguna diblokir dari login.`
      : `Akun ${target.name} (@${target.username}) berhasil diaktifkan kembali.`,
  };
}

export async function deleteUserPermanentlyAction(targetUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Hanya Admin (HRGA) yang dapat menghapus akun secara permanen." };
  }

  if (targetUserId === currentUser.id) {
    return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  // Permanently delete user (cascade deletes tasks, revisions, and notifications)
  await prisma.user.delete({
    where: { id: targetUserId },
  });

  revalidatePath("/admin/users");
  return {
    success: true,
    message: `Akun ${target.name} (@${target.username}) telah berhasil dihapus secara permanen dari sistem.`,
  };
}

export async function getAdminUsersAction() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.role !== "ADMIN") {
    return null;
  }

  const users = await prisma.user.findMany({
    include: {
      tasks: {
        select: {
          id: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: u.email,
    role: u.role as "ADMIN" | "MANAGEMENT" | "STAFF",
    position: u.position,
    department: u.department,
    avatarUrl: u.avatarUrl,
    isApproved: u.isApproved,
    isSuspended: u.isSuspended,
    createdAt: u.createdAt,
    activeTasksCount: u.tasks.filter((t) => t.status !== "Done").length,
    totalTasksCount: u.tasks.length,
  }));
}

export async function logoutAction() {
  clearSessionCookie();
  revalidatePath("/", "layout");
  return { success: true };
}

// -------------------------------------------------------------
// PROFILE UPDATE & APPROVAL WORKFLOW
// -------------------------------------------------------------

/**
 * Upload Avatar Image Action
 * Converts uploaded image to a Base64 Data URL string and saves directly to the database.
 * Enforces a strict 400KB file size limit and valid image MIME types (JPG, PNG, WebP, GIF).
 */
export async function uploadAvatarAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "Silakan login terlebih dahulu untuk mengunggah foto profil." };
  }

  const file = formData.get("file") as File | null;
  if (!file || typeof file === "string" || file.size === 0) {
    return { success: false, error: "File gambar tidak ditemukan atau file kosong." };
  }

  // File size limit: 400 KB (400 * 1024 bytes = 409600 bytes)
  const MAX_FILE_SIZE = 400 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    const sizeInKb = (file.size / 1024).toFixed(1);
    return {
      success: false,
      error: `Ukuran file terlalu besar (${sizeInKb} KB). Batas maksimal ukuran gambar adalah 400 KB.`,
    };
  }

  try {
    // 1. Convert uploaded image into binary buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // 2. Strict Server-Side Binary Magic Bytes Verification
    // Do NOT trust client file.type or file extension. Verify actual binary header & signatures.
    const inspection = validateImageMagicBytes(buffer);
    if (!inspection.isValid) {
      return {
        success: false,
        error: inspection.error || "File yang diunggah bukan file gambar yang valid.",
      };
    }

    // 3. Strictly restrict targetUserId permission
    const requestedTargetUserId = formData.get("targetUserId") as string | null;
    const isElevated = currentUser.role === "MANAGEMENT" || currentUser.role === "ADMIN";
    const targetUserId = isElevated && requestedTargetUserId ? requestedTargetUserId : currentUser.id;

    // 4. Construct canonical Base64 Data URL using server-verified MIME type
    const base64Data = buffer.toString("base64");
    const base64Url = `data:${inspection.mime};base64,${base64Data}`;

    // 5. Save verified Base64 image to database
    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        avatarUrl: base64Url,
      },
    });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    revalidatePath("/management");

    return {
      success: true,
      url: base64Url,
      message: "Foto profil berhasil diverifikasi dan disimpan!",
    };
  } catch (error) {
    console.error("Error saving avatar upload:", error);
    return {
      success: false,
      error: "Terjadi kesalahan saat memverifikasi dan menyimpan foto profil.",
    };
  }
}

export async function updateProfileAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "You must be signed in to update your profile." };
  }

  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim();

  if (!name || name.length < 2) {
    return { success: false, error: "Full Name must be at least 2 characters." };
  }

  if (!username || username.length < 3) {
    return { success: false, error: "Username must be at least 3 characters." };
  }

  const usernameRegex = /^[a-z0-9_.-]+$/;
  if (!usernameRegex.test(username)) {
    return {
      success: false,
      error: "Username may only contain letters, numbers, dots, hyphens, and underscores.",
    };
  }

  // Validate avatarUrl to prevent XSS (javascript: or dangerous data URLs)
  if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
    return {
      success: false,
      error: "Format URL Avatar tidak valid. Gunakan URL https:// atau gambar Base64 yang valid.",
    };
  }

  // Check username uniqueness if changed
  if (username !== currentUser.username) {
    const existing = await prisma.user.findUnique({
      where: { username },
    });
    if (existing && existing.id !== currentUser.id) {
      return { success: false, error: "This username is already taken. Please choose another." };
    }
  }

  // If currentUser is MANAGEMENT or ADMIN, apply updates directly
  if (currentUser.role === "MANAGEMENT" || currentUser.role === "ADMIN") {
    const updated = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        name,
        username,
        avatarUrl: avatarUrl || currentUser.avatarUrl,
      },
    });

    await setSessionCookie({
      id: updated.id,
      username: updated.username,
      role: updated.role as "ADMIN" | "MANAGEMENT" | "STAFF",
    });

    revalidatePath("/", "layout");
    revalidatePath("/profile");
    return { success: true, message: "Profil Anda berhasil diperbarui." };
  }

  // If currentUser is STAFF, profile change requires approval from Project Manager / Admin!
  // Remove any previous pending request
  await prisma.profileUpdateRequest.deleteMany({
    where: {
      userId: currentUser.id,
      status: "PENDING",
    },
  });

  await prisma.profileUpdateRequest.create({
    data: {
      userId: currentUser.id,
      requestedName: name,
      requestedUsername: username,
      requestedAvatarUrl: avatarUrl || currentUser.avatarUrl,
      status: "PENDING",
    },
  });

  // Notify Project Managers
  const managers = await prisma.user.findMany({
    where: { role: "MANAGEMENT" },
  });
  for (const m of managers) {
    await prisma.notification.create({
      data: {
        userId: m.id,
        title: "Permintaan Perubahan Profil Staf",
        message: `${currentUser.name} (@${currentUser.username}) mengajukan perubahan nama/username/foto profil.`,
        link: "/management",
      },
    });
  }

  revalidatePath("/profile");
  revalidatePath("/management");
  return {
    success: true,
    pendingApproval: true,
    message: "Permintaan perubahan profil berhasil dikirim! Menunggu persetujuan (ACC) dari Project Manager.",
  };
}

export async function approveProfileUpdateAction(requestId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat menyetujui perubahan profil." };
  }

  const req = await prisma.profileUpdateRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });

  if (!req || req.status !== "PENDING") {
    return { success: false, error: "Permintaan tidak ditemukan atau sudah diproses." };
  }

  // Verify username is not taken by someone else
  if (req.requestedUsername !== req.user.username) {
    const existing = await prisma.user.findUnique({
      where: { username: req.requestedUsername },
    });
    if (existing && existing.id !== req.userId) {
      return {
        success: false,
        error: `Username "${req.requestedUsername}" sudah digunakan akun lain. Minta staf memilih username lain.`,
      };
    }
  }

  // Update staff user
  await prisma.user.update({
    where: { id: req.userId },
    data: {
      name: req.requestedName,
      username: req.requestedUsername,
      avatarUrl: req.requestedAvatarUrl,
    },
  });

  // Mark request as APPROVED
  await prisma.profileUpdateRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  // Send notification to staff
  await prisma.notification.create({
    data: {
      userId: req.userId,
      title: "Perubahan Profil Disetujui",
      message: `Perubahan profil Anda menjadi "${req.requestedName}" (@${req.requestedUsername}) telah disetujui oleh Project Manager.`,
      link: "/profile",
    },
  });

  revalidatePath("/management");
  revalidatePath("/profile");
  return { success: true, message: "Perubahan profil staf berhasil disetujui." };
}

export async function rejectProfileUpdateAction(requestId: string, adminNote?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat menolak perubahan profil." };
  }

  const req = await prisma.profileUpdateRequest.findUnique({
    where: { id: requestId },
  });

  if (!req || req.status !== "PENDING") {
    return { success: false, error: "Permintaan tidak ditemukan atau sudah diproses." };
  }

  await prisma.profileUpdateRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      adminNote: adminNote || "Ditolak oleh Project Manager",
    },
  });

  await prisma.notification.create({
    data: {
      userId: req.userId,
      title: "Perubahan Profil Ditolak",
      message: adminNote
        ? `Permintaan perubahan profil Anda ditolak oleh Project Manager: ${adminNote}`
        : "Permintaan perubahan profil Anda ditolak oleh Project Manager.",
      link: "/profile",
    },
  });

  revalidatePath("/management");
  revalidatePath("/profile");
  return { success: true, message: "Permintaan perubahan profil staf telah ditolak." };
}

// -------------------------------------------------------------
// PASSWORD RESET WORKFLOW (STAFF APPROVAL & ADMIN PRIVILEGES)
// -------------------------------------------------------------

export async function requestPasswordResetAction(newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { success: false, error: "You must be signed in to request a password reset." };
  }

  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: "Password must be at least 6 characters long." };
  }

  const cleanPassword = newPassword.trim();
  const hashedPassword = await hashPassword(cleanPassword);

  // If currentUser is MANAGEMENT or ADMIN, update immediately
  if (currentUser.role === "MANAGEMENT" || currentUser.role === "ADMIN") {
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { password: hashedPassword },
    });
    return { success: true, message: "Password Anda berhasil diperbarui." };
  }

  // If currentUser is STAFF, password reset requires Admin / Project Manager approval!
  await prisma.passwordResetRequest.deleteMany({
    where: {
      userId: currentUser.id,
      status: "PENDING",
    },
  });

  await prisma.passwordResetRequest.create({
    data: {
      userId: currentUser.id,
      hashedPassword,
      status: "PENDING",
    },
  });

  // Notify Project Managers
  const managers = await prisma.user.findMany({
    where: { role: "MANAGEMENT" },
  });
  for (const m of managers) {
    await prisma.notification.create({
      data: {
        userId: m.id,
        title: "Permintaan Reset Password Staf",
        message: `Staf ${currentUser.name} (@${currentUser.username}) mengajukan reset password akun.`,
        link: "/management",
      },
    });
  }

  revalidatePath("/profile");
  revalidatePath("/management");
  return {
    success: true,
    pendingApproval: true,
    message: "Permintaan reset password telah diajukan! Menunggu persetujuan (ACC) dari Project Manager.",
  };
}

export async function approvePasswordResetAction(requestId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat menyetujui reset password." };
  }

  const req = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
  });

  if (!req || req.status !== "PENDING") {
    return { success: false, error: "Permintaan tidak ditemukan atau sudah diproses." };
  }

  await prisma.user.update({
    where: { id: req.userId },
    data: { password: req.hashedPassword },
  });

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: { status: "APPROVED" },
  });

  await prisma.notification.create({
    data: {
      userId: req.userId,
      title: "Reset Password Disetujui",
      message: "Permintaan reset password Anda telah disetujui. Anda sekarang dapat login menggunakan kata sandi baru Anda.",
      link: "/profile",
    },
  });

  revalidatePath("/management");
  return { success: true, message: "Reset password staf berhasil disetujui." };
}

export async function rejectPasswordResetAction(requestId: string, adminNote?: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat menolak reset password." };
  }

  const req = await prisma.passwordResetRequest.findUnique({
    where: { id: requestId },
  });

  if (!req || req.status !== "PENDING") {
    return { success: false, error: "Permintaan tidak ditemukan atau sudah diproses." };
  }

  await prisma.passwordResetRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      adminNote: adminNote || "Ditolak oleh Project Manager",
    },
  });

  await prisma.notification.create({
    data: {
      userId: req.userId,
      title: "Reset Password Ditolak",
      message: adminNote
        ? `Permintaan reset password Anda ditolak oleh Project Manager: ${adminNote}`
        : "Permintaan reset password Anda ditolak oleh Project Manager.",
      link: "/profile",
    },
  });

  revalidatePath("/management");
  return { success: true, message: "Permintaan reset password staf telah ditolak." };
}

// -------------------------------------------------------------
// ADMIN MANAGEMENT OVERVIEW ACTIONS (STAFF EDIT, RESET, PROMOTION, DELETE)
// -------------------------------------------------------------

export async function adminUpdateStaffProfileAction(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat mengedit profil staf." };
  }

  const userId = formData.get("userId") as string;
  const name = (formData.get("name") as string)?.trim();
  const username = (formData.get("username") as string)?.trim().toLowerCase();
  const department = (formData.get("department") as string)?.trim();
  const position = (formData.get("position") as string)?.trim();
  const avatarUrl = (formData.get("avatarUrl") as string)?.trim();

  if (!userId || !name || !username) {
    return { success: false, error: "Nama dan username wajib diisi." };
  }

  // Validate avatarUrl to prevent XSS
  if (avatarUrl && !isValidAvatarUrl(avatarUrl)) {
    return {
      success: false,
      error: "Format URL Avatar tidak valid. Gunakan URL https:// atau gambar Base64 yang valid.",
    };
  }

  // Check username uniqueness
  const existing = await prisma.user.findUnique({
    where: { username },
  });
  if (existing && existing.id !== userId) {
    return { success: false, error: "Username sudah digunakan oleh akun lain." };
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      username,
      department: department || undefined,
      position: position || undefined,
      avatarUrl: avatarUrl || undefined,
    },
  });

  await prisma.notification.create({
    data: {
      userId: updated.id,
      title: "Profil Diperbarui oleh Project Manager",
      message: "Data profil Anda telah diperbarui langsung oleh Project Manager.",
      link: "/profile",
    },
  });

  revalidatePath("/management");
  return { success: true, message: `Profil staf ${updated.name} berhasil diperbarui.` };
}

export async function adminResetStaffPasswordAction(targetUserId: string, newPassword: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat mereset password staf." };
  }

  if (!newPassword || newPassword.trim().length < 6) {
    return { success: false, error: "Password minimal 6 karakter." };
  }

  const hashedPassword = await hashPassword(newPassword.trim());

  await prisma.user.update({
    where: { id: targetUserId },
    data: { password: hashedPassword },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: "Password Direset oleh Project Manager",
      message: "Kata sandi akun Anda telah direset langsung oleh Project Manager. Gunakan kata sandi baru untuk login.",
      link: "/profile",
    },
  });

  revalidatePath("/management");
  return { success: true, message: "Password staf berhasil direset!" };
}

export async function toggleAdminRoleAction(targetUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat mengubah hak akses." };
  }

  if (targetUserId === currentUser.id) {
    return { success: false, error: "Anda tidak dapat mengubah hak akses akun Anda sendiri." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  if (target.role === "ADMIN" && currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Hanya sesama Admin yang dapat mengubah hak akses akun Admin." };
  }

  const newRole = target.role === "MANAGEMENT" ? "STAFF" : "MANAGEMENT";

  await prisma.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });

  await prisma.notification.create({
    data: {
      userId: targetUserId,
      title: newRole === "MANAGEMENT" ? "Hak Akses Admin Diberikan" : "Hak Akses Admin Dicabut",
      message:
        newRole === "MANAGEMENT"
          ? "Anda telah ditunjuk sebagai Admin / Management oleh Project Manager."
          : "Hak akses Admin Anda telah dicabut dan dikembalikan ke peran Staf.",
      link: "/management",
    },
  });

  revalidatePath("/management");
  revalidatePath("/", "layout");
  return {
    success: true,
    newRole,
    message:
      newRole === "MANAGEMENT"
        ? `Akun ${target.name} berhasil ditunjuk sebagai Admin / Management.`
        : `Hak admin akun ${target.name} berhasil dicabut kembali menjadi Staf.`,
  };
}

export async function deleteStaffAction(targetUserId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== "MANAGEMENT" && currentUser.role !== "ADMIN")) {
    return { success: false, error: "Akses ditolak: Hanya Project Manager / Admin yang dapat menghapus staf." };
  }

  if (targetUserId === currentUser.id) {
    return { success: false, error: "Anda tidak dapat menghapus akun Anda sendiri." };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetUserId },
  });

  if (!target) {
    return { success: false, error: "Pengguna tidak ditemukan." };
  }

  if (target.role === "ADMIN" && currentUser.role !== "ADMIN") {
    return { success: false, error: "Akses ditolak: Anda tidak memiliki wewenang untuk menghapus akun Admin." };
  }

  // Delete user (cascade deletes tasks and notifications)
  await prisma.user.delete({
    where: { id: targetUserId },
  });

  revalidatePath("/management");
  return { success: true, message: `Staf ${target.name} (@${target.username}) berhasil dihapus dari sistem.` };
}
