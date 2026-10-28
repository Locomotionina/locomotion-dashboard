"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { loginAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  Loader2,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Default to light mode on login screen
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await loginAction(formData);

    if (!result.success) {
      setError(result.error || "Login failed");
      setLoading(false);
    } else {
      // Periksa apakah terdapat parameter `from` dari middleware
      const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
      const from = searchParams?.get("from");

      let targetUrl = "/dashboard";
      if (from && from.startsWith("/") && !from.startsWith("//")) {
        const isRestrictedForStaff = from.startsWith("/admin") || from.startsWith("/management");
        if (result.role === "STAFF" && isRestrictedForStaff) {
          targetUrl = "/dashboard";
        } else if (result.role === "MANAGEMENT" && from.startsWith("/admin")) {
          targetUrl = "/management";
        } else {
          targetUrl = from;
        }
      } else if (result.role === "ADMIN") {
        targetUrl = "/admin/users";
      } else if (result.role === "MANAGEMENT") {
        targetUrl = "/management";
      }

      // Clean, instant transition without router.refresh stutter
      window.location.href = targetUrl;
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center py-6 px-3 sm:px-6 animate-fade-up">
      {/* Main Two-Column Card */}
      <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-border bg-card p-3 sm:p-5 shadow-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 items-stretch">
          {/* Left Column: Interactive Clean Banner Image with Hover Motion */}
          <div className="group relative min-h-[300px] md:min-h-[520px] rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 border border-border/40 cursor-pointer">
            <Image
              src="/banner_screen.webp"
              alt="Locomotion Visual"
              fill
              className="object-cover rounded-2xl transition-all duration-700 ease-out group-hover:scale-[1.06] group-hover:-translate-y-1.5 group-hover:rotate-[0.5deg]"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          </div>

          {/* Right Column: Clean, Simple & Distraction-free Login Form */}
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

              {/* Title & Subtitle */}
              <div className="space-y-1 mb-6">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-foreground">
                  Welcome Back!
                </h1>
                <p className="text-xs text-muted-foreground">
                  Enter your details below to continue.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="flex items-center gap-2 p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 animate-fade-up">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Username Field */}
                <div className="space-y-1.5">
                  <Label htmlFor="username" className="text-xs font-semibold">
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Enter your username"
                    required
                    autoFocus
                    className="h-11 rounded-xl text-sm border-border/80 bg-background/60 focus:bg-background transition-colors"
                  />
                </div>

                {/* Password Field with Eye Toggle */}
                <div className="space-y-1.5">
                  <Label htmlFor="password" className="text-xs font-semibold">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••••••"
                      required
                      className="h-11 rounded-xl pl-3 pr-10 text-sm border-border/80 bg-background/60 focus:bg-background transition-colors"
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

                {/* Remember Me */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-muted-foreground hover:text-foreground">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="h-4 w-4 rounded border-border text-blue-600 focus:ring-blue-500"
                    />
                    <span>Remember me</span>
                  </label>
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
                        <span>Signing in...</span>
                      </>
                    ) : (
                      <>
                        <span>Log in</span>
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    className="w-full h-11 rounded-xl border-border/80 bg-secondary/50 hover:bg-secondary text-foreground font-semibold text-sm transition-all"
                  >
                    <Link href="/register">
                      <span>Sign up</span>
                    </Link>
                  </Button>
                </div>
              </form>
            </div>

            {/* Bottom Footer Link */}
            <div className="mt-6 pt-4 border-t border-border/50 text-center text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/register"
                className="font-semibold text-blue-600 dark:text-blue-400 underline-offset-4 hover:underline ml-1"
              >
                Sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
