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
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getProjectMessagesAction,
  sendProjectMessageAction,
  markProjectChatAsReadAction,
} from "@/actions/projects";
import {
  getSupabaseBrowserClient,
  LOCOMOTION_PROJECT_CHAT_GLOBAL_CHANNEL,
} from "@/lib/supabase";
import {
  compressImage,
  uploadChatImage,
  formatFileSize,
} from "@/lib/image-compression";
import { ChatImageLightbox } from "@/components/ChatImageLightbox";
import { ChatUnreadBadge } from "@/components/ChatUnreadBadge";

export interface ProjectChatMessage {
  id: string;
  projectId: string;
  userId: string;
  content: string | null;
  imageUrl?: string | null;
  createdAt: string;
  replyToId?: string | null;
  replyTo?: {
    id: string;
    content: string | null;
    imageUrl?: string | null;
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
    department?: string;
    avatarUrl?: string | null;
  } | null;
  className?: string;
  initialUnreadCount?: number;
  initialUnreadMessageCount?: number;
  initialUnreadTagCount?: number;
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
  initialUnreadMessageCount,
  initialUnreadTagCount,
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

  // Auto-dismiss error alert after 5 seconds
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  // Reply / Quote State
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    senderName: string;
    content: string | null;
    imageUrl?: string | null;
  } | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // Image Attachment & Lightbox State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedImage, setAttachedImage] = useState<{
    blob: Blob;
    file: File;
    previewUrl: string;
    size: number;
  } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [lightboxImageUrl, setLightboxImageUrl] = useState<string | null>(null);

  // Mention Autocomplete State
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState<number>(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  // Combined Unread Counts (Total Unread Messages + Unread Tags/Mentions)
  const [unreadMessageCount, setUnreadMessageCount] = useState<number>(
    initialUnreadMessageCount ?? initialUnreadCount ?? 0
  );
  const [unreadTagCount, setUnreadTagCount] = useState<number>(
    initialUnreadTagCount ?? initialUnreadCount ?? 0
  );

  // Sync if props update
  useEffect(() => {
    if (initialUnreadMessageCount !== undefined) {
      setUnreadMessageCount(initialUnreadMessageCount);
    } else if (initialUnreadCount !== undefined) {
      setUnreadMessageCount(initialUnreadCount);
    }
  }, [initialUnreadMessageCount, initialUnreadCount]);

  useEffect(() => {
    if (initialUnreadTagCount !== undefined) {
      setUnreadTagCount(initialUnreadTagCount);
    } else if (initialUnreadCount !== undefined) {
      setUnreadTagCount(initialUnreadCount);
    }
  }, [initialUnreadTagCount, initialUnreadCount]);

  // Auto-Reset on View / Mount: immediately mark read in DB and reset local unread counters
  useEffect(() => {
    if (projectId && currentUser) {
      markProjectChatAsReadAction(projectId).catch(() => {});
      onChatRead?.(projectId);
      setUnreadMessageCount(0);
      setUnreadTagCount(0);
    }
  }, [projectId, currentUser, onChatRead]);

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
        const res = await getProjectMessagesAction(projectId, isBackground);
        if (res.success && res.messages) {
          if (res.assignees && res.assignees.length > 0) {
            setAssignees(res.assignees);
          }

          if (res.unreadMentionCount !== undefined && !isBackground) {
            setUnreadTagCount(res.unreadTagCount ?? res.unreadMentionCount);
            setUnreadMessageCount(res.unreadMessageCount ?? res.unreadMentionCount);
            if (res.unreadMentionCount > 0) {
              setTimeout(() => {
                onChatRead?.(projectId);
              }, 1200);
            }
          }

          setMessages((prev) => {
            const currentIds = new Set(prev.map((m) => m.id));
            const newMsgs = res.messages.filter((m: any) => !currentIds.has(m.id));
            const pendingOptimistic = prev.filter((m) => m.id.startsWith("optimistic-"));

            if (
              newMsgs.length === 0 &&
              prev.length === res.messages.length + pendingOptimistic.length
            ) {
              return prev;
            }

            if (isInitialLoadedRef.current && newMsgs.length > 0) {
              setTimeout(() => scrollToBottom("smooth"), 100);
            }

            // Return server messages along with any in-flight optimistic messages
            return [
              ...(res.messages as ProjectChatMessage[]),
              ...pendingOptimistic,
            ];
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
                // If this matches an optimistic message content from same user, replace it
                const optimisticIdx = prev.findIndex(
                  (m) =>
                    m.id.startsWith("optimistic-") &&
                    m.userId === incomingMsg.userId &&
                    m.content === incomingMsg.content
                );
                if (optimisticIdx !== -1) {
                  const updated = [...prev];
                  updated[optimisticIdx] = incomingMsg;
                  return updated;
                }
                if (prev.some((m) => m.id === incomingMsg.id)) return prev;
                return [...prev, incomingMsg];
              });

              // Instantly update unread message & tag counts if sent by someone else
              if (currentUser?.id && incomingMsg.userId !== currentUser.id) {
                setUnreadMessageCount((prev) => prev + 1);
                const isTagged =
                  (Array.isArray(incomingMsg.mentionedUserIds) &&
                    incomingMsg.mentionedUserIds.includes(currentUser.id)) ||
                  incomingMsg.replyTo?.userId === currentUser.id;
                if (isTagged) {
                  setUnreadTagCount((prev) => prev + 1);
                }
              }

              setTimeout(() => scrollToBottom("smooth"), 80);
            }
          })
          .subscribe();

        channelRef.current = channel;
      } catch (e) {
        console.debug("[Supabase Realtime] Chat subscription skipped:", e);
      }
    }

    // 3. Lightweight background polling (every 5 seconds) as fallback
    const pollInterval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "visible") {
        fetchMessages(true);
      }
    }, 5000);

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

  // Process & compress selected or pasted image
  const processAndSetImage = async (fileOrBlob: File | Blob) => {
    try {
      setIsCompressing(true);
      const res = await compressImage(fileOrBlob);
      if (attachedImage?.previewUrl) {
        URL.revokeObjectURL(attachedImage.previewUrl);
      }
      setAttachedImage({
        blob: res.blob,
        file: res.file,
        previewUrl: res.previewUrl,
        size: res.size,
      });
      setTimeout(() => textareaRef.current?.focus(), 20);
    } catch (err: any) {
      alert(err.message || "Gagal mengompresi gambar.");
    } finally {
      setIsCompressing(false);
    }
  };

  // Direct clipboard paste listener (Ctrl+V / Cmd+V)
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          await processAndSetImage(file);
        }
        break;
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await processAndSetImage(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Initiate message quote reply
  const handleReplyClick = (msg: ProjectChatMessage) => {
    setReplyingTo({
      id: msg.id,
      senderName: msg.user?.name || "Member",
      content: msg.content || null,
      imageUrl: msg.imageUrl || null,
    });
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 40);
  };

  // Handle message sending with instant zero-latency optimistic UI update
  const handleSendMessage = async () => {
    const trimmed = inputContent.trim();
    if ((!trimmed && !attachedImage) || isSubmitting || isCompressing) return;

    // Snapshot current composer states
    const replySnapshot = replyingTo;
    const tagsSnapshot = [...mentionedUserIds];
    const imageSnapshot = attachedImage;

    // 1. Instantly clear composer inputs so user can keep typing immediately
    setInputContent("");
    setReplyingTo(null);
    setMentionedUserIds([]);
    setShowMentionDropdown(false);
    setErrorMessage(null);
    setAttachedImage(null);

    // Keep textarea focused on laptop/desktop
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 10);

    // Auto-clear unread badge if any
    if (unreadMessageCount > 0 || unreadTagCount > 0) {
      setUnreadMessageCount(0);
      setUnreadTagCount(0);
      onChatRead?.(projectId);
    }

    // 2. Generate optimistic local message
    const tempId = `optimistic-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const optimisticMsg: ProjectChatMessage = {
      id: tempId,
      projectId,
      userId: currentUser?.id || "temp-user",
      content: trimmed || null,
      imageUrl: imageSnapshot?.previewUrl || null,
      replyToId: replySnapshot?.id || null,
      replyTo: replySnapshot
        ? {
            id: replySnapshot.id,
            content: replySnapshot.content || null,
            imageUrl: replySnapshot.imageUrl || null,
            userId: "",
            userName: replySnapshot.senderName,
          }
        : null,
      mentionedUserIds: tagsSnapshot,
      createdAt: new Date().toISOString(),
      user: currentUser
        ? {
            id: currentUser.id,
            name: currentUser.name,
            username: currentUser.name.toLowerCase().replace(/\s+/g, ""),
            role: currentUser.role || "STAFF",
            position: currentUser.position,
            department: currentUser.department,
            avatarUrl: currentUser.avatarUrl,
          }
        : null,
    };

    // 3. Render optimistic message immediately in chat list (instant feedback)
    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 20);

    // 4. Send to server in background
    setIsSubmitting(true);
    try {
      let uploadedUrl: string | null = null;
      if (imageSnapshot) {
        uploadedUrl = await uploadChatImage(imageSnapshot.blob, projectId, "project");
      }

      const res = await sendProjectMessageAction(
        projectId,
        trimmed,
        replySnapshot?.id || null,
        tagsSnapshot,
        uploadedUrl
      );

      if (res.success && res.message) {
        const sentMsg = res.message as ProjectChatMessage;
        // Seamlessly replace optimistic temporary item with real persisted DB message
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? sentMsg : m))
        );

        // 1. Broadcast to project-specific Supabase Realtime channel
        if (channelRef.current) {
          channelRef.current
            .send({
              type: "broadcast",
              event: "new_message",
              payload: sentMsg,
            })
            .catch(() => {});
        }

        // 2. Broadcast to global channel for instant card badges across all clients
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          try {
            const globalChannel = supabase.channel(
              LOCOMOTION_PROJECT_CHAT_GLOBAL_CHANNEL
            );
            globalChannel
              .send({
                type: "broadcast",
                event: "new_message",
                payload: sentMsg,
              })
              .catch(() => {});
          } catch (e) {
            console.debug("Failed sending global chat broadcast:", e);
          }
        }

        // Revoke the blob URL ONLY on confirmed server save
        if (imageSnapshot?.previewUrl) {
          URL.revokeObjectURL(imageSnapshot.previewUrl);
        }
      } else {
        // Rollback optimistic message and restore composer state with preview URL intact
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputContent(trimmed);
        setReplyingTo(replySnapshot);
        setMentionedUserIds(tagsSnapshot);
        setAttachedImage(imageSnapshot);
        setErrorMessage(res.error || "Gagal mengirim pesan.");
      }
    } catch (err: any) {
      // Rollback optimistic message on error and restore composer state with preview URL intact
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputContent(trimmed);
      setReplyingTo(replySnapshot);
      setMentionedUserIds(tagsSnapshot);
      setAttachedImage(imageSnapshot);
      setErrorMessage(
        err.message || "Terjadi kesalahan saat mengirim pesan atau mengunggah gambar."
      );
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

              {/* Combined Unread Message + Tag Indicator Badge on the Header */}
              <ChatUnreadBadge
                unreadMessageCount={unreadMessageCount}
                unreadTagCount={unreadTagCount}
              />
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
            const quotedHasImage = Boolean(msg.replyTo?.imageUrl || originalMsg?.imageUrl);
            const quotedDisplaySnippet = quotedContent
              ? (quotedHasImage ? `📷 ${quotedContent}` : quotedContent)
              : (quotedHasImage ? "📷 Foto" : "");
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
                              {quotedDisplaySnippet}
                            </p>
                          </div>
                        )}

                        {/* Image Attachment Thumbnail */}
                        {msg.imageUrl && (
                          <div className={cn("pt-0.5", msg.content ? "mb-1.5" : "mb-0.5")}>
                            <img
                              src={msg.imageUrl}
                              alt="Lampiran foto"
                              loading="lazy"
                              onClick={() => setLightboxImageUrl(msg.imageUrl || null)}
                              onError={(e) => {
                                const imgEl = e.currentTarget;
                                imgEl.style.display = "none";
                                const parent = imgEl.parentElement;
                                if (parent && !parent.querySelector(".img-error-fallback")) {
                                  const fallback = document.createElement("div");
                                  fallback.className =
                                    "img-error-fallback flex items-center gap-1.5 py-1 px-2 rounded bg-black/20 text-[11px] text-white/80 italic";
                                  fallback.innerHTML = "<span>📷 Gagal memuat gambar</span>";
                                  parent.appendChild(fallback);
                                }
                              }}
                              className="max-h-60 w-auto rounded-lg object-cover cursor-pointer border border-white/20 hover:opacity-95 transition-opacity shadow-xs"
                            />
                          </div>
                        )}

                        {msg.content && (
                          <div className="leading-relaxed whitespace-pre-wrap select-text">
                            {renderMessageBody(
                              msg.content,
                              true,
                              currentUser?.name,
                              assigneeNames
                            )}
                          </div>
                        )}
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
                              {quotedDisplaySnippet}
                            </p>
                          </div>
                        )}

                        {/* Image Attachment Thumbnail */}
                        {msg.imageUrl && (
                          <div className={cn("pt-0.5", msg.content ? "mb-1.5" : "mb-0.5")}>
                            <img
                              src={msg.imageUrl}
                              alt="Lampiran foto"
                              loading="lazy"
                              onClick={() => setLightboxImageUrl(msg.imageUrl || null)}
                              onError={(e) => {
                                const imgEl = e.currentTarget;
                                imgEl.style.display = "none";
                                const parent = imgEl.parentElement;
                                if (parent && !parent.querySelector(".img-error-fallback")) {
                                  const fallback = document.createElement("div");
                                  fallback.className =
                                    "img-error-fallback flex items-center gap-1.5 py-1 px-2 rounded bg-secondary text-[11px] text-muted-foreground italic";
                                  fallback.innerHTML = "<span>📷 Gagal memuat gambar</span>";
                                  parent.appendChild(fallback);
                                }
                              }}
                              className="max-h-60 w-auto rounded-lg object-cover cursor-pointer border border-black/10 hover:opacity-95 transition-opacity shadow-xs"
                            />
                          </div>
                        )}

                        {msg.content && (
                          <div>
                            {renderMessageBody(
                              msg.content,
                              false,
                              currentUser?.name,
                              assigneeNames
                            )}
                          </div>
                        )}
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
        <div className="px-3.5 py-1.5 bg-rose-500/10 border-t border-rose-500/20 text-rose-600 dark:text-rose-400 text-[11px] flex items-center justify-between gap-1.5 shrink-0 animate-in fade-in">
          <div className="flex items-center gap-1.5 min-w-0">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 p-0.5 rounded cursor-pointer shrink-0"
            title="Tutup pesan error"
          >
            <X className="h-3 w-3" />
          </button>
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
                  {replyingTo.content
                    ? replyingTo.content.length > 55
                      ? `${replyingTo.content.substring(0, 52)}...`
                      : replyingTo.content
                    : replyingTo.imageUrl
                    ? "📷 Foto"
                    : "Pesan"}
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

        {/* Compressing Image Indicator */}
        {isCompressing && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-secondary/70 border border-border/70 text-xs text-muted-foreground animate-pulse">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span>Mengompresi gambar (&lt; 500 KB)...</span>
          </div>
        )}

        {/* Pre-Send Compressed Image Preview Bar */}
        {attachedImage && !isCompressing && (
          <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-secondary/80 border border-border/70 text-xs animate-in fade-in slide-in-from-bottom-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src={attachedImage.previewUrl}
                alt="Lampiran"
                onClick={() => setLightboxImageUrl(attachedImage.previewUrl)}
                className="h-12 w-12 rounded-lg object-cover border border-border shrink-0 shadow-xs cursor-pointer hover:opacity-90 transition-opacity"
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-foreground text-[11px] truncate max-w-[180px]">
                    {attachedImage.file.name || "Gambar terlampir"}
                  </span>
                  <Badge className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[10px] px-1.5 py-0 h-4 font-mono font-bold">
                    {formatFileSize(attachedImage.size)}
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">Siap dikirim dengan kompresi otomatis</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (attachedImage.previewUrl) URL.revokeObjectURL(attachedImage.previewUrl);
                setAttachedImage(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-background/80 transition-colors shrink-0 cursor-pointer"
              title="Hapus gambar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Hidden File Input for Image Selection */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="hidden"
          onChange={handleFileSelect}
        />

        <div className="flex items-end gap-2">
          {/* Image Upload / Paperclip Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSubmitting || isCompressing}
            className="h-[42px] w-[42px] p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 cursor-pointer"
            title="Lampirkan Gambar atau Screenshot (bisa juga langsung paste Ctrl+V)"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <textarea
            ref={textareaRef}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Tulis pesan... paste gambar screenshot atau ketik @ untuk mention"
            rows={1}
            className="flex-1 min-h-[42px] max-h-28 resize-none bg-background border border-border/70 rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all custom-scrollbar"
          />
          <Button
            type="button"
            onClick={handleSendMessage}
            disabled={(!inputContent.trim() && !attachedImage) || isSubmitting || isCompressing}
            size="sm"
            className="h-[42px] px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl gap-1.5 transition-all shadow-sm shrink-0 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline text-xs font-medium">Kirim</span>
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1.5 px-1 hidden sm:block">
          Tekan <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Enter</kbd> untuk mengirim, <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Shift + Enter</kbd> baris baru, <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[9px] border border-border/60">Ctrl+V</kbd> paste gambar langsung.
        </p>
      </div>

      {/* Lightbox Modal */}
      <ChatImageLightbox
        src={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}
