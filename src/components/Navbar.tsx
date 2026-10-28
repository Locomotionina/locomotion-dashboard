"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/actions/auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalSearch } from "@/components/GlobalSearch";
import {
  FolderKanban,
  CheckSquare,
  BarChart3,
  LogOut,
  User,
  ShieldCheck,
  ShieldAlert,
  Users,
  Sparkles,
} from "lucide-react";

interface NavbarProps {
  user: SessionUser | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isAuthPage = pathname === "/login" || pathname === "/register";

  // Hide the navbar entirely on login/register screens or when unauthenticated
  if (!user || isAuthPage) {
    return null;
  }

  const handleLogout = async () => {
    await logoutAction();
    router.push("/login");
    router.refresh();
  };

  const navItems = [
    {
      label: "Project & Brand Hub",
      href: "/projects",
      icon: FolderKanban,
    },
    {
      label: "Staff Workspace",
      href: "/dashboard",
      icon: CheckSquare,
    },
    ...(user.role === "ADMIN"
      ? [
          {
            label: "All Users",
            href: "/admin/users",
            icon: Users,
            adminOnly: true,
          },
        ]
      : []),
    ...(user.role === "MANAGEMENT" || user.role === "ADMIN"
      ? [
          {
            label: "Management Overview",
            href: "/management",
            icon: BarChart3,
            managementOnly: true,
          },
        ]
      : []),
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/70 bg-card/85 backdrop-blur-md transition-colors duration-200">
      <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
        {/* Brand Logo */}
        <div className="flex items-center gap-6">
          <Link href={user ? "/dashboard" : "/login"} prefetch={true} className="flex items-center gap-2.5 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-200 border border-blue-500/30 bg-blue-600 dark:bg-blue-500 flex-shrink-0">
              <Image
                src="/logo.svg"
                alt="Locomotion Logo"
                width={36}
                height={36}
                className="h-full w-full object-cover"
                priority
              />
            </div>
            <span className="font-bold tracking-tight text-base sm:text-lg text-foreground">
              Locomotion
            </span>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20 shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                  {item.managementOnly && user.role !== "MANAGEMENT" && user.role !== "ADMIN" && (
                    <span className="text-[10px] text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">
                      Restricted
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right side: Global Search + Theme Toggle + Notifications + User Profile */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <GlobalSearch />
          <ThemeToggle />
          <NotificationBell />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 rounded-full border border-border/80 bg-secondary/50 p-1 pl-2.5 text-left transition hover:bg-secondary focus:outline-none hover:border-blue-500/30">
                <div className="hidden sm:flex flex-col items-end text-xs leading-tight">
                  <span className="font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {user.position}
                  </span>
                </div>
                <Avatar className="h-8 w-8 ring-2 ring-blue-500/20">
                  <AvatarImage src={user.avatarUrl || ""} />
                  <AvatarFallback className="bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                    {user.name[0]}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-2xl shadow-xl">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none text-foreground">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    @{user.username}
                  </p>
                  <div className="flex items-center gap-1.5 pt-1">
                    <Badge
                      variant={user.role === "ADMIN" ? "destructive" : user.role === "MANAGEMENT" ? "purple" : "cyan"}
                      className="text-[10px]"
                    >
                      {user.role}
                    </Badge>
                    <span className="text-[11px] text-muted-foreground">
                      {user.department}
                    </span>
                  </div>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" prefetch={true} className="flex items-center gap-2 cursor-pointer">
                  <User className="h-4 w-4" />
                  <span>My Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/dashboard" prefetch={true} className="flex items-center gap-2 cursor-pointer">
                  <CheckSquare className="h-4 w-4" />
                  <span>Staff Workspace</span>
                </Link>
              </DropdownMenuItem>
              {user.role === "ADMIN" && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin/users"
                    prefetch={true}
                    className="flex items-center gap-2 cursor-pointer text-rose-500 font-semibold"
                  >
                    <ShieldAlert className="h-4 w-4" />
                    <span>All Users (Admin)</span>
                  </Link>
                </DropdownMenuItem>
              )}
              {(user.role === "MANAGEMENT" || user.role === "ADMIN") && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/management"
                    prefetch={true}
                    className="flex items-center gap-2 cursor-pointer text-blue-600 dark:text-blue-400"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    <span>Management Overview</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="flex items-center gap-2 cursor-pointer text-rose-500 focus:text-rose-500"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile nav links */}
      <div className="flex md:hidden border-t border-border/50 px-4 py-2 gap-2 overflow-x-auto text-xs">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-xl ${
                isActive
                  ? "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-400 font-medium"
                  : "text-muted-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
