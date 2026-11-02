"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ChevronDown, Search, UserCheck, Users, X } from "lucide-react";

export interface ReviewerOption {
  id: string;
  name: string;
  username?: string;
  position?: string;
  department?: string;
  avatarUrl?: string | null;
  role?: string;
}

interface MultiSelectReviewersProps {
  options: ReviewerOption[];
  selectedIds: string[];
  onChange: (selectedIds: string[]) => void;
  placeholder?: string;
  excludeUserId?: string;
  id?: string;
  name?: string;
}

export function MultiSelectReviewers({
  options,
  selectedIds,
  onChange,
  placeholder = "Pilih satu atau beberapa reviewer...",
  excludeUserId,
  id,
  name,
}: MultiSelectReviewersProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const availableOptions = useMemo(() => {
    return (options || []).filter(
      (opt) => !excludeUserId || opt.id !== excludeUserId
    );
  }, [options, excludeUserId]);

  const filteredOptions = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return availableOptions;
    return availableOptions.filter((opt) => {
      return (
        opt.name.toLowerCase().includes(query) ||
        (opt.username && opt.username.toLowerCase().includes(query)) ||
        (opt.position && opt.position.toLowerCase().includes(query)) ||
        (opt.department && opt.department.toLowerCase().includes(query))
      );
    });
  }, [availableOptions, search]);

  const selectedOptions = useMemo(() => {
    return availableOptions.filter((opt) =>
      selectedIds.includes(opt.id)
    );
  }, [availableOptions, selectedIds]);

  const toggleSelect = (userId: string) => {
    if (selectedIds.includes(userId)) {
      onChange(selectedIds.filter((id) => id !== userId));
    } else {
      onChange([...selectedIds, userId]);
    }
  };

  const removeUser = (userId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    onChange(selectedIds.filter((id) => id !== userId));
  };

  const clearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange([]);
  };

  return (
    <div className="space-y-2 w-full min-w-0" ref={containerRef}>
      {/* Hidden inputs for form submission if used inside standard HTML form */}
      {name && (
        <input
          type="hidden"
          name={name}
          id={id}
          value={JSON.stringify(selectedIds)}
        />
      )}

      {/* Selected Tags/Pills Container */}
      {selectedOptions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-purple-500/[0.06] border border-purple-500/20 max-h-36 overflow-y-auto min-w-0">
          {selectedOptions.map((user) => (
            <span
              key={user.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-card border border-purple-500/30 text-foreground shadow-2xs hover:border-purple-500/50 transition-colors min-w-0 max-w-full"
            >
              <Avatar className="h-4 w-4 shrink-0">
                <AvatarImage src={user.avatarUrl || ""} />
                <AvatarFallback className="text-[9px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">
                  {user.name[0]}
                </AvatarFallback>
              </Avatar>
              <span
                className="truncate max-w-[130px] font-semibold text-purple-900 dark:text-purple-200"
                title={`${user.name} (${user.position || user.department})`}
              >
                {user.name}
              </span>
              {user.position && (
                <span className="text-[10px] text-muted-foreground truncate max-w-[90px] hidden sm:inline">
                  • {user.position}
                </span>
              )}
              <button
                type="button"
                onClick={(e) => removeUser(user.id, e)}
                className="text-muted-foreground hover:text-rose-500 dark:hover:text-rose-400 p-0.5 rounded-full hover:bg-secondary transition-colors shrink-0"
                title={`Hapus ${user.name}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}

          {selectedOptions.length > 1 && (
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex items-center text-[10px] text-rose-500 hover:text-rose-600 font-medium px-2 py-1 rounded-lg hover:bg-rose-500/10 transition-colors"
            >
              Hapus Semua ({selectedOptions.length})
            </button>
          )}
        </div>
      )}

      {/* Trigger & Search Input Bar */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex h-10 w-full items-center justify-between rounded-xl border border-input bg-card px-3 py-2 text-xs shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-500/50 text-foreground hover:bg-secondary/40 transition-colors"
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
            <span
              className={`truncate ${
                selectedIds.length === 0
                  ? "text-muted-foreground"
                  : "text-foreground font-medium"
              }`}
            >
              {selectedIds.length === 0
                ? placeholder
                : `${selectedIds.length} Reviewer Dipilih (Paralel Review)`}
            </span>
          </div>
          <ChevronDown
            className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {/* Floating Dropdown Menu */}
        {isOpen && (
          <div className="absolute z-50 mt-1.5 w-full rounded-2xl border border-border/80 bg-card/95 backdrop-blur-md p-2 shadow-2xl animate-fade-in space-y-2">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, role (cth: Head Creative, Art Director, CEO)..."
                className="h-8 pl-8 text-xs bg-background rounded-xl border-border/60"
                autoFocus
              />
            </div>

            {/* Options List */}
            <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
              {filteredOptions.length === 0 ? (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Tidak ada reviewer yang cocok dengan pencarian &ldquo;{search}&rdquo;.
                </div>
              ) : (
                filteredOptions.map((opt) => {
                  const isSelected = selectedIds.includes(opt.id);
                  return (
                    <div
                      key={opt.id}
                      onClick={() => toggleSelect(opt.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-purple-500/15 text-purple-900 dark:text-purple-200 font-semibold"
                          : "hover:bg-secondary/70 text-foreground"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Avatar className="h-6 w-6 shrink-0 border border-border/50">
                          <AvatarImage src={opt.avatarUrl || ""} />
                          <AvatarFallback className="text-[10px] font-bold">
                            {opt.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex flex-col">
                          <span className="truncate font-medium">{opt.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">
                            {opt.position || "Staff"} • {opt.department || "Agency"}
                          </span>
                        </div>
                      </div>

                      <div className="shrink-0 ml-2">
                        {isSelected ? (
                          <div className="h-5 w-5 rounded-md bg-purple-600 text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </div>
                        ) : (
                          <div className="h-5 w-5 rounded-md border border-border/80 hover:border-purple-500/60" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-1.5 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground px-1">
              <span>Bisa memilih beberapa orang sekaligus untuk parallel review.</span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-xs font-semibold text-purple-600 dark:text-purple-400 hover:bg-purple-500/10"
                onClick={() => setIsOpen(false)}
              >
                Selesai
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
