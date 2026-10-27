import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { ProfileForm } from "./ProfileForm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Briefcase, Building2, ShieldCheck, Mail } from "lucide-react";

export default async function ProfilePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch pending requests for this user
  const pendingProfileRequest = await prisma.profileUpdateRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  const pendingPasswordRequest = await prisma.passwordResetRequest.findFirst({
    where: { userId: user.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Profil Pengguna & Pengaturan Akun
        </h1>
        <p className="text-xs text-muted-foreground">
          Kelola foto profil, identitas nama, username, dan keamanan kata sandi Anda.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card Summary */}
        <Card className="h-fit border-border/80 bg-card/60">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-3">
              <Avatar className="h-24 w-24 ring-4 ring-primary/20">
                <AvatarImage src={user.avatarUrl || ""} />
                <AvatarFallback className="text-xl font-bold">{user.name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-lg">{user.name}</CardTitle>
            <CardDescription className="text-xs font-mono">@{user.username}</CardDescription>
            <div className="flex justify-center gap-1.5 pt-2 flex-wrap">
              <Badge variant={user.role === "ADMIN" ? "destructive" : user.role === "MANAGEMENT" ? "purple" : "cyan"}>
                {user.role === "ADMIN" ? "Admin (HRGA)" : user.role === "MANAGEMENT" ? "Management" : "Staff"}
              </Badge>
              <Badge variant="outline">{user.department}</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 text-xs border-t border-border/40 pt-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>{user.position}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
              <span>Departemen {user.department}</span>
            </div>
            {user.email && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                <span className="truncate">{user.email}</span>
              </div>
            )}
            <div className="flex items-center gap-2 text-muted-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Peran:{" "}
                {user.role === "ADMIN"
                  ? "Admin (Top Level)"
                  : user.role === "MANAGEMENT"
                  ? "Management (Project Manager)"
                  : "Staff Agensi"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Profile Edit & Password Form */}
        <div className="md:col-span-2">
          <Card className="border-border/80">
            <CardHeader>
              <CardTitle className="text-lg">Pengaturan Data Akun</CardTitle>
              <CardDescription className="text-xs">
                Perubahan nama, username, dan foto profil ditampilkan pada direktori kerja dan delegasi project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm
                user={user}
                pendingProfileRequest={pendingProfileRequest}
                pendingPasswordRequest={pendingPasswordRequest}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
