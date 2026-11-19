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
  CornerUpLeft,
  X,
  AtSign,
  Users,
  ImageIcon,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getTaskMessagesAction,
  sendTaskMessageAction,
  markTaskChatAsReadAction,
  TaskChatMessageItem,
  TaskParticipant,
} from "@/actions/task-reviews";
import {
  getSupabaseBrowserClient,
  LOCOMOTION_TASK_CHAT_GLOBAL_CHANNEL,
} from "@/lib/supabase";
import {
  compressImage,
  uploadChatImage,
  formatFileSize,
} from "@/lib/image-compression";
import { ChatImageLightbox } from "@/components/ChatImageLightbox";
import { ChatUnreadBadge } from "@/components/ChatUnreadBadge";

export interface TaskDiscussionThreadProps {
  taskId: string;
  currentUser?: {
    id: string;
    name: string;
    role?: string;
    position?: string;
    department?: string;
    avatarUrl?: string | null;
  } | null;
  className?: string;
  onUnreadCountChange?: (count: number) => void;
}

function formatChatTime(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function renderMessageBody(
  text: string,
  isCurrentUser: boolean,
  currentUserName?: string,
  participantNames: string[] = []
): React.ReactNode {
  if (!text) return null;

  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const urlParts = text.split(urlRegex);

  const candidateNames = Array.from(
    new Set([currentUserName, ...participantNames].filter(Boolean) as string[])
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
                ? "bg-white/20 text-white font-medium"
                : "bg-blue-500/10 text-blue-600 dark:text-blue-400 font-medium"
            )}
          >
            {token}
          </span>
        );
      }
      return token;
    });
  });
}

