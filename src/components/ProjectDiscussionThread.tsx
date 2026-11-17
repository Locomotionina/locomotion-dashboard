"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Radio,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectMessagesAction,
  sendProjectMessageAction,
} from "@/actions/projects";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  createdAt: string;
  user?: {
    id: string;
    name: string;
    username: string;
    role: string;
    position?: string;
    department?: string;
    avatarUrl?: string | null;
  } | null;
}

export interface ProjectDiscussionThreadProps {
  projectId: string;
  currentUser?: {
    id: string;
    name: string;
    role?: string;
    position?: string;
    avatarUrl?: string | null;
  } | null;
  className?: string;
}

/**
 * Format timestamp into standard readable time e.g. "10:30 AM"
 */
function formatChatTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Automatically detects raw http:// and https:// URLs in chat messages
 * and renders them as secure, clickable external links.
 */
function renderLinkifiedText(text: string, isCurrentUser: boolean): React.ReactNode {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts.map((part, index) => {
    if (part.match(/^https?:\/\//)) {
      let cleanUrl = part;
      let trailingPunct = "";
      const matchPunct = part.match(/[.,;:!?)]+$/);
      if (matchPunct) {
        trailingPunct = matchPunct[0];
        cleanUrl = part.slice(0, -trailingPunct.length);
      }
      return (
        <span key={index}>
          <a
            href={cleanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "underline font-medium break-all transition-opacity hover:opacity-85 inline-flex items-center gap-0.5",
              isCurrentUser
                ? "text-blue-100 hover:text-white underline-offset-2"
                : "text-blue-600 dark:text-blue-400 hover:text-blue-700 underline-offset-2"
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <span>{cleanUrl}</span>
            <ExternalLink className="h-2.5 w-2.5 inline-block shrink-0 ml-0.5 opacity-80" />
          </a>
          {trailingPunct}
        </span>
      );
    }
    return part;
  });
}

export function ProjectDiscussionThread({
  projectId,
  currentUser,
  className,
}: ProjectDiscussionThreadProps) {
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isInitialLoadedRef = useRef(false);
  const channelRef = useRef<any>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  // Fetch messages from Server Action
  const fetchMessages = useCallback(
    async (isBackground = false) => {
      if (!projectId) return;
      if (!isBackground) setIsLoading(true);

      try {
        const res = await getProjectMessagesAction(projectId);
        if (res.success && res.messages) {
          setMessages((prev) => {
            // Avoid state replacement jitter if no new messages
            const currentIds = new Set(prev.map((m) => m.id));
            const newMsgs = res.messages.filter((m: any) => !currentIds.has(m.id));

            if (newMsgs.length === 0 && prev.length === res.messages.length) {
              return prev;
            }

            // If new messages came in and it's not the initial load, scroll to bottom
            if (isInitialLoadedRef.current && newMsgs.length > 0) {
              setTimeout(() => scrollToBottom("smooth"), 100);
            }

            return res.messages as ProjectChatMessage[];
          });
        }
      } catch (err) {
        console.error("Error fetching project messages:", err);
      } finally {
        if (!isBackground) {
          setIsLoading(false);
        }
      }
    },
    [projectId, scrollToBottom]
  );

  // Initial load and Real-Time Setup
  useEffect(() => {
    isInitialLoadedRef.current = false;

    // 1. Initial Fetch
    fetchMessages(false).then(() => {
      isInitialLoadedRef.current = true;
      setTimeout(() => scrollToBottom("auto"), 150);
    });

    // 2. Supabase Realtime Subscription (if available)
    const supabase = getSupabaseBrowserClient();
    if (supabase) {
      try {
        const channel = supabase.channel(`project-chat:${projectId}`, {
          config: {
            broadcast: { self: false },
          },
        });

        channel
          .on("broadcast", { event: "new_message" }, (payload: any) => {
            if (payload && payload.payload) {
              const incomingMsg = payload.payload as ProjectChatMessage;
              setMessages((prev) => {
                if (prev.some((m) => m.id === incomingMsg.id)) return prev;
                return [...prev, incomingMsg];
              });
              setTimeout(() => scrollToBottom("smooth"), 80);
            }
          })
          .subscribe();

        channelRef.current = channel;
      } catch (e) {
        console.debug("[Supabase Realtime] Chat subscription skipped:", e);
      }
    }

    // 3. Lightweight polling (every 3.5 seconds) for bulletproof live sync
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages(true);
      }
    }, 3500);

    // Refresh immediately when window/tab is focused
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMessages(true);
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (supabase && channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [projectId, fetchMessages, scrollToBottom]);

  // Handle message sending
  const handleSendMessage = async () => {
    const trimmed = inputContent.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await sendProjectMessageAction(projectId, trimmed);

      if (res.success && res.message) {
        setInputContent("");

        // Optimistically append message to local state
        const sentMsg = res.message as ProjectChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg];
        });

        // Broadcast to Supabase Realtime channel if active
        if (channelRef.current) {
          channelRef.current
            .send({
              type: "broadcast",
              event: "new_message",
              payload: sentMsg,
            })
            .catch(() => {});
        }

        setTimeout(() => scrollToBottom("smooth"), 50);
      } else {
        setErrorMessage(res.error || "Gagal mengirim pesan.");
      }
    } catch (err: any) {
      console.error("Failed sending message:", err);
      setErrorMessage(err.message || "Terjadi kesalahan saat mengirim pesan.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      className={cn(
        "rounded-2xl border border-border/70 bg-card/60 backdrop-blur-sm overflow-hidden flex flex-col shadow-sm transition-all",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-secondary/30">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <MessageSquare className="h-3.5 w-3.5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Diskusi Project
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-background/50 border-border/60 text-muted-foreground font-normal"
              >
                {messages.length} pesan
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Thread komunikasi khusus PIC & anggota tim yang ditugaskan
            </p>
          </div>
        </div>

        {/* Live sync pulse indicator */}
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="hidden xs:inline">Live Sync</span>
        </div>
      </div>

      {/* Message List: Scrollable container max-h-80 */}
      <div
        ref={scrollContainerRef}
        className="max-h-80 min-h-[160px] overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3.5 bg-background/40"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
            <span>Memuat pesan diskusi...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-2">
            <div className="h-10 w-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-500">
              <MessageSquare className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-xs font-medium text-foreground">
              Belum ada percakapan di thread ini
            </p>
            <p className="text-[11px] text-muted-foreground max-w-sm">
              Mulai diskusi project bersama tim. Pesan akan langsung dikirimkan ke PIC yang ditugaskan melalui Web Push notification.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = Boolean(
              currentUser?.id && msg.userId === currentUser.id
            );

            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col transition-all",
                  isCurrentUser ? "items-end" : "items-start"
                )}
              >
                {isCurrentUser ? (
                  /* Current User's Message Bubble (Right-aligned, primary blue tint) */
                  <div className="flex flex-col items-end max-w-[85%] sm:max-w-[75%] space-y-1">
                    <div className="rounded-2xl rounded-tr-xs bg-blue-600 text-white px-3.5 py-2 shadow-sm text-xs break-words space-y-1">
                      <div className="leading-relaxed whitespace-pre-wrap select-text">
                        {renderLinkifiedText(msg.content, true)}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-[10px] text-blue-100/80 select-none pt-0.5">
                        <span>{formatChatTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Other Project Members' Message Bubble (Left-aligned, neutral card styling) */
                  <div className="flex items-start gap-2.5 max-w-[85%] sm:max-w-[75%]">
                    <Avatar className="h-7 w-7 shrink-0 ring-1 ring-border/50 mt-0.5">
                      <AvatarImage
                        src={msg.user?.avatarUrl || ""}
                        alt={msg.user?.name || "User"}
                      />
                      <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                        {msg.user?.name?.[0]?.toUpperCase() || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      {/* Member Info Header: Full Name, Role Badge, Timestamp */}
                      <div className="flex items-center gap-1.5 flex-wrap mb-1">
                        <span className="font-semibold text-xs text-foreground truncate max-w-[150px]">
                          {msg.user?.name || "Tim Member"}
                        </span>
                        {msg.user?.role && (
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 h-3.5 font-normal text-muted-foreground border-border/60"
                          >
                            {msg.user.position || msg.user.role}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground select-none">
                          {formatChatTime(msg.createdAt)}
                        </span>
                      </div>

                      {/* Bubble with neutral card styling */}
                      <div className="rounded-2xl rounded-tl-xs bg-secondary/80 dark:bg-secondary/40 border border-border/50 text-foreground px-3.5 py-2 shadow-sm text-xs break-words leading-relaxed whitespace-pre-wrap select-text">
                        {renderLinkifiedText(msg.content, false)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} className="h-0" />
      </div>

      {/* Error alert if send failed */}
      {errorMessage && (
        <div className="px-3.5 py-1.5 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Message Composer: Clean textarea at bottom */}
      <div className="p-3 border-t border-border/50 bg-secondary/20">
        <div className="flex items-end gap-2">
          <textarea
            value={inputContent}
            onChange={(e) => setInputContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Tulis pesan diskusi project... (Enter untuk kirim, Shift + Enter untuk baris baru)"
            rows={1}
            className="flex-1 min-h-[42px] max-h-28 resize-none bg-background border border-border/70 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all custom-scrollbar disabled:opacity-60"
          />
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={isSubmitting || !inputContent.trim()}
            size="sm"
            className="h-[42px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 transition-all shadow-sm shrink-0 disabled:opacity-50"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <span className="hidden sm:inline text-xs font-medium">Kirim</span>
                <Send className="h-3.5 w-3.5" />
              </>
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1 hidden sm:block">
          Tekan <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Enter</kbd> untuk mengirim, <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Shift + Enter</kbd> untuk baris baru.
        </p>
      </div>
    </div>
  );
}
