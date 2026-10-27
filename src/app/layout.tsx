import type { Metadata } from "next";
import localFont from "next/font/local";
import Image from "next/image";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { Navbar } from "@/components/Navbar";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Locomotion | Digital Agency Workload & Project Hub",
  description:
    "Internal agency dashboard for capacity management, brand deliverables, and individual staff workspaces.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var isAuth=window.location.pathname==="/login"||window.location.pathname==="/register";if(isAuth){document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");return;}var t=localStorage.getItem("locomotion-theme")||"light";var d=t==="dark"||(t==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark");document.documentElement.classList.remove("light");}else{document.documentElement.classList.remove("dark");document.documentElement.classList.add("light");}}catch(e){}})();`,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-background font-sans antialiased text-foreground flex flex-col relative overflow-x-hidden`}
      >
        <ThemeProvider>
          <Navbar user={currentUser} />

          <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>

          {currentUser && (
            <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground bg-card/40 backdrop-blur-sm">
              <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-medium text-foreground/80">
                  <Image
                    src="/logo.svg"
                    alt="Locomotion Logo"
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-md object-cover shadow-sm border border-blue-500/30"
                  />
                  <span>Locomotion Digital Agency Platform © 2026</span>
                </div>
                <span>
                  Role-Based Access Control (RBAC) • SQLite & Prisma Engine
                </span>
              </div>
            </footer>
          )}
        </ThemeProvider>
      </body>
    </html>
  );
}