export function TaskDiscussionThread({
  taskId,
  currentUser,
  className,
  onUnreadCountChange,
}: TaskDiscussionThreadProps) {
  const [messages, setMessages] = useState<TaskChatMessageItem[]>([]);
  const [participants, setParticipants] = useState<TaskParticipant[]>([]);
  const [inputContent, setInputContent] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [unreadTagCount, setUnreadTagCount] = useState(0);
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

  // Mention Dropdown state
  const [showMentionDropdown, setShowMentionDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStartIndex, setMentionStartIndex] = useState(-1);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isInitialLoadedRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior, block: "nearest" });
    }
  }, []);

  const scrollToMessage = useCallback((targetId: string) => {
    const el = document.getElementById(`task-msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }, []);

  // Filter task participants for mention dropdown
  const filteredParticipants = useMemo(() => {
    if (!showMentionDropdown) return [];
    const q = mentionQuery.trim().toLowerCase();
    const list = participants.filter((p) => p.id !== currentUser?.id);
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q))
    );
  }, [showMentionDropdown, mentionQuery, participants, currentUser]);

  const participantNames = useMemo(
    () => participants.map((p) => p.name).filter(Boolean),
    [participants]
  );

  // Fetch messages from Server Action
  const fetchMessages = useCallback(
    async (isBackground = false) => {
      if (!taskId) return;
      if (!isBackground) setIsLoading(true);

      try {
        const res = await getTaskMessagesAction(taskId, isBackground);
        if (res.success && res.messages) {
          if (res.participants && res.participants.length > 0) {
            setParticipants(res.participants);
          }

          if (res.unreadMentionCount !== undefined && !isBackground) {
            setUnreadCount(res.unreadMentionCount);
            setUnreadTagCount(res.unreadTagCount ?? res.unreadMentionCount);
            setUnreadMessageCount(res.unreadMessageCount ?? res.unreadMentionCount);
            onUnreadCountChange?.(res.unreadMentionCount);
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

            return [...res.messages, ...pendingOptimistic];
          });
        }
      } catch (err) {
        console.error("Error fetching task messages:", err);
      } finally {
        if (!isBackground) setIsLoading(false);
      }
    },
    [taskId, scrollToBottom, onUnreadCountChange]
  );

  // Realtime subscription & initial fetch
  useEffect(() => {
    isInitialLoadedRef.current = false;

    fetchMessages(false).then(() => {
      isInitialLoadedRef.current = true;
      setTimeout(() => scrollToBottom("auto"), 150);
    });

    // Supabase Realtime channel
    const supabase = getSupabaseBrowserClient();
    let channel: any = null;

    if (supabase) {
      channel = supabase.channel(`task_chat:${taskId}`, {
        config: { broadcast: { self: false } },
      });

      channel
        .on("broadcast", { event: "new_task_message" }, (payload: any) => {
          if (payload?.payload?.taskId === taskId) {
            fetchMessages(true);
          }
        })
        .subscribe();
    }

    // Periodic polling fallback
    const pollInterval = setInterval(() => {
      fetchMessages(true);
    }, 5000);

    return () => {
      clearInterval(pollInterval);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [taskId, fetchMessages, scrollToBottom]);

  // Handle textarea typing & detect @ mentions
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const cursorPos = e.target.selectionStart || 0;
    setInputContent(val);

    const textBefore = val.slice(0, cursorPos);
    const lastAtMatch = textBefore.match(/@([a-zA-Z0-9_\s]*)$/);

    if (lastAtMatch) {
      const query = lastAtMatch[1];
      if (!query.includes("\n") && query.length < 25) {
        setMentionQuery(query);
        setMentionStartIndex(lastAtMatch.index || 0);
        setShowMentionDropdown(true);
        setSelectedMentionIndex(0);
        return;
      }
    }

    setShowMentionDropdown(false);
  };

  const handleSelectMention = (user: TaskParticipant) => {
    if (mentionStartIndex < 0) return;

    const textBefore = inputContent.slice(0, mentionStartIndex);
    const textAfter = inputContent.slice(
      mentionStartIndex + 1 + mentionQuery.length
    );

    const mentionTag = `@${user.name} `;
    const updated = `${textBefore}${mentionTag}${textAfter}`;

    setInputContent(updated);
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionDropdown && filteredParticipants.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedMentionIndex((prev) => (prev + 1) % filteredParticipants.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedMentionIndex((prev) =>
          prev === 0 ? filteredParticipants.length - 1 : prev - 1
        );
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        handleSelectMention(filteredParticipants[selectedMentionIndex]);
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

  const handleReplyClick = (msg: TaskChatMessageItem) => {
    setReplyingTo({
      id: msg.id,
      senderName: msg.user?.name || "Member",
      content: msg.content || null,
      imageUrl: msg.imageUrl || null,
    });
    setTimeout(() => textareaRef.current?.focus(), 40);
  };

  const handleSendMessage = async () => {
    const trimmed = inputContent.trim();
    if ((!trimmed && !attachedImage) || isSending || isCompressing) return;

    const replySnapshot = replyingTo;
    const tagsSnapshot = [...mentionedUserIds];
    const imageSnapshot = attachedImage;

    setInputContent("");
    setReplyingTo(null);
    setMentionedUserIds([]);
    setShowMentionDropdown(false);
    setAttachedImage(null);

    setTimeout(() => textareaRef.current?.focus(), 10);

    if (unreadCount > 0 || unreadMessageCount > 0) {
      setUnreadCount(0);
      setUnreadMessageCount(0);
      setUnreadTagCount(0);
      onUnreadCountChange?.(0);
    }

    // Optimistic message
    const tempId = `optimistic-${Date.now()}`;
    const optimisticMsg: TaskChatMessageItem = {
      id: tempId,
      taskId,
      userId: currentUser?.id || "current-user",
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
      user: {
        id: currentUser?.id || "current-user",
        name: currentUser?.name || "Saya",
        username: currentUser?.name?.toLowerCase().replace(/\s+/g, "") || "saya",
        role: currentUser?.role || "STAFF",
        position: currentUser?.position,
        department: currentUser?.department,
        avatarUrl: currentUser?.avatarUrl,
      },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setTimeout(() => scrollToBottom("smooth"), 50);

    try {
      setIsSending(true);

      let uploadedUrl: string | null = null;
      if (imageSnapshot) {
        uploadedUrl = await uploadChatImage(imageSnapshot.blob, taskId, "task");
      }

      const res = await sendTaskMessageAction(
        taskId,
        trimmed,
        replySnapshot?.id || null,
        tagsSnapshot,
        uploadedUrl
      );

      if (res.success && res.message) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? res.message : m))
        );

        // Broadcast to Supabase
        const supabase = getSupabaseBrowserClient();
        if (supabase) {
          const channel = supabase.channel(`task_chat:${taskId}`);
          channel.send({
            type: "broadcast",
            event: "new_task_message",
            payload: { taskId, messageId: res.message.id },
          });
        }
      } else {
        // Remove failed optimistic msg
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setInputContent(trimmed);
        setReplyingTo(replySnapshot);
        setMentionedUserIds(tagsSnapshot);
        setAttachedImage(imageSnapshot);
      }
    } catch (err) {
      console.error("Failed to send task message:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setInputContent(trimmed);
      setReplyingTo(replySnapshot);
      setMentionedUserIds(tagsSnapshot);
      setAttachedImage(imageSnapshot);
    } finally {
      setIsSending(false);
      if (imageSnapshot?.previewUrl) {
        URL.revokeObjectURL(imageSnapshot.previewUrl);
      }
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-card/60 relative", className)}>
      {/* Header Bar */}
      <div className="p-3 sm:px-4 border-b border-border/60 bg-secondary/20 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />
          <span className="text-xs font-bold text-foreground">Diskusi & Catatan Review</span>
          <Badge variant="outline" className="text-[10px] h-4 px-1.5 font-normal">
            {messages.length}
          </Badge>
          <ChatUnreadBadge
            unreadMessageCount={unreadMessageCount}
            unreadTagCount={unreadTagCount}
          />
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
          </span>
          <span>Live Chat</span>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-4 space-y-3 min-h-0 bg-background/30"
      >
        {isLoading && messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground text-xs gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
            <span>Memuat pesan diskusi...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-2">
            <div className="h-10 w-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-500">
              <MessageSquare className="h-5 w-5 opacity-80" />
            </div>
            <p className="text-xs font-semibold text-foreground">
              Belum ada pesan di task ini
            </p>
            <p className="text-[11px] text-muted-foreground max-w-xs">
              Mulai obrolan review atau sampaikan catatan revisi. Gunakan <kbd className="font-mono bg-secondary px-1 py-0.5 rounded text-[10px]">@</kbd> untuk menyebut PIC atau reviewer.
            </p>
          </div>
        ) : (
          messages.map((msg) => {
            const isCurrentUser = Boolean(currentUser?.id && msg.userId === currentUser.id);
            const isHighlighted = highlightedMessageId === msg.id;

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
                id={`task-msg-${msg.id}`}
                className={cn(
                  "group relative flex flex-col transition-all duration-300 p-1 rounded-2xl",
                  isCurrentUser ? "items-end" : "items-start",
                  isHighlighted && "ring-2 ring-purple-500/70 bg-purple-500/15 scale-[1.01]"
                )}
              >
                {isCurrentUser ? (
                  /* Current User's Bubble (Right) */
                  <div className="flex items-center gap-1.5 max-w-[85%] sm:max-w-[80%] justify-end">
                    <button
                      type="button"
                      onClick={() => handleReplyClick(msg)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-md shrink-0 cursor-pointer"
                      title="Balas pesan"
                    >
                      <CornerUpLeft className="h-3.5 w-3.5" />
                    </button>

                    <div className="flex flex-col items-end w-full space-y-1">
                      <div className="rounded-2xl rounded-tr-xs bg-purple-600 text-white px-3.5 py-2 shadow-sm text-xs break-words w-full">
                        {hasQuote && quotedTargetId && (
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => scrollToMessage(quotedTargetId)}
                            className="mb-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all flex flex-col border-l-2 border-white/70 bg-black/20 hover:bg-black/30 text-left select-none"
                            title="Klik untuk melihat pesan asli"
                          >
                            <div className="flex items-center gap-1 font-semibold text-[10px] text-white">
                              <CornerUpLeft className="h-2.5 w-2.5 shrink-0 opacity-80" />
                              <span>{quotedAuthorName}</span>
                            </div>
                            <p className="line-clamp-1 italic text-[10px] text-purple-100/90 mt-0.5">
                              {quotedDisplaySnippet}
                            </p>
                          </div>
                        )}

                        {/* Image Attachment Thumbnail */}
                        {msg.imageUrl && (
                          <div className="mb-1.5 pt-0.5">
                            <img
                              src={msg.imageUrl}
                              alt="Lampiran foto"
                              loading="lazy"
                              onClick={() => setLightboxImageUrl(msg.imageUrl || null)}
                              className="max-h-60 w-auto rounded-lg object-cover cursor-pointer border border-white/20 hover:opacity-95 transition-opacity shadow-xs"
                            />
                          </div>
                        )}

                        {msg.content && (
                          <div className="leading-relaxed whitespace-pre-wrap select-text">
                            {renderMessageBody(msg.content, true, currentUser?.name, participantNames)}
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-1 text-[10px] text-purple-100/80 select-none pt-0.5">
                          <span>{formatChatTime(msg.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Other Participant's Bubble (Left) */
                  <div className="flex items-start gap-2 max-w-[88%] sm:max-w-[82%]">
                    <Avatar className="h-7 w-7 mt-0.5 shrink-0 ring-1 ring-border">
                      <AvatarImage src={msg.user?.avatarUrl || ""} />
                      <AvatarFallback className="text-[10px] bg-purple-500/10 text-purple-600 font-bold">
                        {msg.user?.name?.[0] || "?"}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col items-start w-full space-y-1">
                      <div className="flex items-center gap-1.5 px-1">
                        <span className="text-xs font-semibold text-foreground">
                          {msg.user?.name || "Member"}
                        </span>
                        {msg.user?.role && (
                          <Badge
                            variant="secondary"
                            className="text-[9px] px-1.5 py-0 h-3.5 font-medium uppercase"
                          >
                            {msg.user.role}
                          </Badge>
                        )}
                        <span className="text-[10px] text-muted-foreground ml-1">
                          {formatChatTime(msg.createdAt)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 w-full">
                        <div className="rounded-2xl rounded-tl-xs bg-secondary/80 border border-border/70 text-foreground px-3.5 py-2 shadow-xs text-xs break-words w-full">
                          {hasQuote && quotedTargetId && (
                            <div
                              role="button"
                              tabIndex={0}
                              onClick={() => scrollToMessage(quotedTargetId)}
                              className="mb-1.5 px-2.5 py-1 rounded-md text-[11px] cursor-pointer transition-all flex flex-col border-l-2 border-purple-500 bg-secondary/60 hover:bg-secondary text-left select-none"
                              title="Klik untuk melihat pesan asli"
                            >
                              <div className="flex items-center gap-1 font-semibold text-[10px] text-purple-600 dark:text-purple-400">
                                <CornerUpLeft className="h-2.5 w-2.5 shrink-0 opacity-80" />
                                <span>{quotedAuthorName}</span>
                              </div>
                              <p className="line-clamp-1 italic text-[10px] text-muted-foreground mt-0.5">
                                {quotedDisplaySnippet}
                              </p>
                            </div>
                          )}

                          {/* Image Attachment Thumbnail */}
                          {msg.imageUrl && (
                            <div className="mb-1.5 pt-0.5">
                              <img
                                src={msg.imageUrl}
                                alt="Lampiran foto"
                                loading="lazy"
                                onClick={() => setLightboxImageUrl(msg.imageUrl || null)}
                                className="max-h-60 w-auto rounded-lg object-cover cursor-pointer border border-black/10 hover:opacity-95 transition-opacity shadow-xs"
                              />
                            </div>
                          )}

                          {msg.content && (
                            <div className="leading-relaxed whitespace-pre-wrap select-text">
                              {renderMessageBody(msg.content, false, currentUser?.name, participantNames)}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleReplyClick(msg)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/70 rounded-md shrink-0 cursor-pointer"
                          title="Balas pesan"
                        >
                          <CornerUpLeft className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quote Reply Bar */}
      {replyingTo && (
        <div className="p-2 px-3 border-t border-border/50 bg-secondary/60 flex items-center justify-between text-xs animate-in fade-in slide-in-from-bottom-2 shrink-0">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <CornerUpLeft className="h-3.5 w-3.5 text-purple-600 shrink-0" />
            <div className="min-w-0 text-left">
              <span className="font-semibold text-foreground text-[11px]">
                Membalas {replyingTo.senderName}:
              </span>
              <p className="text-[10px] text-muted-foreground truncate italic">
                &ldquo;
                {replyingTo.content
                  ? replyingTo.content.length > 55
                    ? `${replyingTo.content.substring(0, 52)}...`
                    : replyingTo.content
                  : replyingTo.imageUrl
                  ? "📷 Foto"
                  : "Pesan"}
                &rdquo;
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setReplyingTo(null)}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary"
            title="Batalkan balasan"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Compressing Image Indicator */}
      {isCompressing && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-border/50 bg-secondary/60 text-xs text-muted-foreground animate-pulse shrink-0">
          <Loader2 className="h-4 w-4 animate-spin text-purple-600" />
          <span>Mengompresi gambar (&lt; 500 KB)...</span>
        </div>
      )}

      {/* Pre-Send Compressed Image Preview Bar */}
      {attachedImage && !isCompressing && (
        <div className="flex items-center justify-between gap-2 p-2 px-3 border-t border-border/50 bg-secondary/70 text-xs animate-in fade-in slide-in-from-bottom-1 shrink-0">
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
            className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 cursor-pointer"
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

      {/* @mention Suggestion Dropdown */}
      {showMentionDropdown && filteredParticipants.length > 0 && (
        <div className="absolute bottom-16 left-3 right-3 sm:left-4 sm:right-4 z-50 bg-card/95 backdrop-blur-md border border-border shadow-xl rounded-xl p-1 max-h-48 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-bottom-2">
          <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground flex items-center justify-between">
            <span>Pilih Anggota Task:</span>
            <kbd className="font-mono text-[9px] bg-secondary px-1 rounded">↑↓ navigate • Enter select</kbd>
          </div>
          {filteredParticipants.map((part, idx) => (
            <div
              key={part.id}
              onClick={() => handleSelectMention(part)}
              className={cn(
                "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs cursor-pointer transition-colors",
                idx === selectedMentionIndex
                  ? "bg-purple-600 text-white font-medium"
                  : "hover:bg-secondary/60 text-foreground"
              )}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar className="h-5 w-5 shrink-0">
                  <AvatarImage src={part.avatarUrl || ""} />
                  <AvatarFallback className="text-[9px]">
                    {part.name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{part.name}</span>
                <span className={cn("text-[10px] truncate", idx === selectedMentionIndex ? "text-purple-200" : "text-muted-foreground")}>
                  @{part.username}
                </span>
              </div>
              <Badge
                variant="outline"
                className={cn(
                  "text-[9px] px-1 py-0 h-4 uppercase shrink-0",
                  idx === selectedMentionIndex
                    ? "border-white/40 text-white"
                    : "border-border text-muted-foreground"
                )}
              >
                {part.isReviewer ? "Reviewer" : part.isAssignee ? "PIC" : "Creator"}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Message Composer */}
      <div className="p-3 border-t border-border/60 bg-card shrink-0">
        <div className="relative flex items-center gap-2">
          {/* Image Upload Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isSending || isCompressing}
            className="h-9 w-9 p-0 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary shrink-0 cursor-pointer"
            title="Lampirkan Gambar atau Screenshot (bisa juga paste Ctrl+V)"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>

          <textarea
            ref={textareaRef}
            rows={1}
            value={inputContent}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder="Tulis pesan atau review... paste screenshot atau ketik @ untuk mention"
            className="flex-1 min-h-[38px] max-h-24 resize-none rounded-xl bg-secondary/40 border border-border/70 px-3.5 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-purple-500/70"
          />

          <Button
            size="sm"
            onClick={handleSendMessage}
            disabled={(!inputContent.trim() && !attachedImage) || isSending || isCompressing}
            className="h-9 px-3.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shrink-0 shadow-sm transition-all cursor-pointer"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline sm:ml-1.5">Kirim</span>
          </Button>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ChatImageLightbox
        src={lightboxImageUrl}
        onClose={() => setLightboxImageUrl(null)}
      />
    </div>
  );
}
