"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  X,
  Loader2,
  FolderKanban,
  CheckSquare,
  User,
  ArrowRight,
  Layers,
  Sparkles,
  Flame,
  Clock,
  Check,
} from "lucide-react";
import { globalSearchAction, GlobalSearchResponse } from "@/actions/search";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function GlobalSearch() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<GlobalSearchResponse>({
    tasks: [],
    projects: [],
    staff: [],
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } else {
      setQuery("");
      setResults({ tasks: [], projects: [], staff: [] });
    }
  }, [isOpen]);

  // Debounced Search Execution
  useEffect(() => {
    if (!query.trim()) {
      setResults({ tasks: [], projects: [], staff: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await globalSearchAction(query);
        setResults(res);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (url: string) => {
    setIsOpen(false);
    router.push(url);
  };

  const hasAnyResults =
    results.tasks.length > 0 || results.projects.length > 0 || results.staff.length > 0;

  return (
    <>
      {/* Navbar Trigger Button (Desktop & Mobile) */}
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="group relative flex items-center gap-2.5 rounded-xl border border-border/70 bg-secondary/40 px-3 py-1.5 text-xs text-muted-foreground hover:border-blue-500/40 hover:bg-secondary/70 hover:text-foreground transition-all duration-200 shadow-sm"
        title="Cari apapun (Ctrl+K)"
      >
        <Search className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        <span className="hidden sm:inline-block font-medium">Cari task, project, tim...</span>
        <span className="inline-block sm:hidden font-medium">Cari...</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 rounded-md border border-border/80 bg-card px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground font-semibold">
          ⌘K
        </kbd>
      </button>

      {/* Global Search Dialog Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 md:pt-20 bg-background/80 backdrop-blur-sm animate-fade-in">
          {/* Backdrop Click */}
          <div className="fixed inset-0" onClick={() => setIsOpen(false)} />

          <div
            ref={containerRef}
            className="relative w-full max-w-2xl rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md shadow-2xl overflow-hidden flex flex-col z-10 animate-fade-up max-h-[85vh]"
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border/50 bg-secondary/20">
              <Search className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari task, deliverable, project, atau staff..."
                className="w-full bg-transparent text-sm sm:text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
              {query && !loading && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-secondary transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <kbd
                onClick={() => setIsOpen(false)}
                className="hidden sm:inline-flex items-center rounded-lg border border-border/80 bg-secondary/50 px-2 py-0.5 text-[11px] font-mono text-muted-foreground cursor-pointer hover:bg-secondary"
              >
                ESC
              </kbd>
            </div>

            {/* Results Content Area */}
            <div className="overflow-y-auto p-3 sm:p-4 space-y-4 max-h-[60vh]">
              {/* Empty state: Suggestions before typing */}
              {!query.trim() && (
                <div className="space-y-4 py-2">
                  <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                    Akses Cepat
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleSelect("/dashboard?tab=active")}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary hover:border-blue-500/40 transition-all text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <CheckSquare className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Active Tasks
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Workspace pengerjaan tugas
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelect("/projects")}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary hover:border-blue-500/40 transition-all text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <FolderKanban className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Project & Brand Hub
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Daftar seluruh brand aktif
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelect("/management")}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary hover:border-blue-500/40 transition-all text-left group"
                    >
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400">
                          Management
                        </div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          Staff overview & approval
                        </div>
                      </div>
                    </button>
                  </div>

                  <div className="text-center py-4 text-xs text-muted-foreground">
                    <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400 mx-auto mb-1 opacity-70" />
                    Ketik nama tugas, kode project (misal: <strong className="text-foreground">LOC-</strong>), atau nama tim untuk pencarian instan.
                  </div>
                </div>
              )}

              {/* No results state */}
              {query.trim() && !loading && !hasAnyResults && (
                <div className="p-8 text-center space-y-2">
                  <Search className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
                  <div className="text-sm font-bold text-foreground">
                    Tidak ada hasil ditemukan
                  </div>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Tidak ditemukan kecocokan untuk &ldquo;{query}&rdquo;. Coba gunakan kata kunci atau kode proyek lain.
                  </p>
                </div>
              )}

              {/* Section 1: Tasks */}
              {results.tasks.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Tugas & Deliverable ({results.tasks.length})</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.tasks.map((task) => (
                      <button
                        key={task.id}
                        type="button"
                        onClick={() => handleSelect(`/dashboard?taskId=${task.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/60 hover:border-blue-500/40 transition-all text-left group"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {task.title}
                            </span>
                            <Badge
                              variant={
                                task.status === "Done"
                                  ? "success"
                                  : task.status === "Revision"
                                  ? "destructive"
                                  : "secondary"
                              }
                              className="text-[10px] py-0 px-2 font-semibold"
                            >
                              {task.status}
                            </Badge>
                          </div>

                          <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                            {task.project && (
                              <span className="font-semibold text-blue-600 dark:text-blue-400">
                                {task.project.code} • {task.project.name}
                              </span>
                            )}
                            {task.user && (
                              <span>PIC: {task.user.name}</span>
                            )}
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 2: Projects */}
              {results.projects.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                    <span className="flex items-center gap-1.5">
                      <FolderKanban className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Proyek & Brand Hub ({results.projects.length})</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.projects.map((project) => (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelect(`/projects/${project.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/60 hover:border-blue-500/40 transition-all text-left group"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                              {project.code}
                            </span>
                            <span className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {project.name}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            Klien: <strong className="text-foreground">{project.clientName}</strong>
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 3: Staff Members */}
              {results.staff.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase tracking-wider px-2">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                      <span>Anggota Tim & Staff ({results.staff.length})</span>
                    </span>
                  </div>

                  <div className="space-y-1">
                    {results.staff.map((person) => (
                      <button
                        key={person.id}
                        type="button"
                        onClick={() => handleSelect("/management")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/50 bg-secondary/20 hover:bg-secondary/60 hover:border-blue-500/40 transition-all text-left group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Avatar className="h-7 w-7 ring-1 ring-blue-500/30">
                            <AvatarImage src={person.avatarUrl || ""} />
                            <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600 font-bold">
                              {person.name[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 truncate">
                              {person.name}
                            </div>
                            <div className="text-[11px] text-muted-foreground truncate">
                              {person.position} • {person.department}
                            </div>
                          </div>
                        </div>

                        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-blue-600 dark:group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Bar */}
            <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-secondary/30 text-[11px] text-muted-foreground">
              <span>Navigasi instan ke seluruh sistem</span>
              <span className="flex items-center gap-2">
                <span>Tekan <kbd className="px-1 py-0.5 bg-card border border-border/70 rounded">ESC</kbd> untuk keluar</span>
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
