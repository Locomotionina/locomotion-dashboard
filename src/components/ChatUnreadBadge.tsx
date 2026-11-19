import React from "react";

export interface ChatUnreadBadgeProps {
  unreadMessageCount?: number;
  unreadTagCount?: number;
  onClick?: (e: React.MouseEvent) => void;
  className?: string;
  compact?: boolean;
}

/**
 * Reusable WhatsApp-style unread counter badge.
 * Displays combined total unread messages + unread tags/mentions.
 */
export function ChatUnreadBadge({
  unreadMessageCount = 0,
  unreadTagCount = 0,
  onClick,
  className = "",
  compact = false,
}: ChatUnreadBadgeProps) {
  if (unreadMessageCount <= 0) return null;

  const hasTags = unreadTagCount > 0;

  // Formatting as specified:
  // Both: "[unreadMessageCount] unread messages • [unreadTagCount] tag untukmu"
  // Regular only: "[unreadMessageCount] unread messages"
  const label = hasTags
    ? `${unreadMessageCount} unread messages • ${unreadTagCount} tag untukmu`
    : `${unreadMessageCount} unread messages`;

  const compactLabel = hasTags
    ? `${unreadMessageCount} unread • ${unreadTagCount} tag`
    : `${unreadMessageCount} unread`;

  const displayedText = compact ? compactLabel : label;

  return (
    <span
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation();
          onClick(e);
        }
      }}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-xs transition-all ${
        hasTags
          ? "bg-amber-500/15 border border-amber-500/35 text-amber-600 dark:text-amber-400 animate-pulse hover:bg-amber-500/25"
          : "bg-blue-500/10 border border-blue-500/25 text-blue-600 dark:text-blue-400 hover:bg-blue-500/20"
      } ${onClick ? "cursor-pointer" : ""} ${className}`}
      title={label}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {hasTags && (
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            hasTags ? "bg-amber-500" : "bg-blue-500"
          }`}
        />
      </span>
      <span className="whitespace-nowrap">{displayedText}</span>
    </span>
  );
}
