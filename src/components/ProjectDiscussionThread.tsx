"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  ExternalLink,
  MessageSquare,
  AlertCircle,
  CornerUpLeft,
  X,
  AtSign,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectMessagesAction,
  sendProjectMessageAction,
  markProjectChatAsReadAction,
} from "@/actions/projects";
import { getSupabaseBrowserClient } from "@/lib/supabase";

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  userId: string;
  content: string;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string;
    userId: string;
    userName: string;
  } | null;
  mentionedUserIds?: string[];
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

export interface ProjectAssignee {
  id: string;
  name: string;
  username?: string;
  role?: string;
  position?: string;
  department?: string;
  avatarUrl?: string | null;
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
  initialUnreadCount?: number;
  onChatRead?: (projectId: string) => void;
  assignees?: ProjectAssignee[];
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
 * Renders chat message text with:
 * 1. Safe, clickable external links
 * 2. Highlighted @mention tags with stronger prominence if tagged user is current user
 */
function renderMessageBody(
  text: string,
  isCurrentUser: boolean,
  currentUserName?: string,
  assigneeNames: string[] = []
): React.ReactNode {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlParts = text.split(urlRegex);

  // Build mention pattern based on candidate names plus general @Name patterns
  const candidateNames = Array.from(
    new Set([currentUserName, ...assigneeNames].filter(Boolean) as string[])
  ).sort((a, b) => b.length - a.length);

  const escapedNames = candidateNames.map((n) =>
    n.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")
  );

  const mentionPattern =
    escapedNames.length > 0
      ? new RegExp(
          `(@(?:${escapedNames.join("|")})|@[a-zA-Z0-9_]+(?:\\s+[a-zA-Z0-9_]+)?)`,
          "gi"
        )
      : /(@[a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?)/gi;

  return urlParts.map((part, partIdx) => {
    if (part.match(/^https?:\/\//)) {
      let cleanUrl = part;
      let trailingPunct = "";
      const matchPunct = part.match(/[.,;:!?)]+$/);
      if (matchPunct) {
        trailingPunct = matchPunct[0];
        cleanUrl = part.slice(0, -trailingPunct.length);
      }
      return (
        <span key={`url-${partIdx}`}>
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

    const mentionTokens = part.split(mentionPattern);
    return mentionTokens.map((token, tokIdx) => {
      if (token.startsWith("@") && token.length > 1) {
        const rawName = token.slice(1).trim();
        const isMatchCurrent = Boolean(
          currentUserName &&
            rawName.toLowerCase() === currentUserName.trim().toLowerCase()
        );

        return (
          <span
            key={`mention-${partIdx}-${tokIdx}`}
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 mx-0.5 rounded-md text-[11px] align-baseline transition-all select-text",
              isMatchCurrent
                ? isCurrentUser
                  ? "bg-white/30 text-white ring-1 ring-white/60 font-bold"
                  : "bg-amber-500/25 text-amber-700 dark:text-amber-200 ring-1 ring-amber-500/50 font-bold shadow-xs"
                : isCurrentUser
                ? "bg-white/15 text-blue-100 font-medium"
                : "bg-blue-500/15 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500/30 font-medium"
            )}
          >
            {token}
          </span>
        );
      }
      return <span key={`text-${partIdx}-${tokIdx}`}>{token}</span>;
    });
  });
}

export function ProjectDiscussionThread({
  projectId,
  currentUser,
  className,
  initialUnreadCount = 0,
  onChatRead,
  assignees: initialAssignees,
}: ProjectDiscussionThreadProps) {
  const [messages, setMessages] = useState<ProjectChatMessage[]>([]);
  const [assignees, setAssignees] = useState<ProjectAssignee[]>(
    initialAssignees || []
  );
  const [inputContent, setInputContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reply / Quote State
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    content: string;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Mention Autocomplete State
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Unread badge count
  const [unreadCount, setUnreadCount] = useState<number>(initialUnreadCount);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mentionDropdownRef = useRef<HTMLDivElement>(null);
  const isInitialLoadedRef = useRef(false);
  const channelRef = useRef<any>(null);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  // Filter assignees matching the query
  const filteredAssignees = useMemo(() => {
    if (!showMentionDropdown) return [];
    const q = mentionQuery.trim();
    if (!q) return assignees;
    return assignees.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        (a.username && a.username.toLowerCase().includes(q))
    );
  }, [showMentionDropdown, mentionQuery, assignees]);

  // Names of assignees for highlighting
  const assigneeNames = useMemo(
    () => assignees.map((a) => a.name).filter(Boolean),
    [assignees]
  );

  // Smooth scroll to quoted message and briefly highlight it
  const scrollToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`chat-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 2000);
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
          if (res.assignees && res.assignees.length > 0) {
            setAssignees(res.assignees);
          }

          if (res.unreadMentionCount !== undefined) {
            setUnreadCount(res.unreadMentionCount);
            if (res.unreadMentionCount > 0) {
              setTimeout(() => {
                onChatRead?.(projectId);
              }, 1200);
            }
          }

          setMessages((prev) => {
            const currentIds = new Set(prev.map((m) => m.id));
            const newMsgs = res.messages.filter((m: any) => !currentIds.has(m.id));

            if (newMsgs.length === 0 && prev.length === res.messages.length) {
              return prev;
            }

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
    [projectId, scrollToBottom, onChatRead]
  );

  // Initial load and Real-Time Setup
  useEffect(() => {
    isInitialLoadedRef.current = false;

    // 1. Initial Fetch
    fetchMessages(false).then(() => {
      isInitialLoadedRef.current = true;
      setTimeout(() => scrollToBottom("auto"), 150);
    });

    // Auto-mark read status when opening
    markProjectChatAsReadAction(projectId).then(() => {
      onChatRead?.(projectId);
    });

    // 2. Supabase Realtime Subscription
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

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        fetchMessages(true);
        markProjectChatAsReadAction(projectId);
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
  }, [projectId, fetchMessages, scrollToBottom, onChatRead]);

  // Handle typing & mention detection
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInputContent(value);

    const cursor = e.target.selectionStart || 0;
    const textBeforeCursor = value.slice(0, cursor);

    // Detect @mention trigger: @ preceded by start-of-line or whitespace, followed by non-whitespace
    const match = textBeforeCursor.match(/(?:^|\s)@([^\s@]*)$/);

    if (match) {
      const q = match[1].toLowerCase();
      const atPos = textBeforeCursor.lastIndexOf("@");
      setMentionStartIndex(atPos);
      setMentionQuery(q);
      setSelectedMentionIndex(0);
      setShowMentionDropdown(true);
    } else {
      setShowMentionDropdown(false);
      setMentionStartIndex(-1);
    }
  };

  // Insert selected mention into composer
  const handleSelectMention = (user: ProjectAssignee) => {
    if (mentionStartIndex < 0) return;

    const cursor = textareaRef.current?.selectionStart || mentionStartIndex + 1 + mentionQuery.length;
    const textBefore = inputContent.slice(0, mentionStartIndex);
    const textAfter = inputContent.slice(cursor);
    const mentionTag = `@${user.name} `;
    const newContent = `${textBefore}${mentionTag}${textAfter}`;

    setInputContent(newContent);
    setMentionedUserIds((prev) => Array.from(new Set([...prev, user.id])));
    setShowMentionDropdown(false);
    setMentionStartIndex(-1);

    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newPos = textBefore.length + mentionTag.length;
        textareaRef.current.setSelectionRange(newPos, newPos);
      }
    }, 20);
  };

  // Keyboard navigation for dropdown & Enter to send
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredAssignees.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredAssignees.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev === 0 ? filteredAssignees.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredAssignees[selectedMentionIndex]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionDropdown(false);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Initiate message quote reply
  const handleReplyClick = (msg: ProjectChatMessage) => {
    setReplyingTo({
      id: msg.id,
      senderName: msg.user?.name || "Member",
      content: msg.content,
    });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 40);
  };

  // Handle message sending
  const handleSendMessage = async () => {
    const trimmed = inputContent.trim();
    if (!trimmed || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    const replyId = replyingTo?.id || null;
    const tagsToSend = [...mentionedUserIds];

    try {
      const res = await sendProjectMessageAction(
        projectId,
        trimmed,
        replyId,
        tagsToSend
      );

      if (res.success && res.message) {
        setInputContent("");
        setReplyingTo(null);
        setMentionedUserIds([]);
        setShowMentionDropdown(false);

        // Auto-clear unread badge
        if (unreadCount > 0) {
          setUnreadCount(0);
          onChatRead?.(projectId);
        }

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
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-foreground">
                Diskusi Project
              </h3>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 bg-background/50 border-border/60 text-muted-foreground font-normal"
              >
                {messages.length} pesan
              </Badge>

              {/* Unread Mention / Reply Indicator Badge on the Header */}
              {unreadCount > 0 && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 shadow-xs animate-pulse">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                  </span>
                  <span>@ Di-tag ({unreadCount})</span>
                </span>
              )}
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
        className="max-h-80 min-h-[180px] overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3.5 bg-background/40"
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
              Mulai diskusi project bersama tim. Gunakan <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px] border border-border/60">@</kbd> untuk menyebut PIC yang ditugaskan.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = Boolean(
              currentUser?.id && msg.userId === currentUser.id
            );
            const isHighlighted = highlightedMessageId === msg.id;

            // Resolve quoted reply (either from msg.replyTo or by finding in local messages array)
            const originalMsg = msg.replyToId
              ? messages.find((m) => m.id === msg.replyToId)
              : null;
            const hasQuote = Boolean(msg.replyTo || originalMsg);
            const quotedTargetId = msg.replyTo?.id || originalMsg?.id || msg.replyToId;
            const quotedContent = msg.replyTo?.content || originalMsg?.content || "";
            const quotedAuthorName =
              msg.replyTo?.userName ||
              originalMsg?.user?.name ||
              (msg.replyTo?.userId === currentUser?.id || originalMsg?.userId === currentUser?.id
                ? "Kamu"
                : "Member");

            return (
              <div
                key={msg.id}
                id={`chat-msg-${msg.id}`}
                className={cn(
                  "group relative flex flex-col transition-all duration-300 p-1 rounded-2xl",
                  isCurrentUser ? "items-end" : "items-start",
                  isHighlighted &&
                    "ring-2 ring-blue-500/70 bg-blue-500/15 scale-[1.01]"
                )}
              >
                {isCurrentUser ? (
                  /* Current User's Message Bubble (Right-aligned, primary blue tint) */
                  <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-[75%] justify-end">
                    {/* Hover Reply Button */}
                    <button
                      type="button"
                      onClick={() => handleReplyClick(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-md shrink-0 cursor-pointer"
                      title="Balas pesan"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex flex-col items-end w-full space-y-1">
                      <div className="rounded-2xl rounded-tr-xs bg-blue-600 text-white px-3.5 py-2 shadow-sm text-xs break-words w-full">
                        {/* Quoted Message Block if this was a reply */}
                        {hasQuote && quotedTargetId && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(quotedTargetId);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                scrollToMessage(quotedTargetId);
                              }
                            }}
                            className="mb-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all flex flex-col border-l-2 border-white/70 bg-black/20 hover:bg-black/30 text-left select-none"
                            title="Klik untuk melihat pesan asli"
                          >
                            <div className="flex items-center gap-1 font-semibold text-[10px] text-white">
                              <CornerUpLeft className="h-2.5 w-2.5 shrink-0 opacity-80" />
                              <span>{quotedAuthorName}</span>
                            </div>
                            <p className="line-clamp-1 italic text-[10px] text-blue-100/90 mt-0.5">
                              {quotedContent}
                            </p>
                          </div>
                        )}

                        <div className="leading-relaxed whitespace-pre-wrap select-text">
                          {renderMessageBody(
                            msg.content,
                            true,
                            currentUser?.name,
                            assigneeNames
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-1 text-[10px] text-blue-100/80 select-none pt-0.5">
                          <span>{formatChatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Other Project Members' Message Bubble (Left-aligned, neutral card styling) */
                  <div className="flex items-start gap-2 max-w-[85%] sm:max-w-[75%]">
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
                        {/* Quoted Message Block if this was a reply */}
                        {hasQuote && quotedTargetId && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              scrollToMessage(quotedTargetId);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.stopPropagation();
                                scrollToMessage(quotedTargetId);
                              }
                            }}
                            className="mb-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all flex flex-col border-l-2 border-blue-500 bg-background/80 hover:bg-background border text-left select-none"
                            title="Klik untuk melihat pesan asli"
                          >
                            <div className="flex items-center gap-1 font-semibold text-[10px] text-foreground">
                              <CornerUpLeft className="h-2.5 w-2.5 shrink-0 text-blue-500" />
                              <span>{quotedAuthorName}</span>
                            </div>
                            <p className="line-clamp-1 italic text-[10px] text-muted-foreground mt-0.5">
                              {quotedContent}
                            </p>
                          </div>
                        )}

                        <div>
                          {renderMessageBody(
                            msg.content,
                            false,
                            currentUser?.name,
                            assigneeNames
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Hover Reply Button */}
                    <button
                      type="button"
                      onClick={() => handleReplyClick(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-md shrink-0 mt-4 cursor-pointer"
                      title="Balas pesan"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </button>
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

      {/* Message Composer */}
      <div className="relative p-3 border-t border-border/50 bg-secondary/20">
        {/* Floating @Mention Autocomplete Dropdown (Restricted strictly to Project Assignees) */}
        {showMentionDropdown && (
          <div
            ref={mentionDropdownRef}
            className="absolute bottom-full left-3 right-3 sm:left-4 sm:right-auto sm:w-80 mb-2 z-40 bg-popover/95 backdrop-blur-md border border-border/80 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
          >
            <div className="px-3 py-2 bg-secondary/50 border-b border-border/50 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-muted-foreground font-semibold">
                <AtSign className="h-3.5 w-3.5 text-blue-500" />
                <span>Sebut Anggota Project (PIC)</span>
              </div>
              <span className="text-[10px] text-muted-foreground">
                {filteredAssignees.length} anggota
              </span>
            </div>

            <div className="max-h-48 overflow-y-auto custom-scrollbar p-1">
              {filteredAssignees.length === 0 ? (
                <div className="py-3 px-3 text-center text-xs text-muted-foreground">
                  {assignees.length === 0
                    ? "Belum ada PIC yang ditugaskan pada project ini."
                    : "Tidak ada PIC yang cocok dengan pencarian."}
                </div>
              ) : (
                filteredAssignees.map((assignee, idx) => {
                  const isSelected = idx === selectedMentionIndex;
                  return (
                    <button
                      key={assignee.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectMention(assignee);
                      }}
                      className={cn(
                        "w-full text-left px-2.5 py-1.5 rounded-lg flex items-center gap-2.5 transition-colors text-xs",
                        isSelected
                          ? "bg-blue-600/15 text-blue-600 dark:text-blue-300 font-semibold"
                          : "hover:bg-secondary/80 text-foreground"
                      )}
                    >
                      <Avatar className="h-6 w-6 shrink-0 ring-1 ring-border/50">
                        <AvatarImage src={assignee.avatarUrl || ""} />
                        <AvatarFallback className="text-[10px] bg-blue-500/10 text-blue-600 font-bold">
                          {assignee.name?.[0]?.toUpperCase() || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <span className="truncate font-medium">
                            {assignee.name}
                          </span>
                          {assignee.department && (
                            <span className="text-[9px] text-muted-foreground uppercase tracking-wider shrink-0">
                              {assignee.department}
                            </span>
                          )}
                        </div>
                        {assignee.position && (
                          <div className="text-[10px] text-muted-foreground truncate">
                            {assignee.position}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
            <div className="px-2.5 py-1 bg-secondary/30 border-t border-border/40 text-[9px] text-muted-foreground flex items-center justify-between">
              <span>Gunakan <kbd className="font-mono bg-background px-1 rounded">↑</kbd><kbd className="font-mono bg-background px-1 rounded ml-0.5">↓</kbd> untuk memilih</span>
              <span><kbd className="font-mono bg-background px-1 rounded">Enter</kbd> pilih • <kbd className="font-mono bg-background px-1 rounded">Esc</kbd> tutup</span>
            </div>
          </div>
        )}

        {/* Replying Preview Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between gap-2 px-3 py-1.5 mb-2 rounded-xl bg-blue-500/10 border-l-3 border-blue-500 text-xs animate-in fade-in slide-in-from-bottom-1 duration-150">
            <div className="flex items-center gap-2 min-w-0">
              <CornerUpLeft className="h-3.5 w-3.5 text-blue-500 shrink-0" />
              <span className="text-[11px] text-muted-foreground truncate">
                Membalas <strong className="font-semibold text-foreground">{replyingTo.senderName}</strong>:{" "}
                <span className="italic opacity-90">
                  &ldquo;
                  {replyingTo.content.length > 55
                    ? `${replyingTo.content.substring(0, 52)}...`
                    : replyingTo.content}
                  &rdquo;
                </span>
              </span>
            </div>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors shrink-0 cursor-pointer"
              title="Batal membalas"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={isSubmitting}
            placeholder="Tulis pesan... ketik @ untuk menyebut PIC project (Enter kirim, Shift+Enter baris baru)"
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
          Tekan <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Enter</kbd> untuk mengirim, <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Shift + Enter</kbd> untuk baris baru, <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">@</kbd> untuk mention PIC.
        </p>
      </div>
    </div>
  );
}
